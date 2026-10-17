import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRows, sheetLines } from './sheet-layout.mjs';
import { buildSheetRequests, sheetValues } from './rebuild-sheet.mjs';

const prices = [
  { id: 'a', group: 'g', name: { uk: 'A', ru: 'А', en: 'A' }, price: { kind: 'fixed', amount: 100 } },
  { id: 'b', group: 'g', name: { uk: 'B', ru: 'Б', en: 'B' }, price: { kind: 'fixed', amount: 200 } },
  { id: 'new', group: 'g', name: { uk: 'N', ru: 'Н', en: 'N' }, price: { kind: 'fixed', amount: 300 } },
];

// Rows 4–8: header g, a, b, header h, c.
const twoGroups = sheetLines(
  mergeRows(
    [
      ...prices.slice(0, 2),
      { id: 'c', group: 'h', name: { uk: 'C', ru: 'В', en: 'C' }, price: { kind: 'fixed', amount: 400 } },
    ],
    [],
  ),
  { g: 'Группа один', h: 'Группа два' },
);

function requestsFor(overrides = {}) {
  return buildSheetRequests({
    sheetId: 7,
    lines: twoGroups,
    protectedRangeIds: [],
    conditionalFormatCount: 0,
    editors: ['o@example.com'],
    ...overrides,
  });
}

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

test('protection leaves the checkbox and one amount range per group editable, never a header', () => {
  const requests = requestsFor({
    protectedRangeIds: [11],
    conditionalFormatCount: 2,
    editors: ['owner@example.com', 'sa@example.iam.gserviceaccount.com'],
  });
  const added = requests.find((request) => request.addProtectedRange).addProtectedRange.protectedRange;
  assert.deepEqual(added.unprotectedRanges, [
    { sheetId: 7, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
    { sheetId: 7, startRowIndex: 4, endRowIndex: 6, startColumnIndex: 3, endColumnIndex: 4 },
    { sheetId: 7, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 3, endColumnIndex: 4 },
  ]);
  assert.deepEqual(added.editors.users, ['owner@example.com', 'sa@example.iam.gserviceaccount.com']);
  assert.ok(requests.some((request) => request.deleteProtectedRange?.protectedRangeId === 11));
  assert.equal(requests.filter((request) => request.deleteConditionalFormatRule).length, 2);
});

test('header lines are bold on a grey fill across A:F, after the data area is reset', () => {
  const formats = requestsFor()
    .filter((request) => request.repeatCell?.fields.includes('backgroundColor'))
    .map(({ repeatCell: { range, cell } }) => ({
      rows: [range.startRowIndex, range.endRowIndex],
      columns: [range.startColumnIndex, range.endColumnIndex],
      bold: cell.userEnteredFormat.textFormat.bold,
      grey: cell.userEnteredFormat.backgroundColor.red < 1,
    }));
  assert.deepEqual(formats, [
    { rows: [3, 8], columns: [0, 6], bold: false, grey: false },
    { rows: [3, 4], columns: [0, 6], bold: true, grey: true },
    { rows: [6, 7], columns: [0, 6], bold: true, grey: true },
  ]);
});

test('the value block carries header lines with an empty key and the label in B', () => {
  assert.deepEqual(sheetValues(twoGroups), [
    ['', 'Группа один', '', '', '', ''],
    ['a', 'А', '', 100, 100, ''],
    ['b', 'Б', '', 200, 200, ''],
    ['', 'Группа два', '', '', '', ''],
    ['c', 'В', '', 400, 400, ''],
  ]);
});

test('names wrap inside a fixed width instead of stretching past a phone screen', () => {
  const requests = requestsFor();
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
    [1, 3, 8],
    [5, 3, 8],
  ]);
});

test('the red rule comes before the yellow one so a rejected cell reads as rejected', () => {
  const rules = requestsFor()
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
