import { getEntry, type CollectionEntry } from 'astro:content';
import { serviceSubpages, type ServiceSubpage } from '../i18n/paths';
import type { Locale } from '../i18n/ui';

/**
 * Текст подстраницы на языке страницы. Ошибки останавливают сборку здесь, а не в схеме, — довод
 * тот же, что у `serviceCopy` (src/data/services.ts): схема видит только существующие файлы.
 */
export async function subpageCopy(
  locale: Locale,
  subpage: ServiceSubpage,
): Promise<CollectionEntry<'subpages'>> {
  const id = `${locale}/${subpage}`;
  if (!(serviceSubpages[subpage].locales as readonly Locale[]).includes(locale)) {
    throw new Error(`текст подстраницы на языке, которого у неё нет: src/content/subpages/${id}.md`);
  }

  const entry = await getEntry('subpages', id);
  if (!entry) {
    throw new Error(`нет текста подстраницы: src/content/subpages/${id}.md`);
  }
  if (entry.data.subpage !== subpage) {
    throw new Error(
      `src/content/subpages/${id}.md: поле subpage «${entry.data.subpage}» не совпадает с именем файла`,
    );
  }
  return entry;
}
