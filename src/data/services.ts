import { getEntry, type CollectionEntry } from 'astro:content';
import type { ServiceCategory } from '../i18n/paths';
import type { Locale } from '../i18n/ui';

/**
 * Текст категории на языке страницы. Недостающий файл останавливает сборку здесь, а не в схеме:
 * схема видит только то, что существует, а нарушение состоит как раз в отсутствии одного из
 * двенадцати файлов (content.config.ts §services). Страница без текста хуже отсутствующей.
 */
export async function serviceCopy(
  locale: Locale,
  category: ServiceCategory,
): Promise<CollectionEntry<'services'>> {
  const id = `${locale}/${category}`;
  const entry = await getEntry('services', id);
  if (!entry) {
    throw new Error(`нет текста услуги: src/content/services/${id}.md`);
  }
  return entry;
}
