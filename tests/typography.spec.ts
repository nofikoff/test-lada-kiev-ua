import { expect, test } from '@playwright/test';
import { categoryPages, homePages, SERVICE_COPY_SELECTOR } from './support/site';

/**
 * Длина строки протяжённого текста (SC-006, FR-007) и область нажатия переключателей
 * прайса (FR-031) — на СОБРАННОЙ странице.
 *
 * Меряется то, что видит читатель, а не то, что задано в стилях: `max-width` в `ch` даёт
 * разную строку при разной гарнитуре, и после смены заголовочной гарнитуры и кегля это
 * перестало быть теорией. `Range.getClientRects()` по абзацу отдаёт по прямоугольнику на
 * зрительную строку; знаков текста, делённое на их число, и есть средняя длина строки
 * (research.md §R12).
 *
 * Ширины — 1440 и 2560: предел обязан держаться на любой, а ломается он именно на широкой,
 * где ничто, кроме меры, ширину колонки не ограничивает.
 */

/** SC-006. Верхний предел; нижней границы нет — на узком экране ширину задают поля. */
const MAX_CHARACTERS = 68;

/** FR-031: область нажатия переключателя прайса после отказа от кнопочной заливки. */
const MINIMUM_TAP = 24;

const WIDTHS = [1440, 2560] as const;

/**
 * Абзац короче этого не измеряется: в одну строку укладывается любая подпись, и среднее
 * по ней говорит о длине текста, а не о мере колонки.
 */
const MEANINGFUL_LENGTH = 90;

interface MeasureRequest {
  readonly selector: string;
  readonly minimum: number;
}

interface LineMeasurement {
  readonly label: string;
  readonly characters: number;
  readonly lines: number;
  readonly average: number;
  readonly width: number;
}

/**
 * Замер целиком исполняется в браузере, поэтому он самодостаточен: ни модулей проверки,
 * ни общих помощников там нет.
 */
function measureInBrowser({ selector, minimum }: MeasureRequest): LineMeasurement[] {
  const results: LineMeasurement[] = [];

  for (const element of Array.from(document.querySelectorAll(selector))) {
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < minimum) continue;

    const range = document.createRange();
    range.selectNodeContents(element);

    // Вложенные ссылки и полужирные вставки дают по прямоугольнику на каждый кусок строки,
    // поэтому строки считаются по различным верхним краям, а не по числу прямоугольников.
    const tops = new Set<number>();
    let widest = 0;
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height === 0 || rect.width === 0) continue;
      tops.add(Math.round(rect.top));
      widest = Math.max(widest, rect.width);
    }

    const lines = tops.size;
    if (lines === 0) continue;

    const label = `${element.tagName.toLowerCase()} «${text.slice(0, 40)}…»`;
    results.push({
      label,
      characters: text.length,
      lines,
      average: Math.round((text.length / lines) * 10) / 10,
      width: Math.round(widest),
    });
  }

  return results;
}

function tooLong(measurements: readonly LineMeasurement[]): LineMeasurement[] {
  return measurements.filter((item) => item.average > MAX_CHARACTERS);
}

function report(width: number, all: readonly LineMeasurement[]): string {
  const bad = tooLong(all);
  return [
    `ширина ${width}: абзацев ${all.length}, длиннее ${MAX_CHARACTERS} знаков — ${bad.length}`,
    ...bad.map(
      (item) =>
        `  ${item.average} зн/строку (${item.characters} знаков в ${item.lines} строк, колонка ${item.width}px)  ${item.label}`,
    ),
  ].join('\n');
}

test.describe('длина строки протяжённого текста', () => {
  for (const width of WIDTHS) {
    for (const { path } of categoryPages) {
      test(`${path} держит меру при ширине ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(path);

        const measured = await page.evaluate(measureInBrowser, {
          selector: `${SERVICE_COPY_SELECTOR} p, ${SERVICE_COPY_SELECTOR} li`,
          minimum: MEANINGFUL_LENGTH,
        });

        // Пустой список абзацев прошёл бы проверку вхолостую: «ни одного длиннее предела»
        // верно и там, где мерить было нечего.
        expect(measured.length, `${path}: текст категории не найден`).toBeGreaterThan(3);
        expect(tooLong(measured).length, report(width, measured)).toBe(0);
      });
    }

    for (const { path } of homePages) {
      test(`повествовательная секция ${path} держит меру при ширине ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(path);

        const measured = await page.evaluate(measureInBrowser, {
          selector: '#about p',
          minimum: MEANINGFUL_LENGTH,
        });

        expect(measured.length, `${path}: абзацы секции «Про нас» не найдены`).toBeGreaterThan(0);
        expect(tooLong(measured).length, report(width, measured)).toBe(0);
      });
    }
  }
});

/**
 * Область нажатия меряется в том окне, которое задал проект прогона: на телефоне это
 * единственное состояние, где требование имеет смысл, а на широком экране оно обязано
 * держаться заодно.
 */
test.describe('область нажатия переключателей прайса', () => {
  test('каждый переключатель не меньше 24×24 px', async ({ page }) => {
    await page.goto('/');

    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count, 'переключатели прайса не найдены').toBe(4);

    for (let index = 0; index < count; index += 1) {
      const box = await tabs.nth(index).boundingBox();
      const label = await tabs.nth(index).innerText();
      expect(box, `переключатель «${label}» не отрисован`).not.toBeNull();
      expect(box!.width, `ширина переключателя «${label}»`).toBeGreaterThanOrEqual(MINIMUM_TAP);
      expect(box!.height, `высота переключателя «${label}»`).toBeGreaterThanOrEqual(MINIMUM_TAP);
    }
  });
});
