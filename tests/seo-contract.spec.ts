import { expect, test, type Page } from '@playwright/test';
import {
  ANALYTICS_ID,
  APEX_ORIGIN,
  homePages,
  INSTAGRAM,
  PHONE,
  priceRange,
  SITE_ORIGIN,
  toLocalPath,
  type Locale,
} from './support/site';

/**
 * Контракт заголовочной части ([contracts/page-head.md]) и машиночитаемого описания
 * ([contracts/structured-data.md]). Проверяется по собранному HTML: требование относится
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

      const images = asArray(business!.image).map(String);
      expect(images.length).toBeGreaterThan(0);
      for (const image of images) expect(image.startsWith(SITE_ORIGIN)).toBe(true);

      const hours = asArray(business!.openingHoursSpecification)[0] as Record<string, unknown>;
      expect(asArray(hours.dayOfWeek)).toHaveLength(7);
      expect(hours.opens).toBe('10:00');
      expect(hours.closes).toBe('21:00');
    });

    test('адрес взят на языке страницы', async ({ page }) => {
      await page.goto(path);
      const nodes = await structuredData(page);
      const business = nodes.find((node) => node['@type'] === 'HealthAndBeautyBusiness');
      const address = business!.address as Record<string, unknown>;

      expect(address['@type']).toBe('PostalAddress');
      expect(address.addressCountry).toBe('UA');

      // Текстовые поля обязаны совпасть с тем, что видит посетитель этой языковой версии.
      const footer = await page.locator('footer').innerText();
      expect(footer).toContain(String(address.addressLocality));
      expect(footer).toContain(String(address.streetAddress));
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

test.describe('сквозные требования ко всем страницам', () => {
  test('пара «заголовок + описание» уникальна', async ({ request }) => {
    const pairs: string[] = [];

    for (const { path } of homePages) {
      const html = await (await request.get(path)).text();
      const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
      const description =
        /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';

      expect(title.trim().length, `пустой заголовок на ${path}`).toBeGreaterThan(0);
      expect(description.trim().length, `пустое описание на ${path}`).toBeGreaterThan(0);
      pairs.push(`${title} ${description}`);
    }

    expect(new Set(pairs).size, 'повторяющаяся пара «заголовок + описание»').toBe(pairs.length);
  });

  test('все абсолютные адреса используют хост с www и не ведут на перенаправление', async ({
    request,
  }) => {
    for (const { path } of homePages) {
      const html = await (await request.get(path)).text();
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
