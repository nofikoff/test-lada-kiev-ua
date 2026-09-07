import { defineConfig, devices } from '@playwright/test';

// Порт `astro preview` по умолчанию. Держится здесь одним значением, потому что его знают
// и webServer, и baseURL, и проверки абсолютных адресов.
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Проверяемый объект — статический HTML собранного сайта, а не компоненты в изоляции:
 * требования спеки сформулированы про опубликованный файл (research.md §R13).
 * Поэтому прогон всегда идёт против `astro preview`, то есть против содержимого dist/.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // `desktop` и `mobile` — оба Chromium: Pixel 7 отличается от Desktop Chrome размером экрана
  // и способом ввода, а не движком. Возможности редизайна (`animation-timeline`, `initial-letter`)
  // в WebKit самые свежие из трёх движков, поэтому третий проект — не про ещё одно разрешение,
  // а про второй движок рендеринга (SC-013, research.md §R14).
  projects: [
    // Проверки, помеченные `@build`, читают файлы из `dist/` и браузера не открывают: результат
    // от движка не зависит, поэтому они идут ровно один раз, а не по разу на каждый движок.
    // Отдельным проектом, а не пропуском внутри файла: пропуск оставил бы в отчёте два `skipped`
    // на каждую такую проверку, и «пропущено» в прогоне значило бы две разные вещи сразу —
    // «здесь не нужно» и «здесь не сделано».
    { name: 'build', grep: /@build/, use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop', grepInvert: /@build/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', grepInvert: /@build/, use: { ...devices['Pixel 7'] } },
    { name: 'webkit', grepInvert: /@build/, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // Именно `npm run preview`, а не собственный статический сервер: коды ответа и обработка
    // завершающего слеша должны быть теми же, что увидит проверка контракта адресов.
    command: 'npm run preview',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Astro 7 сам уводит preview в фоновый процесс, если распознал запуск из-под агента
      // (`cli/preview/index.js`: `!process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent()`).
      // Запускающий процесс тогда завершается сразу, и Playwright останавливается на
      // «webServer exited early». Переменная гасит распознавание — проверяется её наличие,
      // а не значение, поэтому здесь она несёт то, что и означает: фоновый режим не нужен.
      // Вне агентской среды это ровно поведение по умолчанию.
      ASTRO_PREVIEW_BACKGROUND: 'false',
    },
  },
});
