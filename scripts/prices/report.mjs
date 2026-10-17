/**
 * Writes the outcome of a publication back to the sheet: status, the «На сайте» snapshot and the
 * per-row marks. Status texts — specs/005-sheet-price-publishing/data-model.md §Status transitions.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { a1, clientFromEnv } from './sheets-api.mjs';
import { FIRST_DATA_ROW, SHEET_NAME, STATUS_CELL } from './sheet-layout.mjs';
import { REPORT_FILE } from './publish.mjs';

function kyivParts(date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Kyiv',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

export function formatKyiv(date) {
  const parts = kyivParts(date);
  return `${parts.day}.${parts.month} ${parts.hour}:${parts.minute}`;
}

/** Time only: the sheet's watchdog parses «идёт с ЧЧ:ММ» (apps-script/Code.js, watchdog). */
export function formatKyivClock(date) {
  const parts = kyivParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function positions(count) {
  return count % 10 === 1 && count % 100 !== 11 ? 'позиции' : 'позиций';
}

function rejectionText({ from, to }) {
  return `изменение больше чем вдвое, не опубликовано: ${from} → ${to}`;
}

/** One E:F pair per sheet line from FIRST_DATA_ROW; group header lines get blanks. */
function snapshotBlock(rows, rejected) {
  for (const { key, line } of rows) {
    if (!Number.isInteger(line) || line < FIRST_DATA_ROW) throw new Error(`report row ${key} has no sheet line`);
  }
  const last = Math.max(...rows.map(({ line }) => line));
  const values = Array.from({ length: last - FIRST_DATA_ROW + 1 }, () => ['', '']);
  for (const { key, line, published } of rows) {
    values[line - FIRST_DATA_ROW] = [published, rejected.has(key) ? rejectionText(rejected.get(key)) : ''];
  }
  return { range: a1(SHEET_NAME, `E${FIRST_DATA_ROW}:F${last}`), values };
}

function publishedStatus(report, at) {
  if (report.rejected.length) {
    return `опубликовано ${at}, кроме ${report.rejected.length} ${positions(report.rejected.length)} — см. пометки`;
  }
  return report.applied.length ? `опубликовано ${at}` : `опубликовано ${at}, изменений цен нет`;
}

export function buildReportUpdates({ outcome, report, now }) {
  const at = formatKyiv(now);
  const statusUpdate = (text) => ({ range: a1(SHEET_NAME, STATUS_CELL), values: [[text]] });

  switch (outcome) {
    case 'started':
      return [statusUpdate(`публикация идёт с ${formatKyivClock(now)}`)];
    case 'failed-before-deploy':
      return [statusUpdate('ошибка, сайт не изменён, Руслан уведомлён')];
    case 'failed-after-deploy':
      // The snapshot stays as it was, so the next publication applies the same amounts again.
      return [statusUpdate('ошибка после выкладки, сайт обновлён, Руслан уведомлён')];
    case 'published': {
      const rejected = new Map(report.rejected.map((item) => [item.key, item]));
      const updates = [statusUpdate(publishedStatus(report, at))];
      if (report.rows.length) updates.push(snapshotBlock(report.rows, rejected));
      return updates;
    }
    default:
      throw new Error(`unknown outcome: ${outcome}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outcome = process.env.OUTCOME;
  const reportPath = join(process.env.RUNNER_TEMP ?? process.cwd(), REPORT_FILE);
  const report = outcome === 'published' ? JSON.parse(readFileSync(reportPath, 'utf8')) : undefined;
  await clientFromEnv().updateValues(buildReportUpdates({ outcome, report, now: new Date() }));
  console.log(`sheet status: ${outcome}`);
}
