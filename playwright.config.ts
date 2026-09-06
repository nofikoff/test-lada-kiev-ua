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
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Именно `npm run preview`, а не собственный статический сервер: коды ответа и обработка
    // завершающего слеша должны быть теми же, что увидит проверка контракта адресов.
    command: 'npm run preview',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
