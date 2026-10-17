import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportUpdates, formatKyiv } from './report.mjs';

const now = new Date('2026-10-12T11:32:00Z');
const at = formatKyiv(now);

const report = (overrides = {}) => ({
  ok: true,
  source: 'sheet',
  applied: [{ key: 'a', from: 100, to: 110 }],
  rejected: [],
  rows: [
    { key: 'a', line: 4, published: 110 },
    { key: 'b', line: 5, published: 200 },
  ],
  ...overrides,
});

function status(updates) {
  return updates.find((update) => update.range.endsWith('C1')).values[0][0];
}

test('time is shown in Kyiv time', () => {
  assert.equal(at, '12.10 14:32');
});

// Copy of the watchdog pattern in apps-script/Code.js: a status it cannot parse is never timed out.
const WATCHDOG_PATTERN = /^публикация (?:запущена в|идёт с) (\d{2}):(\d{2})$/;

test('started writes only the status, with the start time the watchdog can parse', () => {
  const updates = buildReportUpdates({ outcome: 'started', report: undefined, now });
  assert.equal(updates.length, 1);
  assert.equal(status(updates), 'публикация идёт с 14:32');
  assert.match(status(updates), WATCHDOG_PATTERN);
});

test('published writes the snapshot and clears marks', () => {
  const updates = buildReportUpdates({ outcome: 'published', report: report(), now });
  assert.equal(status(updates), `опубликовано ${at}`);
  assert.deepEqual(updates.find((update) => update.range.endsWith('E4:F5')).values, [
    [110, ''],
    [200, ''],
  ]);
});

test('published with no changes says so', () => {
  const updates = buildReportUpdates({ outcome: 'published', report: report({ applied: [] }), now });
  assert.equal(status(updates), `опубликовано ${at}, изменений цен нет`);
});

test('a rejected row is marked with the reason and keeps the old snapshot', () => {
  const updates = buildReportUpdates({
    outcome: 'published',
    report: report({
      rejected: [{ key: 'b', from: 200, to: 900, reason: 'jump' }],
    }),
    now,
  });
  assert.equal(status(updates), `опубликовано ${at}, кроме 1 позиции — см. пометки`);
  assert.deepEqual(updates.find((update) => update.range.endsWith('E4:F5')).values, [
    [110, ''],
    [200, 'изменение больше чем вдвое, не опубликовано: 200 → 900'],
  ]);
});

test('marks land on the sheet line of their position, header lines get blanks', () => {
  const updates = buildReportUpdates({
    outcome: 'published',
    report: report({
      rejected: [{ key: 'b', from: 200, to: 900, reason: 'jump' }],
      rows: [
        { key: 'a', line: 5, published: 110 },
        { key: 'b', line: 7, published: 200 },
      ],
    }),
    now,
  });
  assert.deepEqual(updates.find((update) => update.range.endsWith('E4:F7')).values, [
    ['', ''],
    [110, ''],
    ['', ''],
    [200, 'изменение больше чем вдвое, не опубликовано: 200 → 900'],
  ]);
});

test('a report row without a sheet line is an error, not a guess', () => {
  assert.throws(
    () => buildReportUpdates({ outcome: 'published', report: report({ rows: [{ key: 'a', published: 110 }] }), now }),
    /\ba\b/,
  );
});

test('the count of rejected positions takes the genitive plural', () => {
  const rejected = Array.from({ length: 5 }, (_, index) => ({ key: `k${index}`, from: 1, to: 9, reason: 'jump' }));
  const updates = buildReportUpdates({ outcome: 'published', report: report({ rejected, rows: [] }), now });
  assert.equal(status(updates), `опубликовано ${at}, кроме 5 позиций — см. пометки`);
});

test('failures write only the status and leave the snapshot alone', () => {
  for (const [outcome, text] of [
    ['failed-before-deploy', 'ошибка, сайт не изменён, Руслан уведомлён'],
    ['failed-after-deploy', 'ошибка после выкладки, сайт обновлён, Руслан уведомлён'],
  ]) {
    const updates = buildReportUpdates({ outcome, report: report(), now });
    assert.equal(updates.length, 1);
    assert.equal(status(updates), text);
  }
});

test('an unknown outcome is an error', () => {
  assert.throws(() => buildReportUpdates({ outcome: 'done', report: report(), now }), /done/);
});
