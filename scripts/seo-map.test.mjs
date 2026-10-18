import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// С расширением: Node в ESM его не достраивает.
import { linksFrom, parseSeoMap } from '../src/data/seo-map.ts';
import { displayAnchor } from '../src/i18n/guide.ts';

const MAP_TEXT = readFileSync(new URL('../docs/seo/map.md', import.meta.url), 'utf8');

/** Карта в форме контракта `/seo`: §Site, §Pages и §Links со всеми колонками. */
const FIXTURE = `# Map

## Site
| lang | base_url | kb_prefix | source |
|---|---|---|---|
| uk | https://www.lada.kiev.ua | /guide/ | manual 2026-10-11 |

## Pages
| page | kind | parent | cluster | lang | url | status |
|---|---|---|---|---|---|---|
| depilation-guide | hub |  |  | uk | /guide/depilation/ | planned |
| depilation-vs-epilation | entity | depilation-guide | depiliatsiia-chy-epiliatsiia | uk | /guide/depilation/vs-epilation/ | planned |
| depilation-aftercare | question | depilation-guide | depiliatsiia-pislia | uk | /guide/depilation/aftercare/ | planned |
| depilation | service |  | depiliatsiia | uk | /depilation/ | published |
| depilation-guide | hub |  |  | ru | /ru/guide/depilation/ | planned |
| depilation | service |  | depiliatsiia | ru | /ru/depilation/ | published |

## Links
| from | to | anchor | lang | reason |
|---|---|---|---|---|
| depilation-guide | depilation | депіляція київ | uk | обзорная ведёт к услуге |
| depilation | depilation-guide | депіляція | uk | услуга отдаёт вес обзорной |
| depilation-guide | depilation-vs-epilation | депіляція чи епіляція | uk | вниз к странице сущности |
| depilation-guide | depilation-aftercare | що не можна робити після депіляції | uk | вниз к странице вопроса |
| depilation-guide | depilation | депиляция воском киев | ru | обзорная ведёт к услуге |
`;

const FIXTURE_PAGES = [
  { page: 'depilation-guide', kind: 'hub', lang: 'uk', url: '/guide/depilation/' },
  { page: 'depilation-vs-epilation', kind: 'entity', lang: 'uk', url: '/guide/depilation/vs-epilation/' },
  { page: 'depilation-aftercare', kind: 'question', lang: 'uk', url: '/guide/depilation/aftercare/' },
  { page: 'depilation', kind: 'service', lang: 'uk', url: '/depilation/' },
  { page: 'depilation-guide', kind: 'hub', lang: 'ru', url: '/ru/guide/depilation/' },
  { page: 'depilation', kind: 'service', lang: 'ru', url: '/ru/depilation/' },
];

const FIXTURE_LINKS = [
  { from: 'depilation-guide', to: 'depilation', anchor: 'депіляція київ', lang: 'uk' },
  { from: 'depilation', to: 'depilation-guide', anchor: 'депіляція', lang: 'uk' },
  { from: 'depilation-guide', to: 'depilation-vs-epilation', anchor: 'депіляція чи епіляція', lang: 'uk' },
  { from: 'depilation-guide', to: 'depilation-aftercare', anchor: 'що не можна робити після депіляції', lang: 'uk' },
  { from: 'depilation-guide', to: 'depilation', anchor: 'депиляция воском киев', lang: 'ru' },
];

/** Таблица раздела в обратном порядке колонок и с лишней колонкой в середине. */
function reshuffled(text, section) {
  const lines = text.split('\n');
  const heading = lines.indexOf(`## ${section}`);
  let end = heading + 1;
  while (end < lines.length && lines[end].startsWith('|')) end += 1;
  const rows = lines.slice(heading + 1, end).map((line) => line.slice(1, -1).split('|'));
  const shuffled = rows.map((cells, index) => {
    const extra = index === 0 ? ' note ' : index === 1 ? '---' : ' x ';
    const reversed = [...cells].reverse();
    reversed.splice(2, 0, extra);
    return `|${reversed.join('|')}|`;
  });
  return [...lines.slice(0, heading + 1), ...shuffled, ...lines.slice(end)].join('\n');
}

test('разбирает §Pages и §Links действующей карты в поля `MapPage` и `MapLink`', () => {
  const map = parseSeoMap(MAP_TEXT);

  for (const page of map.pages) {
    assert.deepEqual(Object.keys(page).sort(), ['kind', 'lang', 'page', 'url']);
  }
  for (const link of map.links) {
    assert.deepEqual(Object.keys(link).sort(), ['anchor', 'from', 'lang', 'to']);
  }

  // Страницы и рёбра пилота: docs/specs/routes.md §Knowledge base и §Links from the map.
  const pilotPages = [
    { page: 'depilation-guide', kind: 'hub', lang: 'uk', url: '/guide/depilation/' },
    { page: 'depilation-guide', kind: 'hub', lang: 'ru', url: '/ru/guide/depilation/' },
    { page: 'depilation-vs-epilation', kind: 'entity', lang: 'uk', url: '/guide/depilation/vs-epilation/' },
    { page: 'depilation-vs-epilation', kind: 'entity', lang: 'ru', url: '/ru/guide/depilation/vs-epilation/' },
    { page: 'lada', kind: 'expert', lang: 'uk', url: '/lada/' },
    { page: 'lada', kind: 'expert', lang: 'ru', url: '/ru/lada/' },
    { page: 'depilation', kind: 'service', lang: 'uk', url: '/depilation/' },
  ];
  for (const page of pilotPages) {
    assert.ok(
      map.pages.some((parsed) => JSON.stringify(parsed) === JSON.stringify(page)),
      `в §Pages нет ${JSON.stringify(page)}`,
    );
  }
  // Анкор в сравнение не входит: `/seo map` вправе править его в main, а текст ссылки держит tests/links.spec.ts.
  const pilotLinks = [
    { from: 'depilation-guide', to: 'depilation-vs-epilation', lang: 'uk' },
    { from: 'depilation-vs-epilation', to: 'depilation', lang: 'uk' },
    { from: 'depilation-guide', to: 'depilation-vs-epilation', lang: 'ru' },
    { from: 'depilation', to: 'depilation-guide', lang: 'ru' },
  ];
  for (const { from, to, lang } of pilotLinks) {
    const parsed = map.links.find((link) => link.from === from && link.to === to && link.lang === lang);
    assert.ok(parsed, `в §Links нет ребра ${from} → ${to} (${lang})`);
    assert.ok(parsed.anchor.length > 0, `у ребра ${from} → ${to} (${lang}) пустой анкор`);
  }
});

test('разбор фикстуры: строки в порядке таблиц, status и §Site не читаются', () => {
  const map = parseSeoMap(FIXTURE);
  assert.deepEqual(map.pages, FIXTURE_PAGES);
  assert.deepEqual(map.links, FIXTURE_LINKS);

  const withoutSiteAndStatus = FIXTURE.replace(/## Site\n(\|.*\n)+/, '').replace(/ \| (planned|published) \|$/gm, ' |')
    .replace('| page | kind | parent | cluster | lang | url | status |', '| page | kind | parent | cluster | lang | url |')
    .replace('|---|---|---|---|---|---|---|', '|---|---|---|---|---|---|');
  assert.doesNotMatch(withoutSiteAndStatus, /## Site|status|planned/);
  assert.deepEqual(parseSeoMap(withoutSiteAndStatus), map);
});

test('колонки находятся по имени: перестановка и лишняя колонка разбор не меняют', () => {
  const shuffled = reshuffled(reshuffled(FIXTURE, 'Pages'), 'Links');
  // Контроль самой перестановки: без него равенство ниже прошло бы и на неизменённой карте.
  assert.ok(shuffled.includes('| status | url | note | lang |'));
  assert.ok(shuffled.includes('| reason | lang | note | anchor |'));
  assert.deepEqual(parseSeoMap(shuffled), parseSeoMap(FIXTURE));
});

test('ячейка в обратных кавычках и экранированная черта читаются по грамматике контракта /seo', () => {
  const map = parseSeoMap(
    FIXTURE.replace('| depilation | depilation-guide | депіляція | uk |', '| `depilation` | depilation-guide | депіляція \\| воск | uk |'),
  );
  assert.deepEqual(map.links[1], { from: 'depilation', to: 'depilation-guide', anchor: 'депіляція | воск', lang: 'uk' });
});

test('нет §Pages, §Links или нужной колонки — исключение с именем файла карты', () => {
  const broken = [
    [FIXTURE.replace('## Pages', '## Страницы'), /^docs\/seo\/map\.md: .*Pages/],
    [FIXTURE.replace('## Links', '## Связи'), /^docs\/seo\/map\.md: .*Links/],
    [FIXTURE.replace(/## Links\n(\|.*\n)+/, '## Links\n\nтаблица будет позже\n'), /^docs\/seo\/map\.md: .*Links/],
    [FIXTURE.replace('| lang | url | status |', '| language | url | status |'), /^docs\/seo\/map\.md: .*Pages.*lang/],
    [FIXTURE.replace('| page | kind |', '| slug | kind |'), /^docs\/seo\/map\.md: .*Pages.*page/],
    [FIXTURE.replace('| from | to | anchor |', '| from | to | text |'), /^docs\/seo\/map\.md: .*Links.*anchor/],
  ];
  for (const [text, message] of broken) {
    assert.throws(() => parseSeoMap(text), { message });
  }
});

test('испорченная строка таблицы останавливает разбор, а не пропускается', () => {
  assert.throws(
    () => parseSeoMap(FIXTURE.replace('| depilation | depilation-guide | депіляція | uk | услуга отдаёт вес обзорной |', '| depilation | depilation-guide | депіляція |')),
    { message: /^docs\/seo\/map\.md: .*Links/ },
  );
  assert.throws(
    () => parseSeoMap(FIXTURE.replace('| depilation-aftercare | question |', '| depilation-aftercare | faq |')),
    { message: /^docs\/seo\/map\.md: .*faq/ },
  );
  assert.throws(
    () =>
      parseSeoMap(
        FIXTURE.replace(
          '| depilation | service |  | depiliatsiia | uk | /depilation/ | published |',
          '| depilation | service |  | depiliatsiia | uk | /depilation/ | published |\n| depilation | service |  | depiliatsiia | uk | /depilation/sugaring/ | published |',
        ),
      ),
    { message: /^docs\/seo\/map\.md: .*depilation.*\(uk\) повторяется/ },
  );
  assert.throws(() => parseSeoMap(`${FIXTURE}\n## Links\n| from | to | anchor | lang |\n|---|---|---|---|\n`), {
    message: /^docs\/seo\/map\.md: .*Links.*повторяется/,
  });
});

test('строки языков, которых в базе знаний нет, не читаются', () => {
  const map = parseSeoMap(
    FIXTURE.replace(
      '| depilation | service |  | depiliatsiia | ru | /ru/depilation/ | published |',
      '| depilation | service |  | depiliatsiia | ru | /ru/depilation/ | published |\n| depilation | service |  | depiliatsiia | en | /en/depilation/ | published |',
    ).replace(
      '| depilation-guide | depilation | депиляция воском киев | ru | обзорная ведёт к услуге |',
      '| depilation-guide | depilation | депиляция воском киев | ru | обзорная ведёт к услуге |\n| depilation-guide | depilation | hair removal kyiv | en | обзорная ведёт к услуге |',
    ),
  );
  assert.deepEqual(map, parseSeoMap(FIXTURE));
});

test('linksFrom: рёбра языка от страницы в порядке §Links только к собранным адресам', () => {
  const map = parseSeoMap(FIXTURE);
  const built = new Set(['/guide/depilation/', '/guide/depilation/vs-epilation/', '/depilation/', '/ru/depilation/']);

  assert.deepEqual(linksFrom(map, 'uk', '/guide/depilation/', built), [
    { href: '/depilation/', anchor: 'депіляція київ', toKind: 'service' },
    { href: '/guide/depilation/vs-epilation/', anchor: 'депіляція чи епіляція', toKind: 'entity' },
  ]);
  assert.deepEqual(linksFrom(map, 'ru', '/ru/guide/depilation/', built), [
    { href: '/ru/depilation/', anchor: 'депиляция воском киев', toKind: 'service' },
  ]);
  assert.deepEqual(linksFrom(map, 'uk', '/depilation/', built), [
    { href: '/guide/depilation/', anchor: 'депіляція', toKind: 'hub' },
  ]);
  assert.deepEqual(linksFrom(map, 'uk', '/depilation/', new Set(['/depilation/'])), []);
  // Адрес uk-страницы под чужим языком ничего не даёт: рёбра берутся только своего языка.
  assert.deepEqual(linksFrom(map, 'ru', '/guide/depilation/', built), []);
});

test('displayAnchor поднимает первую букву и восстанавливает регистр имён собственных', () => {
  assert.equal(displayAnchor('uk', 'депіляція київ'), 'Депіляція Київ');
  assert.equal(displayAnchor('ru', 'депиляция воском киев'), 'Депиляция воском Киев');
  assert.equal(displayAnchor('uk', 'депіляція чи епіляція'), 'Депіляція чи епіляція');
  assert.equal(displayAnchor('ru', 'депиляция'), 'Депиляция');
  // Имя собственное — только целым словом: начало другого слова не трогается.
  assert.equal(displayAnchor('uk', 'масаж київщина'), 'Масаж київщина');
  assert.equal(displayAnchor('ru', 'массаж, киев'), 'Массаж, Киев');
});
