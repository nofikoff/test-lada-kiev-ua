import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { allPages, LOCALES, SITE_ORIGIN } from './support/site';

/**
 * Контракт адресов ([contracts/routes.md]) против собранного сайта, поднятого `astro preview`.
 *
 * Одна строка таблицы контракта проверяется не здесь, и это граница инструмента, а не пропуск:
 * язык страницы ошибки по разделу задаётся `ErrorDocument` внутри `/ru/` и `/en/`, а сервер
 * предпросмотра этой директивы не реализует — он отдаёт один корневой файл ошибки на любой
 * несуществующий адрес. Локально проверяется то, от чего зависит сборка: страница ошибки каждого
 * раздела существует, написана на языке своего раздела и объявлена в `.htaccess` того же раздела.
 *
 * Отложено до проверки на рабочем сервере: §Проверка 4 контракта (несуществующий адрес внутри
 * `/en/` отдаёт английскую страницу ошибки) и §Проверки 7–9 (карта сайта отдаёт XML, битый адрес
 * отвечает 404, файлы предыдущей сборки более не отвечают 200). Ни одну из них локальный сервер
 * воспроизвести не может, и зелёный тест на их месте означал бы только подделку.
 */

const PUBLISHED: readonly { path: string; status: number }[] = [
  ...allPages.map((page) => ({ path: page.path, status: 200 })),
  { path: '/robots.txt', status: 200 },
  { path: '/sitemap-index.xml', status: 200 },
  { path: '/llms.txt', status: 200 },
];

/**
 * Файл страницы ошибки раздела. Корневая живёт в `404.html` — Astro выносит её на корень
 * независимо от формы адресов; страницы разделов подчиняются `build.format: 'directory'`.
 */
const ERROR_PAGES: Record<(typeof LOCALES)[number], string> = {
  uk: '/404.html',
  ru: '/ru/404/index.html',
  en: '/en/404/index.html',
};

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

test.describe('страницы ошибок', () => {
  for (const locale of LOCALES) {
    test(`страница ошибки раздела ${locale} собрана и написана на его языке`, async ({
      request,
    }) => {
      const response = await request.get(ERROR_PAGES[locale]);
      expect(response.status(), `${ERROR_PAGES[locale]} не собрана`).toBe(200);

      const html = await response.text();
      expect(html).toContain(`<html lang="${locale}"`);

      // Страница ошибки не адресуется и не индексируется: у неё нет собственного адреса,
      // её отдаёт сервер на месте запрошенного.
      expect(html).toMatch(/<meta name="robots" content="noindex"/);
      expect(html).not.toContain('<link rel="canonical"');
    });
  }

  /**
   * Объявление читается из репозитория, а не запрашивается у сервера: сервер предпросмотра
   * файлы, начинающиеся с точки, не отдаёт, а веб-сервер их отдавать и не должен.
   * Проверяется связь, которая ломается молча: `ErrorDocument`, указывающий на несобранный
   * файл, отвечает не страницей ошибки, а кодом 500.
   */
  for (const locale of LOCALES) {
    test(`ErrorDocument раздела ${locale} указывает на собранную страницу`, async ({ request }) => {
      const file = locale === 'uk' ? 'public/.htaccess' : `public/${locale}/.htaccess`;
      const config = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

      const declared = /^\s*ErrorDocument\s+404\s+(\S+)/m.exec(config)?.[1];
      expect(declared, `${file} не объявляет страницу ошибки`).toBe(ERROR_PAGES[locale]);

      expect((await request.get(declared!)).status(), `${declared} не собран`).toBe(200);
    });
  }
});
