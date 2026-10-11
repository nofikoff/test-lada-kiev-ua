/**
 * Sheets API v4 over plain fetch — two read and three write calls do not justify `googleapis`
 * (specs/005-sheet-price-publishing/research.md). The access token never reaches an error message
 * or a log line (FR-030).
 */

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetsApiError extends Error {
  constructor(status, body) {
    super(`Sheets API ${status}: ${body}`);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

export function createSheetsClient({ token, spreadsheetId, fetch: fetchImpl = globalThis.fetch }) {
  if (!token) throw new Error('GOOGLE_ACCESS_TOKEN is not set');
  if (!spreadsheetId) throw new Error('sheet id is not set');
  const root = `${BASE}/${encodeURIComponent(spreadsheetId)}`;

  async function call(method, path, { query = {}, body } = {}) {
    const url = new URL(`${root}${path}`);
    for (const [name, value] of Object.entries(query)) {
      for (const item of [value].flat()) url.searchParams.append(name, item);
    }
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new SheetsApiError(response.status, text);
    return text ? JSON.parse(text) : {};
  }

  return {
    /** Unformatted values of one A1 range: numbers stay numbers, blanks become ''. */
    async getValues(range) {
      const result = await call('GET', `/values/${encodeURIComponent(range)}`, {
        query: { valueRenderOption: 'UNFORMATTED_VALUE' },
      });
      return result.values ?? [];
    },
    async updateValues(data) {
      return call('POST', '/values:batchUpdate', { body: { valueInputOption: 'RAW', data } });
    },
    async clearValues(ranges) {
      return call('POST', '/values:batchClear', { body: { ranges } });
    },
    async batchUpdate(requests) {
      return call('POST', ':batchUpdate', { body: { requests } });
    },
    async getSpreadsheet() {
      return call('GET', '', {
        query: { fields: 'sheets(properties(sheetId,title),protectedRanges(protectedRangeId),conditionalFormats)' },
      });
    },
  };
}

export function clientFromEnv(env = process.env, fetchImpl = globalThis.fetch) {
  return createSheetsClient({
    token: env.GOOGLE_ACCESS_TOKEN,
    spreadsheetId: env.PRICES_SHEET_ID,
    fetch: fetchImpl,
  });
}

/** `'Цены'!A4:E113` — the sheet name needs quoting because it is not plain ASCII. */
export function a1(sheetName, range) {
  return `'${sheetName.replaceAll("'", "''")}'!${range}`;
}
