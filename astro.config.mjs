// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Канонический хост — с www: apex отвечает постоянным перенаправлением (contracts/routes.md).
const SITE = 'https://www.lada.kiev.ua';

/**
 * Tailwind подключён через postcss.config.js, а не через @astrojs/tailwind.
 * Интеграция объявляет peer-диапазон astro ^3||^4||^5 и с седьмой версией не ставится;
 * её работа — регистрация того же плагина PostCSS, который Vite подхватывает сам.
 * Обоснование выбора третьей версии Tailwind, а не четвёртой — research.md §R9.
 */
export default defineConfig({
  site: SITE,
  output: 'static',
  build: {
    // Даёт ru/index.html: адрес /ru/ обслуживается напрямую, /ru приходит на него
    // перенаправлением Apache. Форма 'file' перенесла бы корректность адресов в конфигурацию сервера.
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'uk',
    locales: ['uk', 'ru', 'en'],
    routing: {
      // Основной язык живёт на корне без префикса — действующая схема адресов, менять её нельзя.
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'uk',
        // Полные теги языка: карта сайта объявляет регион, разметка страницы — только язык.
        locales: { uk: 'uk-UA', ru: 'ru-UA', en: 'en' },
      },
    }),
  ],
});
