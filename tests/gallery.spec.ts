import { expect, test, type Page } from '@playwright/test';
import { homePages, type Locale } from './support/site';

/**
 * Лента работ на главной (specs/003-lada-photos-home/contracts/gallery.md; FR-009…FR-019, FR-026).
 *
 * Состав и порядок ленты записаны здесь литералами, а не прочитаны из `src/data/gallery.json`:
 * проверка, читающая те же данные, что и страница, доказала бы только их согласие с самими собой
 * (тот же довод — `tests/support/site.ts`).
 */
type Category = 'massage' | 'depilation' | 'beauty';

const STRIP: readonly { id: string; category?: Category }[] = [
  { id: 'lada-novikova-massage-tea', category: 'massage' },
  { id: 'lada-novikova-wax-spatulas', category: 'depilation' },
  { id: 'lada-novikova-bamboo-sticks', category: 'massage' },
  { id: 'lada-novikova-studio-portrait' },
  { id: 'lada-novikova-sugaring', category: 'depilation' },
  { id: 'depilation-wax-beads', category: 'depilation' },
  { id: 'lada-novikova-candles' },
  { id: 'lada-novikova-warm-wax', category: 'depilation' },
  { id: 'lada-novikova-makeup-mirror', category: 'beauty' },
  { id: 'massage-tools', category: 'massage' },
  { id: 'studio-terrace' },
];

const SERVICE_NAMES: Record<Locale, Record<Category, string>> = {
  uk: { massage: 'Масаж', depilation: 'Депіляція', beauty: 'Make-up' },
  ru: { massage: 'Массаж', depilation: 'Депиляция', beauty: 'Make-up' },
  en: { massage: 'Massage', depilation: 'Hair Removal', beauty: 'Make-up' },
};

const BUTTONS: Record<Locale, { prev: string; next: string }> = {
  uk: { prev: 'Попереднє фото', next: 'Наступне фото' },
  ru: { prev: 'Предыдущее фото', next: 'Следующее фото' },
  en: { prev: 'Previous photo', next: 'Next photo' },
};

function categoryPath(locale: Locale, category: Category): string {
  return `${locale === 'uk' ? '' : `/${locale}`}/${category}/`;
}

const strip = (page: Page) => page.locator('[data-gallery]');
const cards = (page: Page) => page.locator('[data-gallery] li');

/** Прокрутка, дождавшаяся конца плавного сдвига: два одинаковых замера подряд. */
async function settledScroll(page: Page): Promise<number> {
  let previous = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = await strip(page).evaluate((element) => element.scrollLeft);
    if (current === previous) return current;
    previous = current;
    await page.waitForTimeout(100);
  }
  return previous;
}

/** Шаг ленты — ширина карточки плюс зазор между карточками. */
async function step(page: Page): Promise<number> {
  return cards(page)
    .first()
    .evaluate((card) => {
      const list = card.parentElement!;
      return card.getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap || '0');
    });
}

/** Журнал событий gtag, переживающий переход на другую страницу. */
async function recordAnalytics(page: Page) {
  await page.addInitScript(() => {
    const key = 'gallery-spec-events';
    const layer = ((window as unknown as { dataLayer: unknown[] }).dataLayer ??= []);
    const push = layer.push.bind(layer);
    layer.push = (...entries: unknown[]) => {
      for (const entry of entries) {
        const args = Array.from(entry as ArrayLike<unknown>);
        if (args[0] === 'event') {
          const log = JSON.parse(sessionStorage.getItem(key) ?? '[]');
          log.push(args);
          sessionStorage.setItem(key, JSON.stringify(log));
        }
      }
      return push(...entries);
    };
  });
}

async function galleryEvents(page: Page): Promise<unknown[][]> {
  const log = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gallery-spec-events') ?? '[]'));
  return (log as unknown[][]).filter((args) => args[1] === 'gallery_click');
}

function luminance([r, g, b]: number[]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: number[], b: number[]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Цвет обводки фокуса и цвет подложки под элементом, сложенный из фонов предков. */
async function focusColors(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.focus();
  return target.evaluate((element) => {
    const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
    const style = getComputedStyle(element);
    const layers: number[][] = [];
    for (let node: Element | null = element.parentElement; node; node = node.parentElement) {
      const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor);
      if (a > 0) layers.push([r, g, b, a]);
      if (a >= 1) break;
    }
    const base = layers.pop() ?? [0, 0, 0, 1];
    const background = layers.reverse().reduce(
      (under, [r, g, b, a]) => [r * a + under[0] * (1 - a), g * a + under[1] * (1 - a), b * a + under[2] * (1 - a)],
      base.slice(0, 3),
    );
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outline: parse(style.outlineColor).slice(0, 3),
      background,
    };
  });
}

for (const { locale, path } of homePages) {
  test.describe(`лента ${path}`, () => {
    test('стоит между «О нас» и обзором услуг, 11 карточек в заданном порядке', async ({ page }) => {
      await page.goto(path);

      const order = await page.evaluate(() => {
        const about = document.querySelector('#about');
        const gallery = document.querySelector('#gallery');
        const services = document.querySelector('.door')?.closest('section');
        if (!about || !gallery || !services) return null;
        return {
          afterAbout: Boolean(about.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING),
          beforeServices: Boolean(gallery.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(order, 'нет #about, #gallery или обзора услуг').not.toBeNull();
      expect(order).toEqual({ afterAbout: true, beforeServices: true });

      await expect(cards(page)).toHaveCount(STRIP.length);
      for (const [index, expected] of STRIP.entries()) {
        const card = cards(page).nth(index);
        expect(await card.locator('img').getAttribute('src'), `карточка ${index + 1}`).toContain(expected.id);

        if (expected.category) {
          await expect(card.locator('a')).toHaveAttribute('href', categoryPath(locale, expected.category));
          await expect(card.locator('figcaption')).toHaveText(SERVICE_NAMES[locale][expected.category]);
        } else {
          await expect(card.locator('a'), `у ${expected.id} не должно быть ссылки`).toHaveCount(0);
          await expect(card.locator('figcaption')).toHaveCount(0);
        }
      }
    });

    test('описания непустые и не повторяются, фото ленты отложены', async ({ page }) => {
      await page.goto(path);
      const images = cards(page).locator('img');

      const alts = (await images.evaluateAll((all) => all.map((image) => image.getAttribute('alt') ?? '')))
        .map((alt) => alt.trim());
      expect(alts.filter((alt) => alt === ''), 'пустые описания').toEqual([]);
      expect(new Set(alts).size, `повторы описаний: ${alts.join(' | ')}`).toBe(alts.length);

      const eager = await images.evaluateAll((all) =>
        all.filter((image) => image.getAttribute('loading') !== 'lazy').map((image) => image.getAttribute('src')),
      );
      expect(eager, 'фото ленты без отложенной загрузки').toEqual([]);
    });

    test('лента — именованная область, достижимая с клавиатуры', async ({ page }) => {
      await page.goto(path);

      await expect(strip(page)).toHaveAttribute('role', 'region');
      await expect(strip(page)).toHaveAttribute('tabindex', '0');
      expect((await strip(page).getAttribute('aria-label'))?.trim()).toBeTruthy();

      await strip(page).focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => strip(page).evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    });

    test('ссылки ленты ведут на страницы услуг того же языка', async ({ page, request }) => {
      await page.goto(path);
      const hrefs = await cards(page)
        .locator('a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
      expect(hrefs).toHaveLength(STRIP.filter((card) => card.category).length);

      for (const href of hrefs) {
        const response = await request.get(href, { maxRedirects: 0 });
        expect(response.status(), href).toBe(200);
      }
    });

    test('кнопки сдвигают на карточку и гаснут на краях, сама лента стоит', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(path);
      await strip(page).scrollIntoViewIfNeeded();

      const prev = page.getByRole('button', { name: BUTTONS[locale].prev });
      const next = page.getByRole('button', { name: BUTTONS[locale].next });
      await expect(prev).toBeVisible();
      await expect(next).toBeVisible();
      await expect(prev).toBeDisabled();

      const before = await strip(page).evaluate((element) => element.scrollLeft);
      await page.waitForTimeout(3000);
      expect(await strip(page).evaluate((element) => element.scrollLeft), 'лента прокрутилась сама').toBe(before);

      await next.click();
      const moved = await settledScroll(page);
      expect(Math.abs(moved - (await step(page))), `сдвиг ${moved}`).toBeLessThanOrEqual(2);
      await expect(prev).toBeEnabled();

      await strip(page).evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
      await expect(next).toBeDisabled();
    });

    test('фокус на ссылке и кнопке виден: обводка не слабее 3:1 к подложке', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(path);

      for (const selector of ['[data-gallery] a', '[data-gallery-next]']) {
        const colors = await focusColors(page, selector);
        expect(colors.outlineStyle, `${selector}: нет обводки фокуса`).not.toBe('none');
        expect(colors.outlineWidth, `${selector}: обводка тоньше 2px`).toBeGreaterThanOrEqual(2);
        expect(ratio(colors.outline, colors.background), `${selector}: контраст обводки`).toBeGreaterThanOrEqual(3);
      }
    });

    test('нажатие карточки отдаёт одно событие и открывает страницу услуги', async ({ page }) => {
      await page.route('https://www.googletagmanager.com/**', (route) =>
        route.fulfill({ contentType: 'text/javascript', body: '' }),
      );
      await recordAnalytics(page);
      await page.goto(path);

      await cards(page).locator(`a[href="${categoryPath(locale, 'depilation')}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${categoryPath(locale, 'depilation')}$`));
      expect(await galleryEvents(page)).toEqual([
        ['event', 'gallery_click', { service: 'depilation', locale }],
      ]);
    });

    test('заблокированный счётчик не мешает переходу', async ({ page }) => {
      await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
      await page.goto(path);

      await cards(page).locator(`a[href="${categoryPath(locale, 'massage')}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${categoryPath(locale, 'massage')}$`));
    });

    test('открытие в новой вкладке считается одним событием', async ({ page, context }) => {
      await page.route('https://www.googletagmanager.com/**', (route) =>
        route.fulfill({ contentType: 'text/javascript', body: '' }),
      );
      await recordAnalytics(page);
      await page.goto(path);

      const opened = context.waitForEvent('page');
      await cards(page).locator('a').first().click({ modifiers: ['ControlOrMeta'] });
      await (await opened).close();
      expect(await galleryEvents(page)).toEqual([['event', 'gallery_click', { service: 'massage', locale }]]);
    });
  });
}

test.describe('уменьшенное движение', () => {
  test.use({ reducedMotion: 'reduce' });

  test('кнопка сдвигает ленту сразу, без плавности', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await strip(page).scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: BUTTONS.uk.next }).click();
    const immediately = await strip(page).evaluate((element) => element.scrollLeft);
    expect(Math.abs(immediately - (await step(page)))).toBeLessThanOrEqual(2);
  });
});

/**
 * SC-004 в уточнённой форме (research.md §R11): порог отложенной загрузки задаёт браузер, и Chromium
 * берёт заранее карточки из начала ленты. Проверяется то, что от страницы зависит: их не больше
 * двух, и ни одна не опережает портрет.
 */
test('на 360×740 до прокрутки лента берёт не больше двух фото и после портрета', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const requested: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('lada-novikova-portrait')) requested.push('portrait');
    const card = STRIP.find(({ id }) => url.includes(id));
    if (card) requested.push(card.id);
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const early = new Set(requested.filter((name) => name !== 'portrait'));
  expect(early.size, `фото ленты до прокрутки: ${[...early].join(', ')}`).toBeLessThanOrEqual(2);
  for (const id of early) {
    expect(STRIP.slice(0, 2).map((card) => card.id), `${id} не из начала ленты`).toContain(id);
  }
  if (early.size > 0) {
    expect(requested.indexOf('portrait'), 'фото ленты запрошено раньше портрета').toBeGreaterThanOrEqual(0);
    expect(requested.indexOf('portrait')).toBeLessThan(requested.findIndex((name) => name !== 'portrait'));
  }
});
