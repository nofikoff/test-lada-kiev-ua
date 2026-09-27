/**
 * Вес исполняемого кода собранного сайта: не более 5 КБ на страницу помимо аналитики и не выше
 * потолка 1536 Б. Потолок согласован с автором 2026-09-26 (пакет 003, закрыт) и заменил 732 Б
 * из SC-005 пакета 002; в пакете
 * 001, для которого скрипт написан, бюджет стоял под SC-006 и FR-029.
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

/** Каталог сборки — аргументом, чтобы анализатор проверялся на фикстурах (`tests/analyze-bundle.spec.ts`). */
const DIST = process.argv[2] ?? 'dist';

/** КБ здесь — 1024 байта, как и в отчётах Lighthouse. */
const BUDGET_BYTES = 5 * 1024;
const CEILING_BYTES = 1536;

/**
 * Признаки аналитики: каждая запись — набор подстрок, которые должны встретиться вместе.
 * Признаком служит сам сниппет счётчика, а не вызов `gtag(`: собственный код, отправляющий
 * событие, тоже вызывает `gtag(` и вышел бы из-под учёта того бюджета, который он тратит.
 * Сниппет подключён `is:inline` и минификатор его не трогает, поэтому кавычки в маркере стабильны.
 */
const ANALYTICS_MARKERS = [['googletagmanager.com'], ["gtag('js'", "gtag('config'"]];

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
  return ANALYTICS_MARKERS.some((markers) => markers.every((marker) => text.includes(marker)));
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
  `\nПотолок ${CEILING_BYTES} Б, бюджет ${BUDGET_BYTES} Б на страницу помимо аналитики.` +
    `\nНаибольшая страница: ${worst} Б (${((worst / CEILING_BYTES) * 100).toFixed(1)}% потолка) — ${heaviest.join(', ')}`,
);

const limit = Math.min(CEILING_BYTES, BUDGET_BYTES);
const over = rows.filter((row) => row.bytes > limit);
if (over.length > 0) {
  console.error(
    `\nПревышение ${limit} Б: ${over.map((row) => `${row.address} — ${row.bytes} Б`).join(', ')}`,
  );
  process.exit(1);
}
