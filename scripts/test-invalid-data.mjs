/**
 * Приёмка модели данных (docs/specs/content-model.md §Инварианты): порча данных обязана ронять
 * сборку, а не проходить молча, а допустимая правка — проходить и менять ровно то, что должна.
 * Порча и правка прайса, текстов, обращения, фото Лады, реестра подстраниц, базы знаний и её карты
 * вносятся в сам файл (или добавляют, перемещают файл) и откатываются в `finally`, поэтому прогон
 * не оставляет за собой изменений в дереве.
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

// База знаний (docs/specs/content-model.md §Build stops).
const GUIDE = 'src/content/guide';
const UK_HUB_INDEX = `${GUIDE}/uk/depilation/index.md`;
const UK_ARTICLE = `${GUIDE}/uk/depilation/vs-epilation.md`;
const RU_HUB = `${GUIDE}/ru/depilation.md`;
const RU_ARTICLE = `${GUIDE}/ru/depilation/vs-epilation.md`;
const RU_ARTICLES = `${GUIDE}/ru/depilation`;
// Вне `src/content/guide/`: каталог, перенесённый внутрь коллекции, загрузился бы снова.
const RU_ARTICLES_AWAY = 'node_modules/.invalid-data/ru-depilation';
const EXPERT_RU = 'src/content/expert/ru.md';
const SEO_MAP = 'docs/seo/map.md';

/** Имя файла в выражении: точки и косые черты пути — буквально. */
function literal(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Файл базы знаний, который проходит схему: случай обязан упасть на своей межфайловой остановке,
 * а не на схеме одной записи.
 */
function guideFile(page, heading) {
  return `---
page: ${page}
title: "${heading} — Lada N"
description: "Проверочная страница базы знаний: файл кладёт прогон test:invalid-data, чтобы убедиться, что сборка поступает с ним по контракту."
heading: "${heading}"
published: 2026-10-18
modified: 2026-10-18
---

Проверочный текст.
`;
}

/** Правка, которая не нашла своё место, проверяла бы не порчу, а исходный файл. */
function replaceOnce(path, original, pattern, replacement) {
  const edited = original.replace(pattern, replacement);
  if (edited === original) throw new Error(`${path}: не нашлось ${pattern}`);
  writeFileSync(path, edited);
}

/** `published` файла базы знаний: даты пилота ставятся в день слияния, поэтому прогон читает их из файла. */
function publishedOf(path, original) {
  const published = /^published: (\d{4}-\d{2}-\d{2})$/m.exec(original)?.[1];
  if (!published) throw new Error(`${path}: нет published`);
  return published;
}

const dayBefore = (day) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Дата правки — днём раньше даты публикации, от даты в файле. */
function modifiedBeforePublished(path, original) {
  replaceOnce(path, original, /^modified: .*$/m, `modified: ${dayBefore(publishedOf(path, original))}`);
}

const MISSING_PAGE = 'depilation-not-in-map';

/** Один и тот же `page`, которого нет в карте, — в обеих версиях статьи: иначе сработала бы № 7. */
const pageNotInMap = (path, original) =>
  replaceOnce(path, original, /^page: depilation-vs-epilation$/m, `page: ${MISSING_PAGE}`);

/** Ребро «хаб → статья» uk из §Links: строка таблицы с этими `from`, `to` и `lang`. */
const HUB_TO_ARTICLE_UK = /^\|\s*depilation-guide\s*\|\s*depilation-vs-epilation\s*\|[^\n]*\|\s*uk\s*\|[^\n]*\n/m;

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

/**
 * `freshStore` — хранилище коллекций стёрто, как после `npm ci` в CI. Сохранённое хранилище меняет
 * исход загрузки: запись, уже лежащая в нём, ловится проверкой дубля `glob`, а на пустом дубль
 * решает порядок параллельной загрузки.
 */
function build({ freshStore = false } = {}) {
  if (freshStore) rmSync(new URL(DATA_STORE, `file://${root}`), { force: true });
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

  // Остановки базы знаний: по случаю на каждую, сообщение называет файл
  // (docs/specs/content-model.md §Build stops).
  {
    // Уносится весь каталог статей: у хаба их больше одной, и удаление пилота хаб не опустошило бы.
    name: 'хаб без статьи своего языка (№ 9)',
    edits: [{ move: RU_ARTICLES, to: RU_ARTICLES_AWAY }],
    expect: new RegExp(`${literal(RU_HUB)}: у хаба нет ни одной статьи языка ru`),
  },
  {
    // Сборка называет первую статью без хаба, и при нескольких статьях это не обязательно пилот.
    name: 'статья без хаба своего языка (№ 8)',
    file: RU_HUB,
    expect: new RegExp(`${literal(`${RU_ARTICLES}/`)}[a-z0-9-]+\\.md: нет хаба ${literal(RU_HUB)}`),
    corrupt: (path) => rmSync(path),
  },
  {
    name: 'повтор page в языке (№ 6)',
    edits: [{ add: `${GUIDE}/uk/depilation/copy.md`, content: guideFile('depilation-vs-epilation', 'Копія статті') }],
    expect: new RegExp(
      `${literal(`${GUIDE}/uk/depilation/`)}(copy|vs-epilation)\\.md и ${literal(`${GUIDE}/uk/depilation/`)}` +
        '(copy|vs-epilation)\\.md: page «depilation-vs-epilation» повторяется в языке uk',
    ),
  },
  {
    name: 'версии одного page по разным адресам (№ 7)',
    edits: [{ move: RU_ARTICLE, to: `${GUIDE}/ru/depilation/other.md` }],
    expect: new RegExp(
      `${literal(UK_ARTICLE)} и ${literal(`${GUIDE}/ru/depilation/other.md`)}: ` +
        'версии страницы «depilation-vs-epilation» лежат по разным адресам',
    ),
  },
  {
    name: 'дата правки раньше даты публикации (№ 1)',
    file: UK_ARTICLE,
    // Запись и поле — в разных строках сообщения Astro, поэтому два выражения.
    expect: [/guide → uk\/depilation\/vs-epilation/, /modified\W+дата правки modified раньше даты публикации/],
    corrupt: modifiedBeforePublished,
  },
  {
    name: 'slug во frontmatter (№ 2)',
    file: UK_ARTICLE,
    // Ошибку схемы файлом называет строка места ошибки, а не запись («guide → <id>»).
    expect: [/Unrecognized key[^\n]*slug/, new RegExp(`${literal(UK_ARTICLE)}:\\d+:\\d+`)],
    corrupt: (path, original) => replaceOnce(path, original, /^(page: .*)$/m, '$1\nslug: other-address'),
  },
  {
    name: 'путь не хаба и не статьи (№ 3)',
    edits: [{ add: `${GUIDE}/uk/depilation/vs-epilation/deep.md`, content: guideFile('depilation-deep', 'Глибше статті') }],
    expect: new RegExp(`${literal(`${GUIDE}/uk/depilation/vs-epilation/deep.md`)}: путь не хаба и не статьи базы знаний`),
  },
  {
    name: 'язык, которого в базе знаний нет (№ 4)',
    edits: [{ add: `${GUIDE}/en/depilation.md`, content: guideFile('depilation-guide', 'Hair removal') }],
    expect: new RegExp(`${literal(`${GUIDE}/en/depilation.md`)}: язык «en» в базе знаний не публикуется`),
  },
  {
    name: 'категория, которой нет (№ 5)',
    edits: [{ add: `${GUIDE}/uk/nails.md`, content: guideFile('nails-guide', 'Нігті') }],
    expect: new RegExp(`${literal(`${GUIDE}/uk/nails.md`)}: категории «nails» нет`),
  },
  {
    name: 'page нет в карте (№ 10)',
    edits: [
      { file: UK_ARTICLE, corrupt: pageNotInMap },
      { file: RU_ARTICLE, corrupt: pageNotInMap },
    ],
    expect: new RegExp(
      `${literal(UK_ARTICLE)}: page «${MISSING_PAGE}» \\(uk\\) в ${literal(SEO_MAP)} §Pages нет, ` +
        'файл даёт /guide/depilation/vs-epilation/',
    ),
  },
  {
    name: 'в карте нет ребра «хаб → статья» (№ 11)',
    file: SEO_MAP,
    expect: new RegExp(
      `${literal(UK_ARTICLE)}: в ${literal(SEO_MAP)} §Links нет строки depilation-guide → depilation-vs-epilation \\(uk\\)`,
    ),
    corrupt: (path, original) => replaceOnce(path, original, HUB_TO_ARTICLE_UK, ''),
  },
  {
    // `glob` сводил `uk/depilation/index.md` и хаб `uk/depilation.md` к одному id и оставлял один из
    // них по порядку параллельной загрузки: сборка то проходила молча, то называла не тот файл.
    // Случай идёт на пустом хранилище, как в CI, — на сохранённом дубль ловила проверка `glob`.
    name: 'index.md рядом с хабом называет остановка, а не порядок загрузки (№ 10)',
    freshStore: true,
    edits: [{ add: UK_HUB_INDEX, content: guideFile('depilation-index', 'Індекс депіляції') }],
    expect: new RegExp(
      `${literal(UK_HUB_INDEX)}: page «depilation-index» \\(uk\\) в ${literal(SEO_MAP)} §Pages нет, ` +
        'файл даёт /guide/depilation/index/',
    ),
  },
  {
    name: 'отсутствующий файл страницы эксперта (№ 13)',
    file: EXPERT_RU,
    expect: /нет текста страницы эксперта: src\/content\/expert\/ru\.md/,
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

/** Статья хаба с датой публикации `day`; её строку §Pages и ребро от хаба вписывает `mapWithFixtures`. */
function guideArticle(page, heading, description, day) {
  return `---
page: ${page}
title: "${heading} — Lada N"
description: "${description}"
heading: "${heading}"
published: ${day}
modified: ${day}
---

Перевірочний текст статті хабу.
`;
}

/**
 * Допустимые новые статьи хаба — страницы-фикстуры, которые прогон на время вписывает в карту вместе
 * с рёбрами от хаба: страницы карты со статусом `planned` публикуются одна за другой, и случай,
 * опирающийся на них, ломался бы с каждой новой статьёй. Порядок списков — дата публикации
 * по убыванию, затем заголовок (docs/specs/routes.md §Links from the map). Даты пилота читаются
 * из его файла, они ставятся в день слияния:
 * - `same-day` — дата пилота и заголовок позже пилотного по алфавиту: тот же день решает заголовок,
 *   а порядок файлов (`check-same-day.md` раньше `vs-epilation.md`) дал бы обратный результат;
 * - `day-before` — днём раньше и заголовок раньше пилотного по алфавиту: старая статья стоит ниже
 *   вопреки заголовку, и ни убывание даты, ни её игнор не дают тот же порядок.
 * Настоящие статьи хаба стоят в тех же списках; порядок сверяется по подпоследовательности
 * пилота и фикстур, поэтому их даты исход не меняют.
 */
const PILOT_DAY = publishedOf(UK_ARTICLE, readFileSync(new URL(UK_ARTICLE, `file://${root}`), 'utf8'));
const SAME_DAY_PAGE = 'depilation-check-same-day';
const SAME_DAY_FILE = `${GUIDE}/uk/depilation/check-same-day.md`;
const SAME_DAY_PATH = '/guide/depilation/check-same-day/';
const SAME_DAY = guideArticle(
  SAME_DAY_PAGE,
  'Перевірка порядку: та сама дата',
  'Перевірка порядку: перевірочна стаття, яку додає прогон test:invalid-data, щоб довести, що нова стаття виходить без правки шаблонів.',
  PILOT_DAY,
);
const DAY_BEFORE_PAGE = 'depilation-check-day-before';
const DAY_BEFORE_FILE = `${GUIDE}/uk/depilation/check-day-before.md`;
const DAY_BEFORE_PATH = '/guide/depilation/check-day-before/';
/**
 * `</script>` в заголовке: строка frontmatter доходит до JSON-LD статьи, и без экранирования в `jsonLd()`
 * блок закрылся бы на ней. Заголовок по-прежнему раньше пилотного по алфавиту.
 */
const DAY_BEFORE_HEADING = 'Вибір методу депіляції: перевірка </script>';
const DAY_BEFORE = guideArticle(
  DAY_BEFORE_PAGE,
  DAY_BEFORE_HEADING,
  'Вибір методу депіляції: перевірочна стаття, яку додає прогон test:invalid-data, щоб довести, що старіша стаття стоїть у списках нижче за новішу.',
  dayBefore(PILOT_DAY),
);
const PILOT_PATH = '/guide/depilation/vs-epilation/';
/** Порядок списков хаба и эксперта, посчитанный по построению дат и заголовков выше, а не выводом сборки. */
const ARTICLE_ORDER = [PILOT_PATH, SAME_DAY_PATH, DAY_BEFORE_PATH];

/** Адреса пилота и фикстур в порядке первой ссылки на странице хаба или эксперта. */
const articleLinks = (html) => [
  ...new Set(
    [...html.matchAll(/href="(\/guide\/depilation\/[a-z0-9-]+\/)"/g)]
      .map(([, href]) => href)
      .filter((href) => ARTICLE_ORDER.includes(href)),
  ),
];

/** Строки фикстур в §Pages и рёбра «хаб → фикстура» в §Links — сразу за строками пилота. */
function mapWithFixtures(path, original) {
  const pageRow = (page, url) => `| ${page} | question | depilation-guide | ${page} | uk | ${url} | planned |\n`;
  const linkRow = (page, anchor) => `| depilation-guide | ${page} | ${anchor} | uk | вниз к странице вопроса |\n`;
  const withPages = original.replace(
    /^\|\s*depilation-vs-epilation\s*\|\s*entity\s*\|[^\n]*\|\s*uk\s*\|[^\n]*\n/m,
    (row) => row + pageRow(SAME_DAY_PAGE, SAME_DAY_PATH) + pageRow(DAY_BEFORE_PAGE, DAY_BEFORE_PATH),
  );
  if (withPages === original) throw new Error(`${path}: не нашлось строки пилота uk в §Pages`);
  replaceOnce(
    path,
    withPages,
    HUB_TO_ARTICLE_UK,
    (row) => row + linkRow(SAME_DAY_PAGE, 'перевірка порядку') + linkRow(DAY_BEFORE_PAGE, 'вибір методу депіляції'),
  );
}

/**
 * Блок JSON-LD цел: в теле нет сырого `<` и оно разбирается как JSON. Сырой `</script>` оборвал бы
 * совпадение раньше конца блока, и разбор упал бы.
 */
function headlineIntact(html, headline) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(([, body]) => body);
  try {
    const nodes = blocks.flatMap((body) => JSON.parse(body)['@graph'] ?? []);
    return blocks.length > 0 && blocks.every((body) => !body.includes('<')) && nodes.some((node) => node.headline === headline);
  } catch {
    return false;
  }
}

/** Адреса `hasPart` узла `CollectionPage` хаба — из JSON-LD как данных. */
function hasPartUrls(html) {
  try {
    const collection = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(([, json]) => JSON.parse(json)['@graph'] ?? [])
      .find((node) => node['@type'] === 'CollectionPage');
    return (collection?.hasPart ?? []).map((part) => part.url);
  } catch {
    // Оборванный блок — провал проверки порядка с её подписью, а не падение всего прогона.
    return [];
  }
}

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
  {
    // Следующая статья — файлом и строками карты, без правки шаблонов.
    name: 'две новые статьи хаба только на uk появляются в хабе, у эксперта и в карте сайта, по порядку',
    edits: [
      { file: SEO_MAP, corrupt: mapWithFixtures },
      { add: SAME_DAY_FILE, content: SAME_DAY },
      { add: DAY_BEFORE_FILE, content: DAY_BEFORE },
    ],
    expect: () => {
      const link = `href="${SAME_DAY_PATH}"`;
      const sitemap = readFileSync(new URL('dist/sitemap-0.xml', `file://${root}`), 'utf8');
      const alternates = [...builtPage(SAME_DAY_PATH).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
        .map(([, hreflang, href]) => `${hreflang} ${href}`)
        .sort();
      const own = `https://www.lada.kiev.ua${SAME_DAY_PATH}`;
      const hub = builtPage('/guide/depilation/');
      const order = (actual) => JSON.stringify(actual) === JSON.stringify(ARTICLE_ORDER);
      return [
        [hub.includes(link), `${SAME_DAY_PATH} в списке /guide/depilation/`],
        [builtPage('/lada/').includes(link), `${SAME_DAY_PATH} в списке /lada/`],
        [sitemap.includes(`<loc>${own}</loc>`), `${SAME_DAY_PATH} в sitemap-0.xml`],
        [
          JSON.stringify(alternates) === JSON.stringify([`uk ${own}`, `x-default ${own}`]),
          `hreflang ${SAME_DAY_PATH} — только uk и x-default (${alternates.join(', ')})`,
        ],
        [!builtPage('/ru/guide/depilation/').includes('check-same-day'), 'на /ru/guide/depilation/ её нет'],
        [!builtPage('/ru/lada/').includes('check-same-day'), 'на /ru/lada/ её нет'],
        [
          order(articleLinks(hub)),
          `порядок списка /guide/depilation/: дата, затем заголовок (${articleLinks(hub).join(', ')})`,
        ],
        [
          order(hasPartUrls(hub).map((url) => new URL(url).pathname).filter((path) => ARTICLE_ORDER.includes(path))),
          'порядок hasPart хаба тот же',
        ],
        [
          headlineIntact(builtPage(DAY_BEFORE_PATH), DAY_BEFORE_HEADING),
          `${DAY_BEFORE_PATH}: </script> в заголовке не обрывает JSON-LD, headline читается целиком`,
        ],
        [
          order(articleLinks(builtPage('/lada/'))),
          `порядок списка /lada/: дата, затем заголовок (${articleLinks(builtPage('/lada/')).join(', ')})`,
        ],
      ];
    },
  },
];

let failed = 0;

for (const testCase of cases) {
  // Случай без `edits` — одна порча `file` + `corrupt`, как у всех случаев до базы знаний.
  const edits = testCase.edits ?? [{ file: testCase.file, corrupt: testCase.corrupt }];
  const { status, output } = withCorruptions(edits, () => build({ freshStore: testCase.freshStore }));

  // Несколько выражений — когда предъявляемое разнесено по строкам вывода: запись и её поле.
  const patterns = [testCase.expect].flat();
  const stopped = status !== 0;
  const named = patterns.every((pattern) => pattern.test(plain(output)));

  if (stopped && named) {
    // Сообщение и есть предъявляемое доказательство: код возврата говорит лишь о том, что сборка
    // упала, а требование — чтобы она назвала поле, на котором это произошло.
    console.log(`✓ ${testCase.name}: код возврата ${status}`);
    for (const pattern of patterns) {
      const line = plain(output)
        .split('\n')
        .find((row) => pattern.test(row));
      console.log(`  ${line?.trim() ?? ''}`);
    }
    continue;
  }

  failed += 1;
  console.error(`✗ ${testCase.name}`);
  if (!stopped) console.error('  сборка завершилась успешно на испорченных данных');
  if (!named) console.error(`  в выводе нет указания на поле (ожидалось ${patterns.join(', ')})`);
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
