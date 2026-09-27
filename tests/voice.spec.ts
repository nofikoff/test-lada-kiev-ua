import { expect, test } from '@playwright/test';
import {
  ABOUT,
  ABOUT_COPY_SELECTOR,
  builtPages,
  countWords,
  FORBIDDEN_NAME,
  homePages,
  normalize,
} from './support/site';

/**
 * Голос сайта (docs/specs/voice.md) и карта запросов (docs/specs/page-head.md §Целевые запросы)
 * по собранному HTML. Тон, первое лицо и отсутствие обещаний лечения автоматикой не меряются —
 * их список в docs/specs/voice.md §Не измеряется.
 */

test.describe('одно название студии', () => {
  // Весь ответ, а не видимый текст: заголовок окна, описание и превью ссылок — тоже название.
  for (const { path } of builtPages) {
    test(`${path}: нет «майстерня / мастерская / workshop»`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html.match(FORBIDDEN_NAME)?.[0], path).toBeUndefined();
    });
  }

  test('/llms.txt: нет «майстерня / мастерская / workshop»', async ({ request }) => {
    const text = await (await request.get('/llms.txt')).text();
    expect(text.match(FORBIDDEN_NAME)?.[0]).toBeUndefined();
  });
});

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
