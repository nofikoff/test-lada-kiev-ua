import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig(
  {
    ignores: ['dist', '.astro', 'playwright-report', 'test-results', '.playwright-mcp'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Правила разметки .astro: парсер компонентного синтаксиса плюс проверки, которых нет в базовом
  // наборе. Правил React здесь нет и быть не может — React из дерева удалён (ADR-004).
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.{ts,astro}'],
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
    // Сниппет счётчика — чужой код, который обязан остаться прежним (ADR-011):
    // gtag.js читает из dataLayer объект `arguments`, а не массив, поэтому переписать его
    // на остаточные параметры значило бы менять поведение аналитики ради правила стиля.
    files: ['src/layouts/BaseLayout.astro/**'],
    rules: {
      'prefer-rest-params': 'off',
    },
  },
);
