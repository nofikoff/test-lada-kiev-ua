import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// С расширением: Node в ESM его не достраивает.
import { jsonLd } from '../src/data/json-ld.ts';

const SEPARATORS = String.fromCharCode(0x2028, 0x2029);

const HOSTILE = {
  headline: 'Заголовок </script><script>alert(1)</script> и <!-- комментарий',
  description: `строка${SEPARATORS[0]}с${SEPARATORS[1]}разделителями`,
};

test('`</script>` в строке не закрывает блок, а данные читаются обратно без потерь', () => {
  const serialized = jsonLd(HOSTILE);

  assert.ok(!serialized.includes('<'), 'знак < остался в блоке');
  assert.ok(![...SEPARATORS].some((separator) => serialized.includes(separator)), 'U+2028 или U+2029 остались в блоке');
  // Контроль: без экранирования разметка блока ломалась бы на этой же строке.
  assert.ok(JSON.stringify(HOSTILE).includes('</script>'));
  assert.deepEqual(JSON.parse(serialized), HOSTILE);
});

test('обычная разметка проходит без изменений', () => {
  const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'Article', headline: 'Депіляція чи епіляція' }] };
  assert.equal(jsonLd(graph), JSON.stringify(graph));
});

test('все блоки ld+json в SeoHead выводятся через `jsonLd`, а не напрямую `JSON.stringify`', () => {
  const source = readFileSync(new URL('../src/components/SeoHead.astro', import.meta.url), 'utf8');
  const blocks = [...source.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>/g)].map(([tag]) => tag);

  // Контроль: без него «все блоки» было бы верно и для файла, в котором блоков не нашли.
  assert.ok(blocks.length >= 3, `блоков ld+json в SeoHead: ${blocks.length}`);
  for (const tag of blocks) assert.match(tag, /set:html=\{jsonLd\(/, tag);
});
