import { expect, test, type APIRequestContext } from '@playwright/test';
import { allPages, SITE_ORIGIN, toLocalPath } from './support/site';

/**
 * Карта сайта (FR-040, SC-003, SC-014) против собранного сайта.
 *
 * Проверка отвечает на вопрос, который действующий сайт проваливает молча: сегодня запрос
 * `/sitemap.xml` отдаёт HTML главной страницы с кодом 200 (research.md §R15), то есть карта
 * сайта выглядит существующей и не является ею.
 *
 * **Двенадцать из пятнадцати адресов появляются в Step 5.4.** До него проверка объёма падает,
 * показывая три адреса против пятнадцати, — это ожидаемое состояние, а не сбой инструмента.
 */

/** Теги языка в карте сайта — полные, с регионом, в отличие от кода языка в разметке страницы. */
const SITEMAP_HREFLANGS = ['uk-UA', 'ru-UA', 'en'];

const INDEX = '/sitemap-index.xml';

interface SitemapEntry {
  readonly loc: string;
  readonly alternates: { hreflang: string; href: string }[];
}

async function xml(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), `${path} не отдаётся`).toBe(200);
  expect(response.headers()['content-type'], `${path} отдан не как XML`).toContain('xml');
  return response.text();
}

/** Дочерние карты из индекса: интеграция разбивает набор адресов на файлы по мере роста. */
function childSitemaps(index: string): string[] {
  return [...index.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function entriesOf(urlset: string): SitemapEntry[] {
  return [...urlset.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block]) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(block)?.[1] ?? '',
    alternates: [...block.matchAll(/<xhtml:link\b([^>]*)\/>/g)].map(([, attributes]) => ({
      hreflang: /hreflang="([^"]*)"/.exec(attributes)?.[1] ?? '',
      href: /href="([^"]*)"/.exec(attributes)?.[1] ?? '',
    })),
  }));
}

async function allEntries(request: APIRequestContext): Promise<SitemapEntry[]> {
  const index = await xml(request, INDEX);
  const children = childSitemaps(index);
  expect(children.length, 'индекс карты сайта пуст').toBeGreaterThan(0);

  const entries: SitemapEntry[] = [];
  for (const child of children) {
    entries.push(...entriesOf(await xml(request, toLocalPath(child))));
  }
  return entries;
}

test.describe('карта сайта', () => {
  test('отдаётся как XML и перечисляет ровно пятнадцать адресов', async ({ request }) => {
    const entries = await allEntries(request);
    const expected = allPages.map((page) => `${SITE_ORIGIN}${page.path}`).sort();

    expect(
      entries.map((entry) => entry.loc).sort(),
      'страницы категорий создаёт Step 5.4 (T048–T049) — до него в карте только три адреса',
    ).toEqual(expected);
  });

  test('у каждого адреса три языковые альтернативы', async ({ request }) => {
    const entries = await allEntries(request);

    for (const entry of entries) {
      expect(
        entry.alternates.map((alternate) => alternate.hreflang).sort(),
        `языковые альтернативы ${entry.loc}`,
      ).toEqual([...SITEMAP_HREFLANGS].sort());

      // Альтернативы страницы категории ведут на ту же категорию, а не на главную.
      for (const alternate of entry.alternates) {
        expect(alternate.href.startsWith(SITE_ORIGIN), `${alternate.href} — чужой хост`).toBe(true);
      }
    }
  });

  test('ни один адрес карты сайта не отвечает кодом, отличным от 200', async ({ request }) => {
    const entries = await allEntries(request);
    const addresses = new Set(entries.flatMap((entry) => [entry.loc, ...entry.alternates.map((alternate) => alternate.href)]));

    for (const address of addresses) {
      const response = await request.get(toLocalPath(address), { maxRedirects: 0 });
      expect(response.status(), `${address} из карты сайта`).toBe(200);
    }
  });
});
