/**
 * Mapping between src/data/prices.json and the rows of the price sheet. Cell addresses are the
 * contract shared with publish.mjs, report.mjs, rebuild-sheet.mjs and apps-script/Code.js:
 * specs/005-sheet-price-publishing/contracts/sheet-layout.md.
 */

export const SHEET_NAME = 'Цены';
export const PUBLISH_CELL = 'B1';
export const STATUS_CELL = 'C1';
export const HEADER_ROW = 3;
export const FIRST_DATA_ROW = 4;
export const HEADERS = ['ключ', 'Услуга', 'Вариант', 'Сумма, грн', 'На сайте', 'Пометка'];

/** `<id>` for a fixed price, `<id>@<count>` for one variant. */
export function rowKey(id, count) {
  return count === undefined ? id : `${id}@${count}`;
}

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

/** One row per editable amount; `share` positions have no amount and stay out of the sheet. */
export function rowsFromPrices(prices) {
  const rows = [];
  for (const item of prices) {
    const { price } = item;
    if (price.kind === 'fixed') {
      rows.push({ key: rowKey(item.id), name: item.name.ru, variant: '', amount: price.amount });
    } else if (price.kind === 'variants') {
      price.variants.forEach((variant, index) => {
        rows.push({
          key: rowKey(item.id, variant.count),
          name: index === 0 ? item.name.ru : '',
          variant: variantLabel(price.unit, variant.count),
          amount: variant.amount,
        });
      });
    }
  }
  return rows;
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
    const { price } = item;
    if (price.kind === 'fixed') {
      const amount = amountsByKey.get(rowKey(item.id));
      if (amount !== undefined) price.amount = amount;
    } else if (price.kind === 'variants') {
      for (const variant of price.variants) {
        const amount = amountsByKey.get(rowKey(item.id, variant.count));
        if (amount !== undefined) variant.amount = amount;
      }
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

export function lastDataRow(rowCount) {
  return FIRST_DATA_ROW + rowCount - 1;
}
