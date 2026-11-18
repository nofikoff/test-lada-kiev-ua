import { expect, test, type Page } from '@playwright/test';
import { ANALYTICS_ID, SITE_ORIGIN } from './support/site';

/**
 * Счётчик загружается на любом хосте, а визит отправляет только с боевого
 * (docs/specs/page-head.md §Analytics). Без этого прогоны против `astro preview` записали
 * в GA4 тысячи сессий `hostName = localhost` 2026-10-19 и 2026-10-21.
 *
 * Отправка визита перехватывается и обрывается в обоих тестах: проверка не пишет в GA4 сама.
 */
const DISABLE_FLAG = `ga-disable-${ANALYTICS_ID}`;
const LOADER = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
const COLLECT = /google-analytics\.com\/g\/collect/;

/** Попытки отправить визит: запрос до GA4 не доходит. */
async function interceptHits(page: Page): Promise<string[]> {
  const hits: string[] = [];
  await page.route(COLLECT, (route) => {
    hits.push(route.request().url());
    return route.abort();
  });
  return hits;
}

const disableFlag = (page: Page) =>
  page.evaluate((flag) => (window as unknown as Record<string, unknown>)[flag], DISABLE_FLAG);

test.describe('счётчик GA4', () => {
  test('на localhost загружен, но визит не отправляет', async ({ page }) => {
    const hits = await interceptHits(page);
    const loader = page.waitForResponse(LOADER);

    await page.goto('/');
    expect((await loader).ok(), 'gtag.js не загрузился — проверке нечего проверять').toBe(true);
    await page.waitForLoadState('networkidle');

    expect(hits, 'визит с localhost ушёл в GA4').toEqual([]);
    expect(await disableFlag(page)).toBe(true);
  });

  test('на боевом хосте отправляет визит', async ({ page, baseURL }) => {
    const hits = await interceptHits(page);
    // Боевой адрес отдаётся из локальной сборки; прочие сторонние запросы, кроме загрузчика
    // счётчика, обрываются, чтобы страница не зависела от сети.
    await page.route(
      (url) => !COLLECT.test(url.href),
      async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === SITE_ORIGIN) {
          const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
          return route.fulfill({ response });
        }
        if (url.href.startsWith(LOADER) || url.origin === new URL(baseURL!).origin) return route.continue();
        return route.abort();
      },
    );

    await page.goto(`${SITE_ORIGIN}/`);

    expect(await disableFlag(page)).toBeUndefined();
    await expect.poll(() => hits.length, { message: 'визит с боевого хоста не отправлен' }).toBeGreaterThan(0);
  });
});
