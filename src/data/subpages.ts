import { getEntry, type CollectionEntry } from 'astro:content';
import { serviceSubpages, type PriceMethod, type ServicePageRef, type ServiceSubpage } from '../i18n/paths';
import type { Locale } from '../i18n/ui';
import { groupsOfCategory, type PriceGroup } from './price-groups';
import { serviceCopy } from './services';

/**
 * Subpage copy in the page's language. Errors stop the build here rather than in the schema, for
 * the reason `serviceCopy` (src/data/services.ts) gives: a schema only sees files that exist.
 * The collection holds exactly the registry's «subpage × its language» pairs
 * (src/content.config.ts), so the language guard below rejects a call with a foreign language;
 * it is not what catches a stray file.
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
  /** Parent category heading for the middle breadcrumb step; a category itself has none. */
  readonly parentHeading: string | null;
}

/**
 * Everything a service page derives from its ref, in one place: `ServicePage.astro` (visible price
 * list) and `SeoHead.astro` (`Offer` list) both read it, so the two cannot select different
 * copy, groups or price method for the same page (FR-004a).
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
    // The crumb names the category exactly as its own `<h1>` does.
    parentHeading: (await serviceCopy(locale, page.category)).data.heading,
  };
}
