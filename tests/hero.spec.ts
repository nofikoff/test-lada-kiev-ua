import { expect, test, type Page } from '@playwright/test';
import { homePages } from './support/site';

/**
 * Первый экран с портретом Лады (specs/003-lada-photos-home/contracts/hero.md, FR-002…FR-008).
 *
 * Проверяется геометрия, а не лицо: распознавания в прогоне нет, поэтому «лицо видно» сведено к
 * тому, что проверить можно — портрет не пересекается с текстом и не уходит под шапку. Само лицо
 * смотрят глазами по скриншотам (spec.md §Assumptions).
 */
const SCREENS = [
  { width: 320, height: 640, callVisible: false },
  { width: 360, height: 740, callVisible: true },
  { width: 390, height: 844, callVisible: false },
  { width: 1366, height: 768, callVisible: true },
  { width: 1920, height: 1080, callVisible: false },
  { width: 2560, height: 1440, callVisible: false },
] as const;

/** Точка перелома раскладки из пакета 002: 62rem при корневом кегле 16px. */
const SPLIT_AT = 992;

/** FR-005: половина ширины исходника 1440px при плотности 2x. */
const PORTRAIT_MAX_WIDTH = 720;

async function box(page: Page, selector: string) {
  const found = await page.locator(selector).first().boundingBox();
  expect(found, `нет элемента ${selector}`).not.toBeNull();
  return found!;
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const { locale, path } of homePages) {
  test.describe(`первый экран ${path}`, () => {
    for (const screen of SCREENS) {
      test(`${screen.width}×${screen.height}: портрет не на тексте и не под шапкой`, async ({ page }) => {
        await page.setViewportSize({ width: screen.width, height: screen.height });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);

        const portrait = await box(page, '.hero__portrait');
        const text = await box(page, '.hero__in');
        const header = await box(page, 'header.head');

        expect(intersects(portrait, text), 'портрет пересекает текстовую колонку').toBe(false);
        expect(portrait.y, 'верх портрета под фиксированной шапкой').toBeGreaterThanOrEqual(
          header.y + header.height - 1,
        );

        if (screen.width >= SPLIT_AT) {
          expect(portrait.width, 'колонка портрета шире половины исходника').toBeLessThanOrEqual(
            PORTRAIT_MAX_WIDTH,
          );
        }

        if (screen.callVisible) {
          const call = await box(page, '.hero__cta a[href^="tel:"]');
          expect(call.y, 'кнопка звонка выше экрана').toBeGreaterThanOrEqual(0);
          expect(call.y + call.height, 'кнопка звонка ниже края экрана').toBeLessThanOrEqual(
            screen.height,
          );
        }
      });
    }

    test(`портрет — содержательное изображение с высоким приоритетом (${locale})`, async ({ page }) => {
      await page.goto(path);
      const image = page.locator('.hero__portrait img');

      await expect(image).toHaveCount(1);
      expect((await image.getAttribute('alt'))?.trim(), 'пустой alt портрета').toBeTruthy();
      await expect(image).not.toHaveAttribute('loading', 'lazy');
      await expect(image).toHaveAttribute('fetchpriority', 'high');
      await expect(page.locator('.hero__portrait [aria-hidden="true"] img')).toHaveCount(0);
    });

    test(`${path}: без монограммы и стокового кадра, заголовок раньше портрета`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator('main section').first();

      await expect(hero.locator('.monogram')).toHaveCount(0);
      // Первый экран. Вне его стоковый кадр ищет seo-contract.spec.ts — JSON-LD и превью.
      expect(await hero.innerHTML()).not.toContain('massage-kiev-lada-novikova');

      const headingFirst = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        const portrait = document.querySelector('.hero__portrait img');
        return Boolean(
          heading &&
            portrait &&
            heading.compareDocumentPosition(portrait) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      });
      expect(headingFirst, 'h1 должен идти в разметке раньше портрета').toBe(true);
    });

    test(`${path}: прозрачность самого изображения не анимируется`, async ({ page }) => {
      await page.goto(path);
      const animated = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.hero__portrait picture, .hero__portrait img'))
          .map((element) => getComputedStyle(element).animationName)
          .filter((name) => name !== 'none'),
      );
      expect(animated, 'FR-007: раскрытие — работа накрывающего слоя, а не изображения').toEqual([]);
    });
  });
}
