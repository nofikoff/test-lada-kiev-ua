import { expect, test } from '@playwright/test';
import { homePages, SITE_ORIGIN } from './support/site';

/**
 * Знаки студии в служебных местах страницы: подпись домена в нижней полосе подвала (FR-035)
 * и значок вкладки (FR-036). Ни то, ни другое не покрыто соседними проверками — сверка полноты
 * контента читает словарь предыдущей версии, а контракт заголовочной части описывает адреса
 * и машиночитаемое описание.
 */

/**
 * Отображаемая форма домена. Литерал хоста здесь свой, как и весь `tests/support/site.ts`:
 * проверка, читающая ту же константу, что и реализация, доказывала бы лишь её согласие с самой
 * собой. Сверка с каноническим адресом страницы стоит отдельно и ловит уже расхождение.
 */
const DOMAIN = new URL(SITE_ORIGIN).host.replace(/^www\./, '');

const ICON_PREFIX = 'data:image/svg+xml,';

/** Латунь палитры. В значке она записана шестнадцатеричной формой: токенов CSS ему не видно. */
const BRASS = '#C9A961';

test.describe('подпись домена (FR-035)', () => {
  for (const { path } of homePages) {
    test(`${path}: домен стоит в подвале, не ссылкой и в одном экземпляре`, async ({ page }) => {
      await page.goto(path);

      /**
       * Ожидаемое значение берётся у канонического адреса самой страницы, а не у литерала выше:
       * так проверка остаётся верной после смены хоста и краснеет ровно на том, ради чего
       * заведено требование — на подписи, отставшей от конфигурации сборки.
       */
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, 'на странице нет канонического адреса').not.toBeNull();
      const expected = new URL(canonical!).host.replace(/^www\./, '');
      expect(expected, 'канонический хост разошёлся с ожидаемым').toBe(DOMAIN);

      const footer = page.locator('footer');
      const signature = footer.getByText(expected, { exact: true });
      await expect(signature, `подписи «${expected}» нет в подвале`).toHaveCount(1);

      // Посетитель уже на сайте: подпись называет адрес, а не ведёт по нему.
      expect(
        await signature.evaluate((element) => element.closest('a') !== null),
        'подпись домена оказалась ссылкой',
      ).toBe(false);

      // Вторая копия домена расходится с первой молча, поэтому она запрещена и в выводе.
      const visible = await page.locator('body').innerText();
      expect(visible.split(expected).length - 1, `домен выведен не один раз`).toBe(1);
    });
  }
});

test.describe('значок вкладки (FR-036)', () => {
  for (const { path } of homePages) {
    test(`${path}: монограмма встроена в разметку и не требует запроса`, async ({ page }) => {
      await page.goto(path);

      const icon = page.locator('link[rel="icon"]');
      await expect(icon).toHaveCount(1);
      await expect(icon).toHaveAttribute('type', 'image/svg+xml');

      /**
       * Отсутствие запроса доказывается формой адреса, а не наблюдением за сетью: безголовый
       * браузер значок вкладки не запрашивает вовсе, поэтому пустой список запросов был бы
       * верен и для значка, вынесенного в файл.
       */
      const href = (await icon.getAttribute('href')) ?? '';
      expect(href.startsWith(ICON_PREFIX), `значок вкладки не встроен: ${href.slice(0, 40)}`).toBe(
        true,
      );

      const mark = await page.evaluate((source) => {
        const document_ = new DOMParser().parseFromString(source, 'image/svg+xml');
        const text = document_.querySelector('text');
        return {
          broken: document_.querySelector('parsererror') !== null,
          letters: (text?.textContent ?? '').replace(/\s+/g, ''),
          fill: text?.getAttribute('fill') ?? '',
          family: text?.getAttribute('font-family') ?? '',
        };
      }, decodeURIComponent(href.slice(ICON_PREFIX.length)));

      expect(mark.broken, 'разметка значка не разбирается как SVG').toBe(false);
      expect(mark.letters, 'знак набран не монограммой').toBe('LN');
      expect(mark.fill.toUpperCase()).toBe(BRASS);
      // Гарнитуры сайта значку недоступны; `Georgia` объявлена запасной для Cormorant.
      expect(mark.family).toContain('Georgia');

      /**
       * Значок обязан отрисоваться из самой строки. Проверка не лишняя: неэкранированная
       * решётка цвета обрывает адрес на фрагменте, и `data:`-префикс при этом остаётся
       * на месте — все проверки выше проходят, а вкладка остаётся пустой.
       */
      const rendered = await page.evaluate(
        (source) =>
          new Promise<boolean>((resolve) => {
            const probe = new Image();
            probe.onload = () => resolve(true);
            probe.onerror = () => resolve(false);
            probe.src = source;
          }),
        href,
      );
      expect(rendered, 'значок не отрисовался из встроенного адреса').toBe(true);
    });
  }
});
