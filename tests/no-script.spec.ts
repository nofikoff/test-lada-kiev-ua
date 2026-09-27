import { expect, test } from '@playwright/test';
import { GALLERY_STRIP, normalize, readPrices } from './support/site';

/**
 * Поведение при отключённых скриптах. Ручная проверка подтверждает состояние один раз: скрытие
 * вкладок задаётся скриптом, и любая правка его инициализации способна вернуть страницу
 * к пустому прайсу, никак себя не проявив в остальном прогоне (ADR-005).
 */
test.use({ javaScriptEnabled: false });

test.describe('страница без скриптов', () => {
  test('прайс виден целиком, все четыре раздела развёрнуты', async ({ page }) => {
    await page.goto('/');

    const panels = page.locator('[role="tabpanel"]');
    await expect(panels).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect(panels.nth(index), `раздел ${index} скрыт без скриптов`).toBeVisible();
    }

    // Не выборка, а весь прайс: скрытым остаётся ровно то, что не попало в текст секции.
    const shown = normalize(await page.locator('#services').innerText());
    for (const record of readPrices()) {
      expect(shown, `позиция ${record.id} не видна`).toContain(normalize(record.name.uk));
    }
  });

  // Лента листается и без скриптов, а кнопки, которые без них не работают, скрыты.
  for (const path of ['/', '/ru/', '/en/']) {
    test(`${path}: лента видна целиком, кнопок листания нет`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('[data-gallery]')).toBeVisible();
      await expect(page.locator('[data-gallery] li img')).toHaveCount(GALLERY_STRIP.length);
      await expect(page.locator('[data-gallery-prev]')).toBeHidden();
      await expect(page.locator('[data-gallery-next]')).toBeHidden();
    });
  }

  test('меню и переходы работают на нативной разметке', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');

    const menu = page.locator('#mobile-menu');
    await expect(menu.locator('nav')).toBeHidden();

    await menu.locator('summary').click();
    await expect(menu.locator('nav'), 'меню не раскрывается без скриптов').toBeVisible();

    // Переход на страницу категории — обычная ссылка, а не обработчик события.
    await page.locator('a[href="/massage/"]').first().click();
    await expect(page).toHaveURL(/\/massage\/$/);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
