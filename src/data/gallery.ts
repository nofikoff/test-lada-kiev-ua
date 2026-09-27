import { getCollection, type CollectionEntry } from 'astro:content';

export type GalleryEntry = CollectionEntry<'gallery'>;

/**
 * Единственная точка чтения коллекции `gallery`. Проверки здесь — те, что схема сделать
 * не может, потому что нарушение возникает между записями: портрет ровно один, позиции ленты
 * идут 1…N без пропусков. Хранилище коллекции отдаёт записи по идентификатору, поэтому порядок
 * ленты задаёт только `position` (тот же довод — `price-list.ts`).
 */
async function entries(): Promise<{ portrait: GalleryEntry; strip: GalleryEntry[] }> {
  const all = await getCollection('gallery');

  const portraits = all.filter((entry) => entry.data.role === 'portrait');
  if (portraits.length !== 1) {
    throw new Error(`gallery.json: портретов ${portraits.length}, должен быть ровно один`);
  }
  const [portrait] = portraits;
  if (portrait.data.position !== undefined || portrait.data.category !== undefined) {
    throw new Error(`gallery.json: у портрета ${portrait.id} не бывает position и category`);
  }
  if (portrait.data.previewPosition === undefined) {
    throw new Error(`gallery.json: у портрета ${portrait.id} нет previewPosition — превью не из чего резать`);
  }

  const strip = all
    .filter((entry) => entry.data.role === 'strip')
    .sort((first, second) => (first.data.position ?? 0) - (second.data.position ?? 0));
  strip.forEach((entry, index) => {
    if (entry.data.position !== index + 1) {
      throw new Error(
        `gallery.json: у ${entry.id} position ${entry.data.position ?? 'не задан'}, ожидается ${index + 1}`,
      );
    }
  });

  return { portrait, strip };
}

export async function portrait(): Promise<GalleryEntry> {
  return (await entries()).portrait;
}

export async function strip(): Promise<GalleryEntry[]> {
  return (await entries()).strip;
}
