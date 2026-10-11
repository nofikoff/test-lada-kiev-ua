import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chunk, purgeUrls } from './purge-cache.mjs';

function distFixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'dist-'));
  for (const file of files) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), '');
  }
  return root;
}

test('every permanent address of the build, hashed assets and .htaccess excluded', () => {
  const dist = distFixture([
    'index.html',
    '404.html',
    '.htaccess',
    'robots.txt',
    'llms.txt',
    'sitemap-index.xml',
    'sitemap-0.xml',
    'massage/index.html',
    'ru/index.html',
    'ru/.htaccess',
    'ru/404/index.html',
    '_astro/index.abc123.css',
    '_astro/og.def456.jpg',
  ]);
  assert.deepEqual(purgeUrls(dist, 'https://www.lada.kiev.ua'), [
    'https://www.lada.kiev.ua/',
    'https://www.lada.kiev.ua/404.html',
    'https://www.lada.kiev.ua/llms.txt',
    'https://www.lada.kiev.ua/massage/',
    'https://www.lada.kiev.ua/robots.txt',
    'https://www.lada.kiev.ua/ru/',
    'https://www.lada.kiev.ua/ru/404/',
    'https://www.lada.kiev.ua/sitemap-0.xml',
    'https://www.lada.kiev.ua/sitemap-index.xml',
  ]);
});

test('Cloudflare takes at most 30 addresses per request', () => {
  const urls = Array.from({ length: 65 }, (_, index) => `u${index}`);
  assert.deepEqual(
    chunk(urls, 30).map((part) => part.length),
    [30, 30, 5],
  );
});
