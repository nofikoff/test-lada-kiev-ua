/**
 * Приёмка модели данных (docs/specs/content-model.md §Инварианты): порча данных обязана ронять
 * сборку, а не проходить молча. Порча прайса, текстов категорий и фото Лады вносится в сам файл
 * и откатывается в `finally`, поэтому прогон не оставляет за собой изменений в дереве.
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

// Последняя сборка шла на испорченных данных, и dist/ остался от неё: следующий прогон проверок
// пошёл бы против мусора. Дерево уже восстановлено — сборка возвращает к нему и сборку.
const restored = build();
if (restored.status !== 0) {
  console.error('Сборка не проходит после отката порчи — дерево осталось изменённым:');
  console.error(tail(restored.output));
  process.exit(1);
}

if (failed > 0) {
  console.error(`\nПровалено случаев: ${failed} из ${cases.length}`);
  process.exit(1);
}

console.log(`\nВсе случаи порчи данных (${cases.length}) останавливают сборку; дерево восстановлено.`);
