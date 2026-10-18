# Contract: Content Files

Интерфейс автора статьи: что положить в репозиторий, чтобы страница вышла, и чем сборка отвечает на ошибку. При реализации переносится в [docs/specs/content-model.md](../../../docs/specs/content-model.md) §Knowledge base.

## Layout

```text
src/content/guide/<lang>/<category>.md            → хаб    /<prefix>guide/<category>/
src/content/guide/<lang>/<category>/<article>.md  → статья /<prefix>guide/<category>/<article>/
src/content/expert/<lang>.md                      → эксперт /<prefix>lada/
```

`<lang>` — `uk` или `ru`, `<prefix>` — пусто для uk, `ru/` для ru. Версии одной страницы на двух языках — два файла с одинаковым путём под разными `<lang>` и одинаковым `page`.

## Frontmatter

```yaml
# guide
page: depilation-vs-epilation     # page из docs/seo/map.md §Pages
title: "… — Lada N"               # ≤ 70 знаков
description: "…"                  # 120–160 знаков
heading: "…"                      # <h1>
published: 2026-10-20             # не меняется после выхода
modified: 2026-10-20              # двигает изменение смысла, не опечатка; ≥ published
```

```yaml
# expert
title: "Лада Новикова: … — Lada N"
description: "…"                  # 120–160 знаков, содержит «Лада Новикова»
heading: "Лада Новикова"
```

Других ключей нет; `slug` запрещён (research R1). Флага черновика нет: черновик — `docs/seo/drafts/`, в сборку не попадает.

## Text rules

| Страница | Правило | Держит |
|---|---|---|
| статья | основная формулировка кластера в `title`, `heading`, `description` (в первой половине) и первом абзаце тела | `tests/voice.spec.ts` |
| статья | ≥ 400 слов в `[data-guide-copy]`, абзацы не повторяют другие страницы своего языка | `tests/seo-contract.spec.ts` |
| хаб | в `title`, `heading`, `description` нет формулировок запросов категории (`page-head.md` §Целевые запросы) и запросов его статей; слово категории допустимо | `tests/voice.spec.ts` |
| эксперт | «Лада Новикова» в `title`, `heading`, `description`; третье лицо; только факты FR-008; ни один абзац не совпадает с «Про нас» своего языка | `tests/voice.spec.ts`, `tests/seo-contract.spec.ts`, вычитка |
| все | «ми» студии, Лада — в третьем лице, ни одно утверждение не говорит, что процедуру делает Лада; запреты `voice.md` | вычитка; «майстерня» — `tests/voice.spec.ts` |
| статья | общее утверждение — с источником в таблице источников; практика студии — только `studio-practice.md`, прайс, текст категории | вычитка |

## Build stops

Проверки идут в этом порядке; первая сработавшая останавливает сборку, и её сообщение называет файл. Тексты — образец, `test:invalid-data` сверяет выделенную часть.

| # | Нарушение | Где | Сообщение |
|---|---|---|---|
| 1 | `modified` раньше `published` | схема | ошибка схемы записи `guide → <id>` по полю **`modified`** |
| 2 | неизвестный ключ frontmatter, описание вне 120–160 | схема | ошибка схемы записи с именем поля |
| 3 | путь не `<lang>/<category>.md` и не `<lang>/<category>/<article>.md`, slug не латиница через дефис | `guide.ts` | `<filePath>: путь не хаба и не статьи базы знаний` |
| 4 | `<lang>` не `uk`/`ru` | `guide.ts` | `<filePath>: язык «<lang>» в базе знаний не публикуется` |
| 5 | `<category>` не из `serviceCategories` | `guide.ts` | `<filePath>: категории «<category>» нет` |
| 6 | повтор `page` в пределах языка | `guide.ts` | `<filePath> и <filePath>: page «<page>» повторяется в языке <lang>` |
| 7 | статья без хаба своего языка | `guide.ts` | `<filePath>: нет хаба src/content/guide/<lang>/<category>.md` |
| 8 | хаб без статьи своего языка | `guide.ts` | `<filePath>: у хаба нет ни одной статьи языка <lang>` |
| 9 | `page` нет в карте для этого языка или адрес в карте другой | `guide.ts` | `<filePath>: page «<page>» (<lang>) в docs/seo/map.md §Pages <нет \| с адресом <url>>, файл даёт <path>` |
| 10 | у статьи нет ребра «хаб → статья» в карте | `guide.ts` | `<filePath>: в docs/seo/map.md §Links нет строки <hub> → <page> (<lang>)` |
| 11 | в карте нет §Pages или §Links или нужной колонки | `seo-map.ts` | `docs/seo/map.md: <что не найдено>` |
| 12 | нет файла эксперта языка | `expert.ts` | `нет текста страницы эксперта: src/content/expert/<lang>.md` |
