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

export interface PageUnderTest {
  readonly locale: Locale;
  readonly path: string;
}

/**
 * Страницы уровня MVP. Двенадцать страниц категорий появляются в Step 5.4 и дописываются
 * сюда же вместе с проверками Step 5.1 — до тех пор их адреса отвечают 404 честно.
 */
export const homePages: readonly PageUnderTest[] = [
  { locale: 'uk', path: '/' },
  { locale: 'ru', path: '/ru/' },
  { locale: 'en', path: '/en/' },
];

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
  price: PriceValue;
}

export function readPrices(): PriceRecord[] {
  return JSON.parse(repoFile('src/data/prices.json')) as PriceRecord[];
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
