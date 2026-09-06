import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig(
  {
    ignores: [
      'dist',
      '.astro',
      'playwright-report',
      'test-results',
      // Сборка старого приложения; удаляется вместе с ним в Step 7.3.
      'public/assets',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Правила разметки .astro: парсер компонентного синтаксиса плюс проверки, которых нет в базовом
  // наборе. Правила плагинов React сняты — React в дереве доживает до Step 7.3 и ничем не собирается.
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,astro}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
  },
  {
    // Конфигурации сборки и служебные скрипты исполняются Node, а не браузером.
    files: ['*.{js,mjs,cjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Инлайн-скрипты .astro плагин выносит в виртуальные файлы вида `Component.astro/1_1.js`.
    // Сниппет счётчика — чужой код, который обязан остаться прежним (research.md §R16):
    // gtag.js читает из dataLayer объект `arguments`, а не массив, поэтому переписать его
    // на остаточные параметры значило бы менять поведение аналитики ради правила стиля.
    files: ['src/layouts/BaseLayout.astro/**'],
    rules: {
      'prefer-rest-params': 'off',
    },
  },
);
