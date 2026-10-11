/**
 * Purges the Cloudflare cache for every permanent address of the build. Addresses come from dist/,
 * not from a list, so a new page is covered the day it ships; `_astro/*` carry a content hash and
 * need no purge. Step 3 of docs/runbook-deploy.md.
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BATCH = 30;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function purgeUrls(distDir, origin) {
  return walk(distDir)
    .map((file) => relative(distDir, file).split(sep).join('/'))
    .filter((path) => !path.startsWith('_astro/') && !path.split('/').pop().startsWith('.'))
    .map((path) => (path === 'index.html' ? '' : path.replace(/(^|\/)index\.html$/, '$1')))
    .map((path) => `${origin}/${path}`)
    .sort();
}

export function chunk(items, size) {
  const parts = [];
  for (let index = 0; index < items.length; index += size) parts.push(items.slice(index, index + size));
  return parts;
}

async function main() {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ZONE_ID: zone, SITE_ORIGIN: origin } = process.env;
  if (!token || !zone || !origin) throw new Error('CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID and SITE_ORIGIN are required');
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  const urls = purgeUrls(dist, origin);
  for (const files of chunk(urls, BATCH)) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success !== true) {
      throw new Error(`Cloudflare purge failed (${response.status}): ${JSON.stringify(body.errors ?? body)}`);
    }
  }
  console.log(`purged ${urls.length} addresses`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
