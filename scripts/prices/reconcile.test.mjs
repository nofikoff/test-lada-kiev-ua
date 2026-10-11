import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from './reconcile.mjs';

const prices = [
  {
    id: 'massage',
    group: 'g',
    name: { uk: 'a', ru: 'a', en: 'a' },
    price: {
      kind: 'variants',
      unit: 'minutes',
      variants: [
        { count: 60, amount: 1600 },
        { count: 90, amount: 2300 },
      ],
    },
  },
  {
    id: 'correction',
    group: 'g',
    name: { uk: 'b', ru: 'b', en: 'b' },
    price: { kind: 'share', percent: 50, note: { uk: 'x', ru: 'x', en: 'x' } },
  },
  { id: 'brows', group: 'g', name: { uk: 'c', ru: 'c', en: 'c' }, price: { kind: 'fixed', amount: 800 } },
];

/** Sheet rows as published; `overrides` sets the amount Lada typed per key. */
function sheet(overrides = {}) {
  return [
    { key: 'massage@60', published: 1600 },
    { key: 'massage@90', published: 2300 },
    { key: 'brows', published: 800 },
  ].map((row) => ({ ...row, amount: row.key in overrides ? overrides[row.key] : row.published }));
}

test('no edits: nothing applied, nothing rejected, prices unchanged', () => {
  const result = reconcile(prices, sheet());
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.rejected, []);
  assert.deepEqual(result.next, prices);
});

test('an ordinary edit is applied and only the amount changes', () => {
  const result = reconcile(prices, sheet({ 'massage@60': 1700 }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, [{ key: 'massage@60', from: 1600, to: 1700 }]);
  assert.equal(result.next[0].price.variants[0].amount, 1700);
  assert.deepEqual(result.next.slice(1), prices.slice(1));
});

test('structure mismatch: extra, missing or reordered key stops the whole run', () => {
  const rows = sheet();
  for (const broken of [
    [...rows, { key: 'ghost', amount: 1, published: 1 }],
    rows.slice(0, 2),
    [rows[1], rows[0], rows[2]],
  ]) {
    const result = reconcile(prices, broken);
    assert.equal(result.ok, false);
    assert.equal(result.error.kind, 'StructureMismatch');
  }
});

test('conflict: an amount edited in git after the last publication stops the run', () => {
  const edited = structuredClone(prices);
  edited[2].price.amount = 850;
  const result = reconcile(edited, sheet({ brows: 900 }));
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'Conflict');
  assert.deepEqual(result.error.keys, ['brows']);
});

test('invalid amounts stop the run', () => {
  for (const amount of [0, -5, 12.5, 'abc', '', null, undefined]) {
    const result = reconcile(prices, sheet({ brows: amount }));
    assert.equal(result.ok, false, `amount ${JSON.stringify(amount)}`);
    assert.equal(result.error.kind, 'InvalidAmount');
    assert.deepEqual(result.error.keys, ['brows']);
  }
});

test('a jump of more than double either way is rejected, the rest applied', () => {
  const result = reconcile(prices, sheet({ brows: 1601, 'massage@60': 799, 'massage@90': 2400 }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.rejected, [
    { key: 'massage@60', from: 1600, to: 799, reason: 'jump' },
    { key: 'brows', from: 800, to: 1601, reason: 'jump' },
  ]);
  assert.deepEqual(result.applied, [{ key: 'massage@90', from: 2300, to: 2400 }]);
  assert.equal(result.next[2].price.amount, 800);
  assert.equal(result.next[0].price.variants[0].amount, 1600);
});

test('exactly double and exactly half are published', () => {
  const result = reconcile(prices, sheet({ brows: 1600, 'massage@60': 800 }));
  assert.deepEqual(result.rejected, []);
  assert.equal(result.applied.length, 2);
});

test('allowLarge lifts the threshold for its own keys only', () => {
  const result = reconcile(prices, sheet({ brows: 4000, 'massage@60': 5000 }), {
    allowLarge: new Set(['brows']),
  });
  assert.deepEqual(result.applied, [{ key: 'brows', from: 800, to: 4000 }]);
  assert.deepEqual(result.rejected, [{ key: 'massage@60', from: 1600, to: 5000, reason: 'jump' }]);
});

test('allowLarge naming a key the sheet does not have is a call error', () => {
  assert.throws(() => reconcile(prices, sheet(), { allowLarge: new Set(['ghost']) }), /ghost/);
});
