/**
 * Общая часть сквозных проверок: адреса страниц, приведение HTML к тексту и факты о прайсе.
 *
 * Канонический хост и состав страниц объявлены здесь литералами намеренно. Проверка контракта,
 * читающая те же константы, что и реализация, проверяет только внутреннюю непротиворечивость —
 * смена хоста в `site` из `astro.config.mjs` прошла бы мимо неё (docs/specs/routes.md
 * §Канонический хост).
 */
import { readFileSync } from 'node:fs';

export const LOCALES = ['uk', 'ru', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const SITE_ORIGIN = 'https://www.lada.kiev.ua';

/** Хост без `www` отвечает постоянным перенаправлением, поэтому в разметке его быть не должно. */
export const APEX_ORIGIN = 'https://lada.kiev.ua';

export const ANALYTICS_ID = 'G-WZT8TJLSDP';

export const PHONE = '+380995570045';

export const INSTAGRAM = 'https://www.instagram.com/lada_n_kyiv/';

/** Карточка студии в Google Картах (Google Business): идентификатор места из её адреса. */
export const GOOGLE_MAPS_PLACE = '0x40d4cfc47fcb8ed9:0x402f20aba16ffbaa';

export const SERVICE_CATEGORIES = ['massage', 'depilation', 'permanent', 'beauty'] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export type GalleryCategory = Extract<ServiceCategory, 'massage' | 'depilation' | 'beauty'>;

/**
 * Состав и порядок ленты работ на главной. Записаны литералами, а не прочитаны из
 * `src/data/gallery.json`, по тому же доводу, что и хост выше.
 */
export const GALLERY_STRIP: readonly { id: string; category?: GalleryCategory }[] = [
  { id: 'lada-novikova-brows-client', category: 'beauty' },
  { id: 'lada-novikova-sugaring', category: 'depilation' },
  { id: 'massage-room', category: 'massage' },
  { id: 'lada-novikova-brow-tint', category: 'beauty' },
  { id: 'anti-cellulite-before-after', category: 'massage' },
  { id: 'sugaring-close-up', category: 'depilation' },
  { id: 'lada-novikova-makeup-client', category: 'beauty' },
  { id: 'massage-tools', category: 'massage' },
  { id: 'depilation-wax-beads', category: 'depilation' },
  { id: 'disposable-tools' },
  { id: 'lada-novikova-certificate' },
  { id: 'makeup-station' },
  { id: 'studio-terrace' },
];

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
 * (docs/specs/page-head.md §Языковые альтернативы).
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
 * Контейнер текста страницы категории. Объём и уникальность текста считаются по нему, а не по
 * всей странице: прайс и подвал набрали бы четыреста слов сами по себе, и проверка прошла бы на
 * странице вообще без описания услуги (docs/specs/content-model.md §Страница категории).
 *
 * Шаблон страницы категории обязан пометить этим атрибутом контейнер, в который выводится текст
 * из коллекции.
 */
export const SERVICE_COPY_SELECTOR = '[data-service-copy]';

/** Контейнер тела обращения Лады в «Про нас»: подпись и заголовок секции вне его. */
export const ABOUT_COPY_SELECTOR = '[data-about-copy]';

/**
 * Название заведения, которого на сайте быть не должно (docs/specs/voice.md). «Майстер»,
 * «майстри», «мастер» — люди, а не заведение, поэтому основа взята с «-н»/«-ск».
 */
export const FORBIDDEN_NAME = /майстерн|мастерск|workshop/i;

export const ABOUT: Record<Locale, { heading: string; signatureName: string; signatureRole: string }> = {
  uk: {
    heading: 'Масаж від реабілітолога',
    signatureName: 'Лада Новикова',
    signatureRole: 'засновниця студії',
  },
  ru: {
    heading: 'Массаж от реабилитолога',
    signatureName: 'Лада Новикова',
    signatureRole: 'основательница студии',
  },
  en: {
    heading: 'Massage by a rehabilitation specialist',
    signatureName: 'Lada Novikova',
    signatureRole: 'founder of the studio',
  },
};

export const FOUNDER_ROLE: Record<Locale, string> = {
  uk: 'засновниця студії, масажистка',
  ru: 'основательница студии, массажистка',
  en: 'founder, massage therapist',
};

export const ALUMNI = {
  name: 'Національний університет фізичного виховання і спорту України',
  sameAs: 'https://uni-sport.edu.ua/',
} as const;

const KYIV: Record<Locale, RegExp> = { uk: /Ки(їв|єв)/i, ru: /Киев/i, en: /Kyiv/i };

/**
 * Карта запросов (docs/specs/page-head.md §Целевые запросы): первое выражение — основная
 * формулировка страницы, остальные обязаны стоять рядом с ней. Выражения, а не строки: заголовок
 * пишет «у Києві», описание — «Києва», и буквальная строка отвергла бы оба.
 */
const QUERIES: Record<Locale, Record<'home' | ServiceCategory, RegExp[]>> = {
  uk: {
    home: [/студі[яї] масажу та краси/i],
    massage: [/масаж/i],
    depilation: [/депіляці/i, /шугаринг/i],
    permanent: [/перманентн\S* макіяж/i],
    beauty: [/ламінуванн/i, /макіяж/i],
  },
  ru: {
    home: [/студи[яи] массажа и красоты/i],
    massage: [/массаж/i],
    depilation: [/депиляци/i, /шугаринг/i],
    permanent: [/перманентн\S* макияж/i],
    beauty: [/ламинировани/i, /макияж/i],
  },
  en: {
    home: [/massage and beauty studio/i],
    massage: [/massage/i],
    depilation: [/waxing/i, /sugaring/i],
    permanent: [/permanent makeup/i],
    beauty: [/lamination/i, /makeup/i],
  },
};

export function queryOf(page: PageUnderTest & { category?: ServiceCategory }): RegExp[] {
  return [...QUERIES[page.locale][page.category ?? 'home'], KYIV[page.locale]];
}

/**
 * Начертания, загруженные главными страницами до пакета 004 (сняты на `main` 95d57b5,
 * 2026-09-27): «гарнитура|начертание|насыщенность|начало unicode-range». `U+301` открывает
 * кириллическое подмножество, `U+0-FF` — латинское. Главный заголовок главной вобрал строку
 * первого экрана, и новый файл шрифта на странице был бы ценой этой правки (docs/specs/home-hero.md).
 */
const LATIN_FACES = [
  'Cormorant|italic|300|U+0-FF',
  'Cormorant|normal|300|U+0-FF',
  'Cormorant|normal|400|U+0-FF',
  'Inter|normal|300|U+0-FF',
  'Inter|normal|400|U+0-FF',
  'Inter|normal|500|U+0-FF',
];
const CYRILLIC_FACES = LATIN_FACES.map((face) => face.replace('U+0-FF', 'U+301'));

export const HOME_FONT_FACES: Record<Locale, readonly string[]> = {
  uk: [...LATIN_FACES, ...CYRILLIC_FACES].sort(),
  ru: [...LATIN_FACES, ...CYRILLIC_FACES].sort(),
  en: [...LATIN_FACES].sort(),
};

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
 * а не результат работы браузера (ADR-012). Поэтому же не годится `innerText` —
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

/** Слова считаются одинаково для текста категории и обращения: по пробелам нормализованного текста. */
export function countWords(text: string): number {
  return normalize(text).split(' ').filter(Boolean).length;
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
 * Связь группы прайса с категорией (ADR-006). Копия таблицы из `src/data/price-groups.ts`,
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
 * (docs/specs/structured-data.md §Страница категории).
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
 * она превращается в бесплатную услугу (docs/specs/structured-data.md §Главная, три локали).
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
