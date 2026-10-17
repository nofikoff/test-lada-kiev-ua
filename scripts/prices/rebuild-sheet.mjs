/**
 * Rebuilds the price sheet from src/data/prices.json: rows, protection, input validation and
 * highlighting. Layout: specs/005-sheet-price-publishing/contracts/sheet-layout.md.
 * Run by the publish workflow in `mode: rebuild-sheet`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Needs --experimental-strip-types: the group labels have one source, the site dictionary (research.md §R12).
import { ui } from '../../src/i18n/ui.ts';
import { a1, clientFromEnv } from './sheets-api.mjs';
import {
  FIRST_DATA_ROW,
  HEADER_ROW,
  HEADERS,
  PUBLISH_CELL,
  PUBLISH_LABEL,
  PUBLISH_LABEL_CELL,
  SHEET_NAME,
  lastDataRow,
  mergeRows,
  sheetLines,
} from './sheet-layout.mjs';

const PRICES_PATH = fileURLToPath(new URL('../../src/data/prices.json', import.meta.url));
const COLUMN_COUNT = HEADERS.length;
const AMOUNT_COLUMN = 3;
const MAX_AMOUNT = 100000;

const RED = { red: 0.96, green: 0.8, blue: 0.8 };
const YELLOW = { red: 1, green: 0.95, blue: 0.7 };
const GREY = { red: 0.9, green: 0.9, blue: 0.9 };
const WHITE = { red: 1, green: 1, blue: 1 };
const LINE_FORMAT_FIELDS = 'userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColor';

// Visible columns B, C, D, F in pixels. Names reach 54 characters, so B wraps instead of
// stretching past a phone screen; F holds the rejection note written by report.mjs.
const COLUMN_WIDTHS = [
  [1, 220],
  [2, 80],
  [3, 100],
  [5, 240],
];
const WRAPPED_COLUMNS = [1, 5];

function gridRange(sheetId, startRow, endRow, startColumn, endColumn) {
  return {
    sheetId,
    startRowIndex: startRow,
    endRowIndex: endRow,
    startColumnIndex: startColumn,
    endColumnIndex: endColumn,
  };
}

function highlight(sheetId, amounts, index, formula, color) {
  return {
    addConditionalFormatRule: {
      index,
      rule: {
        ranges: [amounts],
        booleanRule: {
          condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] },
          format: { backgroundColor: color },
        },
      },
    },
  };
}

function lineFormat(range, bold, backgroundColor) {
  return {
    repeatCell: {
      range,
      cell: { userEnteredFormat: { textFormat: { bold }, backgroundColor } },
      fields: LINE_FORMAT_FIELDS,
    },
  };
}

/** Grid row indices [start, end) of each group's amount rows; the header line above stays out. */
function groupAmountSpans(lines) {
  const spans = [];
  lines.forEach((line, index) => {
    const rowIndex = FIRST_DATA_ROW - 1 + index;
    if (line.kind === 'header') spans.push([rowIndex + 1, rowIndex + 1]);
    else spans.at(-1)[1] = rowIndex + 1;
  });
  return spans;
}

/** Structure requests only; values are written separately so they cannot clobber protection. */
export function buildSheetRequests({ sheetId, lines, protectedRangeIds, conditionalFormatCount, editors }) {
  const users = editors.filter(Boolean);
  if (!users.length) throw new Error('protection needs at least one editor');
  const lastRow = lastDataRow(lines.length);
  const firstDataIndex = FIRST_DATA_ROW - 1;
  const amounts = gridRange(sheetId, firstDataIndex, lastRow, AMOUNT_COLUMN, AMOUNT_COLUMN + 1);
  const groupAmounts = groupAmountSpans(lines).map(([start, end]) =>
    gridRange(sheetId, start, end, AMOUNT_COLUMN, AMOUNT_COLUMN + 1),
  );
  const headerIndices = lines.flatMap((line, index) => (line.kind === 'header' ? [firstDataIndex + index] : []));
  const publishCell = gridRange(sheetId, 0, 1, 1, 2);
  const row = FIRST_DATA_ROW;

  return [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { rowCount: lastRow, columnCount: COLUMN_COUNT, frozenRowCount: HEADER_ROW },
        },
        fields: 'gridProperties(rowCount,columnCount,frozenRowCount)',
      },
    },
    ...protectedRangeIds.map((protectedRangeId) => ({ deleteProtectedRange: { protectedRangeId } })),
    ...Array.from({ length: conditionalFormatCount }, () => ({
      deleteConditionalFormatRule: { sheetId, index: 0 },
    })),
    {
      addProtectedRange: {
        protectedRange: {
          range: { sheetId },
          description: 'Структура прайса меняется только из репозитория',
          warningOnly: false,
          unprotectedRanges: [publishCell, ...groupAmounts],
          editors: { users },
        },
      },
    },
    { setDataValidation: { range: publishCell, rule: { condition: { type: 'BOOLEAN' }, strict: true } } },
    {
      setDataValidation: {
        range: amounts,
        rule: {
          condition: {
            type: 'CUSTOM_FORMULA',
            values: [
              { userEnteredValue: `=AND(ISNUMBER(D${row}),D${row}=INT(D${row}),D${row}>=1,D${row}<=${MAX_AMOUNT})` },
            ],
          },
          inputMessage: 'Только целое число гривен от 1 до 100 000',
          strict: true,
          showCustomUi: true,
        },
      },
    },
    ...[0, 4].map((column) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: column, endIndex: column + 1 },
        properties: { hiddenByUser: true },
        fields: 'hiddenByUser',
      },
    })),
    ...COLUMN_WIDTHS.map(([column, pixelSize]) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: column, endIndex: column + 1 },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    })),
    ...WRAPPED_COLUMNS.map((column) => ({
      repeatCell: {
        range: gridRange(sheetId, firstDataIndex, lastRow, column, column + 1),
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
      },
    })),
    {
      repeatCell: {
        range: gridRange(sheetId, HEADER_ROW - 1, HEADER_ROW, 0, COLUMN_COUNT),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    },
    // Lines shift between rebuilds, so a former header row would keep its fill without the reset.
    lineFormat(gridRange(sheetId, firstDataIndex, lastRow, 0, COLUMN_COUNT), false, WHITE),
    ...headerIndices.map((index) => lineFormat(gridRange(sheetId, index, index + 1, 0, COLUMN_COUNT), true, GREY)),
    highlight(sheetId, amounts, 0, `=$F${row}<>""`, RED),
    highlight(sheetId, amounts, 1, `=AND($D${row}<>"",$D${row}<>$E${row})`, YELLOW),
  ];
}

export function sheetValues(lines) {
  return lines.map((line) =>
    line.kind === 'header'
      ? ['', line.label, '', '', '', '']
      : [line.key, line.name, line.variant, line.amount, line.published, ''],
  );
}

async function main() {
  const prices = JSON.parse(readFileSync(PRICES_PATH, 'utf8'));
  const client = clientFromEnv();
  const meta = await client.getSpreadsheet();
  let sheet = meta.sheets?.find((item) => item.properties.title === SHEET_NAME);
  if (!sheet) {
    const reply = await client.batchUpdate([{ addSheet: { properties: { title: SHEET_NAME } } }]);
    sheet = { properties: reply.replies[0].addSheet.properties, protectedRanges: [], conditionalFormats: [] };
  }
  const sheetId = sheet.properties.sheetId;

  const current = (await client.getValues(a1(SHEET_NAME, `A${FIRST_DATA_ROW}:E`)))
    .filter(([key]) => key)
    .map(([key, , , amount, published]) => ({ key, amount, published }));
  const lines = sheetLines(mergeRows(prices, current), ui.ru.priceList.sections);

  await client.batchUpdate(
    buildSheetRequests({
      sheetId,
      lines,
      protectedRangeIds: (sheet.protectedRanges ?? []).map((range) => range.protectedRangeId),
      conditionalFormatCount: (sheet.conditionalFormats ?? []).length,
      editors: [process.env.PRICES_SHEET_OWNER, process.env.GCP_SERVICE_ACCOUNT],
    }),
  );
  // A1:A2 also drops the label earlier rebuilds wrote into hidden column A.
  await client.clearValues([a1(SHEET_NAME, 'A1:A2'), a1(SHEET_NAME, `A${HEADER_ROW}:F`)]);
  await client.updateValues([
    { range: a1(SHEET_NAME, PUBLISH_CELL), values: [[false]] },
    { range: a1(SHEET_NAME, PUBLISH_LABEL_CELL), values: [[PUBLISH_LABEL]] },
    { range: a1(SHEET_NAME, `A${HEADER_ROW}:F${HEADER_ROW}`), values: [HEADERS] },
    {
      range: a1(SHEET_NAME, `A${FIRST_DATA_ROW}:F${lastDataRow(lines.length)}`),
      values: sheetValues(lines),
    },
  ]);
  const headers = lines.filter((line) => line.kind === 'header').length;
  console.log(`sheet rebuilt: ${lines.length - headers} rows, ${headers} group headers`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
