import { getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';

/**
 * Обращение Лады на языке страницы. Недостающий файл останавливает сборку здесь, а не в схеме —
 * см. `serviceCopy` в src/data/services.ts: секция «Про нас» без обращения хуже её отсутствия.
 */
export async function aboutCopy(locale: Locale): Promise<CollectionEntry<'about'>> {
  const entry = await getEntry('about', locale);
  if (!entry) {
    throw new Error(`нет обращения: src/content/about/${locale}.md`);
  }
  return entry;
}
