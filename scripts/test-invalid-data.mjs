/**
 * Приёмка модели данных (docs/specs/content-model.md §Инварианты): порча данных обязана ронять
 * сборку, а не проходить молча, а допустимая правка — проходить и менять ровно то, что должна.
 * Порча и правка прайса, текстов, обращения, фото Лады и реестра подстраниц вносятся в сам файл
 * и откатываются в `finally`, поэтому прогон не оставляет за собой изменений в дереве.
 *
 * Проверка сделана автоматической намеренно. Ручная процедура «сломать, посмотреть, откатить»
 * подтверждает схему один раз в жизни — в день, когда её написали; после первого расширения
 * схемы никто её не повторит, и требование останется утверждением без подтверждения.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const PRICES = 'src/data/prices.json';
const GALLERY = 'src/data/gallery.json';
const SERVICE_COPY = 'src/content/services/uk/massage.md';
const SUBPAGE_COPY = 'src/content/subpages/uk/sugaring.md';
const STRAY_SUBPAGE_COPY = 'src/content/subpages/ru/brows.md';
const REGISTRY = 'src/data/subpage-registry.ts';
// Хранилище коллекций, которое сборка пишет на диск: по нему видно, что загрузчик файл не читал.
const DATA_STORE = 'node_modules/.astro/data-store.json';
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

/**
 * Каталог, который создаётся ради файла, удаляется вместе с ним: иначе пустой каталог остался бы
 * в дереве после прогона. Возвращает верхний из созданных каталогов или `null`.
 */
function ensureDirectory(path) {
  let missing = null;
  for (let directory = dirname(path); !existsSync(directory); directory = dirname(directory)) missing = directory;
  if (missing) mkdirSync(dirname(path), { recursive: true });
  return missing;
}

/**
 * Файл, которого в дереве не было: `withCorruption` читает исходник и такой случай не умеет.
 * Добавленный файл удаляется при любом исходе, включая исключение.
 */
function withAddedFile(relativePath, content, check) {
  const path = fileURLToPath(new URL(relativePath, `file://${root}`));
  // Файл на этом месте уже есть — случай проверял бы не добавление, а молча испортил бы его.
  if (existsSync(path)) throw new Error(`${relativePath}: файл уже есть, добавить его нельзя`);
  const created = ensureDirectory(path);
  try {
    writeFileSync(path, content);
    return check();
  } finally {
    rmSync(path, { force: true });
    if (created) rmSync(created, { recursive: true, force: true });
  }
}

/** Файл перемещается на время проверки и возвращается на место в `finally`. */
function withMovedFile(fromPath, toPath, check) {
  const from = fileURLToPath(new URL(fromPath, `file://${root}`));
  const to = fileURLToPath(new URL(toPath, `file://${root}`));
  if (existsSync(to)) throw new Error(`${toPath}: файл уже есть, переместить на его место нельзя`);
  const created = ensureDirectory(to);
  let moved = false;
  try {
    renameSync(from, to);
    moved = true;
    return check();
  } finally {
    if (moved) renameSync(to, from);
    if (created) rmSync(created, { recursive: true, force: true });
  }
}

/**
 * Одна правка дерева: порча существующего файла (`file` + `corrupt`), новый файл (`add` +
 * `content`) или перемещение (`move` + `to`).
 */
function withEdit(edit, check) {
  if (edit.add) return withAddedFile(edit.add, edit.content, check);
  if (edit.move) return withMovedFile(edit.move, edit.to, check);
  return withCorruption(edit.file, edit.corrupt, check);
}

/** Несколько файлов портятся разом: правки вкладываются, и откат идёт в обратном порядке. */
function withCorruptions(edits, check) {
  const [first, ...rest] = edits;
  if (!first) return check();
  return withEdit(first, () => withCorruptions(rest, check));
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

// Идентификатор исторический: позиция — «Ніс / Вуха / Брови / Шия», а не верхняя губа.
const SUGAR_FIXTURE_ID = 'women-depilation-upper-lip';

/**
 * Допустимые правки прайса: сборка обязана пройти, а `dist/` — показать правку там, где требует
 * модель, и нигде больше (docs/specs/content-model.md §Инварианты). Ветки «своя цена пастой» и
 * «пастой не делается» проверяются сборкой на правленом прайсе: прайс, в котором нет ни одной
 * позиции с `sugar`, через них не проходит. Название и общая сумма позиции читаются из прайса при
 * прогоне, потому что суммы правит Лада.
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

function isBuilt(path) {
  return existsSync(new URL(`dist${path}index.html`, `file://${root}`));
}

/** Бровям оставлен один украинский язык: `ru/brows.md` выпадает из пар «подстраница × язык». */
function makeBrowsUkOnly(path, original) {
  const edited = original.replace(
    /(brows: \{\s*parent: 'permanent',\s*locales: )\['uk', 'ru'\]/,
    "$1['uk']",
  );
  // Без этого проверка прошла бы вхолостую, если реестр перестанет быть записан так.
  if (edited === original) throw new Error(`${REGISTRY}: не нашлось locales: ['uk', 'ru'] у brows`);
  writeFileSync(path, edited);
}

/**
 * Файл читается и разбирается, но схему не проходит (описание короче 120 знаков). Порча самой
 * разметки не годится: ошибку чтения загрузчик `glob` только пишет в журнал и идёт дальше
 * (`astro/dist/content/loaders/glob.js`), так что сборка прошла бы и при загруженном файле.
 */
const STRAY_COPY = `---
subpage: brows
title: Текст на языке, которого у подстраницы нет
description: Короткое описание, которое схема отвергает
heading: Текст на языке, которого у подстраницы нет
---
`;

/** Сумма в разметке прайса; та же сумма обязана стоять в предложении (docs/specs/structured-data.md). */
const shownPrice = (amount) => `>${amount}</span>`;

/**
 * Предложения собранной страницы, прочитанные из JSON-LD как данные: порядок ключей разметки не
 * часть контракта, и поиск подстроки упал бы на безвредной перестановке.
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
  {
    // Правило пар «подстраница × язык» — у коллекции `subpages` в `src/content.config.ts`.
    name: 'файл текста на языке, которого у подстраницы нет, не загружается',
    file: REGISTRY,
    corrupt: makeBrowsUkOnly,
    alsoCorrupt: [{ file: STRAY_SUBPAGE_COPY, corrupt: (path) => writeFileSync(path, STRAY_COPY) }],
    expect: () => {
      // Контроль `uk/brows`: без него «ru/brows нет» было бы верно и для пустого хранилища.
      const store = readFileSync(new URL(DATA_STORE, `file://${root}`), 'utf8');
      return [
        [isBuilt('/permanent/brows/'), '/permanent/brows/ собрана'],
        [!isBuilt('/ru/permanent/brows/'), '/ru/permanent/brows/ не собрана'],
        [store.includes('"uk/brows"'), 'в хранилище коллекции есть uk/brows'],
        [!store.includes('"ru/brows"'), 'в хранилище коллекции нет ru/brows'],
      ];
    },
  },
];

let failed = 0;

for (const testCase of cases) {
  // Случай без `edits` — одна порча `file` + `corrupt`, как у всех случаев до базы знаний.
  const edits = testCase.edits ?? [{ file: testCase.file, corrupt: testCase.corrupt }];
  const { status, output } = withCorruptions(edits, build);

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
  const edits = edit.edits ?? [{ file: edit.file, corrupt: edit.corrupt }, ...(edit.alsoCorrupt ?? [])];
  const outcome = withCorruptions(edits, () => {
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
