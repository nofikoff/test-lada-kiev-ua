import { defineCollection } from 'astro:content';
// `import { z } from 'astro:content'` объявлен устаревшим в Astro 7 и снимается в восьмой.
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import { locales } from './i18n/ui';
import { guideLocales } from './i18n/guide';
import { serviceCategories } from './i18n/paths';
import { priceGroups } from './data/price-groups';
import { serviceSubpages, subpageSlugs } from './data/subpage-registry';

/**
 * Перевод обязателен во всех локалях. Отсутствие языка — ошибка сборки, а не пустая строка:
 * пустое место на странице никто не заметит, остановленная сборка заметна сразу. Строка из одних
 * пробелов — то же пустое место, поэтому проверка требует хотя бы одного видимого знака, а не длины.
 * Значение не обрезается: `.trim()` молча поменял бы тексты, которые сверяет `test:content`.
 */
const translation = z.string().regex(/\S/, 'перевод пуст или состоит из одних пробелов');

const localized = z.object(
  Object.fromEntries(locales.map((locale) => [locale, translation])) as Record<
    (typeof locales)[number],
    z.ZodString
  >,
);

const positiveInteger = z.number().int().positive();

const fixedPrice = z.object({ kind: z.literal('fixed'), amount: positiveInteger });

const variantsPrice = z.object({
  kind: z.literal('variants'),
  unit: z.enum(['minutes', 'sessions']),
  variants: z
    .array(z.object({ count: positiveInteger, amount: positiveInteger }))
    .min(1)
    .refine(
      (variants) => new Set(variants.map((variant) => variant.count)).size === variants.length,
      { message: 'варианты внутри позиции не могут повторять одно и то же значение count' },
    ),
});

const sharePrice = z.object({
  kind: z.literal('share'),
  // Ноль означал бы бесплатную услугу, сто — что доля не доля. Действующий код хранит для
  // долевой цены сумму 0 именно поэтому и оказывается неотличим от бесплатного.
  percent: z.number().int().min(1).max(99),
  note: localized,
});

const priceValue = z.discriminatedUnion('kind', [fixedPrice, variantsPrice, sharePrice]);

/**
 * Цена пастой: своя сумма, вид которой может отличаться от `price`, или `false` — «пастой не
 * делается». Доля запрещена (docs/specs/content-model.md §Инварианты).
 */
const sugarValue = z.union([z.discriminatedUnion('kind', [fixedPrice, variantsPrice]), z.literal(false)]);

/** Группы, которые хоть одна подстраница читает ценой пастой: только у них `sugar` что-то значит. */
const sugarGroups = new Set<string>(
  subpageSlugs.flatMap((subpage) => {
    const { method, groups } = serviceSubpages[subpage];
    return method === 'sugar' ? groups : [];
  }),
);

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
  schema: z
    .object({
      group: z.enum(priceGroups),
      name: localized,
      description: localized.optional(),
      price: priceValue,
      sugar: sugarValue.optional(),
    })
    .superRefine((item, context) => {
      // Цена пастой у группы, которую страница шугаринга не показывает, — мёртвые данные:
      // её не увидит ни посетитель, ни поисковик.
      if (item.sugar !== undefined && !sugarGroups.has(item.group)) {
        context.addIssue({
          code: 'custom',
          path: ['sugar'],
          message: `цена пастой у группы «${item.group}», которую не читает ни одна подстраница способом sugar`,
        });
      }
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

/**
 * Тексты подстраниц — ровно файлы пар «подстраница × её язык» из реестра, по шаблону на пару.
 * Файл вне пар (например, `ru/<slug>.md` у подстраницы только с `uk`) загрузчик не читает:
 * схему он не роняет и страницы не получает. Объединение языков и slug загрузило бы его, и сборка
 * упала бы на его схеме. Недостающий файл ловит `subpageCopy`, а не схема, — по той же причине,
 * что у `services`.
 */
const subpages = defineCollection({
  loader: glob({
    pattern: subpageSlugs.flatMap((subpage) =>
      serviceSubpages[subpage].locales.map((locale) => `${locale}/${subpage}.md`),
    ),
    base: './src/content/subpages',
  }),
  schema: z.object({
    subpage: z.enum(subpageSlugs),
    title: z.string().min(1),
    // Границы описания — те же, что у категорий (схема `services` выше).
    description: z.string().min(120).max(160),
    heading: z.string().min(1),
  }),
});

/**
 * Обращение Лады в «Про нас», по файлу на локаль. Отсутствие файла ловит `aboutCopy`, а не схема —
 * по той же причине, что у `services`.
 */
const about = defineCollection({
  loader: glob({ pattern: `+(${locales.join('|')}).md`, base: './src/content/about' }),
  schema: z.object({
    heading: translation,
    signatureName: translation,
    signatureRole: translation,
  }),
});

/**
 * Статьи и хабы базы знаний: путь файла и есть адрес, язык и категория (src/data/guide.ts). Шаблон
 * берёт любой `.md` каталога, а не перечень языков и категорий: файл в неверном каталоге обязан
 * остановить сборку в проверке формы пути, а не молча выпасть из загрузки. Межфайловые правила —
 * там же, в `guide.ts`: схема видит одну запись.
 *
 * Схема строгая ради `slug`: загрузчик `glob` берёт его идентификатором записи
 * (`astro/dist/content/loaders/glob.js`), и без запрета файл молча получил бы чужой адрес.
 */
const guide = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guide' }),
  schema: z
    .strictObject({
      page: z.string().min(1),
      title: z.string().min(1),
      // Границы описания — те же, что у категорий (схема `services` выше).
      description: z.string().min(120).max(160),
      heading: z.string().min(1),
      published: z.coerce.date(),
      modified: z.coerce.date(),
    })
    // Дата в будущем не проверяется: исход сборки зависел бы от дня запуска.
    .refine((entry) => entry.modified >= entry.published, {
      path: ['modified'],
      message: 'дата правки modified раньше даты публикации published',
    }),
});

/**
 * Текст страницы эксперта, по файлу на язык базы знаний. Отсутствие файла ловит `expertCopy`,
 * а не схема, — по той же причине, что у `services`.
 */
const expert = defineCollection({
  loader: glob({ pattern: `+(${guideLocales.join('|')}).md`, base: './src/content/expert' }),
  schema: z.strictObject({
    title: z.string().min(1),
    description: z.string().min(120).max(160),
    heading: z.string().min(1),
  }),
});

/**
 * Фото Лады: портрет первого экрана и карточки ленты. Коллекция, а не модуль с данными, ради
 * `localized` и `image()` — пропущенный перевод описания или файл фото роняет сборку, а не только
 * проверку типов. Связи между записями — один портрет,
 * позиции ленты без пропусков — проверяет `src/data/gallery.ts`: схема видит одну запись.
 */
const gallery = defineCollection({
  loader: file('src/data/gallery.json'),
  schema: ({ image }) =>
    z.object({
      photo: image(),
      role: z.enum(['portrait', 'strip']),
      position: positiveInteger.optional(),
      alt: localized,
      category: z.enum(serviceCategories).optional(),
      // Значение CSS `object-position` для обрезки кадра на странице.
      focus: z.string().regex(/^\d{1,3}% \d{1,3}%$/),
      // `contain` — для кадра, у которого смысл несут края: «до/после» с подписями по бокам
      // обрезка до 4:5 резала бы надписи. По умолчанию кадр обрезается.
      fit: z.enum(['cover', 'contain']).optional(),
      // Кадр превью ссылок режет sharp, а он принимает стороны, не проценты CSS: `50% 22%` он
      // отвергает, и Astro понижает это до предупреждения — превью молча не собирается.
      previewPosition: z.enum(['top', 'center', 'bottom']).optional(),
    }),
});

export const collections = { prices, services, subpages, about, gallery, guide, expert };
