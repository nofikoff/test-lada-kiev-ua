import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ui } from '../../src/i18n/ui.ts';
import { applyAmounts, rowKey, rowsFromPrices, sheetLines, variantLabel } from './sheet-layout.mjs';

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
    { key: 'massage@60', group: 'g', name: 'Массаж', variant: '60 мин', amount: 1600 },
    { key: 'massage@90', group: 'g', name: '', variant: '90 мин', amount: 2300 },
    { key: 'brows', group: 'g', name: 'Брови', variant: '', amount: 800 },
  ]);
});

const row = (key, group) => ({ key, group, name: key, variant: '', amount: 1 });
const labels = { women: 'Женская депиляция', men: 'Мужская депиляция' };

test('a header goes before the first row of each group, in file order', () => {
  const lines = sheetLines([row('a', 'women'), row('b', 'women'), row('c', 'men')], labels);
  assert.deepEqual(
    lines.map((line) => (line.kind === 'header' ? `# ${line.label}` : line.key)),
    ['# Женская депиляция', 'a', 'b', '# Мужская депиляция', 'c'],
  );
  assert.deepEqual(lines[0], { kind: 'header', group: 'women', label: 'Женская депиляция' });
  assert.deepEqual(lines[1], { kind: 'row', ...row('a', 'women') });
});

test('a group without rows gets no header', () => {
  const lines = sheetLines([row('a', 'women')], labels);
  assert.equal(lines.filter((line) => line.kind === 'header').length, 1);
});

test('a group split by another group stops the layout and names the group', () => {
  assert.throws(() => sheetLines([row('a', 'women'), row('c', 'men'), row('b', 'women')], labels), /women/);
});

test('a group without a section label stops the layout and names the group', () => {
  assert.throws(() => sheetLines([row('a', 'kids')], labels), /kids/);
  assert.throws(() => sheetLines([row('a', 'toString')], labels), /toString/);
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

test('the real price list yields 167 rows with unique keys', () => {
  const prices = JSON.parse(readFileSync(new URL('../../src/data/prices.json', import.meta.url), 'utf8'));
  const rows = rowsFromPrices(prices);
  assert.equal(rows.length, 167);
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
});

test('the real price list gets one header per group, labelled from the Russian site dictionary', () => {
  const prices = JSON.parse(readFileSync(new URL('../../src/data/prices.json', import.meta.url), 'utf8'));
  const headers = sheetLines(rowsFromPrices(prices), ui.ru.priceList.sections).filter((line) => line.kind === 'header');
  assert.equal(headers.length, 14);
  assert.equal(new Set(headers.map((header) => header.group)).size, headers.length);
  assert.ok(headers.every((header) => header.label === ui.ru.priceList.sections[header.group]));
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

const names = (ru) => ({ uk: ru, ru, en: ru });

// Sugar amounts (specs/006-service-subpages/data-model.md §Sheet row): a fixed sugar price on a
// fixed one, a variants sugar price on a fixed one, "not done with paste", and a second group.
const sugarFixture = [
  {
    id: 'legs',
    group: 'women',
    name: names('Ноги'),
    price: { kind: 'fixed', amount: 600 },
    sugar: { kind: 'fixed', amount: 650 },
  },
  {
    id: 'bikini',
    group: 'women',
    name: names('Бикини'),
    price: { kind: 'fixed', amount: 700 },
    sugar: {
      kind: 'variants',
      unit: 'minutes',
      variants: [
        { count: 60, amount: 750 },
        { count: 90, amount: 900 },
      ],
    },
  },
  { id: 'nose', group: 'women', name: names('Нос'), price: { kind: 'fixed', amount: 200 }, sugar: false },
  {
    id: 'chest',
    group: 'men',
    name: names('Грудь'),
    price: { kind: 'fixed', amount: 500 },
    sugar: { kind: 'fixed', amount: 550 },
  },
];

test('rowKey names the sugar amount apart from the shared one', () => {
  assert.equal(rowKey('legs'), 'legs');
  assert.equal(rowKey('legs', 60), 'legs@60');
  assert.equal(rowKey('legs', undefined, 'base'), 'legs');
  assert.equal(rowKey('legs', undefined, 'sugar'), 'legs/sugar');
  assert.equal(rowKey('legs', 60, 'sugar'), 'legs/sugar@60');
});

test('sugar rows follow the shared rows of their position, unnamed, in the same group; false gives none', () => {
  assert.deepEqual(rowsFromPrices(sugarFixture), [
    { key: 'legs', group: 'women', name: 'Ноги', variant: '', amount: 600 },
    { key: 'legs/sugar', group: 'women', name: '', variant: 'сахар', amount: 650 },
    { key: 'bikini', group: 'women', name: 'Бикини', variant: '', amount: 700 },
    { key: 'bikini/sugar@60', group: 'women', name: '', variant: 'сахар, 60 мин', amount: 750 },
    { key: 'bikini/sugar@90', group: 'women', name: '', variant: 'сахар, 90 мин', amount: 900 },
    { key: 'nose', group: 'women', name: 'Нос', variant: '', amount: 200 },
    { key: 'chest', group: 'men', name: 'Грудь', variant: '', amount: 500 },
    { key: 'chest/sugar', group: 'men', name: '', variant: 'сахар', amount: 550 },
  ]);
});

test('applyAmounts changes a sugar amount by its key and leaves the shared one alone', () => {
  const next = applyAmounts(sugarFixture, new Map([['legs/sugar', 700], ['bikini/sugar@90', 950]]));
  assert.equal(next[0].sugar.amount, 700);
  assert.equal(next[0].price.amount, 600);
  assert.equal(next[1].sugar.variants[1].amount, 950);
  assert.equal(next[1].sugar.variants[0].amount, 750);
  assert.equal(next[1].price.amount, 700);
  assert.equal(sugarFixture[0].sugar.amount, 650);
});

test('a sugar key on a position without a sugar price is refused', () => {
  assert.throws(() => applyAmounts(fixture, new Map([['brows/sugar', 900]])), /price list has no row brows\/sugar/);
});

test('sugar rows add no group header and do not split their group', () => {
  const withoutSugar = sugarFixture.map((item) => {
    const copy = structuredClone(item);
    delete copy.sugar;
    return copy;
  });
  const linesOf = (prices) => sheetLines(rowsFromPrices(prices), { women: 'Женская', men: 'Мужская' });
  const count = (lines, kind) => lines.filter((line) => line.kind === kind).length;
  const lines = linesOf(sugarFixture);
  assert.equal(count(lines, 'header'), count(linesOf(withoutSugar), 'header'));
  assert.equal(count(lines, 'row'), 8);
});
