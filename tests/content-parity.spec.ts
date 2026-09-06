import { expect, test } from '@playwright/test';
import { homePages, htmlToText, normalize, readLegacyFixture } from './support/site';

/**
 * Сверка полноты переноса: каждая строка действующего словаря обязана присутствовать в HTML
 * своей языковой версии. Фикстура снята механически до начала работ (Step 0.2) и остаётся
 * единственным, что делает безопасным удаление `translations.ts` в Step 7.3.
 */
const fixture = readLegacyFixture();

test.describe('полнота контента', () => {
  for (const { locale, path } of homePages) {
    test(`страница ${path} содержит все строки локали ${locale}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);

      const pageText = normalize(htmlToText(await response.text()));
      const missing = fixture[locale].filter((line) => !pageText.includes(normalize(line)));

      expect(missing, `потеряно строк: ${missing.length} из ${fixture[locale].length}`).toEqual([]);
    });
  }
});
