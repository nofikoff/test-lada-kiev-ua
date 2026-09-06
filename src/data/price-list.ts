import { getCollection, type CollectionEntry } from 'astro:content';
import priceFile from './prices.json';
import type { PriceGroup } from './price-groups';

/**
 * Единственная точка чтения прайса из коллекции.
 *
 * Порядок позиций в файле и есть порядок их отображения (data-model.md §Позиция прайса,
 * research.md §R4), но хранилище коллекции отдаёт записи отсортированными по идентификатору:
 * каждый, кто вызовет `getCollection('prices')` напрямую, молча переставит прайс местами.
 * Порядок восстанавливается по индексу в самом файле.
 */
const fileOrder = new Map(priceFile.map((item, index) => [item.id, index]));

export type PriceEntry = CollectionEntry<'prices'>;

export async function pricesOfGroups(groups: readonly PriceGroup[]): Promise<PriceEntry[]> {
  const wanted = new Set<string>(groups);
  return (await getCollection('prices'))
    .filter((entry) => wanted.has(entry.data.group))
    .sort((first, second) => (fileOrder.get(first.id) ?? 0) - (fileOrder.get(second.id) ?? 0));
}
