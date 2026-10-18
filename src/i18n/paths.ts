import { defaultLocale, locales, type Locale } from './ui';
import { guideLocales, type GuideLocale } from './guide';
import { serviceSubpages, subpageRefs, subpageSlugs, type SubpageRef } from '../data/subpage-registry';

export const serviceCategories = ['massage', 'depilation', 'permanent', 'beauty'] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

/**
 * Набор путей страниц категорий — один на все три языковые версии. Перечисление категорий
 * живёт здесь же, поэтому новая категория появляется во всех локалях сразу или ни в одной.
 */
export function categoryStaticPaths(): { params: { category: ServiceCategory } }[] {
  return serviceCategories.map((category) => ({ params: { category } }));
}

/**
 * Страница услуги — категория или подстраница; путь, альтернативы и состав страницы читают её.
 * `kind` не задан: по нему ссылка отличается от страниц базы знаний и эксперта, а литералы
 * `{ category }` по всему коду остаются без правки.
 */
export type ServicePageRef = (
  | { readonly category: ServiceCategory; readonly subpage?: undefined }
  | SubpageRef
) & { readonly kind?: undefined };

/**
 * Хаб (`article` нет) или статья базы знаний. Языки — свойство набора файлов, а не реестра:
 * их вычисляет `guideIndex()` (src/data/guide.ts) и кладёт сюда, поэтому `paths.ts` остаётся
 * синхронным и не читает коллекцию.
 */
export interface GuidePageRef {
  readonly kind: 'guide';
  readonly category: ServiceCategory;
  readonly article?: string;
  readonly locales: readonly GuideLocale[];
}

export interface ExpertPageRef {
  readonly kind: 'expert';
}

/** Ссылка на любую страницу сайта, кроме главной: у главной ссылки нет (`undefined`). */
export type PageRef = ServicePageRef | GuidePageRef | ExpertPageRef;

/** Пары `{ category, subpage }` для маршрута подстраниц одного языка. */
export function subpageStaticPaths(locale: Locale): { params: SubpageRef }[] {
  return subpageSlugs
    .filter((subpage) => (serviceSubpages[subpage].locales as readonly Locale[]).includes(locale))
    .map((subpage) => ({ params: subpageRefs[subpage] }));
}

/**
 * Языки, на которых страница существует: у главной и категорий — все, у подстраницы — свои,
 * у страницы базы знаний — языки её файлов, у эксперта — языки базы знаний.
 */
export function pageLocales(page?: PageRef): readonly Locale[] {
  if (page?.kind === 'guide') return page.locales;
  if (page?.kind === 'expert') return guideLocales;
  return page?.subpage ? serviceSubpages[page.subpage].locales : locales;
}

/** Префикс раздела локали. Основная локаль живёт на корне — это действующая схема адресов. */
function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? '' : `/${locale}`;
}

/**
 * Путь страницы, всегда с завершающим слешем: сборка выдаёт `<путь>/index.html`,
 * Apache перенаправляет форму без слеша на форму со слешем, и канонический адрес обязан
 * совпадать с конечным — иначе он указывает на перенаправление.
 */
export function pagePath(locale: Locale, page?: PageRef): string {
  const prefix = localePrefix(locale);
  if (page?.kind === 'guide') {
    return `${prefix}/guide/${page.category}/${page.article ? `${page.article}/` : ''}`;
  }
  if (page?.kind === 'expert') return `${prefix}/lada/`;
  const category = page ? `/${page.category}` : '';
  const subpage = page?.subpage ? `/${page.subpage}` : '';
  return `${prefix}${category}${subpage}/`;
}

/**
 * Абсолютный адрес от канонического хоста. Принимает путь, уже приведённый к форме со слешем.
 * Хост берётся из `site` в astro.config.mjs: вторая копия домена разошлась бы с ним молча.
 */
export function absoluteUrl(path: string): string {
  return new URL(path, import.meta.env.SITE).href;
}

export function canonicalUrl(locale: Locale, page?: PageRef): string {
  return absoluteUrl(pagePath(locale, page));
}

export interface LanguageAlternate {
  readonly locale: Locale;
  /** Значение `hreflang`: код языка, не код страны. Код `ua` не употребляется нигде. */
  readonly hreflang: Locale;
  readonly href: string;
}

export interface LanguageAlternates {
  readonly alternates: readonly LanguageAlternate[];
  /**
   * Версия по умолчанию — украинская: она отдаётся на корне и обслуживает всех остальных. Страница
   * базы знаний может быть без украинской версии — тогда это её единственная версия.
   */
  readonly xDefault: string;
}

/**
 * Языковые указания страницы: её языки плюс версия по умолчанию. Адрес одинаков во всех языках,
 * поэтому соответствие вычисляется подстановкой префикса и не требует таблицы — это причина,
 * по которой адреса не локализуются. Языка, на котором страницы нет, в наборе нет: ссылка на
 * чужую страницу не эквивалент, и поисковик счёл бы альтернативу ошибочной.
 */
export function languageAlternates(page?: PageRef): LanguageAlternates {
  const own = pageLocales(page);
  return {
    alternates: own.map((locale) => ({
      locale,
      hreflang: locale,
      href: canonicalUrl(locale, page),
    })),
    xDefault: canonicalUrl(own.includes(defaultLocale) ? defaultLocale : own[0], page),
  };
}
