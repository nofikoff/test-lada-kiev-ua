# Data Model: Knowledge Base Pilot

Состояний и переходов нет: файл в `src/content/guide/` — опубликованная страница, файла нет — страницы нет (spec, Clarifications). Решения, на которых держится модель, — [research.md](research.md) R1–R4.

## Guide entry

Запись коллекции `guide`, один файл — одна страница на одном языке.

| Поле | Откуда | Правило |
|---|---|---|
| `locale` | первый сегмент `entry.id` | `uk` или `ru` (`guideLocales`) |
| `category` | второй сегмент | одна из `serviceCategories` |
| `article` | третий сегмент; нет у хаба | `^[a-z0-9]+(-[a-z0-9]+)*$`; глубже третьего сегмента — ошибка |
| `kind` | число сегментов | 2 — `hub`, 3 — `article` |
| `page` | frontmatter | идентификатор страницы `docs/seo/map.md` §Pages |
| `title` | frontmatter | непустая; форма `<текст> — Lada N`, ≤ 70 знаков — держит проверка, не схема (как у категорий) |
| `description` | frontmatter | 120–160 знаков |
| `heading` | frontmatter | непустая; `<h1>`, имя страницы в крошках и списках |
| `published` | frontmatter | дата |
| `modified` | frontmatter | дата, `>= published` (схема, `path: ['modified']`); равенство допустимо, дата в будущем не проверяется |
| тело | Markdown | статья — ≥ 400 слов в `[data-guide-copy]`; хаб — вступление в `[data-guide-copy]` без нижней границы; абзацы обоих не повторяют другие страницы своего языка |

Неизвестный ключ frontmatter, включая `slug`, останавливает сборку (`.strict()`, R1).

## Guide page (derived)

Строит `guideIndex()` в `src/data/guide.ts` после проверок. Одна страница = `category` + `article?`, её версии — записи с этой парой на разных языках.

```ts
interface GuidePage {
  readonly ref: GuidePageRef;                 // kind, category, article?, locales
  readonly entries: Partial<Record<GuideLocale, CollectionEntry<'guide'>>>;
}

guideIndex(): Promise<{
  readonly pages: readonly GuidePage[];
  hubOf(locale, category): GuidePage | undefined;
  articlesOf(locale, category): readonly CollectionEntry<'guide'>[]; // published ↓, затем heading
  articles(locale): readonly CollectionEntry<'guide'>[];             // для страницы эксперта
  pathsOf(locale): readonly string[];                                // собранные адреса раздела
}>;
```

Связи:

- статья → хаб: та же `category` и тот же `locale`; у статьи обязан быть хаб её языка, у хаба — хотя бы одна статья его языка;
- `page` одинаков у версий одной страницы на разных языках, но в пределах одного языка уникален; версии одного `page` лежат по одному пути `<category>/<article>`, иначе сборка останавливается ([contracts/content-files.md](contracts/content-files.md) §Build stops, № 7);
- страница ↔ строка §Pages карты: `page`, `lang` и `url` совпадают с выведенными из пути.

## Expert entry

Коллекция `expert`, файлы `uk.md`, `ru.md`. Frontmatter: `title`, `description` (120–160), `heading`. Тело — текст в третьем лице, только факты из FR-008; ни один абзац не повторяет «Про нас» своего языка. Список статей и портрет текстом не являются: список собирает `guideIndex().articles(locale)`, портрет — `portrait()` из `src/data/gallery.ts`. Нет файла языка — сборка останавливается в `expertCopy`.

## Seo map

`parseSeoMap(text)` в `src/data/seo-map.ts` — чистая функция без импортов Astro.

```ts
interface MapPage { page: string; kind: 'hub'|'entity'|'question'|'service'|'expert'; lang: 'uk'|'ru'; url: string }
interface MapLink { from: string; to: string; anchor: string; lang: 'uk'|'ru' }

linksFrom(locale, path): readonly { href: string; anchor: string; toKind: MapPage['kind'] }[];
```

`linksFrom` берёт рёбра, у которых `url` страницы `from` равен `path`, а `url` страницы `to` есть среди собранных адресов: страницы услуг, `guideIndex().pathsOf(locale)`, страница эксперта. Порядок — порядок строк §Links. Колонка `status` и §Site не читаются.

## Page reference

```ts
type PageRef = ServicePageRef | GuidePageRef | ExpertPageRef;  // undefined — главная
```

| Вид | `pagePath('uk' / 'ru')` | `pageLocales` | `x-default` |
|---|---|---|---|
| guide hub | `/guide/<c>/`, `/ru/guide/<c>/` | `ref.locales` | uk, иначе единственная |
| guide article | `/guide/<c>/<a>/`, `/ru/guide/<c>/<a>/` | `ref.locales` | uk, иначе единственная |
| expert | `/lada/`, `/ru/lada/` | `['uk', 'ru']` | uk |

## Rendered link

То, что выводит `MapLinks.astro` и список хаба: `href` — путь со слешем, текст — `displayAnchor(locale, anchor)`. Это анкор карты с поднятой первой буквой и восстановленным регистром имён собственных из `src/i18n/guide.ts`; после нормализации (trim, пробелы, нижний регистр) текст равен анкору карты.
