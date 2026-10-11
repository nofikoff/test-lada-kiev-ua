/**
 * Publish step of .github/workflows/publish.yml: sheet amounts → src/data/prices.json, plus the
 * report for report.mjs and the commit message. Exit codes —
 * specs/005-sheet-price-publishing/contracts/publish-workflow.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcile } from './reconcile.mjs';
import { a1, clientFromEnv } from './sheets-api.mjs';
import { FIRST_DATA_ROW, SHEET_NAME, amountsOf } from './sheet-layout.mjs';

export const REPORT_FILE = 'prices-report.json';
export const COMMIT_FILE = 'prices-commit.txt';

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_REJECTED = 3;

function parseAllowList(value = '') {
  return new Set(
    value
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean),
  );
}

function commitMessage({ applied, rejected, source, allowLarge }) {
  const lines = ['chore(prices): publish prices from the sheet', ''];
  for (const { key, from, to } of applied) lines.push(`${key}: ${from} → ${to}`);
  lines.push('', `Source: ${source}`);
  if (allowLarge.size) lines.push(`Allowed: ${[...allowLarge].join(', ')}`);
  for (const { key, from, to, reason } of rejected) lines.push(`Rejected: ${key} ${from} → ${to} (${reason})`);
  return `${lines.join('\n')}\n`;
}

export async function runPublish({ env, client, pricesPath, outDir }) {
  const source = env.SOURCE === 'sheet' ? 'sheet' : 'manual';
  const allowLarge = parseAllowList(env.ALLOW_LARGE_CHANGE);
  const writeReport = (report) => writeFileSync(join(outDir, REPORT_FILE), `${JSON.stringify({ source, ...report }, null, 2)}\n`);

  if (source === 'sheet' && allowLarge.size) {
    writeReport({
      ok: false,
      error: { kind: 'Forbidden', keys: [...allowLarge], message: 'allow_large_change доступен только ручному запуску' },
    });
    return EXIT_FAILED;
  }

  const values = await client.getValues(a1(SHEET_NAME, `A${FIRST_DATA_ROW}:E`));
  const rows = values
    .filter(([key]) => key !== undefined && key !== '')
    .map(([key, , , amount, published]) => ({ key, amount, published }));
  const prices = JSON.parse(readFileSync(pricesPath, 'utf8'));

  let result;
  try {
    result = reconcile(prices, rows, { allowLarge });
  } catch (error) {
    result = { ok: false, error: { kind: 'CallError', keys: [], message: error.message } };
  }
  if (!result.ok) {
    writeReport({ ok: false, error: result.error });
    console.error(result.error.message);
    return EXIT_FAILED;
  }

  const { next, applied, rejected } = result;
  if (applied.length) {
    writeFileSync(pricesPath, `${JSON.stringify(next, null, 2)}\n`);
    writeFileSync(join(outDir, COMMIT_FILE), commitMessage({ applied, rejected, source, allowLarge }));
  }
  const published = amountsOf(next);
  writeReport({
    ok: true,
    applied,
    rejected,
    rows: rows.map(({ key }) => ({ key, published: published.get(key) })),
  });
  console.log(`applied ${applied.length}, rejected ${rejected.length}`);
  return rejected.length ? EXIT_REJECTED : EXIT_OK;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runPublish({
    env: process.env,
    client: clientFromEnv(),
    pricesPath: fileURLToPath(new URL('../../src/data/prices.json', import.meta.url)),
    outDir: process.env.RUNNER_TEMP ?? process.cwd(),
  });
}
