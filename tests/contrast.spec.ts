import { expect, test } from '@playwright/test';
import { categoryPages, homePages, type PageUnderTest } from './support/site';

/**
 * Контраст текста к своей подложке на СОБРАННОЙ странице (SC-001, FR-032).
 *
 * Проверка обходит реальные текстовые элементы и читает вычисленные цвета, а не сверяется
 * с таблицей палитры из data-model.md. Разница принципиальная: расчёт по списку пар доказывает
 * лишь внутреннюю непротиворечивость модели, а ошибка, которую здесь ловят, — «хороший цвет
 * применён к неверной подложке». Увидеть её можно только на странице (research.md §R11; тот же
 * довод про канонический хост записан в `tests/support/site.ts`).
 *
 * Проходов три: покой, наведение, фокус. FR-032 требует одного порога для всех трёх, и проверка
 * одного покоя оставила бы два состояния недоказанными.
 *
 * Порог — 4.5:1 без послабления для крупного текста. WCAG такое послабление даёт, SC-001 нет:
 * там сказано «ни одна пара», и вводить исключение, которого нет в критерии, значило бы
 * ослабить проверку по собственному усмотрению. Запрещённая пара `--muted` на `--raised`
 * (4.38:1) отдельного списка не требует — она не проходит этот порог сама по себе.
 *
 * ГРАНИЦА МЕТОДА. Подложка складывается из `background-color` предков до первого непрозрачного.
 * Фоновая картинка и градиент в счёт не идут: одного цвета, который можно прочитать, у них нет.
 * Для первого экрана это не пробел, а ровно то, ради чего заведён `hero__floor` (FR-017,
 * research.md §R7): статичная подложка обязана держать текст на угле независимо от кадра под
 * ней, и проверка меряет именно уголь. Убери подложку — проверка этого не заметит, заметит
 * глаз на ручном проходе.
 */

/** SC-001. Одно число: и основной, и служебный текст обязаны его держать. */
const MINIMUM_RATIO = 4.5;

/** Что получает наведение и фокус: два из трёх состояний FR-032 проверяются на этом наборе. */
const INTERACTIVE =
  'a[href], button, summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Метка элемента под замером: ставится на время одного измерения и сразу снимается. */
const PROBE = 'data-contrast-probe';

interface Scope {
  readonly name: string;
  readonly pages: readonly PageUnderTest[];
  /** Корень области. */
  readonly within: string;
  /** Что из области исключено: куски, которые пересобираются в другом шаге. */
  readonly without?: readonly string[];
  /**
   * Шаг, в котором область пересобирается. Пока он не пройден, область под `test.fixme()`:
   * иначе полный прогон краснеет на каждом промежуточном шаге, и притом не по своей причине —
   * диагноз указывал бы на шаг, который ни при чём (правило пометок в tasks.md).
   * Снятие пометки — удаление этой строки, и оно обязано быть в коммите самого шага.
   */
  readonly readyAt?: string;
}

/**
 * Области разведены по шагам пересборки, а не по адресам целиком: прайс живёт на тех же
 * пятнадцати адресах, что и всё остальное, но пересобирается на два шага позже первого экрана.
 *
 * Шапка и подвал — четвёртая область, и это отличие от таблицы в quickstart.md, где строк три.
 * Они стоят на каждой странице, а пересобираются последними (Step 7.1, T043); оставь их внутри
 * «главной», и T025 не смог бы её позеленить: сегодняшний копирайт `text-white/40` даёт 3.77:1
 * и провалил бы порог на шаге, который подвала не касается.
 */
const SCOPES: readonly Scope[] = [
  {
    name: 'главная без прайса',
    pages: homePages,
    within: 'main',
    without: ['#services'],
    readyAt: 'Step 3.1',
  },
  {
    name: 'прайс главной',
    pages: homePages,
    within: '#services',
    readyAt: 'Step 4.1',
  },
  {
    name: 'страницы категорий',
    pages: categoryPages,
    within: 'main',
    readyAt: 'Step 5.2',
  },
  {
    name: 'шапка и подвал',
    pages: homePages,
    within: 'header, footer',
    readyAt: 'Step 7.1',
  },
];

interface Measurement {
  readonly label: string;
  readonly text: string;
  readonly color: string;
  readonly background: string;
  readonly ratio: number;
}

interface ProbeRequest {
  readonly within: string;
  readonly without: readonly string[];
  /** `resting` обходит область целиком, `probe` меряет один помеченный элемент. */
  readonly mode: 'resting' | 'probe';
}

/**
 * Всё измерение целиком, включая разбор цвета и формулу WCAG. Функция обязана быть
 * самодостаточной: она сериализуется и исполняется в браузере, где модулей проверки нет.
 * Поэтому же она одна на все три прохода — вторая копия формулы разошлась бы с первой.
 */
function probeInBrowser({ within, without, mode }: ProbeRequest): Measurement[] {
  interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
  }

  function parseColor(value: string): Rgba {
    if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const numbers = value.match(/[\d.]+(?:e[+-]?\d+)?/gi);
    if (!numbers || numbers.length < 3) throw new Error(`не разобран цвет: ${value}`);
    // `color(srgb .07 .06 .05)` отдаёт доли, `rgb(18 16 14)` — байты. Различаются по записи,
    // а не по величине: 1 — законное значение в обеих.
    const scale = value.startsWith('color(') ? 255 : 1;
    return {
      r: Number(numbers[0]) * scale,
      g: Number(numbers[1]) * scale,
      b: Number(numbers[2]) * scale,
      a: numbers.length > 3 ? Number(numbers[3]) : 1,
    };
  }

  function over(top: Rgba, bottom: Rgba): Rgba {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
  }

  function luminance({ r, g, b }: Rgba): number {
    const channel = (value: number) => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrast(a: Rgba, b: Rgba): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** Подложка: слои `background-color` предков, сложенные до первого непрозрачного. */
  function backdrop(element: Element): Rgba {
    const layers: Rgba[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const background = parseColor(getComputedStyle(node).backgroundColor);
      if (background.a > 0) layers.push(background);
      if (background.a === 1) return layers.reduceRight((below, above) => over(above, below));
    }
    throw new Error(`подложка не определена: ни один предок не непрозрачен`);
  }

  function label(element: Element): string {
    const parts: string[] = [];
    for (let node: Element | null = element; node && parts.length < 4; node = node.parentElement) {
      const id = node.id ? `#${node.id}` : '';
      const names =
        typeof node.className === 'string' && node.className.trim() !== ''
          ? `.${node.className.trim().split(/\s+/).slice(0, 2).join('.')}`
          : '';
      parts.unshift(`${node.tagName.toLowerCase()}${id}${names}`);
    }
    return parts.join(' > ');
  }

  /** Собственный текст элемента: текст потомков считается на самих потомках. */
  function ownText(element: Element): string {
    return Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function measure(element: Element): Measurement {
    const style = getComputedStyle(element);
    const under = backdrop(element);
    const text = over(parseColor(style.color), under);
    return {
      label: label(element),
      text: ownText(element).slice(0, 60),
      color: style.color,
      background: `rgb(${Math.round(under.r)} ${Math.round(under.g)} ${Math.round(under.b)})`,
      ratio: Math.round(contrast(text, under) * 100) / 100,
    };
  }

  if (mode === 'probe') {
    const element = document.querySelector('[data-contrast-probe]');
    return element ? [measure(element)] : [];
  }

  const seen = new Set<Element>();
  const results: Measurement[] = [];

  for (const root of Array.from(document.querySelectorAll(within))) {
    for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
      if (seen.has(element)) continue;
      seen.add(element);
      if (without.some((selector) => element.closest(selector))) continue;
      if (ownText(element) === '') continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (Number.parseFloat(style.opacity) === 0) continue;
      results.push(measure(element));
    }
  }

  return results;
}

function below(measurements: readonly Measurement[]): Measurement[] {
  return measurements.filter((item) => item.ratio < MINIMUM_RATIO);
}

function report(state: string, all: readonly Measurement[]): string {
  const bad = below(all);
  return [
    `${state}: замерено ${all.length}, ниже ${MINIMUM_RATIO}:1 — ${bad.length}`,
    ...bad.map(
      (item) => `  ${item.ratio}:1  ${item.color} на ${item.background}  ${item.label}  «${item.text}»`,
    ),
  ].join('\n');
}

for (const scope of SCOPES) {
  test.describe(`контраст: ${scope.name}`, () => {
    for (const { path } of scope.pages) {
      test(`${path} держит порог в покое, при наведении и в фокусе`, async ({ page }) => {
        if (scope.readyAt) test.fixme(true, `область пересобирается в ${scope.readyAt}`);

        const request: ProbeRequest = {
          within: scope.within,
          without: scope.without ?? [],
          mode: 'resting',
        };

        await page.goto(path);

        /**
         * Скрытые вкладки прайса раскрываются перед замером: иначе под проверку попадала бы
         * четверть прайса — три панели из четырёх скрывает скрипт при загрузке. Раскрытие
         * меняет раскладку, но не цвета, а меряются здесь цвета.
         */
        await page.evaluate(() => {
          document
            .querySelectorAll<HTMLElement>('[role="tabpanel"][hidden]')
            .forEach((panel) => (panel.hidden = false));
        });

        const resting = await page.evaluate(probeInBrowser, request);
        expect(resting.length, `${path}: в области «${scope.name}» не найдено текста`).toBeGreaterThan(0);
        expect(below(resting).length, report('покой', resting)).toBe(0);

        const targets = page.locator(`:is(${scope.within}) :is(${INTERACTIVE}):visible`);
        const count = await targets.count();
        expect(count, `${path}: в области «${scope.name}» нет интерактивных элементов`).toBeGreaterThan(0);

        const single: ProbeRequest = { ...request, mode: 'probe' };
        const hovered: Measurement[] = [];
        const focused: Measurement[] = [];

        for (let index = 0; index < count; index += 1) {
          const target = targets.nth(index);
          await target.evaluate((element, name) => element.setAttribute(name, ''), PROBE);

          await target.hover();
          hovered.push(...(await page.evaluate(probeInBrowser, single)));

          await target.focus();
          focused.push(...(await page.evaluate(probeInBrowser, single)));

          await target.evaluate((element, name) => element.removeAttribute(name), PROBE);
        }

        // Без этих двух строк проходы наведения и фокуса зеленеют вхолостую: сломайся метка
        // элемента — списки остались бы пустыми, а «ни одной пары ниже порога» верно и для пустого.
        expect(hovered.length, 'проход наведения не измерил ни одного элемента').toBe(count);
        expect(focused.length, 'проход фокуса не измерил ни одного элемента').toBe(count);

        expect(below(hovered).length, report('наведение', hovered)).toBe(0);
        expect(below(focused).length, report('фокус', focused)).toBe(0);
      });
    }
  });
}
