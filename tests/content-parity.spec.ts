import { expect, test } from '@playwright/test';
import { homePages, htmlToText, normalize, readLegacyFixture } from './support/site';

/**
 * Сверка полноты переноса: каждая строка действующего словаря обязана присутствовать в HTML
 * своей языковой версии. Фикстура снята механически до миграции и ловит потерю блока при любой
 * правке (docs/specs/content-model.md §Фикстура прежнего контента).
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
