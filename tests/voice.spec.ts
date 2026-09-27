import { expect, test } from '@playwright/test';
import {
  ABOUT,
  ABOUT_COPY_SELECTOR,
  allPages,
  builtPages,
  categoryPages,
  countWords,
  FORBIDDEN_NAME,
  HOME_FONT_FACES,
  homePages,
  htmlToText,
  normalize,
  queryOf,
  SERVICE_COPY_SELECTOR,
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

function head(html: string): { title: string; description: string; h1: string } {
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
  const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? '';
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '';
  return {
    title: normalize(htmlToText(title)),
    description: normalize(htmlToText(description)),
    h1: normalize(htmlToText(h1)),
  };
}

test.describe('карта запросов', () => {
  for (const page of allPages) {
    test(`${page.path}: запрос в заголовке окна, главном заголовке и описании`, async ({ request }) => {
      const { title, description, h1 } = head(await (await request.get(page.path)).text());
      const query = queryOf(page);

      expect(title, 'форма заголовка окна').toMatch(/^.+ — Lada N$/);
      expect(title.length, `заголовок окна: ${title}`).toBeLessThanOrEqual(70);

      for (const fragment of query) {
        expect(title, `заголовок окна без ${fragment}`).toMatch(fragment);
        expect(h1, `главный заголовок без ${fragment}`).toMatch(fragment);
        expect(description, `описание без ${fragment}`).toMatch(fragment);
      }

      const primary = description.search(query[0]);
      expect(primary, `основная формулировка во второй половине описания: ${description}`).toBeLessThan(
        description.length / 2,
      );
    });
  }

  for (const page of categoryPages) {
    test(`${page.path}: первый абзац текста называет запрос`, async ({ page: browser }) => {
      await browser.goto(page.path);
      const first = normalize(
        await browser.locator(`${SERVICE_COPY_SELECTOR} p`).first().innerText(),
      );
      for (const fragment of queryOf(page)) {
        expect(first, `первый абзац без ${fragment}`).toMatch(fragment);
      }
    });
  }

  for (const page of categoryPages.filter((entry) => entry.category === 'depilation')) {
    test(`${page.path}: шугаринг назван`, async ({ page: browser }) => {
      await browser.goto(page.path);
      await expect(browser.locator(SERVICE_COPY_SELECTOR)).toContainText(/шугаринг|sugaring/i);
    });
  }

  for (const page of categoryPages.filter((entry) => entry.category === 'massage')) {
    test(`${page.path}: текст ведёт на обращение Лады`, async ({ page: browser }) => {
      await browser.goto(page.path);
      const home = homePages.find((entry) => entry.locale === page.locale)!;
      await expect(
        browser.locator(`${SERVICE_COPY_SELECTOR} a[href="${home.path}#about"]`),
      ).toHaveCount(1);
    });
  }
});

test.describe('главный заголовок главной', () => {
  for (const { locale, path } of homePages) {
    test(`${path}: бренд и строка первого экрана в одном h1, без нового шрифта`, async ({
      page,
      browserName,
    }) => {
      await page.goto(path);

      const heading = page.locator('h1');
      await expect(heading).toHaveCount(1);
      await expect(heading.locator('.display')).toHaveText('Lada N');
      await expect(heading.locator('.hero__sub')).toHaveCount(1);
      await expect(page.locator('.hero__sub')).toHaveCount(1);

      // WebKit отмечает загруженными и начертания, которых стили не используют: на сборке 1cac138
      // до пакета он уже показывал Cormorant italic 400/500. Сравнение там ничего не доказывает.
      if (browserName === 'webkit') return;

      await page.evaluate(() => document.fonts.ready);
      const faces = await page.evaluate(() =>
        [...document.fonts]
          .filter((face) => face.status === 'loaded' && !face.family.includes('fallback'))
          .map((face) => {
            const family = face.family.replace(/["']/g, '').replace(/-[0-9a-f]+$/, '');
            const start = Number.parseInt(/U\+([0-9a-f]+)/i.exec(face.unicodeRange)?.[1] ?? '0', 16);
            return `${family}|${face.style}|${face.weight}|U+${start.toString(16).toUpperCase()}`;
          }),
      );
      expect([...new Set(faces)].sort()).toEqual(HOME_FONT_FACES[locale]);
    });
  }
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
