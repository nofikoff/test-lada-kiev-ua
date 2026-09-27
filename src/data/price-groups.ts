import type { ServiceCategory } from '../i18n/paths';

/**
 * Единственное место, где группа прайса связана с категорией услуг.
 * Одно измерение данных обслуживает две группировки: страница категории берёт позиции по этой
 * таблице, вкладки главной — по своему составу групп. Ни та, ни другая не хранит цен,
 * поэтому разойтись они не могут (docs/specs/content-model.md §Инварианты, ADR-006).
 */
export const priceGroupCategory = {
  fullBodyMassage: 'massage',
  localMassage: 'massage',
  exotic: 'massage',
  womenDepilation: 'depilation',
  combos: 'depilation',
  menDepilation: 'depilation',
  permanentBrows: 'permanent',
  permanentLips: 'permanent',
  permanentEyeliner: 'permanent',
  browsLashes: 'beauty',
  makeupHair: 'beauty',
} as const satisfies Record<string, ServiceCategory>;

export type PriceGroup = keyof typeof priceGroupCategory;

export const priceGroups = Object.keys(priceGroupCategory) as readonly PriceGroup[];

export function categoryOf(group: PriceGroup): ServiceCategory {
  return priceGroupCategory[group];
}

export function groupsOfCategory(category: ServiceCategory): readonly PriceGroup[] {
  return priceGroups.filter((group) => priceGroupCategory[group] === category);
}
