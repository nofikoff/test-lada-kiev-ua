import { defaultLocale, locales, type Locale } from './ui';
import { categoryOf, type PriceGroup } from '../data/price-groups';

export const serviceCategories = ['massage', 'depilation', 'permanent', 'beauty'] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

/**
 * Набор путей страниц категорий — один на все три языковые версии. Перечисление категорий
 * живёт здесь же, поэтому новая категория появляется во всех локалях сразу или ни в одной.
 */
export function categoryStaticPaths(): { params: { category: ServiceCategory } }[] {
  return serviceCategories.map((category) => ({ params: { category } }));
}

/** Цена позиции, которую показывает страница: общая или пастой (data-model §Price item пакета 006). */
export type PriceMethod = 'base' | 'sugar';

interface SubpageDefinition {
  readonly parent: ServiceCategory;
  readonly locales: readonly Locale[];
  readonly groups: readonly PriceGroup[];
  readonly method: PriceMethod;
}

/**
 * Подстраницы услуг — единственное место, где подстраница существует: путь, языковые
 * альтернативы, маршруты и схема текстов выводятся отсюда (ADR-028). Языки — те, на которых
 * кластер есть в ядре, поэтому их набор у подстраницы свой, а не общий с категориями.
 */
export const serviceSubpages = {
  sugaring: {
    parent: 'depilation',
    locales: ['uk', 'ru'],
    // Группы триммера и бритвы не читаются: пасты в них нет.
    groups: ['womenDepilation', 'combos', 'menDepilation', 'menCombos'],
    method: 'sugar',
  },
  brows: {
    parent: 'permanent',
    locales: ['uk', 'ru'],
    groups: ['permanentBrows'],
    method: 'base',
  },
} as const satisfies Record<string, SubpageDefinition>;

export type ServiceSubpage = keyof typeof serviceSubpages;

export const subpageSlugs = Object.keys(serviceSubpages) as [ServiceSubpage, ...ServiceSubpage[]];

/**
 * Связи, которые тип не выражает, проверяются при загрузке модуля и роняют сборку: группа чужой
 * категории показала бы на подстранице прайс другой услуги, а подстраница без украинской версии
 * осталась бы без `x-default`.
 */
for (const subpage of subpageSlugs) {
  const definition: SubpageDefinition = serviceSubpages[subpage];
  for (const group of definition.groups) {
    if (categoryOf(group) !== definition.parent) {
      throw new Error(
        `подстраница «${subpage}»: группа прайса «${group}» принадлежит категории ` +
          `«${categoryOf(group)}», а не «${definition.parent}»`,
      );
    }
  }
  if (!definition.locales.includes(defaultLocale)) {
    throw new Error(
      `подстраница «${subpage}»: нет языка «${defaultLocale}», а он — версия по умолчанию (x-default)`,
    );
  }
}

type SubpageRefOf = {
  [S in ServiceSubpage]: {
    readonly category: (typeof serviceSubpages)[S]['parent'];
    readonly subpage: S;
  };
};

/** Ссылка на подстраницу: категория в ней — всегда её родитель, другой тип не допускает. */
export type SubpageRef = SubpageRefOf[ServiceSubpage];

/**
 * The only place that creates `SubpageRef` values. TypeScript cannot correlate a registry key with
 * its parent inside a generic function (the pair widens to a union), so each ref is written out and
 * `satisfies` makes the compiler hold both halves: every registry entry needs a ref here, and a ref
 * pairing a slug with a foreign parent does not compile.
 */
const subpageRefs = {
  sugaring: { category: serviceSubpages.sugaring.parent, subpage: 'sugaring' },
  brows: { category: serviceSubpages.brows.parent, subpage: 'brows' },
} satisfies SubpageRefOf;

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
