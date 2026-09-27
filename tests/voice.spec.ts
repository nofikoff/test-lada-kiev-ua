import { expect, test } from '@playwright/test';
import {
  ABOUT,
  ABOUT_COPY_SELECTOR,
  countWords,
  homePages,
  normalize,
} from './support/site';

/**
 * Голос сайта (docs/specs/voice.md) и карта запросов (docs/specs/page-head.md §Целевые запросы)
 * по собранному HTML. Тон, первое лицо и отсутствие обещаний лечения автоматикой не меряются —
 * их список в docs/specs/voice.md §Не измеряется.
 */

test.describe('обращение Лады в «Про нас»', () => {
  for (const { locale, path } of homePages) {
    test(`${path}: подписанное обращение 150–250 слов`, async ({ page }) => {
      await page.goto(path);

      const about = page.locator('#about');
      const copy = about.locator(ABOUT_COPY_SELECTOR);
      await expect(copy).toHaveCount(1);

      const words = countWords(await copy.innerText());
      expect(words, `${path}: ${words} слов в теле обращения`).toBeGreaterThanOrEqual(150);
      expect(words, `${path}: ${words} слов в теле обращения`).toBeLessThanOrEqual(250);

      await expect(about.locator('h2')).toHaveText(ABOUT[locale].heading);

      // Подпись стоит вне тела: иначе её слова засчитывались бы обращению. Имя само по себе в теле
      // есть («Мене звати Лада Новикова»), поэтому ищется подпись целиком.
      const { signatureName, signatureRole } = ABOUT[locale];
      const signature = `${signatureName}, ${signatureRole}`;
      expect(normalize(await about.innerText())).toContain(signature);
      expect(normalize(await copy.innerText())).not.toContain(signature);
    });
  }
});
