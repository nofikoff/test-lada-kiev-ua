import { expect, test } from '@playwright/test';
import { homePages } from './support/site';

/**
 * Шрифты после Step 4.2 отдаются с собственного домена (research.md §R8). Проверяется два
 * утверждения: сторонних доменов шрифтов в разметке не осталось и кириллическое начертание
 * заявленной гарнитуры действительно существует.
 *
 * Второе — не придирка к формулировке: §R8 отмечал наличие кириллицы у заголовочной гарнитуры
 * как взятое из общих знаний и не подтверждённое источником. Если начертания нет, украинские
 * заголовки набираются запасным шрифтом молча, и увидеть это можно только на отрисованной
 * странице. Поэтому проверка идёт через загрузчик шрифтов браузера, а не через список файлов
 * сборки: там лежал бы файл, о котором неизвестно, принял ли его браузер и покрывает ли он
 * нужные знаки.
 */

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** Знаки, отличающие украинскую кириллицу от русской: их нет в наборе, покрывающем только русский. */
const UKRAINIAN_GLYPHS = 'ҐґЄєІіЇї';

/** Полный охват — признак сгенерированного запасного начертания, а не настоящего файла. */
const CATCH_ALL_RANGE = 'U+0-10FFFF';

/**
 * Браузер отдаёт `unicodeRange` нормализованным — `U+400-45F` вместо записи в стиле CSS
 * `U+0400-045F`, — поэтому охват проверяется разбором диапазонов, а не поиском подстроки.
 */
function covers(unicodeRange: string, text: string): boolean {
  const ranges = unicodeRange.split(',').map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
    const start = Number.parseInt(from, 16);
    return { start, end: to === undefined ? start : Number.parseInt(to, 16) };
  });

  return [...text].every((character) => {
    const code = character.codePointAt(0)!;
    return ranges.some((range) => code >= range.start && code <= range.end);
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http://localhost') ? route.continue() : route.abort(),
  );
});

test.describe('шрифты отдаются с собственного домена', () => {
  for (const { path } of homePages) {
    test(`${path} не обращается к сторонним доменам шрифтов`, async ({ request }) => {
      const html = await (await request.get(path)).text();

      for (const host of FONT_HOSTS) {
        expect(html, `${path} всё ещё обращается к ${host}`).not.toContain(host);
      }
    });

    test(`${path} предзагружает файлы шрифтов со своего домена`, async ({ page, request }) => {
      await page.goto(path);

      const preloaded = await page
        .locator('link[rel="preload"][as="font"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));

      expect(preloaded.length, `${path} не предзагружает ни одного шрифта`).toBeGreaterThan(0);

      for (const href of preloaded) {
        expect(href.startsWith('/'), `${href} ведёт на сторонний домен`).toBe(true);
        const response = await request.get(href, { maxRedirects: 0 });
        expect(response.status(), `файл шрифта ${href}`).toBe(200);
      }
    });
  }
});

/**
 * Украинская версия: заголовок раздела «Про нас» набирается заявленной серифной гарнитурой,
 * и знаки, которых нет ни в латинице, ни в русской кириллице, покрыты настоящим начертанием.
 */
test.describe('кириллическое начертание серифной гарнитуры', () => {
  test('украинский заголовок отрисован объявленной гарнитурой, а не запасной', async ({ page }) => {
    await page.goto('/');

    const heading = page.locator('#about h2');
    const text = (await heading.innerText()).trim();
    expect(text, 'украинский заголовок пуст').not.toBe('');

    const family = await heading.evaluate((element) =>
      getComputedStyle(element).fontFamily.split(',')[0].replace(/^["']|["']$/g, ''),
    );
    expect(family, 'заголовок набирается не Cormorant').toContain('Cormorant');

    /**
     * `document.fonts.load` возвращает только те начертания семейства, которые покрывают
     * переданные знаки и загрузились. Пустой ответ — прямое доказательство отсутствия
     * кириллицы у гарнитуры; проверка на этих знаках поэтому не может пройти вхолостую.
     *
     * Начертание запроса — 500, самое тяжёлое из загружаемых (astro.config.mjs). С 700
     * ответ был бы пуст просто потому, что такого файла нет, и проверка краснела бы
     * по своей причине, ничего не сказав о кириллице.
     */
    const faces = await page.evaluate(
      async ({ fontFamily, glyphs }) => {
        const loaded = await document.fonts.load(`500 48px "${fontFamily}"`, glyphs);
        return loaded.map((face) => ({ status: face.status, unicodeRange: face.unicodeRange }));
      },
      { fontFamily: family, glyphs: text + UKRAINIAN_GLYPHS },
    );

    expect(faces.length, `у ${family} нет начертания, покрывающего ${UKRAINIAN_GLYPHS}`,
    ).toBeGreaterThan(0);
    expect(faces.every((face) => face.status === 'loaded')).toBe(true);

    // Начертание с полным охватом — сгенерированное запасное; на нём проверка прошла бы вхолостую.
    const cyrillic = faces.filter(
      (face) => face.unicodeRange !== CATCH_ALL_RANGE && covers(face.unicodeRange, UKRAINIAN_GLYPHS),
    );
    expect(
      cyrillic.length,
      `украинские знаки покрыты только запасным начертанием: ${JSON.stringify(faces)}`,
    ).toBeGreaterThan(0);
  });

  test('основная гарнитура текста тоже покрывает украинские знаки', async ({ page }) => {
    await page.goto('/');

    const family = await page.evaluate(() =>
      getComputedStyle(document.body).fontFamily.split(',')[0].replace(/^["']|["']$/g, ''),
    );
    expect(family).toContain('Inter');

    const faces = await page.evaluate(
      async ({ fontFamily, glyphs }) => {
        const loaded = await document.fonts.load(`400 16px "${fontFamily}"`, glyphs);
        return loaded.map((face) => ({ status: face.status, unicodeRange: face.unicodeRange }));
      },
      { fontFamily: family, glyphs: UKRAINIAN_GLYPHS },
    );

    expect(faces.length, `у ${family} нет начертания, покрывающего ${UKRAINIAN_GLYPHS}`,
    ).toBeGreaterThan(0);
    expect(
      faces.filter(
        (face) =>
          face.unicodeRange !== CATCH_ALL_RANGE && covers(face.unicodeRange, UKRAINIAN_GLYPHS),
      ).length,
      `украинские знаки покрыты только запасным начертанием: ${JSON.stringify(faces)}`,
    ).toBeGreaterThan(0);
  });
});
