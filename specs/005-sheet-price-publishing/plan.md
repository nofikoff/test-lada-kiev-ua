# Implementation Plan: Sheet-driven price publishing

**Branch**: `005-sheet-price-publishing` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-sheet-price-publishing/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Лада правит суммы в Google-таблице и ставит галочку «Опубликовать». Скрипт таблицы (Apps Script) запускает workflow GitHub Actions. Workflow читает таблицу через Sheets API, сверяет её с `src/data/prices.json` чистой функцией `reconcile`, пишет принятые суммы в файл, прогоняет все гейты, выкладывает `dist/` через rsync, ограниченный `rrsync`, сбрасывает кэш Cloudflare, отправляет commit в `main` и записывает статус, пометки и столбец «На сайте» обратно в таблицу. Тот же workflow — единственный путь выкладки сайта. Решения и отвергнутые варианты — [research.md](research.md).

**Amendment 2026-10-17** (FR-032, SC-009): перестройка ставит перед строками каждой группы строку-заголовок с русской подписью раздела сайта. `rebuild-sheet.mjs` импортирует `src/i18n/ui.ts` через удаление типов Node и передаёт подписи в чистую раскладку `sheet-layout.mjs`. Защита снимается с `D` по группам, `publish.mjs` сохраняет номер строки листа, `report.mjs` пишет «На сайте» и пометки по этим номерам. Решение и отвергнутые варианты — [research.md](research.md) §R12.

## Technical Context

**Language/Version**: Node ≥ 22.12 (ESM `.mjs`, как `scripts/*.mjs`); Apps Script V8 runtime для скрипта таблицы

**Primary Dependencies**: новых npm-зависимостей нет — Sheets API и Cloudflare API через встроенный `fetch`; в workflow — `actions/checkout`, `actions/setup-node`, `google-github-actions/auth` (версии фиксируются на этапе implement по актуальным релизам)

**Storage**: `src/data/prices.json` (источник сборки, ADR-006); Google-таблица — форма ввода сумм и снимок «На сайте»

**Testing**: `node --test` для чистых функций (`scripts/prices/*.test.mjs`, вне `tests/`, который принадлежит Playwright), с флагом удаления типов, потому что тест перестройки грузит `ui.ts` (§R12); существующие гейты без изменений; пробный прогон workflow на копии таблицы

**Target Platform**: GitHub-hosted runner `ubuntu-24.04` (закреплён: гейт типографики меряет строку в шрифтовом окружении образа, а `ubuntu-latest` переезжает на Ubuntu 26 19 октября 2026); сервер CentOS 7, rsync 3.1.2, `rrsync` в комплекте пакета нет (проверено 2026-10-12 по SSH)

**Project Type**: статический сайт + служебные скрипты сборки и CI

**Performance Goals**: от галочки до цены на сайте ≤ 10 мин в 9 из 10 публикаций (SC-001)

**Constraints**: публикация прерывается через 20 мин (FR-028); не больше одной публикации одновременно (FR-014); ни одного долгоживущего ключа Google (FR-022)

**Scale/Scope**: 73 позиции, 110 сумм (47 fixed, 63 строки вариантов от 23 позиций), 3 позиции `share` вне таблицы; диапазон сумм 200…8500 на 2026-10-12

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус |
|---|---|
| I. Zero client-side framework | соблюдён: в клиентскую сборку ничего не добавляется |
| II. Контент — это данные | соблюдён: цена остаётся в `prices.json` со схемой; таблица только пишет в него суммы, схема и гейты проверяют результат |
| III. URL — публичный контракт | соблюдён: адреса не меняются |
| IV. Страница самодостаточна | соблюдён: `Offer` в JSON-LD читает тот же `prices.json` |
| V. Готовность доказывается прогоном | соблюдён и усилен: выкладка без зелёных гейтов в workflow невозможна |
| Technology Constraints: выкладка директорией на Apache | соблюдена; меняется исполнитель (CI вместо машины автора) и учётная запись (`lada` вместо `root`), регламент переписывается |
| ADR-006 (один `prices.json`, порядок файла = порядок на сайте) | соблюдён: `reconcile` меняет только `amount`, порядок и состав проверяет на равенство |
| ADR-012 (тесты против собранного `dist/`) | соблюдён: workflow гоняет `test:publish` (полный `test:e2e` по флажку, ADR-027) против свежей сборки |
| ADR-013 (доля не попадает в `Offer`) | соблюдён: `share` вне таблицы |
| ADR-007 (словарь интерфейса — TS `as const`, JSON отвергнут) | соблюдён дополнением 2026-10-17: подписи групп таблица берёт из `ui.ts` импортом, словарь не переносится в JSON и не копируется |
| ADR-024 (статьи через git, без админки) | соблюдён: условие пересмотра ADR-024 — автор статей без git; цены — отдельное решение, таблица не CMS для статей |

ADRs without Affects: 23 (выборка по путям `adr_affects.py` ничего не нашла; строки выше — по заголовкам `docs/adr/`).

Повторная проверка после Phase 1: нарушений нет, Complexity Tracking пуст.

## Project Structure

### Documentation (this feature)

```text
specs/005-sheet-price-publishing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── sheet-layout.md
│   └── publish-workflow.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/prices/
├── sheet-layout.mjs        # prices.json ↔ строки таблицы: ключ строки, подпись варианта
├── reconcile.mjs           # чистая функция сверки (data-model.md §Reconcile)
├── sheets-api.mjs          # fetch-обёртка Sheets API v4
├── publish.mjs             # CLI шага workflow: таблица → prices.json + отчёт
├── report.mjs              # CLI шага workflow: статус, пометки, «На сайте» → таблица
├── rebuild-sheet.mjs       # CLI режима rebuild: строки, защита, проверка ввода, подсветка
├── sheet-layout.test.mjs
└── reconcile.test.mjs
scripts/purge-cache.mjs      # адреса из dist/ → Cloudflare purge пачками по 30
apps-script/
├── Code.js                 # onEdit-триггер галочки → workflow_dispatch
└── appsscript.json
.github/workflows/publish.yml
docs/runbook-deploy.md       # переписывается под workflow
docs/specs/content-model.md  # владение суммами и таблица
docs/adr/                    # два новых ADR
CLAUDE.md                    # гейт test:unit, строка карты
```

**Structure Decision**: служебный код — `scripts/`, как существующие `test-invalid-data.mjs` и `analyze-bundle.mjs`; модульные тесты рядом с кодом под `node --test`, потому что `tests/` — `testDir` Playwright и подхватил бы `*.test.mjs`. Скрипт таблицы хранится в репозитории как исходник и переносится в редактор Apps Script вручную (quickstart.md).

## Complexity Tracking

Нарушений нет.
