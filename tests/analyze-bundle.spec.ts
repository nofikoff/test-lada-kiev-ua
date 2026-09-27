import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Анализатор бюджета исполняемого кода (FR-024 пакета 003) проверяется на собственных фикстурах,
 * а не на сборке сайта: на сборке нельзя поставить страницу ровно на порог и нельзя показать,
 * что собственный вызов `gtag('event', …)` засчитан, до того как такой вызов появился на сайте.
 */
const BUILD_TAG = '@build';
const FIXTURES = 'tests/fixtures/bundle';

function analyze(directory: string) {
  const run = spawnSync(process.execPath, ['scripts/analyze-bundle.mjs', directory], {
    encoding: 'utf8',
  });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

/**
 * Байты собственного кода единственной страницы фикстуры. Строк для «/» ровно одна: в сборке
 * сайта их две (`index.html` и `404.html`), и совпадение по первой прошло бы на чужом каталоге.
 */
function ownBytes(output: string): number {
  const rows = output.split('\n').filter((line) => /^\/\s/.test(line));
  expect(rows, `в отчёте должна быть ровно одна строка для «/»:\n${output}`).toHaveLength(1);
  return Number(rows[0].trim().split(/\s+/)[2]);
}

function pageWithModule(bytes: number): string {
  const directory = mkdtempSync(join(tmpdir(), 'bundle-'));
  mkdirSync(directory, { recursive: true });
  const body = `/*${'x'.repeat(bytes - 4)}*/`;
  writeFileSync(join(directory, 'index.html'), `<html><body><script type="module">${body}</script></body></html>`);
  return directory;
}

test.describe('анализатор бюджета кода', () => {
  test(`собственный вызов gtag засчитывается в бюджет ${BUILD_TAG}`, () => {
    const { status, output } = analyze(join(FIXTURES, 'own-code-calls-gtag'));
    expect(status, output).toBe(0);
    expect(ownBytes(output), output).toBeGreaterThan(0);
  });

  test(`сниппет счётчика и JSON-LD в бюджет не входят ${BUILD_TAG}`, () => {
    const { status, output } = analyze(join(FIXTURES, 'snippet-only'));
    expect(status, output).toBe(0);
    expect(ownBytes(output), output).toBe(0);
  });

  test(`потолок 1536 байт: ровно на пороге проходит, байтом выше — нет ${BUILD_TAG}`, () => {
    const atCeiling = pageWithModule(1536);
    const overCeiling = pageWithModule(1537);
    try {
      expect(analyze(atCeiling).status, analyze(atCeiling).output).toBe(0);
      expect(analyze(overCeiling).status, analyze(overCeiling).output).toBe(1);
    } finally {
      rmSync(atCeiling, { recursive: true, force: true });
      rmSync(overCeiling, { recursive: true, force: true });
    }
  });
});
