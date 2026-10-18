/**
 * Типовые проверки таблицы `subpageRefs` (src/data/subpage-registry.ts). Ограничение «у каждой
 * подстраницы есть ссылка, и родитель в ней — её собственный» держит компилятор, а не исполнение,
 * поэтому проверка — `npm run check`: `@ts-expect-error` без ошибки под ним сам есть ошибка
 * компиляции. Сборка файл не импортирует, в `dist/` он не попадает.
 */
import { subpageRefs, type SubpageRefOf } from '../../src/data/subpage-registry';

// Сама таблица реестра, а не только тип: без `satisfies` у неё `subpage` расширяется до `string`.
export const registryRefs: SubpageRefOf = subpageRefs;

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
