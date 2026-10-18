import type { GuideLocale } from '../i18n/guide';
import { pagePath, serviceCategories, subpageStaticPaths } from '../i18n/paths';
import { guideIndex } from './guide';
import { linksFrom, type PageLink } from './seo-map';

/**
 * Рёбра карты от страницы `path` к собранным страницам её языка: разделу базы знаний из индекса,
 * страницам услуг и странице эксперта (docs/specs/routes.md §Links from the map).
 * Файл карты здесь не читается — его прочитал и сверил с контентом `guideIndex()`.
 */
export async function pageLinks(locale: GuideLocale, path: string): Promise<readonly PageLink[]> {
  const index = await guideIndex();
  const built = new Set([
    ...index.pathsOf(locale),
    ...serviceCategories.map((category) => pagePath(locale, { category })),
    ...subpageStaticPaths(locale).map(({ params }) => pagePath(locale, params)),
    pagePath(locale, { kind: 'expert' }),
  ]);
  return linksFrom(index.map, locale, path, built);
}
