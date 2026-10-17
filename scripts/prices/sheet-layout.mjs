/**
 * Mapping between src/data/prices.json and the rows of the price sheet. Cell addresses are the
 * contract shared with publish.mjs, report.mjs, rebuild-sheet.mjs and apps-script/Code.js:
 * specs/005-sheet-price-publishing/contracts/sheet-layout.md. Rows of a sugar amount:
 * specs/006-service-subpages/data-model.md §Sheet row of a sugar amount.
 */

export const SHEET_NAME = 'Цены';
export const PUBLISH_CELL = 'B1';
export const PUBLISH_LABEL_CELL = 'B2';
export const PUBLISH_LABEL = '↑ Опубликовать';
export const STATUS_CELL = 'C1';
export const HEADER_ROW = 3;
export const FIRST_DATA_ROW = 4;
export const HEADERS = ['ключ', 'Услуга', 'Вариант', 'Сумма, грн', 'На сайте', 'Пометка'];

/** `<id>` for a fixed price, `<id>@<count>` for one variant; the sugar price inserts `/sugar` after the id. */
export function rowKey(id, count, method = 'base') {
  const base = method === 'base' ? id : `${id}/${method}`;
  return count === undefined ? base : `${base}@${count}`;
}

/** Price fields of a position in sheet order: the shared price first, then the sugar one. */
const PRICE_FIELDS = [
  { method: 'base', field: 'price', label: '' },
  { method: 'sugar', field: 'sugar', label: 'сахар' },
];

function sessionsWord(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'сеансов';
  if (last === 1) return 'сеанс';
  if (last >= 2 && last <= 4) return 'сеанса';
  return 'сеансов';
}

export function variantLabel(unit, count) {
  if (unit === 'minutes') return `${count} мин`;
  if (unit === 'sessions') return `${count} ${sessionsWord(count)}`;
  throw new Error(`unknown variant unit: ${unit}`);
}

/**
 * Every editable amount of one position with its row key, its `Вариант` label and the object that
 * owns the `amount`. The only place that knows the price shapes: rowsFromPrices reads through it and
 * applyAmounts writes through it, so a key cannot mean one amount when read and another when written.
 * `share` has no amount, and `sugar: false` or no `sugar` gives no row.
 */
function amountSlots(item) {
  return PRICE_FIELDS.flatMap(({ method, field, label }) => {
    const price = item[field];
    if (price?.kind === 'fixed') return [{ key: rowKey(item.id, undefined, method), variant: label, owner: price }];
    if (price?.kind === 'variants') {
      return price.variants.map((variant) => ({
        key: rowKey(item.id, variant.count, method),
        variant: [label, variantLabel(price.unit, variant.count)].filter(Boolean).join(', '),
        owner: variant,
      }));
    }
    return [];
  });
}

/** One row per editable amount, named on the first row of its position only. */
export function rowsFromPrices(prices) {
  return prices.flatMap((item) =>
    amountSlots(item).map((slot, index) => ({
      key: slot.key,
      group: item.group,
      name: index === 0 ? item.name.ru : '',
      variant: slot.variant,
      amount: slot.owner.amount,
    })),
  );
}

export function amountsOf(prices) {
  return new Map(rowsFromPrices(prices).map((row) => [row.key, row.amount]));
}

/** Returns a copy of `prices` with the given amounts; every other field is carried over as is. */
export function applyAmounts(prices, amountsByKey) {
  const known = amountsOf(prices);
  for (const key of amountsByKey.keys()) {
    if (!known.has(key)) throw new Error(`price list has no row ${key}`);
  }
  const next = structuredClone(prices);
  for (const item of next) {
    for (const slot of amountSlots(item)) {
      const amount = amountsByKey.get(slot.key);
      if (amount !== undefined) slot.owner.amount = amount;
    }
  }
  return next;
}

/**
 * Sheet rows after a rebuild. A pending edit by Lada survives only where the snapshot still matches
 * the repository; where it does not, the amount was changed in git and the repository wins, which
 * is the documented way out of a Conflict.
 */
export function mergeRows(prices, currentRows) {
  const current = new Map(currentRows.map((row) => [row.key, row]));
  return rowsFromPrices(prices).map((row) => {
    const existing = current.get(row.key);
    const keepsPendingEdit = existing !== undefined && existing.published === row.amount;
    return {
      ...row,
      amount: keepsPendingEdit ? existing.amount : row.amount,
      published: row.amount,
    };
  });
}

/**
 * Sheet lines from FIRST_DATA_ROW on: a header line before the first row of each group (FR-032).
 * `labels` is ui.ru.priceList.sections, passed in so this module stays free of the TS dictionary
 * import (research.md §R12). Throws before anything is written: a split group would get two headers,
 * a group without a label would get an empty one.
 */
export function sheetLines(rows, labels) {
  const lines = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.group !== lines.at(-1)?.group) {
      if (seen.has(row.group)) throw new Error(`group ${row.group} is not contiguous in prices.json`);
      if (!Object.hasOwn(labels, row.group)) {
        throw new Error(`group ${row.group} has no label in ui.ru.priceList.sections`);
      }
      seen.add(row.group);
      lines.push({ kind: 'header', group: row.group, label: labels[row.group] });
    }
    lines.push({ kind: 'row', ...row });
  }
  return lines;
}

export function lastDataRow(rowCount) {
  return FIRST_DATA_ROW + rowCount - 1;
}
