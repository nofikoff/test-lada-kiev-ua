import { isoDay, type GuideLocale } from '../i18n/guide';
import { canonicalUrl, type ExpertPageRef, type GuidePageRef } from '../i18n/paths';
import { ui } from '../i18n/ui';
import { expertCopy } from './expert';
import { founderNode } from './founder';
import { guideIndex } from './guide';

/**
 * JSON-LD хаба, статьи и страницы эксперта по specs/007-knowledge-base-pilot/contracts/page-head-and-jsonld.md
 * §Article, §Hub, §Expert. Узла организации здесь нет: автор, издатель и предмет страницы эксперта —
 * узлы главной своего языка по `@id`, поэтому «тот же человек» и «та же студия» проверяются
 * равенством строк. К узлу основательницы добавлен `url` страницы эксперта: узлы с одним `@id`
 * поисковик сливает, и главной это не противоречит (research.md R7).
 */

const EXPERT: ExpertPageRef = { kind: 'expert' };

interface ListItem {
  readonly name: string;
  readonly item: string;
}

function breadcrumbList(steps: readonly ListItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, ...step })),
  };
}

/**
 * Граф страницы базы знаний: `Article` или `CollectionPage` и крошки, которые повторяют видимые.
 * `image` — адрес превью страницы, тот же, что в `og:image`.
 */
export async function guideGraph(locale: GuideLocale, page: GuidePageRef, image: string) {
  const index = await guideIndex();
  const entry = index.entryOf(locale, page);
  const canonical = canonicalUrl(locale, page);
  const home = canonicalUrl(locale);
  const t = ui[locale];

  if (!page.article) {
    const collection = {
      '@type': 'CollectionPage',
      '@id': `${canonical}#page`,
      name: entry.data.heading,
      description: entry.data.description,
      url: canonical,
      inLanguage: locale,
      // Порядок — порядок списка хаба: тот же `articlesOf`.
      hasPart: index.articlesOf(locale, page.category).map((article) => {
        const url = canonicalUrl(locale, index.refOf(article));
        return { '@type': 'Article', '@id': `${url}#article`, headline: article.data.heading, url };
      }),
    };
    return {
      '@context': 'https://schema.org',
      '@graph': [
        collection,
        breadcrumbList([
          { name: t.nav.home, item: home },
          { name: entry.data.heading, item: canonical },
        ]),
      ],
    };
  }

  // Хаб языка у статьи есть всегда: без него сборка остановлена (остановка № 8, src/data/guide.ts).
  const hub = index.hubOf(locale, page.category)!;
  const founder = await founderNode(locale);
  const article = {
    '@type': 'Article',
    '@id': `${canonical}#article`,
    headline: entry.data.heading,
    description: entry.data.description,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: locale,
    datePublished: isoDay(entry.data.published),
    dateModified: isoDay(entry.data.modified),
    image,
    author: {
      '@type': founder['@type'],
      '@id': founder['@id'],
      name: founder.name,
      url: canonicalUrl(locale, EXPERT),
    },
    publisher: {
      '@type': 'HealthAndBeautyBusiness',
      '@id': `${home}#business`,
      name: t.meta.siteName,
      url: home,
    },
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      article,
      breadcrumbList([
        { name: t.nav.home, item: home },
        { name: index.entryOf(locale, hub.ref).data.heading, item: canonicalUrl(locale, hub.ref) },
        { name: entry.data.heading, item: canonical },
      ]),
    ],
  };
}

/** Граф страницы эксперта: `ProfilePage` об основательнице. Крошек у страницы нет. */
export async function expertGraph(locale: GuideLocale) {
  const entry = await expertCopy(locale);
  const canonical = canonicalUrl(locale, EXPERT);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${canonical}#page`,
        name: entry.data.heading,
        url: canonical,
        inLanguage: locale,
        mainEntity: { ...(await founderNode(locale)), url: canonical },
      },
    ],
  };
}
