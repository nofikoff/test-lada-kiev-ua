import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  allPages,
  EXPERT_PAGES,
  GUIDE_PAGES,
  htmlToText,
  normalize,
  PILOT_EDGES,
  SERVICE_COPY_SELECTOR,
  servicePages,
  SITE_ORIGIN,
  toLocalPath,
} from './support/site';

/**
 * Ссылки между страницами (docs/specs/routes.md §Links from the map). Источник рёбер —
 * `docs/seo/map.md` §Links: карта — внешний контракт `/seo`, а не константа реализации, поэтому
 * тест читает её своим разбором и сверяет с собранным HTML. Рёбра пилота, которые
 * не должны пропасть вместе со строкой карты, проверяются ещё и литералами `PILOT_EDGES`.
 */

const MAP_FILE = 'docs/seo/map.md';

/** Виды страниц карты, чьи рёбра обязаны стать ссылками: база знаний, эксперт и страницы услуг. */
const FROM_KINDS = new Set(['hub', 'entity', 'question', 'expert', 'service']);

/**
 * Вход в раздел со страниц услуг — категорий и подстраниц (docs/specs/routes.md §Links from the map) —
 * литералами, как `PILOT_EDGES`: ребро, удалённое из карты, убрало бы ссылку молча.
 */
const SERVICE_GUIDE_EDGES = [
  { from: '/depilation/', to: '/guide/depilation/', text: 'Депіляція' },
  { from: '/ru/depilation/', to: '/ru/guide/depilation/', text: 'Депиляция' },
  { from: '/permanent/', to: '/guide/permanent/', text: 'Перманентний макіяж' },
] as const;

/** Строки таблицы раздела карты с ячейками по именам колонок из строки заголовка. */
function mapTable(text: string, section: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${section}`);
  if (start < 0) throw new Error(`${MAP_FILE}: нет раздела «## ${section}»`);

  const rows: string[][] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (!line.trim().startsWith('|')) {
      if (rows.length > 0) break;
      continue;
    }
    rows.push(
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1')),
    );
  }
  const [header, , ...body] = rows;
  if (!header) throw new Error(`${MAP_FILE}: в разделе «## ${section}» нет таблицы`);
  const columns = header.map((name) => name.toLowerCase());
  return body.map((cells) => Object.fromEntries(columns.map((name, index) => [name, cells[index] ?? ''])));
}

interface Edge {
  readonly lang: string;
  readonly from: string;
  readonly fromKind: string;
  readonly to: string;
  readonly anchor: string;
}

function mapEdges(): Edge[] {
  const text = readFileSync(new URL(`../${MAP_FILE}`, import.meta.url), 'utf8');
  const pages = new Map(mapTable(text, 'Pages').map((row) => [`${row.page} ${row.lang}`, row]));
  return mapTable(text, 'Links').flatMap((link) => {
    const from = pages.get(`${link.from} ${link.lang}`);
    const to = pages.get(`${link.to} ${link.lang}`);
    return from && to ? [{ lang: link.lang, from: from.url, fromKind: from.kind, to: to.url, anchor: link.anchor }] : [];
  });
}

/** Сравнение текста ссылки с анкором карты — как у `/seo audit`: trim, пробелы, нижний регистр. */
function anchorForm(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

interface Link {
  readonly href: string;
  readonly text: string;
}

/** Ссылки ответа сервера в порядке разметки: проверяется опубликованный файл (ADR-012). */
async function linksOf(request: APIRequestContext, path: string): Promise<Link[]> {
  const response = await request.get(path);
  expect(response.status(), `${path} не отдаётся`).toBe(200);
  const html = await response.text();
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].flatMap(([, attributes, inner]) => {
    const href = /\bhref="([^"]*)"/.exec(attributes)?.[1];
    return href === undefined ? [] : [{ href, text: htmlToText(inner) }];
  });
}

const built = new Set(allPages.map((page) => page.path));

/** Новые страницы — база знаний и эксперт, когда они собраны. */
const newPages = [...GUIDE_PAGES, ...EXPERT_PAGES].filter((page) => built.has(page.path));

test.describe('рёбра карты на собранных страницах', () => {
  const edges = mapEdges().filter(
    (edge) => FROM_KINDS.has(edge.fromKind) && built.has(edge.from) && built.has(edge.to),
  );
  const sources = [...new Set(edges.map((edge) => edge.from))];

  test('карта даёт рёбра от собранных страниц базы знаний', () => {
    expect(sources.length, `в ${MAP_FILE} нет рёбер между собранными страницами`).toBeGreaterThan(0);
  });

  for (const from of sources) {
    test(`${from}: каждое ребро карты — ссылка с текстом анкора`, async ({ request }) => {
      const links = await linksOf(request, from);
      for (const edge of edges.filter((candidate) => candidate.from === from)) {
        const texts = links.filter((link) => link.href === edge.to).map((link) => anchorForm(link.text));
        expect(texts, `${from} → ${edge.to} «${edge.anchor}»`).toContain(anchorForm(edge.anchor));
      }
    });
  }
});

test.describe('рёбра пилота литералами', () => {
  // Ребро, удалённое из карты, не должно убрать ссылку молча (docs/specs/routes.md §Links from the map).
  for (const { from, to } of PILOT_EDGES) {
    test(`${from} ссылается на ${to}`, async ({ request }) => {
      const links = await linksOf(request, from);
      expect(links.map((link) => link.href)).toContain(to);
    });
  }
});

test.describe('вход в базу знаний со страниц услуг', () => {
  for (const { from, to, text } of SERVICE_GUIDE_EDGES) {
    // Блок после текста страницы услуги, тексты услуг не правятся.
    test(`${from} ссылается на ${to} «${text}» после текста, вне его`, async ({ page }) => {
      await page.goto(from);
      const link = page.locator(`main a[href="${to}"]`);
      await expect(link).toHaveCount(1);
      expect(normalize(await link.innerText())).toBe(text);

      const placed = await link.evaluate((element, copySelector) => {
        const copy = document.querySelector(copySelector)!;
        return {
          inside: copy.contains(element),
          after: Boolean(copy.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      }, SERVICE_COPY_SELECTOR);
      expect(placed).toEqual({ inside: false, after: true });
    });
  }

  // Рёбра карты с этих страниц ведут только на несобранные страницы базы знаний.
  const withGuideLinks = new Set<string>(SERVICE_GUIDE_EDGES.map((edge) => edge.from));
  for (const { path } of servicePages.filter((entry) => !withGuideLinks.has(entry.path))) {
    test(`${path}: ссылок в раздел базы знаний нет`, async ({ request }) => {
      const intoGuide = (await linksOf(request, path)).filter((link) => /^\/(ru\/)?guide\//.test(link.href));
      expect(intoGuide).toEqual([]);
    });
  }
});

test.describe('список статей хаба', () => {
  for (const hub of GUIDE_PAGES.filter((page) => page.kind === 'hub')) {
    const articles = GUIDE_PAGES.filter(
      (page) => page.kind === 'article' && page.locale === hub.locale && page.category === hub.category,
    );

    // Статьи перечисляет список хаба; блок ссылок карты выводит только ребро к услуге (§Placement).
    test(`${hub.path}: каждая статья — одна ссылка, в списке, а не в блоке ссылок`, async ({ page }) => {
      await page.goto(hub.path);
      for (const article of articles) {
        await expect(page.locator(`main a[href="${article.path}"]`), article.path).toHaveCount(1);
        await expect(page.locator(`main aside a[href="${article.path}"]`), article.path).toHaveCount(0);
      }
    });
  }
});

test.describe('внутренние ссылки новых страниц', () => {
  for (const { path } of newPages) {
    test(`${path}: каждая внутренняя ссылка ведёт на собранную страницу в форме со слешем`, async ({
      request,
    }) => {
      const internal = (await linksOf(request, path))
        .map((link) => (link.href.startsWith(SITE_ORIGIN) ? toLocalPath(link.href) : link.href))
        .filter((href) => href.startsWith('/') && !href.startsWith('//'))
        .map((href) => href.replace(/#.*$/, ''));

      expect(internal.length, `${path}: внутренних ссылок нет`).toBeGreaterThan(0);
      const stray = internal.filter((href) => !built.has(href));
      expect(stray, `${path}: ссылки на несобранные адреса или без слеша`).toEqual([]);
    });
  }
});
