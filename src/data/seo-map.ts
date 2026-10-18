/**
 * Разбор карты базы знаний `docs/seo/map.md` — §Pages и §Links по грамматике контракта `/seo`
 * (`~/.claude/skills/seo/references/contract.md` §Map file). Модуль чистый: файл читает
 * `src/data/guide.ts`, собранные адреса даёт `src/data/map-links.ts`, а здесь только текст на входе
 * (docs/specs/routes.md §Links from the map). Из `src/` — только типы: модуль
 * загружает и `node --experimental-strip-types` (scripts/seo-map.test.mjs).
 *
 * Колонки ищутся по имени заголовка, а не по позиции: `/seo map` вправе переставить или добавить
 * колонку. Колонка `status` и §Site не читаются — опубликованной страницу делает файл в контенте,
 * а не статус карты.
 */
import type { GuideLocale } from '../i18n/guide';

export type MapPageKind = 'hub' | 'entity' | 'question' | 'service' | 'expert';

export interface MapPage {
  readonly page: string;
  readonly kind: MapPageKind;
  readonly lang: GuideLocale;
  readonly url: string;
}

export interface MapLink {
  readonly from: string;
  readonly to: string;
  readonly anchor: string;
  readonly lang: GuideLocale;
}

export interface SeoMap {
  readonly pages: readonly MapPage[];
  readonly links: readonly MapLink[];
}

/** Ребро карты на странице: адрес со слешем, анкор как в карте и вид страницы, куда оно ведёт. */
export interface PageLink {
  readonly href: string;
  readonly anchor: string;
  readonly toKind: MapPageKind;
}

const SOURCE = 'docs/seo/map.md';

/**
 * Копии перечней `MapPageKind` и `GuideLocale` для проверки строки на исполнении: значение из
 * `src/` сюда не импортировать (см. шапку). `satisfies Record<…, true>` держит набор ключей
 * равным типу — пропуск и лишний ключ не компилируются.
 */
const KINDS = { hub: true, entity: true, question: true, service: true, expert: true } satisfies Record<
  MapPageKind,
  true
>;
const LOCALES = { uk: true, ru: true } satisfies Record<GuideLocale, true>;

function isKind(value: string): value is MapPageKind {
  return Object.hasOwn(KINDS, value);
}

function isLocale(value: string): value is GuideLocale {
  return Object.hasOwn(LOCALES, value);
}

// `###` сюда не попадает: после `##` обязателен пробел.
const HEADING = /^##\s+(.+?)\s*$/;
const SEPARATOR_CELL = /^:?-{3,}:?$/;
const CELL_SPLIT = /(?<!\\)\|/;

function splitCells(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  return row.split(CELL_SPLIT).map((cell) => {
    const value = cell.replaceAll('\\|', '|').trim();
    return value.length >= 2 && value.startsWith('`') && value.endsWith('`') ? value.slice(1, -1).trim() : value;
  });
}

interface TableRow {
  readonly line: number;
  readonly cells: Readonly<Record<string, string>>;
}

/**
 * Строки таблицы раздела с ячейками по именам колонок. Таблица — первый сплошной блок строк
 * с `|` после заголовка раздела; текст раздела вне неё не читается.
 */
function sectionRows(lines: readonly string[], name: string, required: readonly string[]): TableRow[] {
  const headings = lines.flatMap((line, index) => {
    const match = HEADING.exec(line);
    return match ? [{ name: match[1], index }] : [];
  });
  const own = headings.filter((heading) => heading.name === name);
  if (own.length === 0) throw new Error(`${SOURCE}: нет раздела «## ${name}»`);
  // Второй раздел с тем же именем половину строк спрятал бы от разбора, и ссылки пропали бы молча.
  if (own.length > 1) throw new Error(`${SOURCE}: раздел «## ${name}» повторяется`);

  const start = own[0].index;
  const next = headings.find((heading) => heading.index > start);
  const body = lines.slice(start + 1, next?.index ?? lines.length);
  const isTableLine = (line: string) => line.trimStart().startsWith('|');
  const first = body.findIndex(isTableLine);
  const block: { line: number; text: string }[] = [];
  if (first >= 0) {
    for (const [offset, text] of body.slice(first).entries()) {
      if (!isTableLine(text)) break;
      // Номер строки файла с единицы: заголовок раздела стоит на строке `start + 1`.
      block.push({ line: start + 2 + first + offset, text });
    }
  }
  if (block.length < 2 || !splitCells(block[1].text).every((cell) => SEPARATOR_CELL.test(cell))) {
    throw new Error(`${SOURCE}: в разделе «## ${name}» нет таблицы`);
  }

  const columns = splitCells(block[0].text).map((column) => column.toLowerCase());
  const missing = required.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`${SOURCE}: в таблице «## ${name}» нет колонки ${missing.map((column) => `«${column}»`).join(', ')}`);
  }

  return block.slice(2).map(({ line, text }) => {
    const cells = splitCells(text);
    // Строку другой длины не разложить по колонкам однозначно, а пропуск убрал бы ссылку молча.
    if (cells.length !== columns.length) {
      throw new Error(
        `${SOURCE}: строка ${line} таблицы «## ${name}» — ${cells.length} ячеек при ${columns.length} колонках`,
      );
    }
    return { line, cells: Object.fromEntries(columns.map((column, index) => [column, cells[index]])) };
  });
}

/**
 * Остановка № 12 (docs/specs/content-model.md §Build stops):
 * нет раздела, таблицы или колонки — исключение с именем файла карты. Строки языков, которых
 * в базе знаний нет, пропускаются: карта вправе планировать их, сайт их не публикует.
 */
export function parseSeoMap(text: string): SeoMap {
  const lines = text.split(/\r?\n/);

  const seen = new Set<string>();
  const pages = sectionRows(lines, 'Pages', ['page', 'kind', 'lang', 'url']).flatMap(({ line, cells }) => {
    const { page, kind, lang, url } = cells;
    if (!isLocale(lang)) return [];
    const where = `${SOURCE}: строка ${line} таблицы «## Pages»`;
    if (!isKind(kind)) {
      throw new Error(`${where} — вид страницы «${kind}» не из ${Object.keys(KINDS).join(', ')}`);
    }
    // Две строки одной пары `page` + `lang` дают странице два адреса, и сверка файлов с картой
    // (остановка № 10) не знала бы, с каким из них сравнивать.
    if (seen.has(`${page} ${lang}`)) throw new Error(`${where} — page «${page}» (${lang}) повторяется`);
    seen.add(`${page} ${lang}`);
    return [{ page, kind, lang, url }];
  });

  const links = sectionRows(lines, 'Links', ['from', 'to', 'anchor', 'lang']).flatMap(({ cells }) => {
    const { from, to, anchor, lang } = cells;
    return isLocale(lang) ? [{ from, to, anchor, lang }] : [];
  });

  return { pages, links };
}

/**
 * Рёбра карты от страницы `path` языка `locale`, ведущие на собранные адреса, в порядке строк
 * §Links (docs/specs/routes.md §Links from the map).
 */
export function linksFrom(
  map: SeoMap,
  locale: GuideLocale,
  path: string,
  builtPaths: ReadonlySet<string>,
): readonly PageLink[] {
  const pages = new Map(map.pages.filter((page) => page.lang === locale).map((page) => [page.page, page]));

  return map.links.flatMap((link) => {
    if (link.lang !== locale) return [];
    const from = pages.get(link.from);
    const to = pages.get(link.to);
    if (from?.url !== path || !to || !builtPaths.has(to.url)) return [];
    return [{ href: to.url, anchor: link.anchor, toKind: to.kind }];
  });
}
