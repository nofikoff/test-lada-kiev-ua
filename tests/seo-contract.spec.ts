import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  ABOUT,
  ABOUT_COPY_SELECTOR,
  ALUMNI,
  allPages,
  ANALYTICS_ID,
  APEX_ORIGIN,
  barePath,
  categoryPages,
  countWords,
  EXPERT_COPY_SELECTOR,
  EXPERT_PAGES,
  expectedPricedRows,
  FOUNDER_ROLE,
  GUIDE_COPY_SELECTOR,
  GUIDE_PAGES,
  homePages,
  htmlToText,
  INSTAGRAM,
  LOCALES,
  localesOf,
  normalize,
  pathIn,
  PHONE,
  priceRange,
  readPrices,
  SERVICE_COPY_SELECTOR,
  SERVICE_SUBPAGES,
  servicePages,
  SITE_ORIGIN,
  subpagePages,
  toLocalPath,
  type Locale,
  type PricedRow,
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
 * Страница услуги, которая не отдаётся, останавливает каждую проверку ниже здесь — с указанием
 * адреса, а не с разбором `null` там, где ожидалась разметка.
 */
async function requireServicePage(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), `${path}: страница услуги не отдаётся`).toBe(200);
  return response.text();
}

function homeOf(locale: Locale): string {
  return homePages.find((entry) => entry.locale === locale)!.path;
}

/** Адрес цепочки навигации: строкой или узлом с `@id`. */
function crumbAddress(item: Record<string, unknown>): unknown {
  return typeof item.item === 'string' ? item.item : (item.item as Record<string, unknown>)?.['@id'];
}

/**
 * Строки видимого прайса с суммами. Долевая цена печатается подписью без валюты и строки
 * с суммой не даёт; описание позиции — вложенный элемент, поэтому название собирается из
 * текстовых узлов.
 */
async function shownPricedRows(page: Page): Promise<PricedRow[]> {
  return page.locator('#services .item').evaluateAll((rows) =>
    rows
      .filter((row) => row.querySelector('.tier__cur'))
      .map((row) => ({
        name: [...row.querySelector('.item__name')!.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join('')
          .trim(),
        sums: [...row.querySelectorAll('.tier__sum')].map((sum) => Number(sum.textContent)),
      })),
  );
}

/**
 * Предложения, сведённые к строкам прайса: вариант называется «позиция — длительность» и несёт
 * `eligibleQuantity`, а позиция с вариантами в прайсе — одна строка с колонкой сумм.
 */
function offeredRows(offers: Record<string, unknown>[]): PricedRow[] {
  const rows: { name: string; sums: number[] }[] = [];
  let variantOf: string | null = null;
  for (const offer of offers) {
    const name = String(offer.name);
    if (!offer.eligibleQuantity) {
      rows.push({ name, sums: [Number(offer.price)] });
      variantOf = null;
      continue;
    }
    const position = name.slice(0, name.lastIndexOf(' — '));
    if (position !== variantOf) rows.push({ name: position, sums: [] });
    rows[rows.length - 1].sums.push(Number(offer.price));
    variantOf = position;
  }
  return rows;
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
      // Языки — `knowsLanguage`, не `availableLanguage` (ADR-022).
      expect(asArray(business!.knowsLanguage).map(String).sort()).toEqual(['en', 'ru', 'uk']);
      expect(business!.availableLanguage).toBeUndefined();

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
      await requireServicePage(request, path);
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
      await requireServicePage(request, path);
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
      await requireServicePage(request, path);
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
       * Предложения — позиции прайса с их суммами за вычетом долевых
       * (docs/specs/structured-data.md §Страница категории): предложение с нулевой ценой описывает
       * бесплатную услугу, поэтому «коррекция 50%» в перечень не попадает.
       */
      const offers = nodes.filter((node) => node['@type'] === 'Offer');
      for (const offer of offers) {
        expect(Number(offer.price), `нулевая цена в ${JSON.stringify(offer)}`).toBeGreaterThan(0);
        expect(offer.priceCurrency).toBe('UAH');
      }
      expect(offeredRows(offers), `предложения на ${path}`).toEqual(expectedPricedRows(category, locale));
    });

    test('цепочка навигации ведёт с главной на страницу категории', async ({ page, request }) => {
      await requireServicePage(request, path);
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

/** Формат площадок предпросмотра для языков, которые у подстраницы есть. */
function ogAlternates(pageLocales: readonly Locale[], own: Locale): string[] {
  return pageLocales.filter((code) => code !== own).map((code) => OG_LOCALE[code]);
}

/**
 * Подстраницы (ADR-028): та же заголовочная часть, что у категории, кроме языков — английской
 * версии нет, поэтому её нет ни в `hreflang`, ни в `og:locale:alternate`.
 */
for (const { locale, category, subpage, path } of subpagePages) {
  const categoryPath = categoryPages.find(
    (entry) => entry.locale === locale && entry.category === category,
  )!.path;
  const siblings = subpagePages.filter((entry) => entry.subpage === subpage);
  const ukPath = siblings.find((entry) => entry.locale === 'uk')!.path;

  test.describe(`подстраница ${path}`, () => {
    test('язык документа, единственный заголовок и канонический адрес на себя', async ({
      page,
      request,
    }) => {
      await requireServicePage(request, path);
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE_ORIGIN}${path}`);
    });

    test('языковые альтернативы — только языки подстраницы и x-default на украинскую', async ({
      page,
      request,
    }) => {
      await requireServicePage(request, path);
      await page.goto(path);

      const pairs = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) =>
          links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')] as const),
        );
      expect(Object.fromEntries(pairs)).toEqual({
        ...Object.fromEntries(siblings.map((entry) => [entry.locale, `${SITE_ORIGIN}${entry.path}`])),
        'x-default': `${SITE_ORIGIN}${ukPath}`,
      });

      for (const [, href] of pairs) {
        const response = await request.get(toLocalPath(href!), { maxRedirects: 0 });
        expect(response.status(), `языковая альтернатива ${href}`).toBe(200);
      }
    });

    test('альтернативные локали предпросмотра — только второй язык подстраницы', async ({
      page,
    }) => {
      await page.goto(path);

      expect(await metaContent(page, 'meta[property="og:locale"]')).toBe(OG_LOCALE[locale]);
      const alternates = await page
        .locator('meta[property="og:locale:alternate"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content')));
      expect(alternates.sort()).toEqual(ogAlternates(SERVICE_SUBPAGES[subpage].locales, locale).sort());
    });

    test('описание услуги с предложениями по ценам способа страницы', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);

      const service = nodes.find((node) => node['@type'] === 'Service');
      expect(service, 'нет описания услуги').toBeDefined();
      expect(service!.name).toBe((await page.locator('h1').innerText()).trim());
      expect(service!.url).toBe(`${SITE_ORIGIN}${path}`);
      expect(service!.description).toBe(await metaContent(page, 'meta[name="description"]'));
      expect((service!.provider as Record<string, unknown>)['@id']).toBe(
        `${SITE_ORIGIN}${homeOf(locale)}#business`,
      );

      const offers = nodes.filter((node) => node['@type'] === 'Offer');
      for (const offer of offers) {
        expect(Number(offer.price), `нулевая цена в ${JSON.stringify(offer)}`).toBeGreaterThan(0);
        expect(offer.priceCurrency).toBe('UAH');
      }
    });

    test('цепочка навигации из трёх звеньев: главная, категория, подстраница', async ({
      page,
      request,
    }) => {
      await page.goto(path);
      const nodes = await structuredData(page);

      const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
      expect(breadcrumb, 'нет цепочки навигации').toBeDefined();
      const items = asArray(breadcrumb!.itemListElement) as Record<string, unknown>[];

      expect(items.map(crumbAddress)).toEqual([
        `${SITE_ORIGIN}${homeOf(locale)}`,
        `${SITE_ORIGIN}${categoryPath}`,
        `${SITE_ORIGIN}${path}`,
      ]);
      expect(items.map((item) => Number(item.position))).toEqual([1, 2, 3]);

      // Среднее звено называет категорию так же, как её собственный главный заголовок.
      const categoryHtml = await requireServicePage(request, categoryPath);
      const categoryHeading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(categoryHtml)?.[1] ?? '';
      expect(normalize(String(items[1].name))).toBe(normalize(htmlToText(categoryHeading)));
      expect(normalize(String(items[2].name))).toBe(normalize(await page.locator('h1').innerText()));
    });

    test('видимые крошки ведут на главную и категорию своего языка', async ({ page }) => {
      await page.goto(path);

      const crumbs = page.locator('main nav ol > li:not([aria-hidden="true"])');
      await expect(crumbs).toHaveCount(3);
      await expect(crumbs.nth(0).locator('a')).toHaveAttribute('href', homeOf(locale));
      await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', categoryPath);
      await expect(crumbs.nth(2)).toHaveAttribute('aria-current', 'page');
      await expect(crumbs.nth(2).locator('a')).toHaveCount(0);
    });

    test('переключатель языка ведёт на главные языков, как на всём сайте', async ({ page }) => {
      await page.goto(path);

      const links = await page
        .locator('header a[hreflang]')
        .evaluateAll((anchors) =>
          anchors.map((anchor) => [anchor.getAttribute('hreflang'), anchor.getAttribute('href')] as const),
        );
      expect(new Set(links.map(([code]) => code))).toEqual(new Set(LOCALES));
      for (const [code, href] of links) {
        expect(href, `переключатель ${code}`).toBe(homeOf(code as Locale));
      }
    });

    /**
     * Посетитель и поисковик видят одни и те же позиции в одном порядке и по одной сумме — цене
     * способа страницы из `prices.json` (docs/specs/structured-data.md §Service subpage). Ожидание
     * считается от прайса, а не от второй стороны: иначе страница шугаринга, читающая общую цену
     * вместо цены пастой, совпала бы сама с собой. Список, а не множество: «Пахви» стоит и в
     * женской, и в мужской группе.
     */
    test('прайс и предложения перечисляют позиции и суммы цены способа страницы', async ({ page }) => {
      await page.goto(path);

      const expected = expectedPricedRows(subpage, locale);
      expect(expected.length, `${path}: в группах страницы нет позиций с суммой`).toBeGreaterThan(0);
      expect(await shownPricedRows(page), 'видимый прайс').toEqual(expected);
      const offers = (await structuredData(page)).filter((node) => node['@type'] === 'Offer');
      expect(offeredRows(offers), 'предложения').toEqual(expected);
    });
  });
}

/** Подписи групп прайса из словаря интерфейса (`priceList.sections`) — литералами, как хост. */
const SUGARING_SECTIONS: Record<'uk' | 'ru', { shown: string[]; absent: string[] }> = {
  uk: {
    shown: [
      'Жіноча депіляція',
      'Жіночі комплекси (Вигідно!)',
      'Чоловіча депіляція (Віск / Цукор)',
      'Чоловічі комплекси — Віск / Цукор (Вигідно!)',
    ],
    absent: ['Чоловіча депіляція (Тример / Бритва)', 'Чоловічі комплекси — Тример / Бритва (Вигідно!)'],
  },
  ru: {
    shown: [
      'Женская депиляция',
      'Женские комплексы (Выгодно!)',
      'Мужская депиляция (Воск / Сахар)',
      'Мужские комплексы — Воск / Сахар (Выгодно!)',
    ],
    absent: ['Мужская депиляция (Триммер / Бритва)', 'Мужские комплексы — Триммер / Бритва (Выгодно!)'],
  },
};

test.describe('прайс страницы шугаринга', () => {
  for (const { locale, path } of subpagePages.filter((entry) => entry.subpage === 'sugaring')) {
    test(`${path}: четыре раздела «Віск / Цукор», разделов триммера нет`, async ({ page }) => {
      await page.goto(path);

      // Текстом узла, а не отрисовки: надзаголовок может быть набран через `text-transform`.
      const sections = (await page.locator('#services h3').allTextContents()).map(normalize);
      const expected = SUGARING_SECTIONS[locale as 'uk' | 'ru'];
      expect(sections).toEqual(expected.shown);
      for (const label of expected.absent) expect(sections).not.toContain(label);
    });
  }
});

/**
 * Коррекция бровей — доля от процедуры (docs/specs/content-model.md §Инварианты): подписью из
 * прайса, без валюты. Подпись берётся из `prices.json`, а не литералом: доли и суммы правит Лада.
 * Что предложения на долю нет, держит сверка прайса с `Offer` выше. Текст страницы долю обновления
 * не называет и опирается на сноску под прайсом, поэтому сноска проверяется здесь же.
 */
test.describe('прайс страницы бровей', () => {
  const browGroups: readonly string[] = SERVICE_SUBPAGES.brows.groups;
  const shares = readPrices().filter(
    (record) => browGroups.includes(record.group) && record.price.kind === 'share',
  );

  for (const { locale, path } of subpagePages.filter((entry) => entry.subpage === 'brows')) {
    test(`${path}: коррекция показана долей из прайса, сноска об обновлении на месте`, async ({
      page,
    }) => {
      expect(shares.length, 'в группе бровей нет долевой позиции').toBeGreaterThan(0);
      await page.goto(path);

      const rows = await page.locator('#services .item').evaluateAll((items) =>
        items.map((row) => ({
          name: [...row.querySelector('.item__name')!.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent)
            .join('')
            .trim(),
          sums: [...row.querySelectorAll('.tier__sum')].map((sum) => sum.textContent!.trim()),
          currency: row.querySelector('.tier__cur') !== null,
        })),
      );

      for (const record of shares) {
        const note = record.price.kind === 'share' ? record.price.note[locale] : '';
        expect(rows.filter((row) => row.name === record.name[locale])).toEqual([
          { name: record.name[locale], sums: [note], currency: false },
        ]);
      }

      await expect(page.locator('#services .price__note')).toHaveCount(1);
    });
  }
});

/**
 * Объём и уникальность текста (docs/specs/content-model.md §Страница категории, §Service subpage). Счётчик слов —
 * рабочее определение «содержательного текста»: четыреста слов нельзя набрать шаблоном
 * с подставленным названием. Считается только контейнер текста страницы — прайс и подвал
 * набрали бы норму сами. Категории и подстраницы сверяются вместе: абзац, перенесённый из категории
 * в подстраницу без удаления, повторяется внутри языка.
 */
test.describe('тексты страниц услуг', () => {
  for (const locale of LOCALES) {
    test(`тексты локали ${locale} не короче 400 слов и не повторяют друг друга`, async ({
      page,
      request,
    }) => {
      const paragraphsByPage = new Map<string, string[]>();

      for (const entry of servicePages.filter((candidate) => candidate.locale === locale)) {
        await requireServicePage(request, entry.path);
        await page.goto(entry.path);

        const copy = page.locator(SERVICE_COPY_SELECTOR);
        await expect(
          copy,
          `${entry.path}: контейнер ${SERVICE_COPY_SELECTOR} — договорённость с шаблоном страницы услуги`,
        ).toHaveCount(1);

        const words = countWords(await copy.innerText());
        expect(words, `${entry.path}: ${words} слов`).toBeGreaterThanOrEqual(400);

        const paragraphs = (await copy.locator('p').allInnerTexts())
          .map(normalize)
          .filter((paragraph) => paragraph.length > 0);
        expect(paragraphs.length, `${entry.path}: текст без абзацев`).toBeGreaterThan(0);
        paragraphsByPage.set(entry.path, paragraphs);
      }

      // Две страницы с одним адресом слились бы в одну запись и молча выпали бы из сверки ниже.
      expect(paragraphsByPage.size, `страниц услуг локали ${locale} в сверке`).toBe(
        servicePages.filter((candidate) => candidate.locale === locale).length,
      );

      const owner = new Map<string, string>();
      for (const [path, paragraphs] of paragraphsByPage) {
        for (const paragraph of paragraphs) {
          expect(
            owner.get(paragraph),
            `абзац повторяется в «${owner.get(paragraph)}» и «${path}»: ${paragraph.slice(0, 60)}…`,
          ).toBeUndefined();
          owner.set(paragraph, path);
        }
      }
    });
  }
});

/** `@id` основательницы и организации на главной языка: страницы базы знаний ссылаются на них. */
async function homeIds(request: APIRequestContext, locale: Locale): Promise<{ founder: string; business: string }> {
  const response = await request.get(homeOf(locale));
  expect(response.status(), `${homeOf(locale)} не отдаётся`).toBe(200);
  const html = await response.text();
  const nodes = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(
    ([, block]) => flattenGraph(JSON.parse(block)),
  );
  const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness')!;
  return {
    founder: String((business.founder as Record<string, unknown>)['@id']),
    business: String(business['@id']),
  };
}

/** Страница эксперта языка: на неё ведут подпись статьи и `url` автора. */
function expertOf(locale: Locale): string {
  return EXPERT_PAGES.find((entry) => entry.locale === locale)!.path;
}

/** Видимые крошки: имя и адрес каждого звена, текущая страница — без ссылки. */
async function visibleCrumbs(page: Page): Promise<{ name: string; href: string | null }[]> {
  return page.locator('main nav ol > li:not([aria-hidden="true"])').evaluateAll((items) =>
    items.map((item) => ({
      name: (item.textContent ?? '').replace(/\s+/g, ' ').trim(),
      href: item.querySelector('a')?.getAttribute('href') ?? (item.getAttribute('aria-current') ? null : '?'),
    })),
  );
}

/**
 * Хаб и статья базы знаний: заголовочная часть и JSON-LD по
 * specs/007-knowledge-base-pilot/contracts/page-head-and-jsonld.md §Checks.
 */
for (const guidePage of GUIDE_PAGES) {
  const { locale, path, kind, category } = guidePage;
  const own = localesOf(guidePage);
  const bare = barePath(path);
  const canonical = `${SITE_ORIGIN}${path}`;
  const hub = GUIDE_PAGES.find(
    (entry) => entry.kind === 'hub' && entry.locale === locale && entry.category === category,
  )!;
  const articles = GUIDE_PAGES.filter(
    (entry) => entry.kind === 'article' && entry.locale === locale && entry.category === category,
  );

  test.describe(`база знаний ${path}`, () => {
    test('язык, один h1, канонический адрес и альтернативы — только языки страницы', async ({
      page,
      request,
    }) => {
      expect((await request.get(path)).status(), `${path} не отдаётся`).toBe(200);
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);

      const pairs = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) =>
          links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')] as const),
        );
      const versions = Object.fromEntries(own.map((code) => [code, `${SITE_ORIGIN}${pathIn(code, bare)}`]));
      expect(Object.fromEntries(pairs)).toEqual({
        ...versions,
        'x-default': versions.uk ?? versions[own[0]],
      });
      for (const [, href] of pairs) {
        const response = await request.get(toLocalPath(href!), { maxRedirects: 0 });
        expect(response.status(), `языковая альтернатива ${href}`).toBe(200);
      }

      expect(await metaContent(page, 'meta[property="og:type"]')).toBe('website');
      expect(await metaContent(page, 'meta[property="og:locale"]')).toBe(OG_LOCALE[locale]);
      const alternates = await page
        .locator('meta[property="og:locale:alternate"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content')));
      expect(alternates.sort()).toEqual(ogAlternates(own, locale).sort());
    });

    test('один блок JSON-LD, FAQPage нет', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
      const nodes = await structuredData(page);
      // ADR-020: вопрос в заголовке статьи не делает её FAQ.
      expect(nodes.filter((node) => node['@type'] === 'FAQPage')).toEqual([]);
    });

    test('BreadcrumbList повторяет видимые крошки', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
      expect(breadcrumb, 'нет цепочки навигации').toBeDefined();
      const items = asArray(breadcrumb!.itemListElement) as Record<string, unknown>[];

      const chain = kind === 'article' ? [homeOf(locale), hub.path, path] : [homeOf(locale), path];
      expect(items.map(crumbAddress)).toEqual(chain.map((step) => `${SITE_ORIGIN}${step}`));
      expect(items.map((item) => Number(item.position))).toEqual(chain.map((_, index) => index + 1));

      const crumbs = await visibleCrumbs(page);
      expect(crumbs.map((crumb) => normalize(crumb.name))).toEqual(
        items.map((item) => normalize(String(item.name))),
      );
      expect(crumbs.map((crumb) => crumb.href)).toEqual([...chain.slice(0, -1), null]);
      expect(normalize(crumbs.at(-1)!.name)).toBe(normalize(await page.locator('h1').innerText()));
    });

    if (kind === 'article') {
      test('Article: автор — основательница главной, издатель — организация, даты как на странице', async ({
        page,
        request,
      }) => {
        await page.goto(path);
        const nodes = await structuredData(page);
        const article = nodes.find((node) => node['@type'] === 'Article' && node['@id'] === `${canonical}#article`);
        expect(article, 'нет узла Article').toBeDefined();

        const ids = await homeIds(request, locale);
        const author = article!.author as Record<string, unknown>;
        const publisher = article!.publisher as Record<string, unknown>;
        expect(author['@id']).toBe(ids.founder);
        expect(author.name).toBe(ABOUT[locale].signatureName);
        expect(author.url).toBe(`${SITE_ORIGIN}${expertOf(locale)}`);
        expect(publisher['@id']).toBe(ids.business);
        expect(publisher.name).toBe('Lada N');
        expect(publisher.url).toBe(`${SITE_ORIGIN}${homeOf(locale)}`);

        expect(normalize(String(article!.headline))).toBe(normalize(await page.locator('h1').innerText()));
        expect(article!.description).toBe(await metaContent(page, 'meta[name="description"]'));
        expect(article!.url).toBe(canonical);
        expect(article!.mainEntityOfPage).toBe(canonical);
        expect(article!.inLanguage).toBe(locale);
        expect(article!.image).toBe(await metaContent(page, 'meta[property="og:image"]'));

        const published = String(article!.datePublished);
        const modified = String(article!.dateModified);
        expect(published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(published <= modified, `datePublished ${published} позже dateModified ${modified}`).toBe(true);

        const shown = await page
          .locator('main time[datetime]')
          .evaluateAll((times) => times.map((time) => time.getAttribute('datetime')));
        expect(shown, 'видимые даты публикации и правки').toEqual([published, modified]);
      });

      test('текст статьи не короче 400 слов', async ({ page }) => {
        await page.goto(path);
        const copy = page.locator(GUIDE_COPY_SELECTOR);
        await expect(copy).toHaveCount(1);
        const words = countWords(await copy.innerText());
        expect(words, `${path}: ${words} слов`).toBeGreaterThanOrEqual(400);
      });
    } else {
      test('CollectionPage.hasPart — статьи списка хаба в его порядке', async ({ page }) => {
        await page.goto(path);
        const nodes = await structuredData(page);
        const collection = nodes.find((node) => node['@type'] === 'CollectionPage');
        expect(collection, 'нет узла CollectionPage').toBeDefined();
        expect(collection!['@id']).toBe(`${canonical}#page`);
        expect(normalize(String(collection!.name))).toBe(normalize(await page.locator('h1').innerText()));
        expect(collection!.url).toBe(canonical);
        expect(collection!.inLanguage).toBe(locale);

        const parts = asArray(collection!.hasPart) as Record<string, unknown>[];
        const articlePaths = new Set(articles.map((entry) => entry.path));
        const listed = (
          await page.locator('main a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!))
        ).filter((href) => articlePaths.has(href));
        expect(new Set(listed), 'список хаба против статей категории').toEqual(articlePaths);
        expect(parts.map((part) => part.url)).toEqual(listed.map((href) => `${SITE_ORIGIN}${href}`));
        expect(parts.map((part) => part['@id'])).toEqual(listed.map((href) => `${SITE_ORIGIN}${href}#article`));
      });
    }
  });
}

/**
 * Страница эксперта: заголовочная часть, `ProfilePage` с тем же узлом основательницы, что на главной,
 * без крошек, и список статей своего языка (contracts/page-head-and-jsonld.md §Expert).
 */
for (const expertPage of EXPERT_PAGES) {
  const { locale, path } = expertPage;
  const canonical = `${SITE_ORIGIN}${path}`;
  const own = localesOf(expertPage);
  const articles = GUIDE_PAGES.filter((entry) => entry.kind === 'article' && entry.locale === locale);

  test.describe(`страница эксперта ${path}`, () => {
    test('язык, один h1, канонический адрес, альтернативы uk и ru, x-default — /lada/', async ({
      page,
      request,
    }) => {
      expect((await request.get(path)).status(), `${path} не отдаётся`).toBe(200);
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);

      const pairs = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) =>
          links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')] as const),
        );
      expect(Object.fromEntries(pairs)).toEqual({
        uk: `${SITE_ORIGIN}/lada/`,
        ru: `${SITE_ORIGIN}/ru/lada/`,
        'x-default': `${SITE_ORIGIN}/lada/`,
      });

      expect(await metaContent(page, 'meta[property="og:type"]')).toBe('website');
      expect(await metaContent(page, 'meta[property="og:locale"]')).toBe(OG_LOCALE[locale]);
      const alternates = await page
        .locator('meta[property="og:locale:alternate"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content')));
      expect(alternates.sort()).toEqual(ogAlternates(own, locale).sort());
    });

    test('ProfilePage: главный предмет — основательница главной своего языка', async ({ page, request }) => {
      await page.goto(path);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
      const nodes = await structuredData(page);

      const profile = nodes.find((node) => node['@type'] === 'ProfilePage');
      expect(profile, 'нет узла ProfilePage').toBeDefined();
      expect(profile!['@id']).toBe(`${canonical}#page`);
      expect(normalize(String(profile!.name))).toBe(normalize(await page.locator('h1').innerText()));
      expect(profile!.url).toBe(canonical);
      expect(profile!.inLanguage).toBe(locale);

      const subject = profile!.mainEntity as Record<string, unknown>;
      expect(subject['@id']).toBe((await homeIds(request, locale)).founder);
      expect(subject['@type']).toBe('Person');
      expect(subject.name).toBe(ABOUT[locale].signatureName);
      expect(subject.jobTitle).toBe(FOUNDER_ROLE[locale]);
      expect(subject.url).toBe(canonical);
      expect(subject.alumniOf).toEqual({ '@type': 'CollegeOrUniversity', name: ALUMNI.name, sameAs: ALUMNI.sameAs });
      expect(nodes.filter((node) => node['@type'] === 'FAQPage')).toEqual([]);
    });

    test('крошек нет ни в разметке, ни на странице', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      expect(nodes.filter((node) => node['@type'] === 'BreadcrumbList')).toEqual([]);
      await expect(page.locator('main nav')).toHaveCount(0);
    });

    test('список статей — статьи базы знаний своего языка с их заголовками', async ({ page, request }) => {
      expect(articles.length, `у языка ${locale} нет статей`).toBeGreaterThan(0);
      await page.goto(path);

      const listed = await page
        .locator('main a[href*="/guide/"]')
        .evaluateAll((links) =>
          links.map((link) => ({ href: link.getAttribute('href')!, text: link.textContent ?? '' })),
        );
      expect(listed.map((link) => link.href).sort()).toEqual(articles.map((entry) => entry.path).sort());

      // Текст пункта — заголовок статьи, как её собственный h1.
      for (const link of listed) {
        const html = await (await request.get(link.href)).text();
        const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
        expect(normalize(link.text), link.href).toBe(normalize(htmlToText(heading)));
      }
    });

    test('ни один абзац текста не повторяет обращение «Про нас» своего языка', async ({ page }) => {
      await page.goto(homeOf(locale));
      const about = new Set((await page.locator(`${ABOUT_COPY_SELECTOR} p`).allInnerTexts()).map(normalize));
      expect(about.size, `${homeOf(locale)}: обращение без абзацев`).toBeGreaterThan(0);

      await page.goto(path);
      const copy = page.locator(EXPERT_COPY_SELECTOR);
      await expect(copy).toHaveCount(1);
      const paragraphs = (await copy.locator('p').allInnerTexts()).map(normalize).filter(Boolean);
      expect(paragraphs.length, `${path}: текст без абзацев`).toBeGreaterThan(0);
      for (const paragraph of paragraphs) expect(about.has(paragraph), paragraph).toBe(false);
    });
  });
}

/**
 * Абзацы статей и хабов не повторяют ни друг друга, ни тексты услуг, ни обращение «Про нас»
 * своего языка (specs/007-knowledge-base-pilot/contracts/content-files.md §Text rules).
 */
test.describe('тексты базы знаний', () => {
  for (const locale of ['uk', 'ru'] as const) {
    test(`абзацы базы знаний локали ${locale} не повторяют другие страницы`, async ({ page }) => {
      const sources = [
        ...GUIDE_PAGES.filter((entry) => entry.locale === locale).map((entry) => ({
          path: entry.path,
          selector: GUIDE_COPY_SELECTOR,
        })),
        ...servicePages
          .filter((entry) => entry.locale === locale)
          .map((entry) => ({ path: entry.path, selector: SERVICE_COPY_SELECTOR })),
        { path: homeOf(locale), selector: ABOUT_COPY_SELECTOR },
      ];

      const owner = new Map<string, string>();
      for (const { path, selector } of sources) {
        await page.goto(path);
        const copy = page.locator(selector);
        await expect(copy, `${path}: контейнер ${selector}`).toHaveCount(1);
        const paragraphs = (await copy.locator('p').allInnerTexts()).map(normalize).filter(Boolean);
        expect(paragraphs.length, `${path}: текст без абзацев`).toBeGreaterThan(0);
        for (const paragraph of paragraphs) {
          expect(
            owner.get(paragraph),
            `абзац повторяется в «${owner.get(paragraph)}» и «${path}»: ${paragraph.slice(0, 60)}…`,
          ).toBeUndefined();
          owner.set(paragraph, path);
        }
      }
    });
  }
});

test.describe('сквозные требования ко всем страницам', () => {
  test('пара «заголовок + описание» уникальна', async ({ request }) => {
    const pairs: string[] = [];

    // Требование проверяется по всем страницам сайта: нарушение возникает между файлами,
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
   * Превью — кадр портрета Лады, одинаковый на всех страницах сайта, собранный в `_astro/`
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
