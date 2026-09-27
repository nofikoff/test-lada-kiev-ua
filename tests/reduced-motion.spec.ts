import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Деградация движения (docs/specs/motion.md правила 3 и 4).
 *
 * Две разные проверки в одном файле, потому что доказывают они одно требование с двух сторон.
 *
 * Первая — с эмуляцией системного предпочтения: ни у одного элемента нет действующей анимации
 * или перехода, положения ключевых блоков через секунду те же, а содержимое видно. Одного
 * разбора свойств мало (анимация могла бы прийти из другого места каскада), одного сравнения
 * снимков — тоже (медленная анимация за секунду сдвинется меньше порога измерения);
 * вместе они закрывают требование.
 *
 * Вторая — разбором собранного CSS: ни один движок прогона не воспроизводит отсутствие
 * таймлайна, поэтому пустую страницу в браузере без поддержки увидел бы только посетитель.
 */

/**
 * Каталог сборки: проверяется опубликованный CSS, а не исходники. Через `fileURLToPath`,
 * а не `.pathname`: на Windows последний даёт `/C:/…`, чего `readdirSync` не откроет.
 */
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const PAGES = ['/', '/massage/'] as const;

/**
 * Что обязано стоять на месте. Классы названы прямо: проверка сторожит именно эти четыре
 * сорта блоков — секции, карточки услуг, позиции прайса и подвал.
 */
const ANCHORS = 'main section, .door, .item, footer a, footer p';

test.describe('уменьшенное движение', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of PAGES) {
    test(`${path}: ни одной действующей анимации и ни одного перехода`, async ({ page }) => {
      await page.goto(path);

      const moving = await page.evaluate(() => {
        const found: string[] = [];

        const positive = (value: string) =>
          value
            .split(',')
            .map((part) => Number.parseFloat(part))
            .some((seconds) => Number.isFinite(seconds) && seconds > 0);

        const describe = (element: Element) =>
          `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
            typeof element.className === 'string' && element.className.trim() !== ''
              ? `.${element.className.trim().split(/\s+/).slice(0, 2).join('.')}`
              : ''
          }`;

        for (const element of Array.from(document.querySelectorAll('*'))) {
          // Псевдоэлементы проверяются наравне: весь фоновый слой и все блики живут на них,
          // и правило отключения выписано на `*::before` и `*::after` именно поэтому.
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(element, pseudo);
            if (style.animationName !== 'none') {
              found.push(`${describe(element)}${pseudo ?? ''} — анимация ${style.animationName}`);
            }
            if (positive(style.transitionDuration)) {
              found.push(
                `${describe(element)}${pseudo ?? ''} — переход ${style.transitionDuration}`,
              );
            }
          }
        }

        return found;
      });

      expect(moving, `движение осталось у ${moving.length} элементов:\n${moving.join('\n')}`).toEqual(
        [],
      );
    });

    test(`${path}: положения блоков не меняются за секунду`, async ({ page }) => {
      await page.goto(path);

      const snapshot = () =>
        page.evaluate((selector) => {
          const boxes: Record<string, string> = {};
          Array.from(document.querySelectorAll(selector)).forEach((element, index) => {
            const box = element.getBoundingClientRect();
            if (box.width === 0 && box.height === 0) return;
            boxes[`${index}:${element.tagName.toLowerCase()}`] =
              `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`;
          });
          return boxes;
        }, ANCHORS);

      const before = await snapshot();
      // Пустой снимок прошёл бы сравнение вхолостую: «ничего не сдвинулось» верно и для ничего.
      expect(Object.keys(before).length, 'ни один ключевой блок не найден').toBeGreaterThan(20);

      await page.waitForTimeout(1000);
      const after = await snapshot();

      expect(after).toEqual(before);
    });

    test(`${path}: содержимое видно, а не спрятано до таймлайна`, async ({ page }) => {
      await page.goto(path);

      const hidden = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.reveal'))
          .filter((element) => Number.parseFloat(getComputedStyle(element).opacity) < 1)
          .map((element) => element.className),
      );

      const carriers = await page.locator('.reveal').count();
      expect(carriers, 'носителей проявления на странице нет — проверять нечего').toBeGreaterThan(0);
      expect(hidden, `невидимые блоки: ${hidden.join(', ')}`).toEqual([]);
    });
  }
});

/** Собранные файлы стилей: их и читает посетитель, а не исходники. */
function builtStylesheets(): { name: string; css: string }[] {
  const files: { name: string; css: string }[] = [];

  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.css')) files.push({ name: path, css: readFileSync(path, 'utf8') });
    }
  };

  walk(DIST);
  return files;
}

interface Block {
  /** Заголовок блока: селектор правила или `@keyframes …`. */
  readonly head: string;
  readonly body: string;
  /** Стек внешних правил `@…`, от внешнего к внутреннему. */
  readonly outer: readonly string[];
}

/**
 * Разбор скобками, а не готовым парсером: в проекте нет зависимости, которая читала бы CSS,
 * а вопрос к файлу ровно один — что лежит снаружи блока с нулевой непрозрачностью.
 */
function blocksOf(css: string): Block[] {
  const blocks: Block[] = [];
  const stack: { head: string; start: number }[] = [];
  let head = '';

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (character === '{') {
      stack.push({ head: head.trim(), start: index + 1 });
      head = '';
      continue;
    }
    if (character === '}') {
      const block = stack.pop();
      if (!block) continue;
      blocks.push({
        head: block.head,
        body: css.slice(block.start, index),
        outer: stack.map((entry) => entry.head),
      });
      head = '';
      continue;
    }
    head += character;
  }

  return blocks;
}

const ZERO_OPACITY = /opacity\s*:\s*0(?!\.|\d)/;

/**
 * Метка `@build` уводит обе проверки ниже в одноимённый проект прогона: они читают файлы из
 * `dist/` и браузера не открывают, поэтому исполняются один раз, а не по разу на каждый из трёх
 * движков. Разбор проекта — в `playwright.config.ts`.
 */
const BUILD_TAG = '@build';

test.describe('собранный CSS', () => {
  /**
   * docs/specs/motion.md правило 3. Область сужена до носителей проявления намеренно:
   * `rise`, `ring` и `door-lit` законно объявляют нулевую непрозрачность вне блока поддержки —
   * это стартовые кадры бесконечных анимаций, чья невидимость длится доли секунды и от
   * таймлайна не зависит. Проверка «любая нулевая непрозрачность внутри @supports» краснела бы
   * на них, и это была бы её собственная ошибка.
   */
  test(`невидимость носителя проявления объявлена внутри @supports ${BUILD_TAG}`, () => {

    const offenders: string[] = [];
    let carriers = 0;

    for (const { name, css } of builtStylesheets()) {
      for (const block of blocksOf(css)) {
        const isCarrier =
          /\.reveal\b/.test(block.head) ||
          /@keyframes\s+reveal\b/.test(block.head) ||
          block.outer.some((outer) => /@keyframes\s+reveal\b/.test(outer));
        if (!isCarrier) continue;
        if (!ZERO_OPACITY.test(block.body)) continue;

        carriers += 1;
        const supported = block.outer.some((outer) => /@supports[^{]*animation-timeline/.test(outer));
        if (!supported) offenders.push(`${name}: ${block.head} вне @supports`);
      }
    }

    expect(carriers, 'в собранном CSS нет ни одного правила проявления — проверять нечего').toBeGreaterThan(0);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  /**
   * Сторож сжатия стилей, а не требования спеки. Сокращённая запись `animation` таймлайн
   * не принимает: `CSS.supports('animation', 'linear both reveal view()')` отдаёт false в обоих
   * движках прогона, и правило отбрасывается целиком — проявление и уплотнение шапки молча
   * перестают работать. Именно так и вело себя сжатие через lightningcss (astro.config.mjs),
   * поэтому запись обязана оставаться раздельной. Вложенность при этом остаётся верной,
   * то есть проверка выше такую сборку пропускает.
   */
  test(`таймлайн объявлен отдельным свойством, а не внутри сокращённой записи ${BUILD_TAG}`, () => {

    const offenders: string[] = [];
    let declarations = 0;

    for (const { name, css } of builtStylesheets()) {
      for (const match of css.matchAll(/animation\s*:\s*([^;}]+)/g)) {
        declarations += 1;
        if (/\b(?:view|scroll)\s*\(/.test(match[1])) {
          offenders.push(`${name}: animation: ${match[1].trim()}`);
        }
      }
    }

    expect(declarations, 'в собранном CSS нет ни одной анимации — проверять нечего').toBeGreaterThan(0);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
