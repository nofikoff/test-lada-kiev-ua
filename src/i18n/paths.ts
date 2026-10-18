import { defaultLocale, locales, type Locale } from './ui';
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

/** Страница услуги — категория или подстраница; путь, альтернативы и состав страницы читают её. */
export type ServicePageRef =
  | { readonly category: ServiceCategory; readonly subpage?: undefined }
  | SubpageRef;

/** Пары `{ category, subpage }` для маршрута подстраниц одного языка. */
export function subpageStaticPaths(locale: Locale): { params: SubpageRef }[] {
  return subpageSlugs
    .filter((subpage) => (serviceSubpages[subpage].locales as readonly Locale[]).includes(locale))
    .map((subpage) => ({ params: subpageRefs[subpage] }));
}

/** Языки, на которых страница существует: у главной и категорий — все, у подстраницы — свои. */
export function pageLocales(page?: ServicePageRef): readonly Locale[] {
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
export function pagePath(locale: Locale, page?: ServicePageRef): string {
  const category = page ? `/${page.category}` : '';
  const subpage = page?.subpage ? `/${page.subpage}` : '';
  return `${localePrefix(locale)}${category}${subpage}/`;
}

/**
 * Абсолютный адрес от канонического хоста. Принимает путь, уже приведённый к форме со слешем.
 * Хост берётся из `site` в astro.config.mjs: вторая копия домена разошлась бы с ним молча.
 */
export function absoluteUrl(path: string): string {
  return new URL(path, import.meta.env.SITE).href;
}

export function canonicalUrl(locale: Locale, page?: ServicePageRef): string {
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
  /** Версия по умолчанию — всегда украинская: она отдаётся на корне и обслуживает всех остальных. */
  readonly xDefault: string;
}

/**
 * Языковые указания страницы: её языки плюс версия по умолчанию. Адрес одинаков во всех языках,
 * поэтому соответствие вычисляется подстановкой префикса и не требует таблицы — это причина,
 * по которой адреса не локализуются. Языка, на котором страницы нет, в наборе нет: ссылка на
 * чужую страницу не эквивалент, и поисковик счёл бы альтернативу ошибочной.
 */
export function languageAlternates(page?: ServicePageRef): LanguageAlternates {
  return {
    alternates: pageLocales(page).map((locale) => ({
      locale,
      hreflang: locale,
      href: canonicalUrl(locale, page),
    })),
    xDefault: canonicalUrl(defaultLocale, page),
  };
}
