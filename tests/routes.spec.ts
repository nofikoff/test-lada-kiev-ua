import { expect, test } from '@playwright/test';
import { SITE_ORIGIN } from './support/site';

/**
 * Контракт адресов ([contracts/routes.md]) против собранного сайта, поднятого `astro preview`.
 *
 * Две строки таблицы контракта проверяются не здесь, и это граница инструмента, а не пропуск:
 * язык страницы ошибки по разделу задаётся `ErrorDocument` внутри `/ru/` и `/en/`, которого
 * статический сервер предпросмотра не реализует, — он отдаёт один корневой файл ошибки на всё.
 * Сами страницы ошибок появляются в Step 7.1 и проверяются там же, по прямому адресу файла;
 * маршрутизация к ним — пункт приёмки против рабочего сервера (contracts/routes.md §Проверки 7–9).
 */

const PUBLISHED: readonly { path: string; status: number }[] = [
  { path: '/', status: 200 },
  { path: '/ru/', status: 200 },
  { path: '/en/', status: 200 },
  { path: '/robots.txt', status: 200 },
  { path: '/sitemap-index.xml', status: 200 },
  { path: '/llms.txt', status: 200 },
];

test.describe('карта адресов', () => {
  for (const { path, status } of PUBLISHED) {
    test(`${path} отвечает кодом ${status}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(status);
    });
  }

  test('карта сайта отдаёт XML, а не HTML', async ({ request }) => {
    const response = await request.get('/sitemap-index.xml');
    expect(response.headers()['content-type']).toContain('xml');
    expect(await response.text()).toContain('<sitemapindex');
  });

  test('файл правил для роботов ссылается на карту сайта', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`);
  });
});

test.describe('форма адреса со слешем', () => {
  /**
   * Действующие адреса `/ru` и `/en` стоят во внешних источниках, терять их нельзя.
   * Перенаправление на форму со слешем выполняет Apache; здесь проверяется то, что от сборки
   * зависит: адрес без слеша приводит к странице своей локали, и та объявляет каноническим
   * адрес со слешем — иначе канонический и фактический разошлись бы.
   */
  for (const locale of ['ru', 'en'] as const) {
    test(`/${locale} приводит на /${locale}/`, async ({ request }) => {
      const response = await request.get(`/${locale}`);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(
        `<link rel="canonical" href="${SITE_ORIGIN}/${locale}/"`,
      );
    });
  }
});

test.describe('несуществующий адрес', () => {
  /**
   * Действующий сайт отвечает на любой битый адрес кодом 200 с главной страницей — механика
   * одностраничного приложения, превращающая каждую опечатку в страницу-дубль с кодом успеха.
   */
  for (const path of ['/nonexistent-path-test-12345', '/en/nonexistent-path-test-12345']) {
    test(`${path} отвечает кодом 404`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
    });
  }
});
