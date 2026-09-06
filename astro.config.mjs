// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Канонический хост — с www: apex отвечает постоянным перенаправлением (contracts/routes.md).
const SITE = 'https://www.lada.kiev.ua';

/**
 * Начертания перечислены те, что действительно встречаются в разметке, а не весь набор
 * действующей ссылки на сторонний домен: каждое лишнее — отдельный файл в загрузке.
 *
 * Inter: 400 — текст страницы, 300 — подзаголовок первого экрана, 500 — навигация и вкладки,
 * 600 — кнопки, цены и заголовки карточек услуг.
 * Playfair Display: 400 — заголовки групп прайса и разделов, 600 — заголовки секций,
 * 700 — заголовок первого экрана.
 *
 * Подмножество `cyrillic` обязательно: две локали из трёх — кириллица, и без него украинский
 * заголовок отрисовывается запасным шрифтом (research.md §R8).
 */
const SUBSETS = /** @type {['latin', 'cyrillic']} */ (['latin', 'cyrillic']);

/**
 * Tailwind подключён через postcss.config.js, а не через @astrojs/tailwind.
 * Интеграция объявляет peer-диапазон astro ^3||^4||^5 и с седьмой версией не ставится;
 * её работа — регистрация того же плагина PostCSS, который Vite подхватывает сам.
 * Обоснование выбора третьей версии Tailwind, а не четвёртой — research.md §R9.
 */
export default defineConfig({
  site: SITE,
  output: 'static',
  // Совпадение двух адресов и совпадение идентификаторов в прайсе обязаны ронять сборку,
  // а не писать предупреждение: по умолчанию побеждает запись с большим приоритетом,
  // то есть одна из двух цен исчезает молча. Ровно этот класс ошибок здесь недопустим.
  prerenderConflictBehavior: 'error',
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
  /**
   * Шрифты скачиваются на сборке и отдаются с собственного домена: два сторонних домена
   * уходят из критического пути загрузки, а ссылки предзагрузки и метрики запасного шрифта
   * Astro строит сам (research.md §R8).
   */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [300, 400, 500, 600],
      styles: ['normal'],
      subsets: SUBSETS,
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Playfair Display',
      cssVariable: '--font-playfair',
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: SUBSETS,
      fallbacks: ['Georgia', 'serif'],
    },
  ],
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
