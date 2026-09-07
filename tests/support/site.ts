/**
 * Общая часть сквозных проверок: адреса страниц, приведение HTML к тексту и факты о прайсе.
 *
 * Канонический хост и состав страниц объявлены здесь литералами намеренно. Проверка контракта,
 * читающая те же константы, что и реализация, проверяет только внутреннюю непротиворечивость —
 * смена хоста в `src/i18n/paths.ts` прошла бы мимо неё (contracts/routes.md).
 */
import { readFileSync } from 'node:fs';

export const LOCALES = ['uk', 'ru', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const SITE_ORIGIN = 'https://www.lada.kiev.ua';

/** Хост без `www` отвечает постоянным перенаправлением, поэтому в разметке его быть не должно. */
export const APEX_ORIGIN = 'https://lada.kiev.ua';

export const ANALYTICS_ID = 'G-WZT8TJLSDP';

export const PHONE = '+380995570045';

export const INSTAGRAM = 'https://www.instagram.com/massage.ln.kyiv/';

export const SERVICE_CATEGORIES = ['massage', 'depilation', 'permanent', 'beauty'] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface PageUnderTest {
  readonly locale: Locale;
  readonly path: string;
}

export interface CategoryPageUnderTest extends PageUnderTest {
  readonly category: ServiceCategory;
}

export const homePages: readonly PageUnderTest[] = [
  { locale: 'uk', path: '/' },
  { locale: 'ru', path: '/ru/' },
  { locale: 'en', path: '/en/' },
];

/** Префикс раздела локали; основная локаль живёт на корне — это действующая схема адресов. */
function localePrefix(locale: Locale): string {
  return locale === 'uk' ? '' : `/${locale}`;
}

/**
 * Двенадцать страниц категорий: четыре категории × три локали. Адрес категории одинаков во всех
 * языках, поэтому соответствие языковых версий вычисляется подстановкой префикса
 * (contracts/page-head.md §Правила языковых альтернатив).
 *
 * Сами страницы создаёт **Step 5.4**; до него все двенадцать адресов отвечают 404, и проверки
 * ниже падают на первой же строке с указанием на этот шаг — это ожидаемое состояние, а не сбой.
 */
export const categoryPages: readonly CategoryPageUnderTest[] = LOCALES.flatMap((locale) =>
  SERVICE_CATEGORIES.map((category) => ({
    locale,
    category,
    path: `${localePrefix(locale)}/${category}/`,
  })),
);

/** Пятнадцать страниц сайта: три языковые версии главной и двенадцать страниц категорий. */
export const allPages: readonly PageUnderTest[] = [...homePages, ...categoryPages];

/**
 * Файлы страниц ошибок. Адресами они не являются — сервер отдаёт их на месте запрошенного, —
 * поэтому здесь пути сборки, а не маршруты: корневая живёт в `404.html` (Astro выносит её на
 * корень независимо от формы адресов), страницы разделов подчиняются `build.format: 'directory'`.
 */
export const errorPages: Record<Locale, string> = {
  uk: '/404.html',
  ru: '/ru/404/index.html',
  en: '/en/404/index.html',
};

/**
 * Восемнадцать собранных страниц: пятнадцать адресуемых плюс три страницы ошибок. Свойства
 * самого документа — заголовки, язык, разметка — проверяются по этому списку: страница ошибки
 * такой же собранный файл, и дефект структуры в ней ничем не лучше.
 */
export const builtPages: readonly PageUnderTest[] = [
  ...allPages,
  ...LOCALES.map((locale) => ({ locale, path: errorPages[locale] })),
];

/**
 * Контейнер текста страницы категории. Объём и уникальность текста (T044, FR-017) считаются
 * по нему, а не по всей странице: прайс и подвал набрали бы четыреста слов сами по себе,
 * и проверка прошла бы на странице вообще без описания услуги.
 *
 * Step 5.4 обязан пометить этим атрибутом контейнер, в который выводится текст из коллекции.
 */
export const SERVICE_COPY_SELECTOR = '[data-service-copy]';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  copy: '©',
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Текст страницы из ответа сервера, без исполнения скриптов: проверяется опубликованный файл,
 * а не результат работы браузера (research.md §R13). Поэтому же не годится `innerText` —
 * он не видит блоков, скрытых вкладками, и сверка полноты прошла бы мимо трёх четвертей прайса.
 */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped);
}

/** Пробелы и типографские кавычки приводятся к одной форме с обеих сторон сравнения. */
export function normalize(value: string): string {
  return value
    .replace(/[‘’ʼ′`´]/g, "'")
    .replace(/[“”„«»″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function repoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

export function readLegacyFixture(): Record<Locale, string[]> {
  return JSON.parse(repoFile('tests/fixtures/legacy-content.json')) as Record<Locale, string[]>;
}

type PriceValue =
  | { kind: 'fixed'; amount: number }
  | { kind: 'variants'; unit: 'minutes' | 'sessions'; variants: { count: number; amount: number }[] }
  | { kind: 'share'; percent: number };

interface PriceRecord {
  id: string;
  group: string;
  name: Record<Locale, string>;
  price: PriceValue;
}

export function readPrices(): PriceRecord[] {
  return JSON.parse(repoFile('src/data/prices.json')) as PriceRecord[];
}

/**
 * Связь группы прайса с категорией по [data-model.md] §Группа прайса. Копия таблицы модели,
 * а не импорт из `src/`: проверка, читающая ту же таблицу, что и реализация, проверяет
 * внутреннюю непротиворечивость, а не соответствие модели.
 */
const GROUP_CATEGORY: Record<string, ServiceCategory> = {
  fullBodyMassage: 'massage',
  localMassage: 'massage',
  exotic: 'massage',
  womenDepilation: 'depilation',
  combos: 'depilation',
  menDepilation: 'depilation',
  permanentBrows: 'permanent',
  permanentLips: 'permanent',
  permanentEyeliner: 'permanent',
  browsLashes: 'beauty',
  makeupHair: 'beauty',
};

/**
 * Сколько предложений обязано быть в машиночитаемом описании категории: позиция с фиксированной
 * ценой даёт одно, позиция с вариантами — по одному на вариант, долевая не даёт ни одного
 * (contracts/structured-data.md §Предложение).
 */
export function expectedOfferCount(category: ServiceCategory): number {
  return readPrices()
    .filter((record) => GROUP_CATEGORY[record.group] === category)
    .reduce((sum, record) => {
      if (record.price.kind === 'fixed') return sum + 1;
      if (record.price.kind === 'variants') return sum + record.price.variants.length;
      return sum;
    }, 0);
}

/**
 * Фактический диапазон прайса. Долевые позиции не участвуют: доля не сумма, а нулевой суммой
 * она превращается в бесплатную услугу (contracts/structured-data.md).
 */
export function priceRange(): { min: number; max: number } {
  const amounts: number[] = [];
  for (const record of readPrices()) {
    if (record.price.kind === 'fixed') amounts.push(record.price.amount);
    if (record.price.kind === 'variants') {
      for (const variant of record.price.variants) amounts.push(variant.amount);
    }
  }
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

/** Абсолютный адрес собственного сайта → путь, по которому его можно запросить у сборки. */
export function toLocalPath(absoluteUrl: string): string {
  return absoluteUrl.slice(SITE_ORIGIN.length) || '/';
}
