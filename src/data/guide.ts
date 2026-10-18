import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { guideLocales, isGuideLocale, type GuideLocale } from '../i18n/guide';
import { pagePath, serviceCategories, type GuidePageRef, type ServiceCategory } from '../i18n/paths';
import { parseSeoMap, type SeoMap } from './seo-map';

export type GuideEntry = CollectionEntry<'guide'>;

/** Страница базы знаний: её версии — записи с одним путём `<category>/<article>` на разных языках. */
export interface GuidePage {
  readonly ref: GuidePageRef;
  readonly entries: Partial<Record<GuideLocale, GuideEntry>>;
}

export interface GuideIndex {
  readonly pages: readonly GuidePage[];
  /** Разобранная карта, с которой сверены все файлы раздела (остановки 10–12). */
  readonly map: SeoMap;
  hubOf(locale: GuideLocale, category: ServiceCategory): GuidePage | undefined;
  /** Статьи категории языка: новые выше, при равной дате — по заголовку. */
  articlesOf(locale: GuideLocale, category: ServiceCategory): readonly GuideEntry[];
  /** Все статьи языка в том же порядке — для страницы эксперта. */
  articles(locale: GuideLocale): readonly GuideEntry[];
  /** Собранные адреса раздела на языке. */
  pathsOf(locale: GuideLocale): readonly string[];
  /** Запись страницы на языке; страницы на нём нет — исключение: маршрут её бы не собрал. */
  entryOf(locale: GuideLocale, ref: GuidePageRef): GuideEntry;
  /** Ссылка на страницу записи — для адреса статьи в списках хаба и эксперта. */
  refOf(entry: GuideEntry): GuidePageRef;
}

const BASE = 'src/content/guide/';
const MAP_FILE = 'docs/seo/map.md';
const ARTICLE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface Located {
  readonly entry: GuideEntry;
  readonly file: string;
  readonly locale: GuideLocale;
  readonly category: ServiceCategory;
  readonly article?: string;
  /** Путь страницы без языка: версии одной страницы сопоставляются по нему (ADR-008). */
  readonly key: string;
}

function isServiceCategory(value: string): value is ServiceCategory {
  return (serviceCategories as readonly string[]).includes(value);
}

const byFile = (a: { file: string }, b: { file: string }) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0);

/**
 * Язык, категория и slug — из пути файла, а не из `entry.id`: идентификатор прошёл через
 * `github-slugger`, и файл `Vs-Epilation.md` получил бы адрес, которого в имени файла нет.
 * Проверки 3–5 идут каждая по всем файлам, чтобы первая сработавшая не зависела от порядка
 * загрузки (specs/007-knowledge-base-pilot/contracts/content-files.md §Build stops).
 */
function locate(entries: readonly GuideEntry[]): Located[] {
  const files = entries
    .map((entry) => {
      const file = entry.filePath ?? `${BASE}${entry.id}.md`;
      return { entry, file, segments: file.slice(BASE.length).replace(/\.md$/, '').split('/') };
    })
    .sort(byFile);

  for (const { file, segments } of files) {
    const article = segments[2];
    if (segments.length < 2 || segments.length > 3 || (article !== undefined && !ARTICLE_SLUG.test(article))) {
      throw new Error(`${file}: путь не хаба и не статьи базы знаний`);
    }
  }
  for (const { file, segments } of files) {
    if (!isGuideLocale(segments[0])) throw new Error(`${file}: язык «${segments[0]}» в базе знаний не публикуется`);
  }
  for (const { file, segments } of files) {
    if (!isServiceCategory(segments[1])) throw new Error(`${file}: категории «${segments[1]}» нет`);
  }

  return files
    .map(({ entry, file, segments: [locale, category, article] }) => ({
      entry,
      file,
      locale: locale as GuideLocale,
      category: category as ServiceCategory,
      ...(article ? { article } : {}),
      key: article ? `${category}/${article}` : category,
    }))
    .sort((a, b) => guideLocales.indexOf(a.locale) - guideLocales.indexOf(b.locale) || byFile(a, b));
}

/** Остановки 6–9: связи между файлами, которые схема одной записи не видит. */
function checkPages(located: readonly Located[]): void {
  const inLocale = new Map<string, Located>();
  for (const item of located) {
    const { page } = item.entry.data;
    const other = inLocale.get(`${item.locale} ${page}`);
    if (other) throw new Error(`${other.file} и ${item.file}: page «${page}» повторяется в языке ${item.locale}`);
    inLocale.set(`${item.locale} ${page}`, item);
  }

  // Версии сопоставляются по общему адресу (ADR-008): страница на двух адресах дала бы две
  // одноязычные страницы без пары `hreflang`, и сборка прошла бы молча.
  const byPage = new Map<string, Located>();
  for (const item of located) {
    const first = byPage.get(item.entry.data.page);
    if (first && first.key !== item.key) {
      throw new Error(`${first.file} и ${item.file}: версии страницы «${item.entry.data.page}» лежат по разным адресам`);
    }
    if (!first) byPage.set(item.entry.data.page, item);
  }
  const byKey = new Map<string, Located>();
  for (const item of located) {
    const first = byKey.get(item.key);
    if (first && first.entry.data.page !== item.entry.data.page) {
      throw new Error(`${first.file} и ${item.file}: версии страницы «${first.entry.data.page}» лежат по разным адресам`);
    }
    if (!first) byKey.set(item.key, item);
  }

  const hubKeys = new Set(located.filter((item) => !item.article).map((item) => `${item.locale} ${item.category}`));
  for (const item of located) {
    if (item.article && !hubKeys.has(`${item.locale} ${item.category}`)) {
      throw new Error(`${item.file}: нет хаба ${BASE}${item.locale}/${item.category}.md`);
    }
  }
  for (const hub of located.filter((item) => !item.article)) {
    const hasArticle = located.some(
      (item) => item.article && item.locale === hub.locale && item.category === hub.category,
    );
    if (!hasArticle) throw new Error(`${hub.file}: у хаба нет ни одной статьи языка ${hub.locale}`);
  }
}

/** Карту пишет `/seo map`; сборка читает её от корня проекта — так же её читает `tests/links.spec.ts`. */
async function readMap(): Promise<SeoMap> {
  let text: string;
  try {
    text = await readFile(join(process.cwd(), MAP_FILE), 'utf8');
  } catch (error) {
    throw new Error(`${MAP_FILE}: файл карты не прочитан — ${(error as Error).message}`, { cause: error });
  }
  return parseSeoMap(text);
}

/** Остановки 10–11: файл раздела обязан совпасть со строкой §Pages, статья — иметь ребро от хаба. */
function checkMap(located: readonly Located[], pages: readonly GuidePage[], map: SeoMap): void {
  for (const item of located) {
    const { page } = item.entry.data;
    const ref = pages.find((candidate) => candidate.entries[item.locale] === item.entry)!.ref;
    const path = pagePath(item.locale, ref);
    const row = map.pages.find((candidate) => candidate.page === page && candidate.lang === item.locale);
    if (row?.url !== path) {
      throw new Error(
        `${item.file}: page «${page}» (${item.locale}) в ${MAP_FILE} §Pages ` +
          `${row ? `с адресом ${row.url}` : 'нет'}, файл даёт ${path}`,
      );
    }
  }

  // Без ребра «хаб → статья» хаб не смог бы перечислить статью анкором карты (contracts/links.md).
  for (const item of located.filter((candidate) => candidate.article)) {
    const hub = located.find(
      (candidate) => !candidate.article && candidate.locale === item.locale && candidate.category === item.category,
    )!.entry.data.page;
    const { page } = item.entry.data;
    if (!map.links.some((link) => link.from === hub && link.to === page && link.lang === item.locale)) {
      throw new Error(`${item.file}: в ${MAP_FILE} §Links нет строки ${hub} → ${page} (${item.locale})`);
    }
  }
}

function groupPages(located: readonly Located[]): GuidePage[] {
  const keys = [...new Set(located.map((item) => item.key))].sort();
  return keys.map((key) => {
    const versions = located.filter((item) => item.key === key);
    const { category, article } = versions[0];
    const entries: Partial<Record<GuideLocale, GuideEntry>> = Object.fromEntries(
      versions.map((item) => [item.locale, item.entry]),
    );
    return {
      ref: {
        kind: 'guide',
        category,
        ...(article ? { article } : {}),
        locales: guideLocales.filter((locale) => entries[locale]),
      },
      entries,
    };
  });
}

function newestFirst(locale: GuideLocale) {
  return (a: GuideEntry, b: GuideEntry) =>
    b.data.published.getTime() - a.data.published.getTime() || a.data.heading.localeCompare(b.data.heading, locale);
}

/**
 * Проверки идут в порядке контракта: форма пути, язык и категория, повтор `page`, общий адрес
 * версий, пары хаб/статья, разбор карты (№ 12 — первая из остановок карты), соответствие карте.
 * Сверять файлы с картой, которую не удалось разобрать, нечего.
 */
async function buildIndex(): Promise<GuideIndex> {
  const located = locate(await getCollection('guide'));
  checkPages(located);
  const map = await readMap();
  const pages = groupPages(located);
  checkMap(located, pages, map);

  const articleEntries = (locale: GuideLocale, category?: ServiceCategory) =>
    located
      .filter((item) => item.article && item.locale === locale && (!category || item.category === category))
      .map((item) => item.entry)
      .sort(newestFirst(locale));

  const refs = new Map(
    pages.flatMap((page) => Object.values(page.entries).map((entry) => [entry, page.ref] as const)),
  );

  return {
    pages,
    map,
    hubOf: (locale, category) =>
      pages.find((page) => !page.ref.article && page.ref.category === category && page.entries[locale]),
    articlesOf: (locale, category) => articleEntries(locale, category),
    articles: (locale) => articleEntries(locale),
    pathsOf: (locale) => pages.filter((page) => page.entries[locale]).map((page) => pagePath(locale, page.ref)),
    entryOf: (locale, ref) => {
      const entry = pages.find(
        (page) => page.ref.category === ref.category && page.ref.article === ref.article,
      )?.entries[locale];
      if (!entry) throw new Error(`в базе знаний нет страницы ${pagePath(locale, ref)}`);
      return entry;
    },
    refOf: (entry) => {
      const ref = refs.get(entry);
      if (!ref) throw new Error(`${entry.filePath ?? entry.id}: запись не из индекса базы знаний`);
      return ref;
    },
  };
}

let cached: Promise<GuideIndex> | undefined;

/**
 * Индекс базы знаний. Его зовут маршруты раздела, страница эксперта, блок ссылок карты и заголовочная
 * часть, поэтому любая сборка проходит через проверки; промис один на модуль, и коллекция с картой
 * читаются один раз.
 */
export function guideIndex(): Promise<GuideIndex> {
  cached ??= buildIndex();
  return cached;
}

/** Пути маршрута `[...slug]` языка: хаб — `<category>`, статья — `<category>/<article>`. */
export async function guideStaticPaths(
  locale: GuideLocale,
): Promise<{ params: { slug: string }; props: { page: GuidePageRef } }[]> {
  const { pages } = await guideIndex();
  return pages
    .filter((page) => page.entries[locale])
    .map(({ ref }) => ({
      params: { slug: ref.article ? `${ref.category}/${ref.article}` : ref.category },
      props: { page: ref },
    }));
}
