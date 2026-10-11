/**
 * Rebuilds the price sheet from src/data/prices.json: rows, protection, input validation and
 * highlighting. Layout: specs/005-sheet-price-publishing/contracts/sheet-layout.md.
 * Run by the publish workflow in `mode: rebuild-sheet`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { a1, clientFromEnv } from './sheets-api.mjs';
import { FIRST_DATA_ROW, HEADER_ROW, HEADERS, SHEET_NAME, lastDataRow, mergeRows } from './sheet-layout.mjs';

const PRICES_PATH = fileURLToPath(new URL('../../src/data/prices.json', import.meta.url));
const COLUMN_COUNT = HEADERS.length;
const AMOUNT_COLUMN = 3;
const MAX_AMOUNT = 100000;

const RED = { red: 0.96, green: 0.8, blue: 0.8 };
const YELLOW = { red: 1, green: 0.95, blue: 0.7 };

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

/** Structure requests only; values are written separately so they cannot clobber protection. */
export function buildSheetRequests({ sheetId, rowCount, protectedRangeIds, conditionalFormatCount, editors }) {
  const users = editors.filter(Boolean);
  if (!users.length) throw new Error('protection needs at least one editor');
  const lastRow = lastDataRow(rowCount);
  const firstDataIndex = FIRST_DATA_ROW - 1;
  const amounts = gridRange(sheetId, firstDataIndex, lastRow, AMOUNT_COLUMN, AMOUNT_COLUMN + 1);
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
          unprotectedRanges: [publishCell, amounts],
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
    {
      repeatCell: {
        range: gridRange(sheetId, HEADER_ROW - 1, HEADER_ROW, 0, COLUMN_COUNT),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    },
    highlight(sheetId, amounts, 0, `=$F${row}<>""`, RED),
    highlight(sheetId, amounts, 1, `=AND($D${row}<>"",$D${row}<>$E${row})`, YELLOW),
  ];
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
  const rows = mergeRows(prices, current);

  await client.batchUpdate(
    buildSheetRequests({
      sheetId,
      rowCount: rows.length,
      protectedRangeIds: (sheet.protectedRanges ?? []).map((range) => range.protectedRangeId),
      conditionalFormatCount: (sheet.conditionalFormats ?? []).length,
      editors: [process.env.PRICES_SHEET_OWNER, process.env.GCP_SERVICE_ACCOUNT],
    }),
  );
  await client.clearValues([a1(SHEET_NAME, `A${HEADER_ROW}:F`)]);
  await client.updateValues([
    { range: a1(SHEET_NAME, 'A1:B1'), values: [['Опубликовать', false]] },
    { range: a1(SHEET_NAME, `A${HEADER_ROW}:F${HEADER_ROW}`), values: [HEADERS] },
    {
      range: a1(SHEET_NAME, `A${FIRST_DATA_ROW}:F${lastDataRow(rows.length)}`),
      values: rows.map((row) => [row.key, row.name, row.variant, row.amount, row.published, '']),
    },
  ]);
  console.log(`sheet rebuilt: ${rows.length} rows`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
