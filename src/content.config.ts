import { defineCollection } from 'astro:content';
// `import { z } from 'astro:content'` объявлен устаревшим в Astro 7 и снимается в восьмой.
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import { locales } from './i18n/ui';
import { serviceCategories } from './i18n/paths';
import { priceGroups } from './data/price-groups';

/**
 * Перевод обязателен во всех локалях. Отсутствие языка — ошибка сборки, а не пустая строка:
 * пустое место на странице никто не заметит, остановленная сборка заметна сразу.
 */
const localized = z.object(
  Object.fromEntries(locales.map((locale) => [locale, z.string().min(1)])) as Record<
    (typeof locales)[number],
    z.ZodString
  >,
);

const positiveInteger = z.number().int().positive();

const priceValue = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed'), amount: positiveInteger }),
  z.object({
    kind: z.literal('variants'),
    unit: z.enum(['minutes', 'sessions']),
    variants: z
      .array(z.object({ count: positiveInteger, amount: positiveInteger }))
      .min(1)
      .refine(
        (variants) => new Set(variants.map((variant) => variant.count)).size === variants.length,
        { message: 'варианты внутри позиции не могут повторять одно и то же значение count' },
      ),
  }),
  z.object({
    kind: z.literal('share'),
    // Ноль означал бы бесплатную услугу, сто — что доля не доля. Действующий код хранит для
    // долевой цены сумму 0 именно поэтому и оказывается неотличим от бесплатного.
    percent: z.number().int().min(1).max(99),
    note: localized,
  }),
]);

/**
 * Уникальность идентификаторов схемой не проверяется и проверяться не может: zod видит одну
 * запись, а нарушение возникает между записями. Её ловит сам загрузчик `file()` — и роняет
 * сборку только при `prerenderConflictBehavior: 'error'` в `astro.config.mjs`; со значением
 * по умолчанию он ограничивается предупреждением и молча теряет одну из двух цен.
 * Собственный `parser` эту роль занять не может: исключение из него загрузчик проглатывает
 * (`astro/dist/content/loaders/file.js`), и коллекция просто оказывается пустой.
 */
const prices = defineCollection({
  loader: file('src/data/prices.json'),
  schema: z.object({
    group: z.enum(priceGroups),
    name: localized,
    description: localized.optional(),
    price: priceValue,
  }),
});

/**
 * Двенадцать файлов: четыре категории × три локали. Недостающий останавливает сборку не схемой,
 * а страницей, которая его запрашивает: страница без текста хуже отсутствующей страницы.
 */
const services = defineCollection({
  loader: glob({
    pattern: `+(${locales.join('|')})/+(${serviceCategories.join('|')}).md`,
    base: './src/content/services',
  }),
  schema: z.object({
    category: z.enum(serviceCategories),
    title: z.string().min(1),
    // Границы описания — требование контракта заголовочной части, а не вкус: короче обрезается
    // в выдаче до бессмысленного, длиннее обрезается поисковиком.
    description: z.string().min(120).max(160),
    heading: z.string().min(1),
  }),
});

export const collections = { prices, services };
