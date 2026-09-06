import type { PriceGroup } from '../data/price-groups';
import type { UiDictionary } from './ui';

export type TabId = keyof UiDictionary['priceList']['tabs'];

export interface PriceTab {
  readonly id: TabId;
  readonly groups: readonly PriceGroup[];
}

/**
 * Раскладка вкладок главной страницы, а не данные: перечисляет, какие группы показывает вкладка.
 * Состав повторяет действующие вкладки — включая то, что перманентный макияж живёт внутри
 * вкладки бьюти-услуг, хотя ему соответствует отдельная страница категории
 * (data-model.md §Конфигурация вкладок).
 */
export const priceTabs = [
  { id: 'bodyMassage', groups: ['fullBodyMassage', 'localMassage'] },
  { id: 'exotic', groups: ['exotic'] },
  { id: 'depilation', groups: ['womenDepilation', 'combos', 'menDepilation'] },
  {
    id: 'beauty',
    groups: ['browsLashes', 'makeupHair', 'permanentBrows', 'permanentLips', 'permanentEyeliner'],
  },
] as const satisfies readonly PriceTab[];
