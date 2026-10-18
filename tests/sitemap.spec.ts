import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  allPages,
  barePath,
  localesOf,
  pathIn,
  SITE_ORIGIN,
  toLocalPath,
  type Locale,
} from './support/site';

/**
 * Карта сайта (docs/specs/routes.md §Route map) против собранного сайта.
 *
 * Проверка отвечает на вопрос, который сайт до миграции проваливал молча: запрос `/sitemap.xml`
 * отдавал HTML главной страницы с кодом 200, то есть карта сайта выглядела существующей и не
 * являлась ею.
 */

/** Теги языка в карте сайта — полные, с регионом, в отличие от кода языка в разметке страницы. */
const SITEMAP_HREFLANG: Record<Locale, string> = { uk: 'uk-UA', ru: 'ru-UA', en: 'en' };

const PAGE_BY_ADDRESS = new Map(allPages.map((page) => [`${SITE_ORIGIN}${page.path}`, page]));

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
  test('отдаётся как XML и перечисляет ровно адреса страниц сайта', async ({ request }) => {
    const entries = await allEntries(request);
    const expected = allPages.map((page) => `${SITE_ORIGIN}${page.path}`).sort();

    expect(
      entries.map((entry) => entry.loc).sort(),
      'адреса карты сайта против списка страниц сайта',
    ).toEqual(expected);
  });

  /**
   * Альтернативы — по одной на каждый язык страницы и на ту же страницу этого языка. У страницы
   * на одном языке альтернатив нет: так ведёт себя `@astrojs/sitemap` (docs/specs/routes.md §Route map).
   */
  test('у каждого адреса альтернативы ровно его языков, у одноязычной страницы — ни одной', async ({
    request,
  }) => {
    const entries = await allEntries(request);

    for (const entry of entries) {
      const page = PAGE_BY_ADDRESS.get(entry.loc);
      expect(page, `${entry.loc} нет среди страниц сайта`).toBeDefined();

      const own = localesOf(page!);
      const bare = barePath(page!.path);
      const expected =
        own.length > 1
          ? own.map((locale) => [SITEMAP_HREFLANG[locale], `${SITE_ORIGIN}${pathIn(locale, bare)}`])
          : [];

      // Альтернативы страницы категории ведут на ту же категорию, а не на главную.
      expect(
        entry.alternates.map((alternate) => [alternate.hreflang, alternate.href]).sort(),
        `языковые альтернативы ${entry.loc}`,
      ).toEqual(expected.sort());
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
