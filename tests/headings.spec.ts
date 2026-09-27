import { expect, test } from '@playwright/test';
import { builtPages } from './support/site';

/**
 * Порядок заголовков собранной страницы: ровно один `h1` и ни одной пропущенной ступени.
 *
 * Цель — сто баллов доступности (docs/specs/accessibility.md), а прогон до этой проверки мерил из
 * её составляющих только контраст: `heading-order` и `page-has-heading-one` снимались вручную, Lighthouse, и потому
 * разрыв `h1 -> h3` в «Про нас» дожил до приёмки. Проверка закрывает именно этот пробел.
 *
 * Считается разметка ответа, а не дерево браузера. Заголовок группы прайса, скрытый неактивной
 * вкладкой, остаётся заголовком документа — его читают и экранный диктор при переключении, и
 * поисковый обход, — а требования сформулированы про опубликованный файл (ADR-012).
 * Проверка поэтому строже axe, который скрытые заголовки пропускает, и это осознанно.
 */

/**
 * Уровни заголовков в порядке появления в разметке. Скрипты, стили и комментарии убираются
 * до разбора: внутри них `<h2>` — не заголовок, а текст.
 */
function headingLevels(html: string): number[] {
  const markup = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  return [...markup.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
}

test.describe('порядок заголовков', () => {
  for (const { path } of builtPages) {
    test(`${path}: ровно один h1`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status(), `${path} не собрана`).toBe(200);

      const levels = headingLevels(await response.text());
      const first = levels.filter((level) => level === 1);

      expect(first.length, `${path}: h1 не один, а ${first.length}`).toBe(1);
      expect(levels[0], `${path} начинается не с h1, а с h${levels[0]}`).toBe(1);
    });

    test(`${path}: уровни заголовков не перескакивают через ступень`, async ({ request }) => {
      const levels = headingLevels(await (await request.get(path)).text());

      // Разбор, потерявший заголовки, прошёл бы проверку ниже вхолостую: на пустом списке
      // и на списке из одного элемента перескочить нечему.
      expect(levels.length, `${path}: заголовков не найдено`).toBeGreaterThan(1);

      const skips = levels
        .map((level, index) => ({ from: levels[index - 1], to: level }))
        .slice(1)
        .filter((step) => step.to > step.from + 1)
        .map((step) => `h${step.from} -> h${step.to}`);

      expect(skips, `${path}: пропущены ступени — ${skips.join(', ')}`).toEqual([]);
    });
  }
});
