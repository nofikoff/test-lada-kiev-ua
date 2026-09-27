import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  ABOUT,
  ALUMNI,
  allPages,
  ANALYTICS_ID,
  APEX_ORIGIN,
  categoryPages,
  countWords,
  expectedOfferCount,
  FOUNDER_ROLE,
  homePages,
  INSTAGRAM,
  normalize,
  PHONE,
  priceRange,
  SERVICE_CATEGORIES,
  SERVICE_COPY_SELECTOR,
  SITE_ORIGIN,
  toLocalPath,
  type Locale,
} from './support/site';

/**
 * Контракт заголовочной части (docs/specs/page-head.md) и машиночитаемого описания
 * (docs/specs/structured-data.md). Проверяется по собранному HTML: требование относится
 * к опубликованному файлу, а не к исходникам компонентов.
 */

/** Формат площадок предпросмотра — язык с территорией; действующая разметка объявляет их так же. */
const OG_LOCALE: Record<Locale, string> = { uk: 'uk_UA', ru: 'ru_RU', en: 'en_US' };

const ALTERNATE_HREF: Record<Locale, string> = {
  uk: `${SITE_ORIGIN}/`,
  ru: `${SITE_ORIGIN}/ru/`,
  en: `${SITE_ORIGIN}/en/`,
};

/** Прогон не должен зависеть от доступности сторонних доменов: шрифты и счётчик обрываются. */
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http://localhost') ? route.continue() : route.abort(),
  );
});

async function metaContent(page: Page, selector: string): Promise<string | null> {
  const locator = page.locator(selector);
  if ((await locator.count()) === 0) return null;
  return locator.first().getAttribute('content');
}

function flattenGraph(value: unknown, sink: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenGraph(item, sink);
    return sink;
  }
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    sink.push(node);
    for (const child of Object.values(node)) flattenGraph(child, sink);
  }
  return sink;
}

async function structuredData(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.length, 'машиночитаемое описание отсутствует').toBeGreaterThan(0);
  return blocks.flatMap((block) => flattenGraph(JSON.parse(block)));
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Страница категории, которая не отдаётся, останавливает каждую проверку ниже здесь — с указанием
 * адреса, а не с разбором `null` там, где ожидалась разметка.
 */
async function requireCategoryPage(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), `${path}: страница категории не отдаётся`).toBe(200);
  return response.text();
}

for (const { locale, path } of homePages) {
  test.describe(`заголовочная часть ${path}`, () => {
    test('язык документа и единственный заголовок первого уровня', async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('канонический адрес и четыре языковые альтернативы', async ({ page, request }) => {
      await page.goto(path);

      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${SITE_ORIGIN}${path}`,
      );

      const alternates = page.locator('link[rel="alternate"][hreflang]');
      await expect(alternates).toHaveCount(4);

      const pairs = await alternates.evaluateAll((links) =>
        links.map((link) => ({
          hreflang: link.getAttribute('hreflang'),
          href: link.getAttribute('href'),
        })),
      );
      const byHreflang = Object.fromEntries(pairs.map((pair) => [pair.hreflang, pair.href]));

      expect(byHreflang).toEqual({
        uk: ALTERNATE_HREF.uk,
        ru: ALTERNATE_HREF.ru,
        en: ALTERNATE_HREF.en,
        'x-default': ALTERNATE_HREF.uk,
      });

      for (const href of new Set(Object.values(byHreflang))) {
        const response = await request.get(toLocalPath(href as string), { maxRedirects: 0 });
        expect(response.status(), `языковая альтернатива ${href}`).toBe(200);
      }
    });

    test('метаданные предпросмотра полны и объявляют локаль страницы', async ({ page }) => {
      await page.goto(path);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      const description = await metaContent(page, 'meta[name="description"]');
      expect(description).not.toBeNull();
      expect(description!.length).toBeGreaterThanOrEqual(120);
      expect(description!.length).toBeLessThanOrEqual(160);

      expect(await metaContent(page, 'meta[property="og:type"]')).toBe('website');
      expect(await metaContent(page, 'meta[property="og:url"]')).toBe(`${SITE_ORIGIN}${path}`);
      expect(await metaContent(page, 'meta[property="og:title"]')).toBe(title);
      expect(await metaContent(page, 'meta[property="og:description"]')).toBe(description);
      expect(await metaContent(page, 'meta[property="og:site_name"]')).toBeTruthy();
      expect(await metaContent(page, 'meta[property="og:locale"]')).toBe(OG_LOCALE[locale]);

      const image = await metaContent(page, 'meta[property="og:image"]');
      expect(image?.startsWith(SITE_ORIGIN)).toBe(true);
      // Явные размеры: без них часть площадок не строит крупную карточку.
      expect(await metaContent(page, 'meta[property="og:image:width"]')).toBeTruthy();
      expect(await metaContent(page, 'meta[property="og:image:height"]')).toBeTruthy();

      const alternateLocales = await page
        .locator('meta[property="og:locale:alternate"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content')));
      const expectedAlternates = Object.entries(OG_LOCALE)
        .filter(([code]) => code !== locale)
        .map(([, value]) => value);
      expect(alternateLocales.sort()).toEqual(expectedAlternates.sort());

      expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(await metaContent(page, 'meta[name="twitter:title"]')).toBeTruthy();
      expect(await metaContent(page, 'meta[name="twitter:description"]')).toBeTruthy();
      expect(await metaContent(page, 'meta[name="twitter:image"]')).toBe(image);
    });

    test('счётчик аналитики с прежним идентификатором', async ({ request }) => {
      const html = await (await request.get(path)).text();

      expect(html).toContain(`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`);
      expect(html).toContain(`gtag('config', '${ANALYTICS_ID}')`);
    });
  });

  test.describe(`машиночитаемое описание ${path}`, () => {
    test('организация описана типом предприятия сферы красоты и здоровья', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);

      const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness');
      expect(business, 'нет описания организации').toBeDefined();

      expect(business!.name).toBe('Lada N');
      expect(business!.telephone).toBe(PHONE);
      expect(business!.url).toBe(`${SITE_ORIGIN}${path}`);
      expect(asArray(business!.sameAs)).toContain(INSTAGRAM);
      expect(asArray(business!.availableLanguage).map(String).sort()).toEqual(['en', 'ru', 'uk']);

      // Логотип и портрет Лады, стокового кадра нет
      // (docs/specs/home-hero.md §Превью ссылок и JSON-LD).
      const images = asArray(business!.image).map(String);
      expect(images).toHaveLength(2);
      for (const image of images) expect(image.startsWith(SITE_ORIGIN)).toBe(true);
      expect(images.some((image) => image.includes('/logo.'))).toBe(true);
      expect(images.some((image) => image.includes('lada-novikova-portrait'))).toBe(true);

      const hours = asArray(business!.openingHoursSpecification)[0] as Record<string, unknown>;
      expect(asArray(hours.dayOfWeek)).toHaveLength(7);
      expect(hours.opens).toBe('10:00');
      expect(hours.closes).toBe('21:00');
    });

    test('основательница — Лада, с вузом и тем же портретом', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness');
      const founder = business!.founder as Record<string, unknown> | undefined;
      expect(founder, 'нет основательницы в описании организации').toBeDefined();

      expect(founder!['@type']).toBe('Person');
      expect(founder!.name).toBe(ABOUT[locale].signatureName);
      expect(founder!.jobTitle).toBe(FOUNDER_ROLE[locale]);
      expect(founder!.image).toBe(asArray(business!.image).map(String)[1]);
      expect(founder!.alumniOf).toEqual({
        '@type': 'CollegeOrUniversity',
        name: ALUMNI.name,
        sameAs: ALUMNI.sameAs,
      });
    });

    test('адрес взят на языке страницы', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness');
      const address = business!.address as Record<string, unknown>;

      expect(address['@type']).toBe('PostalAddress');
      expect(address.addressCountry).toBe('UA');

      const addressLocality = String(address.addressLocality ?? '');
      const streetAddress = String(address.streetAddress ?? '');
      expect(addressLocality.length, 'пустой населённый пункт').toBeGreaterThan(0);
      expect(streetAddress.length, 'пустая улица').toBeGreaterThan(0);

      /**
       * Части складываются обратно в ту самую строку, которую видит посетитель этой языковой
       * версии. Проверять вхождение каждой по отдельности недостаточно: разбор единственной
       * строки словаря по отсутствующему разделителю даёт две её же подстроки — адрес без
       * последнего символа и адрес без первого, — и обе проходят проверку вхождения, попадая
       * при этом в описание организации.
       */
      const footer = normalize(await page.locator('footer').innerText());
      expect(footer).toContain(`${addressLocality}, ${streetAddress}`);
      expect(addressLocality, 'разбор не по первому разделителю').not.toContain(',');
    });

    test('ценовой диапазон совпадает с прайсом и не содержит нулевых предложений', async ({
      page,
    }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness');

      const { min, max } = priceRange();
      const digits = String(business!.priceRange).match(/\d+/g) ?? [];
      expect(digits.map(Number)).toEqual([min, max]);

      // Предложение с нулевой ценой описывает бесплатную услугу — долевые позиции не публикуются.
      const offers = nodes.filter((node) => node['@type'] === 'Offer');
      for (const offer of offers) {
        expect(Number(offer.price), `нулевая цена в предложении ${JSON.stringify(offer)}`,
        ).toBeGreaterThan(0);
      }
    });
  });
}

for (const { locale, category, path } of categoryPages) {
  test.describe(`страница категории ${path}`, () => {
    test('язык документа, единственный заголовок и канонический адрес', async ({
      page,
      request,
    }) => {
      await requireCategoryPage(request, path);
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${SITE_ORIGIN}${path}`,
      );
    });

    /** Страница категории ссылается на ту же категорию в других локалях, а не на главную. */
    test('языковые альтернативы ведут на ту же категорию', async ({ page, request }) => {
      await requireCategoryPage(request, path);
      await page.goto(path);

      const alternates = page.locator('link[rel="alternate"][hreflang]');
      const pairs = await alternates.evaluateAll((links) =>
        links.map((link) => ({
          hreflang: link.getAttribute('hreflang'),
          href: link.getAttribute('href'),
        })),
      );

      expect(Object.fromEntries(pairs.map((pair) => [pair.hreflang, pair.href]))).toEqual({
        uk: `${SITE_ORIGIN}/${category}/`,
        ru: `${SITE_ORIGIN}/ru/${category}/`,
        en: `${SITE_ORIGIN}/en/${category}/`,
        'x-default': `${SITE_ORIGIN}/${category}/`,
      });

      for (const pair of pairs) {
        const response = await request.get(toLocalPath(pair.href!), { maxRedirects: 0 });
        expect(response.status(), `языковая альтернатива ${pair.href}`).toBe(200);
      }
    });

    test('описание услуги с перечнем предложений', async ({ page, request }) => {
      await requireCategoryPage(request, path);
      await page.goto(path);
      const nodes = await structuredData(page);

      const service = nodes.find((node) => node['@type'] === 'Service');
      expect(service, 'нет описания услуги').toBeDefined();

      const heading = await page.locator('h1').innerText();
      expect([await page.title(), heading.trim()]).toContain(String(service!.name));
      expect(service!.description).toBe(await metaContent(page, 'meta[name="description"]'));

      // Исполнитель — ссылка на организацию главной страницы своей локали, а не второе её описание.
      const providerId =
        typeof service!.provider === 'string'
          ? service!.provider
          : (service!.provider as Record<string, unknown>)['@id'];
      const home = homePages.find((entry) => entry.locale === locale)!;
      expect(providerId).toBe(`${SITE_ORIGIN}${home.path}#business`);

      expect(JSON.stringify(service!.areaServed ?? '')).not.toBe('""');

      /**
       * Число предложений равно числу отображаемых позиций за вычетом долевых
       * (docs/specs/structured-data.md §Страница категории): предложение с нулевой ценой описывает
       * бесплатную услугу, поэтому «коррекция 50%» в перечень не попадает.
       */
      const offers = nodes.filter((node) => node['@type'] === 'Offer');
      expect(offers.length, `предложений на ${path}`).toBe(expectedOfferCount(category));
      for (const offer of offers) {
        expect(Number(offer.price), `нулевая цена в ${JSON.stringify(offer)}`).toBeGreaterThan(0);
        expect(offer.priceCurrency).toBe('UAH');
      }
    });

    test('цепочка навигации ведёт с главной на страницу категории', async ({ page, request }) => {
      await requireCategoryPage(request, path);
      await page.goto(path);
      const nodes = await structuredData(page);

      const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
      expect(breadcrumb, 'нет цепочки навигации').toBeDefined();

      const items = asArray(breadcrumb!.itemListElement) as Record<string, unknown>[];
      expect(items).toHaveLength(2);

      const home = homePages.find((entry) => entry.locale === locale)!;
      const addresses = items.map((item) =>
        typeof item.item === 'string' ? item.item : (item.item as Record<string, unknown>)?.['@id'],
      );
      expect(addresses).toEqual([`${SITE_ORIGIN}${home.path}`, `${SITE_ORIGIN}${path}`]);
      expect(items.map((item) => Number(item.position))).toEqual([1, 2]);

      // Названия — на языке страницы, поэтому берутся с самой страницы, а не из словаря теста.
      for (const item of items) {
        expect(String(item.name ?? '').trim().length, 'пустое название в цепочке').toBeGreaterThan(0);
      }
    });
  });
}

/**
 * Объём и уникальность текста (docs/specs/content-model.md §Страница категории). Счётчик слов —
 * рабочее определение «содержательного текста»: четыреста слов нельзя набрать шаблоном
 * с подставленным названием. Считается только контейнер текста категории — прайс и подвал
 * набрали бы норму сами.
 */
test.describe('тексты страниц категорий', () => {
  for (const locale of ['uk', 'ru', 'en'] as const) {
    test(`тексты локали ${locale} не короче 400 слов и не повторяют друг друга`, async ({
      page,
      request,
    }) => {
      const paragraphsByCategory = new Map<string, string[]>();

      for (const entry of categoryPages.filter((candidate) => candidate.locale === locale)) {
        await requireCategoryPage(request, entry.path);
        await page.goto(entry.path);

        const copy = page.locator(SERVICE_COPY_SELECTOR);
        await expect(
          copy,
          `${entry.path}: контейнер ${SERVICE_COPY_SELECTOR} — договорённость с шаблоном страницы категории`,
        ).toHaveCount(1);

        const words = countWords(await copy.innerText());
        expect(words, `${entry.path}: ${words} слов`).toBeGreaterThanOrEqual(400);

        const paragraphs = (await copy.locator('p').allInnerTexts())
          .map(normalize)
          .filter((paragraph) => paragraph.length > 0);
        expect(paragraphs.length, `${entry.path}: текст без абзацев`).toBeGreaterThan(0);
        paragraphsByCategory.set(entry.category, paragraphs);
      }

      expect(paragraphsByCategory.size).toBe(SERVICE_CATEGORIES.length);

      const owner = new Map<string, string>();
      for (const [category, paragraphs] of paragraphsByCategory) {
        for (const paragraph of paragraphs) {
          expect(
            owner.get(paragraph),
            `абзац повторяется в «${owner.get(paragraph)}» и «${category}»: ${paragraph.slice(0, 60)}…`,
          ).toBeUndefined();
          owner.set(paragraph, category);
        }
      }
    });
  }
});

test.describe('сквозные требования ко всем страницам', () => {
  test('пара «заголовок + описание» уникальна', async ({ request }) => {
    const pairs: string[] = [];

    // Требование проверяется по всем пятнадцати страницам: нарушение возникает между файлами,
    // и одна только главная его не покажет (docs/specs/page-head.md §Заголовки и описания).
    for (const { path } of allPages) {
      const response = await request.get(path);
      expect(response.status(), `${path} не отдаётся`).toBe(200);

      const html = await response.text();
      const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
      const description =
        /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';

      expect(title.trim().length, `пустой заголовок на ${path}`).toBeGreaterThan(0);
      expect(description.trim().length, `пустое описание на ${path}`).toBeGreaterThan(0);
      pairs.push(JSON.stringify([title, description]));
    }

    expect(new Set(pairs).size, 'повторяющаяся пара «заголовок + описание»').toBe(pairs.length);
  });

  /**
   * Превью — кадр портрета Лады, одинаковый на всех пятнадцати страницах, собранный в `_astro/`
   * (docs/specs/home-hero.md §Превью ссылок и JSON-LD). Скриншот сайта и стоковый кадр из выдачи
   * ушли совсем.
   */
  test('превью всех страниц — портрет, стока и скриншота нет', async ({ request }) => {
    const previews = new Set<string>();
    for (const { path } of allPages) {
      const html = await (await request.get(path)).text();
      const preview = /<meta\s+property="og:image"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';

      expect(preview, `превью ${path}`).toContain('/_astro/lada-novikova-portrait');
      expect(html, `стоковый кадр на ${path}`).not.toContain('massage-kiev-lada-novikova');
      expect(html, `скриншот-превью на ${path}`).not.toContain('lada.kiev.ua-website.png');
      previews.add(preview);
    }
    expect(previews.size, 'превью различается между страницами').toBe(1);
  });

  /**
   * Изображение предпросмотра одно на весь сайт, поэтому и вес, и объявленные размеры
   * проверяются один раз. Объявление размеров без сверки с файлом ничего не стоит: до миграции
   * разметка объявляла 1416×840 против файла 2970×1756 весом 3.3 МБ.
   */
  test('изображение предпросмотра укладывается в лимит веса и объявлено своими размерами', async ({
    page,
    request,
  }) => {
    await page.goto('/');

    const url = await metaContent(page, 'meta[property="og:image"]');
    expect(url).not.toBeNull();
    const declared = {
      width: Number(await metaContent(page, 'meta[property="og:image:width"]')),
      height: Number(await metaContent(page, 'meta[property="og:image:height"]')),
    };

    const response = await request.get(toLocalPath(url!), { maxRedirects: 0 });
    expect(response.status(), `изображение предпросмотра ${url}`).toBe(200);

    const bytes = (await response.body()).byteLength;
    expect(
      bytes,
      `изображение предпросмотра весит ${Math.round(bytes / 1024)} КБ при лимите 300 КБ`,
    ).toBeLessThanOrEqual(300 * 1024);

    // Размеры берутся у самого файла: объявление, разошедшееся с ним, строит неверную карточку.
    const actual = await page.evaluate(
      (source) =>
        new Promise<{ width: number; height: number }>((resolve, reject) => {
          const probe = new Image();
          probe.onload = () => resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
          probe.onerror = () => reject(new Error('изображение предпросмотра не загрузилось'));
          probe.src = source;
        }),
      toLocalPath(url!),
    );
    expect(actual).toEqual(declared);
  });

  test('все абсолютные адреса используют хост с www и не ведут на перенаправление', async ({
    request,
  }) => {
    for (const { path } of allPages) {
      const response = await request.get(path);
      expect(response.status(), `${path} не отдаётся`).toBe(200);

      const html = await response.text();
      const found = [...html.matchAll(/https?:\/\/[^"'\s<>)\\]+/g)].map((match) => match[0]);
      const own = found.filter((url) => url.includes('lada.kiev.ua'));

      expect(own.length, `на ${path} нет ни одного собственного абсолютного адреса`).toBeGreaterThan(
        0,
      );
      expect(
        own.filter((url) => url.startsWith(APEX_ORIGIN)),
        `на ${path} объявлен неканонический хост`,
      ).toEqual([]);

      for (const url of new Set(own)) {
        const response = await request.get(toLocalPath(url), { maxRedirects: 0 });
        expect(response.status(), `${url} не отвечает напрямую`).toBe(200);
      }
    }
  });
});
