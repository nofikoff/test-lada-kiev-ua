import { defaultLocale, type Locale } from '../i18n/ui';
import type { ServiceCategory } from '../i18n/paths';
import { categoryOf, type PriceGroup } from './price-groups';

/** Цена позиции, которую показывает страница: общая или пастой (docs/specs/content-model.md §Инварианты). */
export type PriceMethod = 'base' | 'sugar';

interface SubpageDefinition {
  readonly parent: ServiceCategory;
  readonly locales: readonly Locale[];
  readonly groups: readonly PriceGroup[];
  readonly method: PriceMethod;
}

/**
 * Подстраницы услуг — единственное место, где подстраница существует: путь, языковые
 * альтернативы, маршруты и схема текстов выводятся отсюда (ADR-028). Языки — те, на которых
 * кластер есть в ядре, поэтому их набор у подстраницы свой, а не общий с категориями.
 */
export const serviceSubpages = {
  sugaring: {
    parent: 'depilation',
    locales: ['uk', 'ru'],
    // Группы триммера и бритвы не читаются: пасты в них нет.
    groups: ['womenDepilation', 'combos', 'menDepilation', 'menCombos'],
    method: 'sugar',
  },
  brows: {
    parent: 'permanent',
    locales: ['uk', 'ru'],
    groups: ['permanentBrows'],
    method: 'base',
  },
} as const satisfies Record<string, SubpageDefinition>;

export type ServiceSubpage = keyof typeof serviceSubpages;

export const subpageSlugs = Object.keys(serviceSubpages) as [ServiceSubpage, ...ServiceSubpage[]];

/**
 * Связи, которые тип не выражает, проверяются при загрузке модуля и роняют сборку: группа чужой
 * категории показала бы на подстранице прайс другой услуги, а подстраница без украинской версии
 * осталась бы без `x-default`.
 */
for (const subpage of subpageSlugs) {
  const definition: SubpageDefinition = serviceSubpages[subpage];
  for (const group of definition.groups) {
    if (categoryOf(group) !== definition.parent) {
      throw new Error(
        `подстраница «${subpage}»: группа прайса «${group}» принадлежит категории ` +
          `«${categoryOf(group)}», а не «${definition.parent}»`,
      );
    }
  }
  if (!definition.locales.includes(defaultLocale)) {
    throw new Error(
      `подстраница «${subpage}»: нет языка «${defaultLocale}», а он — версия по умолчанию (x-default)`,
    );
  }
}

// Экспорт нужен `tests/types/subpage-refs.ts`: его негативные случаи компилируются против этого типа.
export type SubpageRefOf = {
  [S in ServiceSubpage]: {
    readonly category: (typeof serviceSubpages)[S]['parent'];
    readonly subpage: S;
  };
};

/** Ссылка на подстраницу: категория в ней — всегда её родитель, другой тип не допускает. */
export type SubpageRef = SubpageRefOf[ServiceSubpage];

/**
 * Единственное место, где создаются значения `SubpageRef`. Внутри обобщённой функции TypeScript
 * не связывает ключ реестра с его родителем (пара расширяется до объединения), поэтому каждая
 * ссылка выписана, а `satisfies` заставляет компилятор держать обе половины: у каждой записи
 * реестра здесь есть ссылка, а ссылка с чужим родителем не компилируется.
 */
export const subpageRefs = {
  sugaring: { category: serviceSubpages.sugaring.parent, subpage: 'sugaring' },
  brows: { category: serviceSubpages.brows.parent, subpage: 'brows' },
} satisfies SubpageRefOf;
