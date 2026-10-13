# Implementation Plan: Service subpages for sugaring and brow permanent makeup

**Branch**: `006-service-subpages` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-service-subpages/spec.md`

## Summary

Четыре новые страницы — `/depilation/sugaring/`, `/ru/depilation/sugaring/`, `/permanent/brows/`, `/ru/permanent/brows/` — собираются тем же составом, что страница категории: текст из коллекции, прайс из `prices.json` по группам, заголовочная часть и JSON-LD из `SeoHead.astro`. Подстраница объявляется в одном реестре рядом с категориями (`src/i18n/paths.ts`): родитель, slug, языки, группы прайса, способ цены. Позиция депиляции получает необязательное поле цены пастой; страница шугаринга читает прайс этим способом. Категории `depilation` и `permanent` на uk и ru отдают запрос подстраницам. Решения и отвергнутые варианты — [research.md](research.md), модель — [data-model.md](data-model.md), контракт страниц — [contracts/subpage.md](contracts/subpage.md).

## Technical Context

**Language/Version**: TypeScript 5 в Astro 7.3.1 (`node_modules/astro/package.json`), Node ≥ 22.12

**Primary Dependencies**: Astro (content collections, `glob()`/`file()` loaders, `astro/zod`), `@astrojs/sitemap` 3.7.4, Tailwind 3 через PostCSS (ADR-010)

**Storage**: файлы репозитория — `src/data/prices.json`, `src/content/**.md`

**Testing**: Playwright против `astro preview` над `dist/` (ADR-012), `node:test` (`npm run test:unit`) для строк таблицы цен, `scripts/test-invalid-data.mjs` для испорченных данных, `astro check`, ESLint, анализ бандла; публикация гоняет из них только `test:publish` (ADR-027)

**Target Platform**: статические файлы на Apache за Cloudflare

**Project Type**: статический сайт

**Performance Goals**: LCP подстраницы не хуже страницы категории — состав первого экрана тот же, новых шрифтов и скриптов нет

**Constraints**: ни одного клиентского скрипта сверх существующих (ADR-004); комментарии кода в `dist/` запрещены (constitution §Quality Gates); тексты на uk и ru с утверждениями из практики только из интервью Лады

**Scale/Scope**: 15 → 19 адресуемых страниц; 2 → 4 файла текста под подстраницы; одно новое необязательное поле прайса

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Проверка | Итог |
|---|---|---|
| I. Zero client-side framework | подстраница — тот же серверный шаблон, без скриптов | соответствует |
| II. Контент — данные, а не разметка | текст в коллекции со схемой, цена пастой — поле прайса со схемой, недостающий файл текста роняет сборку | соответствует |
| III. URL — публичный контракт | действующие адреса не меняются; четыре новых добавляются в `routes.md` | соответствует |
| IV. Страница самодостаточна для машинного читателя | своя заголовочная часть, `canonical`, `hreflang`, JSON-LD `Service` + `BreadcrumbList` | соответствует; `hreflang` из двух языков — отклонение от `page-head.md`, обосновано ниже |
| V. Готовность доказывается прогоном | гейты `CLAUDE.md` §Гейты (семь, с `test:unit`) по собранному сайту | соответствует |
| ADR-025 (price input via Google Sheet) | сумма пастой — строка таблицы со своим ключом; структура (появление `sugar`, `false`) — в репозитории | соответствует |
| ADR-004 (static Astro, no client framework) | без клиентского кода | соответствует |
| ADR-006 (prices: single JSON, group defines category) | цена пастой живёт в той же записи прайса, второй записи цен нет | соответствует |
| ADR-007 (content formats: markdown texts, ts dictionary) | тексты подстраниц — markdown в коллекции | соответствует |
| ADR-008 (directory URLs, latin category slugs) | slug латиницей, одинаковый в uk и ru, форма со слешем | соответствует |
| ADR-012 (tests against built dist) | все новые проверки — по `dist/` | соответствует |
| ADR-013 (no zero-price offers) | коррекция бровей — доля, предложения не даёт | соответствует |
| ADR-019 (masters not named) | в текстах только Лада | соответствует |
| ADR-020 (no FAQPage markup) | разметки FAQ нет | соответствует |
| ADR-021 (no query landing pages) | частично отменяется новым ADR пакета | отклонение, решение пакета — новый ADR |
| ADR-023 (KB pages for informational queries) | пункт Rejected о `/sugaring/` и `/powder-brows/` снимается новым ADR | отклонение, решение пакета — новый ADR |

| ADR-026 (single CI deploy path) | всё в `main` уходит на сайт со следующей галочкой Лады, поэтому пакет сливается целиком, а не по историям | соответствует |
| ADR-027 (full e2e outside publish) | публикация гоняет `seo-contract.spec.ts`, который расширяют T017 и T023; полный `test:e2e` — локально до слияния | соответствует |

ADRs without Affects: 27 (`adr_affects.py match` вернул `matched: []`; все ADR без поля `Affects`, перечень выше составлен чтением заголовков `docs/adr/`, пересчитан 2026-10-13).

## Project Structure

### Documentation (this feature)

```text
specs/006-service-subpages/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── interview.md         # ответы Лады, источник утверждений из практики
├── contracts/
│   └── subpage.md
├── checklists/
│   ├── requirements.md
│   └── seo-and-data.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── i18n/
│   ├── paths.ts                  # реестр подстраниц, пути, языковые альтернативы
│   └── ui.ts                     # подписи, если понадобятся (крошки берут heading)
├── content.config.ts             # коллекция subpages; поле sugar у позиции прайса
├── content/
│   ├── services/{uk,ru}/{depilation,permanent}.md   # снять запрос подстраницы, ссылка на неё
│   └── subpages/{uk,ru}/{sugaring,brows}.md         # новые тексты
├── data/
│   ├── prices.json               # без изменений данных (цен пастой пока нет)
│   ├── price-list.ts             # чтение прайса способом: общий или паста
│   └── subpages.ts               # текст подстраницы, ошибка при отсутствии файла
├── components/
│   ├── ServicePage.astro         # принимает ссылку на страницу: категория или подстраница
│   ├── PriceGroup.astro          # способ цены, пустая группа не выводится
│   └── SeoHead.astro             # canonical, hreflang, og:locale, Service, BreadcrumbList для подстраницы
├── layouts/BaseLayout.astro      # пробрасывает ссылку на страницу в SeoHead
└── pages/
    ├── [category]/[subpage].astro
    └── ru/[category]/[subpage].astro

public/llms.txt

tests/
├── support/site.ts               # литералы подстраниц, запросы, ожидаемые предложения
└── routes.spec.ts, sitemap.spec.ts, seo-contract.spec.ts, voice.spec.ts, headings.spec.ts, llms.spec.ts

scripts/test-invalid-data.mjs     # новые случаи порчи и допустимые правки прайса
scripts/prices/sheet-layout.mjs   # строки таблицы для сумм пастой; тесты — sheet-layout.test.mjs

docs/
├── adr/adr-NNN-*.md              # номер из get-id; ADR-021 и ADR-023 получают строку Superseded by
├── specs/{routes,page-head,structured-data,content-model}.md
├── runbook-deploy.md             # список сброса кэша, строки пастой в §Changing the price list
└── seo/{core.csv,map.md}         # только через /seo
```

**Structure Decision**: подстраница — второй вид страницы услуги в той же механике, что категория: один реестр в `paths.ts`, один компонент `ServicePage.astro`, один `SeoHead.astro`. Отдельный компонент или отдельный шаблон заголовочной части не заводится: две копии состава страницы разошлись бы на первой правке.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `hreflang` подстраницы — uk, ru, `x-default` вместо трёх языков (`page-head.md` §Состав) | английской версии подстраниц нет: у ядра нет en-спроса (spec FR-003) | ссылка `en` на категорию — не эквивалент страницы, поисковик счёл бы альтернативу ошибочной; то же исключение уже принято ADR-023 для базы знаний |
| новое поле прайса `sugar` | цены пастой могут отличаться от общих (spec, Clarifications 2026-10-11) | отдельная группа «шугаринг» в прайсе — вторая запись цен тех же зон, против ADR-006 |
