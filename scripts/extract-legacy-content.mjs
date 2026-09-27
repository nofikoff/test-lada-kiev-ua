#!/usr/bin/env node
/**
 * Снимок всех строк действующего словаря переводов в tests/fixtures/legacy-content.json.
 *
 * Единственный источник, по которому проверяется, что текст прежнего сайта не потерялся
 * (docs/specs/content-model.md §Фикстура прежнего контента). Поэтому снимался механически: ручной
 * перенос строк воспроизвёл бы ровно ту ошибку, которую фикстура должна ловить. Словарь
 * `src/i18n/translations.ts` из дерева удалён, и повторно скрипт не запускается — он хранит, как
 * фикстура получена.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'src/i18n/translations.ts');
const TARGET = resolve(ROOT, 'tests/fixtures/legacy-content.json');

// Код языка в источнике — 'ua' (код страны); во всём новом коде он 'uk' (код языка, ISO 639-1).
const LOCALE_MAP = { ua: 'uk', ru: 'ru', en: 'en' };
const OUTPUT_ORDER = ['uk', 'ru', 'en'];

/**
 * Тело `translations` — литерал данных без единой аннотации типа, поэтому вырезание и вычисление
 * его как выражения JS не требует ни компилятора TypeScript, ни зависимостей. Разбор регулярным
 * выражением по всему файлу был бы хуже: он не отличает строку-значение от строки в комментарии.
 */
function loadTranslations(source) {
  const start = source.indexOf('export const translations = ');
  if (start === -1) throw new Error(`не найдено объявление translations в ${SOURCE}`);
  const open = source.indexOf('{', start);
  const end = source.indexOf('} as const;', open);
  if (open === -1 || end === -1) throw new Error(`не найдены границы литерала translations в ${SOURCE}`);

  const literal = source.slice(open, end + 1);
  const value = new Function(`return (${literal});`)();
  if (typeof value !== 'object' || value === null) throw new Error('литерал translations вычислился не в объект');
  return value;
}

function collectStrings(node, sink) {
  if (typeof node === 'string') {
    const text = node.trim();
    if (text) sink.add(text);
    return;
  }
  if (node && typeof node === 'object') {
    for (const child of Object.values(node)) collectStrings(child, sink);
  }
}

const translations = loadTranslations(readFileSync(SOURCE, 'utf8'));

const fixture = {};
for (const locale of OUTPUT_ORDER) {
  const sourceKey = Object.keys(LOCALE_MAP).find((key) => LOCALE_MAP[key] === locale);
  const tree = translations[sourceKey];
  if (!tree) throw new Error(`в словаре нет локали '${sourceKey}'`);
  const sink = new Set();
  collectStrings(tree, sink);
  if (sink.size === 0) throw new Error(`локаль '${locale}' не дала ни одной строки`);
  fixture[locale] = [...sink];
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

for (const locale of OUTPUT_ORDER) {
  process.stdout.write(`${locale}: ${fixture[locale].length} строк\n`);
}
