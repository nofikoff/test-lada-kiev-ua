import { getCollection, type CollectionEntry } from 'astro:content';
import priceFile from './prices.json';
import type { PriceGroup } from './price-groups';
import type { PriceMethod } from './subpage-registry';

/**
 * Единственная точка чтения прайса из коллекции.
 *
 * Порядок позиций в файле и есть порядок их отображения (ADR-006), но хранилище коллекции
 * отдаёт записи отсортированными по идентификатору:
 * каждый, кто вызовет `getCollection('prices')` напрямую, молча переставит прайс местами.
 * Порядок восстанавливается по индексу в самом файле
 * (docs/specs/content-model.md §Две ловушки загрузчика `file()`).
 */
const fileOrder = new Map(priceFile.map((item, index) => [item.id, index]));

export type PriceEntry = CollectionEntry<'prices'>;

/**
 * Позиции групп по цене способа страницы. Способ `sugar` подставляет цену пастой в `data.price`
 * той же записи, а не отдаёт второе поле: читатели прайса (`PriceGroup.astro`, `SeoHead.astro`)
 * знают одну цену и не могут показать посетителю одну, а поисковику другую.
 */
export async function pricesOfGroups(
  groups: readonly PriceGroup[],
  method: PriceMethod = 'base',
): Promise<PriceEntry[]> {
  const wanted = new Set<string>(groups);
  const entries = (await getCollection('prices'))
    .filter((entry) => wanted.has(entry.data.group))
    .sort((first, second) => (fileOrder.get(first.id) ?? 0) - (fileOrder.get(second.id) ?? 0));
  if (method === 'base') return entries;

  return entries.flatMap((entry) => {
    const { sugar } = entry.data;
    if (sugar === false) return [];
    return [{ ...entry, data: { ...entry.data, price: sugar ?? entry.data.price } }];
  });
}
