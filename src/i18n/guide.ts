/**
 * Подписи базы знаний и страницы эксперта. Отдельно от `ui.ts`: его ключи обязаны существовать
 * и в `en`, а английских страниц раздела нет, и строки `en` были бы мёртвыми данными
 * (specs/007-knowledge-base-pilot/research.md R8).
 *
 * Модуль загружает и `node --experimental-strip-types` (scripts/seo-map.test.mjs), поэтому из
 * `src/` он импортирует только типы: значение по пути без расширения Node в ESM не найдёт.
 */

export const guideLocales = ['uk', 'ru'] as const;

export type GuideLocale = (typeof guideLocales)[number];

export interface GuideDictionary {
  /** Блок ссылок карты после текста страницы: надзаголовок без заголовка не выводится (design-tokens.md, правило 7). */
  readonly links: { readonly eyebrow: string; readonly title: string };
  readonly published: string;
  readonly modified: string;
  /** Заголовок списка статей на странице эксперта. */
  readonly expertArticles: string;
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
    expertArticles: 'Статті бази знань',
    properNouns: ['Київ'],
  },
  ru: {
    links: { eyebrow: 'База знаний', title: 'Читайте также' },
    published: 'Опубликовано',
    modified: 'Обновлено',
    expertArticles: 'Статьи базы знаний',
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
