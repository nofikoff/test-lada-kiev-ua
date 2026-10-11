import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPublish } from './publish.mjs';

const prices = [
  {
    id: 'massage',
    group: 'g',
    name: { uk: 'a', ru: 'а', en: 'a' },
    price: { kind: 'variants', unit: 'minutes', variants: [{ count: 60, amount: 1600 }] },
  },
  { id: 'brows', group: 'g', name: { uk: 'b', ru: 'б', en: 'b' }, price: { kind: 'fixed', amount: 800 } },
];

function setup(amounts, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'publish-'));
  const pricesPath = join(dir, 'prices.json');
  const original = `${JSON.stringify(prices, null, 2)}\n`;
  writeFileSync(pricesPath, original);
  const client = {
    async getValues() {
      return [
        ['massage@60', 'а', '60 мин', amounts['massage@60'] ?? 1600, 1600],
        ['brows', 'б', '', amounts.brows ?? 800, 800],
      ];
    },
  };
  return {
    original,
    pricesPath,
    outDir: dir,
    run: () => runPublish({ env: { SOURCE: 'sheet', ...env }, client, pricesPath, outDir: dir }),
    report: () => JSON.parse(readFileSync(join(dir, 'prices-report.json'), 'utf8')),
    commitMessage: () => readFileSync(join(dir, 'prices-commit.txt'), 'utf8'),
    prices: () => readFileSync(pricesPath, 'utf8'),
  };
}

test('an accepted edit rewrites only that amount and exits 0', async () => {
  const ctx = setup({ 'massage@60': 1700 });
  assert.equal(await ctx.run(), 0);
  assert.equal(ctx.prices(), ctx.original.replace('"amount": 1600', '"amount": 1700'));
  assert.deepEqual(ctx.report().rows, [
    { key: 'massage@60', published: 1700 },
    { key: 'brows', published: 800 },
  ]);
  assert.equal(
    ctx.commitMessage(),
    'chore(prices): publish prices from the sheet\n\nmassage@60: 1600 → 1700\n\nSource: sheet\n',
  );
});

test('no edits leave the file byte for byte and write no commit message', async () => {
  const ctx = setup({});
  assert.equal(await ctx.run(), 0);
  assert.equal(ctx.prices(), ctx.original);
  assert.deepEqual(ctx.report().applied, []);
  assert.throws(() => ctx.commitMessage(), /ENOENT/);
});

test('a rejected jump exits 3, keeps the old amount and is listed in the commit', async () => {
  const ctx = setup({ brows: 1700, 'massage@60': 1700 });
  assert.equal(await ctx.run(), 3);
  assert.deepEqual(ctx.report().rejected, [{ key: 'brows', from: 800, to: 1700, reason: 'jump' }]);
  assert.match(ctx.commitMessage(), /Rejected: brows 800 → 1700 \(jump\)\n$/);
  assert.match(ctx.prices(), /"amount": 800/);
});

test('allow_large_change from a manual run lets the jump through and is recorded', async () => {
  const ctx = setup({ brows: 1700 }, { SOURCE: 'manual', ALLOW_LARGE_CHANGE: 'brows' });
  assert.equal(await ctx.run(), 0);
  assert.match(ctx.commitMessage(), /Source: manual\nAllowed: brows\n$/);
});

test('allow_large_change is refused when the run comes from the sheet', async () => {
  const ctx = setup({ brows: 1700 }, { ALLOW_LARGE_CHANGE: 'brows' });
  assert.equal(await ctx.run(), 1);
  assert.equal(ctx.report().error.kind, 'Forbidden');
  assert.equal(ctx.prices(), ctx.original);
});

test('a conflict exits 1 and does not touch the price list', async () => {
  const ctx = setup({});
  writeFileSync(ctx.pricesPath, ctx.original.replace('"amount": 800', '"amount": 850'));
  const before = ctx.prices();
  assert.equal(await ctx.run(), 1);
  assert.equal(ctx.report().error.kind, 'Conflict');
  assert.equal(ctx.prices(), before);
});
