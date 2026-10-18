/**
 * Подписи базы знаний и страницы эксперта. Отдельно от `ui.ts`: его ключи обязаны существовать
 * и в `en`, а английских страниц раздела нет, и строки `en` были бы мёртвыми данными
 * (specs/007-knowledge-base-pilot/research.md R8).
 *
 * Модуль загружает и `node --experimental-strip-types` (scripts/seo-map.test.mjs), поэтому из
 * `src/` он импортирует только типы: значение по пути без расширения Node в ESM не найдёт.
 */

import type { Locale } from './ui';

export const guideLocales = ['uk', 'ru'] as const;

export type GuideLocale = (typeof guideLocales)[number];

export function isGuideLocale(value: string): value is GuideLocale {
  return (guideLocales as readonly string[]).includes(value);
}

/** Язык страницы базы знаний или эксперта; `en` сюда попасть не может — маршрута под ним нет. */
export function guideLocaleOf(locale: Locale): GuideLocale {
  if (!isGuideLocale(locale)) throw new Error(`страниц базы знаний на языке «${locale}» нет`);
  return locale;
}

/** Календарный день записи — для `datetime` и JSON-LD. Дата без времени разобрана в полночь UTC. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Видимая дата. `timeZone: 'UTC'` обязателен: дата без времени — полночь UTC, и в поясе западнее
 * она показалась бы предыдущим днём (specs/007-knowledge-base-pilot/research.md R9).
 */
export function displayDate(locale: GuideLocale, date: Date): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

export interface GuideDictionary {
  /** Блок ссылок карты после текста страницы: надзаголовок без заголовка не выводится (design-tokens.md, правило 7). */
  readonly links: { readonly eyebrow: string; readonly title: string };
  readonly published: string;
  readonly modified: string;
  /** Заголовок списка статей на странице эксперта — та же пара, что у блока ссылок (правило 7). */
  readonly expertArticles: { readonly eyebrow: string; readonly title: string };
  /**
   * Имена собственные анкоров карты в своём регистре: `/seo map` пишет анкоры строчными, и без
   * словаря на странице стояло бы «депіляція київ». Новое имя в анкоре — новая строка здесь.
   */
  readonly properNouns: readonly string[];
}

export const guide: Record<GuideLocale, GuideDictionary> = {
  uk: {
    links: { eyebrow: 'База знань', title: 'Читайте також' },
    published: 'Опубліковано',
    modified: 'Оновлено',
    expertArticles: { eyebrow: 'База знань', title: 'Статті за підписом Лади' },
    properNouns: ['Київ'],
  },
  ru: {
    links: { eyebrow: 'База знаний', title: 'Читайте также' },
    published: 'Опубликовано',
    modified: 'Обновлено',
    expertArticles: { eyebrow: 'База знаний', title: 'Статьи за подписью Лады' },
    properNouns: ['Киев'],
  },
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Видимый текст ссылки из анкора карты: первая буква поднята, имена собственные — в своём
 * регистре. Регистр на соответствие карте не влияет: `/seo audit` и `tests/links.spec.ts`
 * сравнивают анкоры без него.
 */
export function displayAnchor(locale: GuideLocale, anchor: string): string {
  const cased = guide[locale].properNouns.reduce(
    // Граница слова — через свойства Unicode: `\b` в JavaScript кириллицу буквой не считает.
    (text, noun) =>
      text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(noun)}(?![\\p{L}\\p{N}])`, 'giu'), noun),
    anchor,
  );
  return cased.charAt(0).toLocaleUpperCase(locale) + cased.slice(1);
}
