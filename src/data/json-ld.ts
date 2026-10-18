/**
 * Сериализация JSON-LD для блока `<script type="application/ld+json">`. `JSON.stringify` не
 * экранирует `<`, и `</script>` в строке frontmatter закрыл бы блок, выведя остаток как разметку.
 * `<` внутри JSON бывает только в строках, где экранированный знак читается обратно тем же знаком.
 * U+2028 и U+2029 тоже остаются в строке сырыми, а старые разборщики считают их концом строки.
 * Из `src/` импортов нет: модуль загружает и `node --experimental-strip-types` (scripts/json-ld.test.mjs).
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll(LINE_SEPARATOR, '\\u2028')
    .replaceAll(PARAGRAPH_SEPARATOR, '\\u2029');
}
