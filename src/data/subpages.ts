import { getEntry, type CollectionEntry } from 'astro:content';
import type { ServicePageRef } from '../i18n/paths';
import type { Locale } from '../i18n/ui';
import { groupsOfCategory, type PriceGroup } from './price-groups';
import { serviceCopy } from './services';
import { serviceSubpages, type PriceMethod, type ServiceSubpage } from './subpage-registry';

/**
 * Текст подстраницы на языке страницы. Ошибка роняет сборку здесь, а не в схеме, по причине из
 * `serviceCopy` (src/data/services.ts): схема видит только существующие файлы. Проверка языка
 * отвергает вызов с чужим языком; лишний файл отсекает коллекция (src/content.config.ts).
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

export interface ServicePageData {
  readonly copy: CollectionEntry<'services'> | CollectionEntry<'subpages'>;
  readonly groups: readonly PriceGroup[];
  readonly method: PriceMethod;
  /** Заголовок родительской категории для среднего звена крошек; у самой категории его нет. */
  readonly parentHeading: string | null;
}

/**
 * Всё, что страница услуги выводит из своей ссылки, в одном месте. Его читают и `ServicePage.astro`
 * (видимый прайс), и `SeoHead.astro` (предложения), поэтому для одной страницы они не могут
 * выбрать разные текст, группы или способ цены (docs/specs/structured-data.md §Service subpage).
 */
export async function servicePageOf(locale: Locale, page: ServicePageRef): Promise<ServicePageData> {
  const subpage = page.subpage;
  if (!subpage) {
    return {
      copy: await serviceCopy(locale, page.category),
      groups: groupsOfCategory(page.category),
      method: 'base',
      parentHeading: null,
    };
  }

  const { groups, method } = serviceSubpages[subpage];
  return {
    copy: await subpageCopy(locale, subpage),
    groups,
    method,
    // Крошка называет категорию так же, как её собственный `<h1>`.
    parentHeading: (await serviceCopy(locale, page.category)).data.heading,
  };
}
