/**
 * Вес исполняемого кода собранного сайта — предмет SC-006 (не более 5 КБ на страницу помимо
 * аналитики) и FR-029. В таблице отправной точки этот порог подписан как SC-004; SC-004 —
 * про оценки Lighthouse.
 *
 * Считаются ВСТРОЕННЫЕ модульные скрипты страницы, а не только файлы `dist/_astro/*.js`.
 * Сборка после переноса вкладок не порождает ни одного внешнего файла скрипта: код вкладок
 * целиком ушёл в разметку. Скрипт, измеряющий только внешние файлы, показал бы ноль и врал бы
 * ровно тогда, когда врать нельзя.
 *
 * Аналитика из бюджета исключена требованием («помимо аналитики»): её вес не зависит от того,
 * как собран сайт, и переносится без изменений (research.md §R16). Машиночитаемое описание
 * тоже не считается — это данные в теге скрипта, а не исполняемый код.
 */
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';

/** SC-006. КБ здесь — 1024 байта, как и в отчётах Lighthouse. */
const BUDGET_BYTES = 5 * 1024;

const ANALYTICS_MARKERS = ['googletagmanager.com', 'gtag(', 'dataLayer'];

/** Тип, при котором содержимое тега исполняется. Пустой тип означает классический скрипт. */
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

function attribute(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag);
  return match?.[1];
}

function isAnalytics(text) {
  return ANALYTICS_MARKERS.some((marker) => text.includes(marker));
}

function distPath(url) {
  return join(DIST, ...url.split('?')[0].split('/'));
}

/**
 * Исполняемый код страницы: встроенные скрипты — телом, внешние собственные — содержимым файла.
 * Скрипты со стороннего домена возвращаются нулевым весом: они не наш код, но должны быть видны.
 */
function scriptsOf(page) {
  const html = readFileSync(page, 'utf8');
  const found = [];

  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const tag = `<script${attributes}>`;
    const type = (attribute(tag, 'type') ?? '').toLowerCase();
    if (!EXECUTABLE_TYPES.has(type)) continue;

    const src = attribute(tag, 'src');
    if (src === undefined) {
      if (isAnalytics(body)) continue;
      found.push({ own: true, name: 'встроенный модуль', content: Buffer.from(body, 'utf8') });
      continue;
    }

    if (isAnalytics(src)) continue;
    if (!src.startsWith('/')) {
      found.push({ own: false, name: src, content: Buffer.alloc(0) });
      continue;
    }
    found.push({ own: true, name: src, content: readFileSync(distPath(src)) });
  }

  return found;
}

const pages = htmlFiles(DIST).sort();
if (pages.length === 0) {
  console.error(`В ${DIST}/ нет собранных страниц — сначала нужна сборка.`);
  process.exit(1);
}

const rows = pages.map((page) => {
  const own = scriptsOf(page).filter((script) => script.own);
  const bytes = own.reduce((sum, script) => sum + script.content.byteLength, 0);

  // Сжатый размер — для сравнения с отправной точкой: она снята по переданным байтам.
  const gzip = own.reduce((sum, script) => sum + gzipSync(script.content).byteLength, 0);
  const directory = relative(DIST, page).split(sep).slice(0, -1);

  return { address: `/${directory.join('/')}${directory.length > 0 ? '/' : ''}`, count: own.length, bytes, gzip };
});

const width = Math.max(...rows.map((row) => row.address.length), 6);
console.log('Исполняемый код помимо аналитики, по страницам сборки:\n');
console.log(`${'адрес'.padEnd(width)}  скриптов      байт    сжатых`);
for (const row of rows) {
  console.log(
    `${row.address.padEnd(width)}  ${String(row.count).padStart(8)}  ${String(row.bytes).padStart(8)}  ${String(row.gzip).padStart(8)}`,
  );
}

const worst = Math.max(...rows.map((row) => row.bytes));
const heaviest = rows.filter((row) => row.bytes === worst).map((row) => row.address);

console.log(
  `\nБюджет SC-006: ${BUDGET_BYTES} Б на страницу помимо аналитики.` +
    `\nНаибольшая страница: ${worst} Б (${((worst / BUDGET_BYTES) * 100).toFixed(1)}% бюджета) — ${heaviest.join(', ')}`,
);

const over = rows.filter((row) => row.bytes > BUDGET_BYTES);
if (over.length > 0) {
  console.error(`\nПревышение бюджета: ${over.map((row) => `${row.address} — ${row.bytes} Б`).join(', ')}`);
  process.exit(1);
}
