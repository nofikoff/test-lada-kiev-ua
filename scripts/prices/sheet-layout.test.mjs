import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyAmounts, rowsFromPrices, variantLabel } from './sheet-layout.mjs';

const fixture = [
  {
    id: 'massage',
    group: 'g',
    name: { uk: 'Масаж', ru: 'Массаж', en: 'Massage' },
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
    name: { uk: 'Корекція', ru: 'Коррекция', en: 'Correction' },
    price: { kind: 'share', percent: 50, note: { uk: 'x', ru: 'x', en: 'x' } },
  },
  {
    id: 'brows',
    group: 'g',
    name: { uk: 'Брови', ru: 'Брови', en: 'Brows' },
    price: { kind: 'fixed', amount: 800 },
  },
];

test('one row per amount in file order, share skipped, name on the first variant only', () => {
  assert.deepEqual(rowsFromPrices(fixture), [
    { key: 'massage@60', name: 'Массаж', variant: '60 мин', amount: 1600 },
    { key: 'massage@90', name: '', variant: '90 мин', amount: 2300 },
    { key: 'brows', name: 'Брови', variant: '', amount: 800 },
  ]);
});

test('session labels follow Russian plural rules', () => {
  const labels = [1, 2, 4, 5, 10, 11, 14, 21, 22, 25].map((count) => variantLabel('sessions', count));
  assert.deepEqual(labels, [
    '1 сеанс',
    '2 сеанса',
    '4 сеанса',
    '5 сеансов',
    '10 сеансов',
    '11 сеансов',
    '14 сеансов',
    '21 сеанс',
    '22 сеанса',
    '25 сеансов',
  ]);
});

test('an unknown unit is an error, not a blank label', () => {
  assert.throws(() => variantLabel('hours', 2), /hours/);
});

test('the real price list yields 110 rows with unique keys', () => {
  const prices = JSON.parse(readFileSync(new URL('../../src/data/prices.json', import.meta.url), 'utf8'));
  const rows = rowsFromPrices(prices);
  assert.equal(rows.length, 110);
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
});

test('applyAmounts changes amounts only and leaves the input untouched', () => {
  const next = applyAmounts(fixture, new Map([['massage@90', 2400], ['brows', 900]]));
  assert.equal(next[0].price.variants[1].amount, 2400);
  assert.equal(next[2].price.amount, 900);
  assert.equal(fixture[0].price.variants[1].amount, 2300);
  const strip = (items) =>
    JSON.stringify(items, (key, value) => (key === 'amount' ? undefined : value));
  assert.equal(strip(next), strip(fixture));
});

test('applyAmounts refuses a key the price list does not have', () => {
  assert.throws(() => applyAmounts(fixture, new Map([['ghost', 1]])), /ghost/);
});
