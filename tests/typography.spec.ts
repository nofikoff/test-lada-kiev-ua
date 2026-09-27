import { expect, test } from '@playwright/test';
import { categoryPages, homePages, SERVICE_COPY_SELECTOR } from './support/site';

/**
 * Длина строки протяжённого текста (docs/specs/design-tokens.md §Мера колонки) и область нажатия
 * переключателей прайса (docs/specs/accessibility.md) — на СОБРАННОЙ странице.
 *
 * Меряется то, что видит читатель, а не то, что задано в стилях: `max-width` в `ch` даёт
 * разную строку при разной гарнитуре, и после смены заголовочной гарнитуры и кегля это
 * перестало быть теорией.
 *
 * Меряется САМАЯ ДЛИННАЯ строка абзаца, а не средняя. Последняя строка
 * абзаца заполнена частично, поэтому среднее систематически ниже самой длинной: колонка,
 * дающая 72 знака в строке, показывает среднее 64 и порог 68 проходит. Среднее структурно
 * не способно увидеть то, что ограничивает предел, — этим и была зелена прежняя проверка.
 *
 * Строки собираются посимвольно: `Range` на один знак даёт его прямоугольник, знаки с общим
 * верхним краем и есть зрительная строка. `getClientRects()` по всему абзацу для этого
 * не годится — он отдаёт прямоугольники, а не знаки, и длину строки из них не получить.
 *
 * Ширины — 1440 и 2560: предел обязан держаться на любой, а ломается он именно на широкой,
 * где ничто, кроме меры, ширину колонки не ограничивает.
 */

/** Верхний предел; нижней границы нет — на узком экране ширину задают поля. */
const MAX_CHARACTERS = 68;

/** Область нажатия переключателя прайса после отказа от кнопочной заливки. */
const MINIMUM_TAP = 24;

const WIDTHS = [1440, 2560] as const;

/**
 * Абзац короче этого не измеряется: в одну строку укладывается любая подпись, и её длина
 * говорит о длине текста, а не о мере колонки.
 */
const MEANINGFUL_LENGTH = 90;

interface MeasureRequest {
  readonly selector: string;
  readonly minimum: number;
}

interface LineMeasurement {
  readonly label: string;
  /** Самая длинная зрительная строка абзаца — величина, которую ограничивает предел. */
  readonly longest: number;
  /** Её текст: без него превышение нечем перепроверить глазами. */
  readonly longestLine: string;
  readonly lines: number;
  /** Ширина колонки в px: по ней видно, мера виновата в превышении или содержимое. */
  readonly width: number;
  /** Знаков без пробелов, разложенных по строкам, и сколько их в тексте абзаца. */
  readonly placed: number;
  readonly expected: number;
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

    // Строка — знаки с общим верхним краем. Допуск в 4 px при межстрочном интервале около
    // 29 px: вложенная ссылка или полужирная вставка со своими метриками сдвигает
    // прямоугольник знака на пиксель-другой, не переводя его на другую строку.
    const rows: { top: number; characters: string[] }[] = [];
    const rowFor = (top: number) => {
      const found = rows.find((row) => Math.abs(row.top - top) <= 4);
      if (found) return found;
      const created = { top, characters: [] as string[] };
      rows.push(created);
      return created;
    };

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.nodeValue ?? '';
      for (let index = 0; index < value.length; index += 1) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();
        // Свёрнутый пробел разметки места не занимает и строки собой не образует.
        if (rect.width === 0 && rect.height === 0) continue;
        rowFor(Math.round(rect.top)).characters.push(value[index]);
      }
    }

    if (rows.length === 0) continue;

    rows.sort((a, b) => a.top - b.top);
    // Пробел переноса стоит в конце строки и её длиной не является.
    const lines = rows.map((row) => row.characters.join('').trim());
    const longestLine = lines.reduce((most, line) => (line.length > most.length ? line : most), '');

    results.push({
      label: `${element.tagName.toLowerCase()} «${text.slice(0, 40)}…»`,
      longest: longestLine.length,
      longestLine,
      lines: lines.length,
      width: Math.round(element.getBoundingClientRect().width),
      placed: lines.join('').replace(/\s/g, '').length,
      expected: text.replace(/\s/g, '').length,
    });
  }

  return results;
}

function tooLong(measurements: readonly LineMeasurement[]): LineMeasurement[] {
  return measurements.filter((item) => item.longest > MAX_CHARACTERS);
}

/**
 * Абзацы, у которых обход потерял текст. Без этой сверки проверка зеленела бы вхолостую на
 * сломанном обходе: «ни одной строки длиннее предела» верно и для абзаца, у которого по
 * строкам не разложено ни одного знака.
 */
function incomplete(measurements: readonly LineMeasurement[]): LineMeasurement[] {
  return measurements.filter((item) => item.placed !== item.expected);
}

function report(width: number, all: readonly LineMeasurement[]): string {
  const bad = tooLong(all);
  return [
    `ширина ${width}: абзацев ${all.length}, со строкой длиннее ${MAX_CHARACTERS} знаков — ${bad.length}`,
    ...bad.map(
      (item) =>
        `  ${item.longest} знаков в строке (${item.lines} строк, колонка ${item.width}px)  ${item.label}\n    «${item.longestLine}»`,
    ),
  ].join('\n');
}

function lostText(all: readonly LineMeasurement[]): string {
  return incomplete(all)
    .map((item) => `  разложено ${item.placed} знаков из ${item.expected}  ${item.label}`)
    .join('\n');
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
        expect(
          incomplete(measured).length,
          `${path}: обход знаков потерял текст\n${lostText(measured)}`,
        ).toBe(0);
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
        expect(
          incomplete(measured).length,
          `${path}: обход знаков потерял текст\n${lostText(measured)}`,
        ).toBe(0);
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
