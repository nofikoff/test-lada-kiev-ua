/**
 * Негативные типовые проверки таблицы `subpageRefs` (src/i18n/paths.ts). Ограничение «у каждой
 * подстраницы есть ссылка, и родитель в ней — её собственный» держит компилятор, а не исполнение,
 * поэтому проверка — `npm run check`: `@ts-expect-error` без ошибки под ним сам есть ошибка
 * компиляции. Сборка файл не импортирует, в `dist/` он не попадает.
 */
import type { SubpageRefOf } from '../../src/i18n/paths';

// Ошибка о чужом родителе стоит на самом свойстве, о недостающей записи — на строке `satisfies`.
export const foreignParent = {
  // @ts-expect-error подстраница не может ссылаться на родителя другой подстраницы
  sugaring: { category: 'permanent', subpage: 'sugaring' },
  // @ts-expect-error то же в обратную сторону
  brows: { category: 'depilation', subpage: 'brows' },
} satisfies SubpageRefOf;

export const missingEntry = {
  sugaring: { category: 'depilation', subpage: 'sugaring' },
  // @ts-expect-error у каждой подстраницы реестра должна быть ссылка: у brows её нет
} satisfies SubpageRefOf;
