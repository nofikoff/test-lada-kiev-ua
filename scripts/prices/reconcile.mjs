import { amountsOf, applyAmounts } from './sheet-layout.mjs';

const REBUILD_HINT = 'перестрой таблицу: Actions → publish → mode rebuild-sheet';

function failure(kind, keys, message) {
  return { ok: false, error: { kind, keys, message } };
}

function isValidAmount(value) {
  return Number.isInteger(value) && value > 0;
}

function isJump(from, to) {
  return to > 2 * from || to < from / 2;
}

/**
 * Sheet rows `{ key, amount, published }` against the price list. Pure: the caller writes files
 * and the sheet. Check order and outcomes — specs/005-sheet-price-publishing/data-model.md
 * §Reconcile.
 */
export function reconcile(prices, rows, { allowLarge = new Set() } = {}) {
  const sheetKeys = rows.map((row) => row.key);
  for (const key of allowLarge) {
    if (!sheetKeys.includes(key)) throw new Error(`allow_large_change names an unknown row: ${key}`);
  }

  const repoAmounts = amountsOf(prices);
  const repoKeys = [...repoAmounts.keys()];
  if (repoKeys.length !== sheetKeys.length || repoKeys.some((key, index) => key !== sheetKeys[index])) {
    const keys = [
      ...sheetKeys.filter((key) => !repoAmounts.has(key)),
      ...repoKeys.filter((key) => !sheetKeys.includes(key)),
    ];
    return failure(
      'StructureMismatch',
      keys,
      `строки таблицы не совпадают с прайсом репозитория (${keys.length ? keys.join(', ') : 'другой порядок'}); ${REBUILD_HINT}`,
    );
  }

  const conflicts = rows.filter((row) => row.published !== repoAmounts.get(row.key)).map((row) => row.key);
  if (conflicts.length) {
    return failure(
      'Conflict',
      conflicts,
      `суммы в репозитории разошлись с опубликованными из таблицы: ${conflicts.join(', ')}; ${REBUILD_HINT}`,
    );
  }

  const invalid = rows.filter((row) => !isValidAmount(row.amount)).map((row) => row.key);
  if (invalid.length) {
    return failure('InvalidAmount', invalid, `сумма не целое число больше нуля: ${invalid.join(', ')}`);
  }

  const applied = [];
  const rejected = [];
  for (const { key, amount: to, published: from } of rows) {
    if (to === from) continue;
    if (isJump(from, to) && !allowLarge.has(key)) {
      rejected.push({ key, from, to, reason: 'jump' });
    } else {
      applied.push({ key, from, to });
    }
  }

  const next = applyAmounts(prices, new Map(applied.map(({ key, to }) => [key, to])));
  return { ok: true, next, applied, rejected };
}
