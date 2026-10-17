/**
 * Приёмка модели данных (docs/specs/content-model.md §Инварианты): порча данных обязана ронять
 * сборку, а не проходить молча, а допустимая правка — проходить и менять ровно то, что должна.
 * Порча и правка прайса, текстов, обращения и фото Лады вносятся в сам файл и откатываются
 * в `finally`, поэтому прогон не оставляет за собой изменений в дереве.
 *
 * Проверка сделана автоматической намеренно. Ручная процедура «сломать, посмотреть, откатить»
 * подтверждает схему один раз в жизни — в день, когда её написали; после первого расширения
 * схемы никто её не повторит, и требование останется утверждением без подтверждения.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const PRICES = 'src/data/prices.json';
const GALLERY = 'src/data/gallery.json';
const SERVICE_COPY = 'src/content/services/uk/massage.md';
const SUBPAGE_COPY = 'src/content/subpages/uk/sugaring.md';
const ABOUT_COPY = 'src/content/about/uk.md';

/** Поле `sugar` целиком, а не подстрока: «sugaring» стоит в адресах страниц сборки. */
const SUGAR_FIELD = /\bsugar\b/;

function setSugar(id, sugar) {
  return (path, original) =>
    writeFileSync(
      path,
      editJson(original, (items) => {
        items.find((item) => item.id === id).sugar = sugar;
      }),
    );
}

/** Astro раскрашивает вывод собственным средством, поэтому FORCE_COLOR его не гасит. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function plain(text) {
  return text.replace(ANSI, '');
}

function tail(text) {
  return plain(text).split('\n').slice(-25).join('\n');
}

function build() {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/**
 * Порча вносится в файл на месте: коллекции читаются сборкой по путям из `content.config.ts`,
 * и копия в стороне осталась бы ею незамеченной. Исходное содержимое держится в памяти
 * и возвращается на место при любом исходе, включая исключение.
 */
function withCorruption(relativePath, corrupt, check) {
  const path = new URL(relativePath, `file://${root}`);
  const original = readFileSync(path, 'utf8');
  try {
    corrupt(path, original);
    return check();
  } finally {
    writeFileSync(path, original);
  }
}

function editJson(original, edit) {
  const items = JSON.parse(original);
  edit(items);
  return `${JSON.stringify(items, null, 2)}\n`;
}

const cases = [
  {
    name: 'отсутствующий перевод названия позиции',
    file: PRICES,
    // Язык, которого нет, — ошибка сборки, а не пустое место на странице.
    expect: /name(\.|\s*→\s*|["'\]\s]+)ru/i,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          delete items[0].name.ru;
        }),
      ),
  },
  {
    name: 'отсутствующий файл текста категории',
    file: SERVICE_COPY,
    // Ловится не схемой, а страницей, которая текст запрашивает: схема видит только то, что есть.
    expect: /нет текста услуги: src\/content\/services\/uk\/massage\.md/,
    corrupt: (path) => rmSync(path),
  },
  {
    name: 'отсутствующий файл обращения',
    file: ABOUT_COPY,
    expect: /нет обращения: src\/content\/about\/uk\.md/,
    corrupt: (path) => rmSync(path),
  },
  {
    name: 'отрицательная цена',
    file: PRICES,
    expect: /price\.amount/i,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          const fixed = items.find((item) => item.price.kind === 'fixed');
          fixed.price.amount = -fixed.price.amount;
        }),
      ),
  },
  {
    name: 'отсутствующий перевод описания фото',
    file: GALLERY,
    expect: /alt(\.|\s*→\s*|["'\]\s]+)en/i,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          delete items[1].alt.en;
        }),
      ),
  },
  {
    // Пробелы проходят проверку длины, а описания в них нет — alt=" " для экранного чтеца пуст.
    name: 'описание фото из одних пробелов',
    file: GALLERY,
    expect: /alt(\.|\s*→\s*|["'\]\s]+)ru/i,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          items[1].alt.ru = ' \n ';
        }),
      ),
  },
  {
    name: 'фото ведёт на несуществующую услугу',
    file: GALLERY,
    expect: /category/i,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          items[1].category = 'nails';
        }),
      ),
  },
  {
    name: 'запись ссылается на отсутствующий файл фото',
    file: GALLERY,
    expect: /Could not find requested image `\.\.\/assets\/gallery\/no-such-photo\.jpg`/,
    corrupt: (path, original) =>
      writeFileSync(
        path,
        editJson(original, (items) => {
          items[1].photo = '../assets/gallery/no-such-photo.jpg';
        }),
      ),
  },
  {
    // Цена пастой у группы, которую страница шугаринга не читает, — мёртвые данные.
    name: 'цена пастой у позиции бровей',
    file: PRICES,
    expect: SUGAR_FIELD,
    corrupt: setSugar('permanent-brows-powder', { kind: 'fixed', amount: 999 }),
  },
  {
    name: 'цена пастой у позиции триммера',
    file: PRICES,
    expect: SUGAR_FIELD,
    corrupt: setSugar('men-trimmer-underarms', { kind: 'fixed', amount: 999 }),
  },
  {
    name: 'цена пастой долей',
    file: PRICES,
    expect: SUGAR_FIELD,
    corrupt: setSugar('women-depilation-underarms', {
      kind: 'share',
      percent: 50,
      note: { uk: '50%', ru: '50%', en: '50%' },
    }),
  },
  {
    name: 'отсутствующий файл текста подстраницы',
    file: SUBPAGE_COPY,
    expect: /нет текста подстраницы: src\/content\/subpages\/uk\/sugaring\.md/,
    corrupt: (path) => rmSync(path),
  },
];

// The id is historical: the item is «Ніс / Вуха / Брови / Шия», not the upper lip.
const SUGAR_FIXTURE_ID = 'women-depilation-upper-lip';

/**
 * Allowed price edits: the build must pass, and `dist/` must show them where the model requires and
 * nowhere else (docs/specs/content-model.md §Инварианты). On 2026-10-18 the real price list has no
 * `sugar` field, so until it appears nothing but these cases exercises the «own sugar price» and
 * «not done with paste» branches. Name and base amount of the fixture item are read from the price
 * list at run time, because Lada edits the amounts.
 */
function fixtureItem() {
  const item = JSON.parse(readFileSync(new URL(PRICES, `file://${root}`), 'utf8')).find(
    (entry) => entry.id === SUGAR_FIXTURE_ID,
  );
  return { name: item.name.uk, amount: item.price.amount };
}

/** Сумма, которой нет в прайсе: иначе её появление на странице ничего бы не доказало. */
function unusedAmount() {
  const amounts = (price) =>
    !price ? [] : price.kind === 'fixed' ? [price.amount] : (price.variants ?? []).map((variant) => variant.amount);
  const used = new Set(
    JSON.parse(readFileSync(new URL(PRICES, `file://${root}`), 'utf8')).flatMap(({ price, sugar }) => [
      ...amounts(price),
      ...amounts(sugar),
    ]),
  );
  let amount = 999;
  while (used.has(amount)) amount += 1;
  return amount;
}

function builtPage(path) {
  return readFileSync(new URL(`dist${path}index.html`, `file://${root}`), 'utf8');
}

/** Price in the price-list markup and in the JSON-LD offer: both sides must agree (FR-004a). */
const shownPrice = (amount) => `>${amount}</span>`;

/**
 * Offers of a built page, read from its JSON-LD as data: the key order of the markup is not part
 * of the contract, so a substring match on it would fail on a harmless reordering.
 */
function offersOf(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, json]) => JSON.parse(json))
    .flatMap((document) => document['@graph'] ?? [])
    .flatMap((node) => node.hasOfferCatalog?.itemListElement ?? []);
}

const offers = (html, name, amount) =>
  offersOf(html).some((entry) => entry.name === name && entry.price === amount);

const { name: FIXTURE_NAME, amount: FIXTURE_AMOUNT } = fixtureItem();
const SUGAR_AMOUNT = unusedAmount();

const allowedEdits = [
  {
    name: `своя цена пастой у «${FIXTURE_NAME}»`,
    file: PRICES,
    corrupt: setSugar(SUGAR_FIXTURE_ID, { kind: 'fixed', amount: SUGAR_AMOUNT }),
    expect: () => {
      const sugaring = builtPage('/depilation/sugaring/');
      const depilation = builtPage('/depilation/');
      return [
        [sugaring.includes(shownPrice(SUGAR_AMOUNT)), `/depilation/sugaring/ показывает ${SUGAR_AMOUNT}`],
        [offers(sugaring, FIXTURE_NAME, SUGAR_AMOUNT), `/depilation/sugaring/ предлагает «${FIXTURE_NAME}» за ${SUGAR_AMOUNT}`],
        [!depilation.includes(shownPrice(SUGAR_AMOUNT)), `/depilation/ не показывает ${SUGAR_AMOUNT}`],
        [offers(depilation, FIXTURE_NAME, FIXTURE_AMOUNT), `/depilation/ предлагает «${FIXTURE_NAME}» за общую ${FIXTURE_AMOUNT}`],
      ];
    },
  },
  {
    name: `«${FIXTURE_NAME}» пастой не делается`,
    file: PRICES,
    corrupt: setSugar(SUGAR_FIXTURE_ID, false),
    expect: () => [
      [!builtPage('/depilation/sugaring/').includes(FIXTURE_NAME), `на /depilation/sugaring/ нет «${FIXTURE_NAME}»`],
      [builtPage('/depilation/').includes(FIXTURE_NAME), `на /depilation/ есть «${FIXTURE_NAME}»`],
    ],
  },
];

let failed = 0;

for (const testCase of cases) {
  const { status, output } = withCorruption(testCase.file, testCase.corrupt, build);

  const stopped = status !== 0;
  const named = testCase.expect.test(plain(output));

  if (stopped && named) {
    // Сообщение и есть предъявляемое доказательство: код возврата говорит лишь о том, что сборка
    // упала, а требование — чтобы она назвала поле, на котором это произошло.
    const line = plain(output)
      .split('\n')
      .find((row) => testCase.expect.test(row));
    console.log(`✓ ${testCase.name}: код возврата ${status}`);
    console.log(`  ${line?.trim() ?? ''}`);
    continue;
  }

  failed += 1;
  console.error(`✗ ${testCase.name}`);
  if (!stopped) console.error('  сборка завершилась успешно на испорченных данных');
  if (!named) console.error(`  в выводе нет указания на поле (ожидалось ${testCase.expect})`);
  console.error(tail(output));
}

for (const edit of allowedEdits) {
  // Проверка `dist/` идёт внутри правки: после отката сборка ещё не пересобрана, но читать
  // приходится именно сборку на правленых данных.
  const outcome = withCorruption(edit.file, edit.corrupt, () => {
    const result = build();
    return { ...result, checks: result.status === 0 ? edit.expect() : [] };
  });

  const missed = outcome.checks.filter(([held]) => !held).map(([, label]) => label);
  if (outcome.status === 0 && missed.length === 0) {
    console.log(`✓ допустимая правка: ${edit.name}`);
    for (const [, label] of outcome.checks) console.log(`  ${label}`);
    continue;
  }

  failed += 1;
  console.error(`✗ допустимая правка: ${edit.name}`);
  if (outcome.status !== 0) {
    console.error('  сборка упала на допустимых данных');
    console.error(tail(outcome.output));
  }
  for (const label of missed) console.error(`  не выполнено: ${label}`);
}

// Последняя сборка шла на испорченных данных, и dist/ остался от неё: следующий прогон проверок
// пошёл бы против мусора. Дерево уже восстановлено — сборка возвращает к нему и сборку.
const restored = build();
if (restored.status !== 0) {
  console.error('Сборка не проходит после отката порчи — дерево осталось изменённым:');
  console.error(tail(restored.output));
  process.exit(1);
}

if (failed > 0) {
  console.error(`\nПровалено случаев: ${failed} из ${cases.length + allowedEdits.length}`);
  process.exit(1);
}

console.log(
  `\nВсе случаи порчи данных (${cases.length}) останавливают сборку, допустимые правки ` +
    `(${allowedEdits.length}) видны в dist/; дерево восстановлено.`,
);
