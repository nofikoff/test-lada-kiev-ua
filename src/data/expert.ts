import { getEntry, type CollectionEntry } from 'astro:content';
import type { GuideLocale } from '../i18n/guide';

/**
 * Текст страницы эксперта на языке страницы. Недостающий файл останавливает сборку здесь, а не
 * в схеме, — по тому же доводу, что `aboutCopy` (src/data/about.ts): схема видит только то, что есть.
 */
export async function expertCopy(locale: GuideLocale): Promise<CollectionEntry<'expert'>> {
  const entry = await getEntry('expert', locale);
  if (!entry) {
    throw new Error(`нет текста страницы эксперта: src/content/expert/${locale}.md`);
  }
  return entry;
}
