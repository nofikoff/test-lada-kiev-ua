import { defaultLocale, locales, type Locale } from './ui';

/**
 * Канонический хост. С `www`: адрес без него отвечает постоянным перенаправлением,
 * поэтому объявленный сайтом адрес обязан быть уже конечным (contracts/routes.md).
 */
export const SITE_ORIGIN = 'https://www.lada.kiev.ua';

export const serviceCategories = ['massage', 'depilation', 'permanent', 'beauty'] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

/** Префикс раздела локали. Основная локаль живёт на корне — это действующая схема адресов. */
function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? '' : `/${locale}`;
}

/**
 * Путь страницы, всегда с завершающим слешем: сборка выдаёт `<путь>/index.html`,
 * Apache перенаправляет форму без слеша на форму со слешем, и канонический адрес обязан
 * совпадать с конечным — иначе он указывает на перенаправление.
 */
export function pagePath(locale: Locale, category?: ServiceCategory): string {
  const prefix = localePrefix(locale);
  const segment = category ? `/${category}` : '';
  return `${prefix}${segment}/`;
}

/** Абсолютный адрес от канонического хоста. Принимает путь, уже приведённый к форме со слешем. */
export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_ORIGIN}/`).href;
}

export function canonicalUrl(locale: Locale, category?: ServiceCategory): string {
  return absoluteUrl(pagePath(locale, category));
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
 * Полный набор языковых указаний страницы: три локали плюс версия по умолчанию.
 * Адрес категории одинаков во всех языках, поэтому соответствие вычисляется подстановкой
 * префикса и не требует таблицы — это причина, по которой адреса не локализуются.
 */
export function languageAlternates(category?: ServiceCategory): LanguageAlternates {
  return {
    alternates: locales.map((locale) => ({
      locale,
      hreflang: locale,
      href: canonicalUrl(locale, category),
    })),
    xDefault: canonicalUrl(defaultLocale, category),
  };
}
