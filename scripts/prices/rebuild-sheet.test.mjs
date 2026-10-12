import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRows } from './sheet-layout.mjs';
import { buildSheetRequests } from './rebuild-sheet.mjs';

const prices = [
  { id: 'a', group: 'g', name: { uk: 'A', ru: 'А', en: 'A' }, price: { kind: 'fixed', amount: 100 } },
  { id: 'b', group: 'g', name: { uk: 'B', ru: 'Б', en: 'B' }, price: { kind: 'fixed', amount: 200 } },
  { id: 'new', group: 'g', name: { uk: 'N', ru: 'Н', en: 'N' }, price: { kind: 'fixed', amount: 300 } },
];

test('rebuild keeps a pending edit, lets git win on a conflict, seeds new rows, drops gone ones', () => {
  const merged = mergeRows(prices, [
    { key: 'gone', amount: 1, published: 1 },
    { key: 'b', amount: 250, published: 180 },
    { key: 'a', amount: 120, published: 100 },
  ]);
  assert.deepEqual(
    merged.map(({ key, amount, published }) => ({ key, amount, published })),
    [
      { key: 'a', amount: 120, published: 100 },
      { key: 'b', amount: 200, published: 200 },
      { key: 'new', amount: 300, published: 300 },
    ],
  );
});

test('protection leaves only the checkbox and the amount column editable', () => {
  const requests = buildSheetRequests({
    sheetId: 7,
    rowCount: 3,
    protectedRangeIds: [11],
    conditionalFormatCount: 2,
    editors: ['owner@example.com', 'sa@example.iam.gserviceaccount.com'],
  });
  const added = requests.find((request) => request.addProtectedRange).addProtectedRange.protectedRange;
  assert.deepEqual(added.unprotectedRanges, [
    { sheetId: 7, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
    { sheetId: 7, startRowIndex: 3, endRowIndex: 6, startColumnIndex: 3, endColumnIndex: 4 },
  ]);
  assert.deepEqual(added.editors.users, ['owner@example.com', 'sa@example.iam.gserviceaccount.com']);
  assert.ok(requests.some((request) => request.deleteProtectedRange?.protectedRangeId === 11));
  assert.equal(requests.filter((request) => request.deleteConditionalFormatRule).length, 2);
});

test('names wrap inside a fixed width instead of stretching past a phone screen', () => {
  const requests = buildSheetRequests({
    sheetId: 7,
    rowCount: 3,
    protectedRangeIds: [],
    conditionalFormatCount: 0,
    editors: ['o@example.com'],
  });
  const widths = requests
    .filter((request) => request.updateDimensionProperties?.fields === 'pixelSize')
    .map(({ updateDimensionProperties: { range, properties } }) => [range.startIndex, properties.pixelSize]);
  assert.deepEqual(widths, [
    [1, 220],
    [2, 80],
    [3, 100],
    [5, 240],
  ]);
  const wrapped = requests
    .filter((request) => request.repeatCell?.cell.userEnteredFormat.wrapStrategy === 'WRAP')
    .map(({ repeatCell: { range } }) => [range.startColumnIndex, range.startRowIndex, range.endRowIndex]);
  assert.deepEqual(wrapped, [
    [1, 3, 6],
    [5, 3, 6],
  ]);
});

test('the red rule comes before the yellow one so a rejected cell reads as rejected', () => {
  const rules = buildSheetRequests({
    sheetId: 7,
    rowCount: 3,
    protectedRangeIds: [],
    conditionalFormatCount: 0,
    editors: ['o@example.com'],
  })
    .filter((request) => request.addConditionalFormatRule)
    .map((request) => request.addConditionalFormatRule);
  assert.deepEqual(
    rules.map((rule) => [rule.index, rule.rule.booleanRule.condition.values[0].userEnteredValue]),
    [
      [0, '=$F4<>""'],
      [1, '=AND($D4<>"",$D4<>$E4)'],
    ],
  );
});
