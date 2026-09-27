import { expect, test } from '@playwright/test';
import { allPages, homePages } from './support/site';

/**
 * Интерактив без фреймворка: меню на нативном раскрытии и вкладки прайса. Разметка вкладок
 * отдаётся со всеми видимыми блоками — скрытие неактивных выполняет скрипт при инициализации,
 * иначе при отключённых скриптах не видно ничего (ADR-005).
 */

const TABS = ['bodyMassage', 'exotic', 'depilation', 'beauty'] as const;

test.describe('мобильное меню', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('открывается и закрывается по нажатию', async ({ page }) => {
    await page.goto('/');

    const menu = page.locator('#mobile-menu');
    const summary = menu.locator('summary');
    const items = menu.locator('nav');

    await expect(items).toBeHidden();

    await summary.click();
    await expect(items).toBeVisible();

    await summary.click();
    await expect(items).toBeHidden();
  });

  test('управляется с клавиатуры', async ({ page }) => {
    await page.goto('/');

    const menu = page.locator('#mobile-menu');
    await menu.locator('summary').focus();
    await page.keyboard.press('Enter');

    await expect(menu.locator('nav')).toBeVisible();
  });
});

test.describe('пункты меню ведут к разделам главной', () => {
  // Разделы есть только на главной: голый `#about` на странице категории никуда не ведёт.
  const SECTIONS = ['about', 'services', 'certificates', 'contacts'];

  for (const { locale, path } of allPages) {
    test(`${path}: пункты шапки — разделы главной своего языка`, async ({ page }) => {
      await page.goto(path);

      const home = homePages.find((candidate) => candidate.locale === locale)!.path;
      const expected = SECTIONS.map((id) => `${home}#${id}`);
      const hrefs = await page
        .locator('header nav a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

      // Две навигации — полоса на широком экране и раскрывающееся меню на узком.
      expect(hrefs).toEqual([...expected, ...expected]);
    });
  }

  test('со страницы категории пункт «О нас» полосы шапки ведёт на главную', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'полоса пунктов видна только на широком экране');
    await page.goto('/ru/massage/');

    await page.locator('header nav').first().getByRole('link', { name: 'О нас' }).click();

    await expect(page).toHaveURL(/\/ru\/#about$/);
    await expect(page.locator('#about')).toBeInViewport();
  });

  test('со страницы категории пункт «О нас» раскрывающегося меню ведёт на главную', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'раскрывающееся меню есть только на узком экране');
    await page.goto('/ru/massage/');

    const menu = page.locator('#mobile-menu');
    await menu.locator('summary').click();
    await menu.locator('nav').getByRole('link', { name: 'О нас' }).click();

    await expect(page).toHaveURL(/\/ru\/#about$/);
    await expect(page.locator('#about')).toBeInViewport();
  });
});

test.describe('вкладки прайса', () => {
  test('объявлены ролями и связаны с блоками', async ({ page }) => {
    await page.goto('/');

    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toHaveCount(1);
    await expect(tablist).toHaveAttribute('aria-label', /\S/);

    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(TABS.length);

    for (const id of TABS) {
      const tab = page.locator(`#tab-${id}`);
      const controls = await tab.getAttribute('aria-controls');
      expect(controls).toBe(`panel-${id}`);
      await expect(page.locator(`#${controls}`)).toHaveAttribute('role', 'tabpanel');
    }

    await expect(page.locator(`#tab-${TABS[0]}`)).toHaveAttribute('aria-selected', 'true');
  });

  test('переключаются мышью', async ({ page }) => {
    await page.goto('/');

    await page.locator('#tab-depilation').click();

    await expect(page.locator('#tab-depilation')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-depilation')).toBeVisible();

    for (const id of TABS.filter((tab) => tab !== 'depilation')) {
      await expect(page.locator(`#tab-${id}`)).toHaveAttribute('aria-selected', 'false');
      await expect(page.locator(`#panel-${id}`)).toBeHidden();
    }
  });

  test('переключаются стрелками, Home и End', async ({ page }) => {
    await page.goto('/');

    await page.locator(`#tab-${TABS[0]}`).focus();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator(`#tab-${TABS[1]}`)).toBeFocused();
    await expect(page.locator(`#tab-${TABS[1]}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(`#panel-${TABS[1]}`)).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator(`#tab-${TABS[0]}`)).toBeFocused();
    await expect(page.locator(`#tab-${TABS[0]}`)).toHaveAttribute('aria-selected', 'true');

    // С первой вкладки движение влево уходит на последнюю: перечень замкнут.
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator(`#tab-${TABS[TABS.length - 1]}`)).toBeFocused();

    await page.keyboard.press('Home');
    await expect(page.locator(`#tab-${TABS[0]}`)).toBeFocused();

    await page.keyboard.press('End');
    await expect(page.locator(`#tab-${TABS[TABS.length - 1]}`)).toBeFocused();
    await expect(page.locator(`#panel-${TABS[TABS.length - 1]}`)).toBeVisible();
  });
});

test.describe('без выполнения скриптов', () => {
  test.use({ javaScriptEnabled: false });

  test('виден весь прайс, а не пустая страница', async ({ page }) => {
    await page.goto('/');

    for (const id of TABS) {
      await expect(page.locator(`#panel-${id}`)).toBeVisible();
    }
  });
});
