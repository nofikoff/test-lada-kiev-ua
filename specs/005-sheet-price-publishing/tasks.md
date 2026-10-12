---

description: "Task list for sheet-driven price publishing"
---

# Tasks: Sheet-driven price publishing

**Input**: Design documents from `/specs/005-sheet-price-publishing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: модульные тесты обязательны для чистых функций и CLI со подставным `fetch` (CLAUDE.md пользователя «Always write tests for new features»; plan.md §Testing). Сквозная проверка — quickstart.md, частично руками автора.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Задачи с пометкой «(автор)» требуют учётных записей автора (GCP, GitHub, Google, root на сервере) и агентом не выполняются

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: скрипт модульных тестов и lint для новых каталогов

- [X] T001 Add `"test:unit": "node --test scripts/prices/*.test.mjs scripts/purge-cache.test.mjs"` to package.json scripts
- [X] T002 [P] Add an eslint block for `apps-script/**/*.js` with Apps Script globals (`SpreadsheetApp`, `PropertiesService`, `UrlFetchApp`, `MailApp`, `ScriptApp`, `Session`, `Utilities`, `LockService`) and `sourceType: 'script'` in eslint.config.js
- [X] T003 [P] Add `npm run test:unit` to the gate list in CLAUDE.md §Гейты

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: модель строк таблицы, сверка, клиент Sheets API, перестройка таблицы — без них ни одна история не запускается

- [X] T004 [P] Write unit tests for sheet rows in scripts/prices/sheet-layout.test.mjs: ключ `<id>` у `fixed` и `<id>@<count>` у варианта; `share` пропущены; порядок = порядок prices.json, варианты — порядок массива; `name.ru` только у первой строки позиции; подписи `60 мин`, `1 сеанс`, `2 сеанса`, `5 сеансов`, `10 сеансов`; на реальном src/data/prices.json — 110 строк
- [X] T005 Implement scripts/prices/sheet-layout.mjs: `rowsFromPrices(prices)`, `variantLabel(unit, count)`, `applyAmounts(prices, amountsByKey)` (меняет только `amount`) и константы адресов из contracts/sheet-layout.md (`SHEET_NAME = 'Цены'`, `PUBLISH_CELL = 'B1'`, `STATUS_CELL = 'C1'`, `HEADER_ROW = 3`, `FIRST_DATA_ROW = 4`, столбцы A–F)
- [X] T006 [P] Write unit tests for reconcile in scripts/prices/reconcile.test.mjs по data-model.md §Reconcile: StructureMismatch (лишний, пропавший, переставленный ключ); Conflict (сумма в prices ≠ `published`) с перечнем ключей; InvalidAmount (`0`, `-5`, `12.5`, `'abc'`, пусто); скачок вверх (`> 2×`) и вниз (`< ½`) → Rejection; ровно `2×` и ровно `½` → Change; `allowLarge` снимает порог только своим ключам; неизвестный ключ в `allowLarge` → ошибка вызова; без изменений → пустые `applied` и `rejected`; `next` отличается от `prices` только суммами
- [X] T007 Implement scripts/prices/reconcile.mjs as a pure function `reconcile(prices, rows, { allowLarge })` returning `{ ok, next, applied, rejected }` or `{ ok: false, error: { kind, keys, message } }` in the check order of data-model.md §Reconcile
- [X] T008 [P] Implement scripts/prices/sheets-api.mjs: `getValues(range)`, `updateValues(data[])` (values.batchUpdate, `valueInputOption=RAW`), `batchUpdate(requests[])` (spreadsheets.batchUpdate), `getSpreadsheet()` (sheetId листа, protectedRanges) через `fetch`; токен и id таблицы из `GOOGLE_ACCESS_TOKEN` и `PRICES_SHEET_ID`; ошибка HTTP несёт код и тело ответа Google, но никогда — токен (FR-030); `fetch` инжектируется для тестов
- [X] T009 Implement scripts/prices/rebuild-sheet.mjs per contracts/sheet-layout.md: лист `Цены`, A1/B1/C1, заголовки строки 3, строки с 4; столбцы A и E скрыты, строки 1–3 закреплены; защита листа с исключениями `B1` и `D4:D<n>`, редакторы защиты — владелец и service account; проверка ввода `D4:D<n>` «целое от 1 до 100000», отклонять, подсказка «Только целое число гривен больше нуля»; галочка в B1; условное форматирование: `=F4<>""` красное выше `=AND(D4<>"",D4<>E4)` жёлтого; первая сборка — `D` = `E` = суммы prices.json

**Checkpoint**: `npm run test:unit` зелёный; перестройка собирает таблицу из prices.json

---

## Phase 3: User Story 1 - Lada changes a price and publishes it herself (Priority: P1) 🎯 MVP

**Goal**: галочка в таблице → новые суммы на сайте на трёх языках и в JSON-LD, статус в таблице

**Independent Test**: изменить одну сумму на копии таблицы, поставить галочку, проверить сумму на `/`, `/ru/`, `/en/`, на странице категории и в `Offer` (quickstart.md §5.2)

### Tests for User Story 1

- [X] T010 [P] [US1] Write tests for the publish CLI in scripts/prices/publish.test.mjs со подставным `fetch`: изменённые суммы попадают в записанный prices.json, остальное содержимое файла побайтно прежнее; отчёт `$RUNNER_TEMP/prices-report.json` содержит `applied`, `rejected`, `source`; тело commit по data-model.md §Commit message; коды выхода 0/3/1 по contracts/publish-workflow.md
- [X] T011 [P] [US1] Write tests for the report CLI in scripts/prices/report.test.mjs: для каждого исхода из data-model.md §Status transitions — точная строка в C1 с датой и временем по Киеву (`Europe/Kyiv`); при успехе E получает опубликованные суммы, F очищается; при «ошибка, сайт не изменён» E и F не трогаются
- [X] T012 [P] [US1] Write tests for cache purge URL derivation in scripts/purge-cache.test.mjs: на фикстурном дереве `dist/` каждый `index.html` → адрес каталога со слешем, `404.html`, `robots.txt`, `llms.txt`, `sitemap-*.xml`; `_astro/*` исключены; пачки по 30; хост `https://www.lada.kiev.ua`

### Implementation for User Story 1

- [X] T013 [US1] Implement scripts/prices/publish.mjs: читает `A4:E<n>` (`UNFORMATTED_VALUE`), вызывает `reconcile` со `allowLarge` из `ALLOW_LARGE_CHANGE`, пишет src/data/prices.json в формате `JSON.stringify(…, null, 2) + '\n'`, пишет отчёт и тело commit в `$RUNNER_TEMP`, выходит с кодом 0/3/1 (depends on T005, T007, T008)
- [X] T014 [US1] Implement scripts/prices/report.mjs: читает отчёт и `OUTCOME` (`started`, `published`, `failed-before-deploy`, `failed-after-deploy`), пишет C1, `E4:E<n>`, `F4:F<n>` одним `values.batchUpdate` (depends on T008)
- [X] T015 [P] [US1] Implement scripts/purge-cache.mjs: адреса из `dist/`, POST `zones/$CLOUDFLARE_ZONE_ID/purge_cache` пачками по 30, падает при `success: false`, токен не печатает
- [X] T016 [US1] Create .github/workflows/publish.yml по contracts/publish-workflow.md:
  - inputs `source`, `mode`, `allow_large_change`; `environment: production`; `permissions: { contents: write, id-token: write }`; `concurrency: { group: publish, cancel-in-progress: false, queue: max }`; `timeout-minutes: 20` на job и на шагах (сумма ≤ 18);
  - шаги: checkout `main`, setup-node 22 с кэшем npm, `npm ci`, кэш и установка браузеров Playwright, `google-github-actions/auth@v3` (`token_format: access_token`, scope `https://www.googleapis.com/auth/spreadsheets`), report `started`;
  - `publish.mjs`; commit локально и rebase на `origin/main`;
  - гейты `check`, `lint`, `test:unit`, `build`, `test:e2e`, `test:invalid-data`, `analyze`;
  - rsync `-rlt --delete --chmod=D755,F644`, `purge-cache.mjs`, проверки после выкладки из docs/runbook-deploy.md (`curl`);
  - push с одной повторной попыткой rebase;
  - report с `if: always()`; финальный шаг падает при коде 3.

  Версии actions зафиксированы на актуальных мажорных тегах. Секреты (FR-030): ключ SSH пишется в файл `600` в `$RUNNER_TEMP` и удаляется в конце; ни одного `set -x`; токен Google передаётся скриптам через `env`, а не аргументом командной строки.
- [X] T017 [US1] Create apps-script/Code.js and apps-script/appsscript.json:
  - `setup()` спрашивает PAT, кладёт его в `PropertiesService.getUserProperties()` и создаёт установленные триггеры `onEdit` → `onPublishEdit` и по времени раз в 10 мин → `watchdog`;
  - `onPublishEdit(e)` реагирует только на `Цены!B1 = TRUE`: dispatch по contracts/publish-workflow.md §Dispatch, снять галочку, записать C1, при 401/403/404 написать письмо автору через `MailApp`;
  - `watchdog()` меняет статус «идёт с ЧЧ:ММ» старше 25 мин на «ошибка, Руслан уведомлён» и пишет письмо (FR-028);
  - `onPublishEdit` читает заголовок ответа `github-authentication-token-expiration`; если до истечения меньше 14 дней, шлёт автору письмо не чаще раза в сутки (FR-029, research R11).

  Адреса ячеек — те же, что в contracts/sheet-layout.md.

**Checkpoint**: пробный прогон workflow зелёный; галочка на копии таблицы запускает workflow

---

## Phase 4: User Story 2 - A mistake never reaches the site (Priority: P1)

**Goal**: скачок, неверный ввод, сбой гейта и правка структуры не меняют сайт; Лада видит причину, автор получает письмо

**Independent Test**: quickstart.md §2 и §5.3 на копии таблицы

### Tests for User Story 2

- [X] T018 [P] [US2] Extend scripts/prices/report.test.mjs: отклонённая строка получает в F текст «изменение больше чем вдвое, не опубликовано: <было> → <стало>», статус «опубликовано ДД.ММ ЧЧ:ММ, кроме N позиций — см. пометки», E отклонённой строки прежний
- [X] T019 [P] [US2] Extend scripts/prices/publish.test.mjs: `ALLOW_LARGE_CHANGE` при `SOURCE=sheet` → код 1 и сообщение (FR-026); StructureMismatch и Conflict → код 1, prices.json не записан

### Implementation for User Story 2

- [X] T020 [US2] Implement the `SOURCE=sheet` guard for `ALLOW_LARGE_CHANGE` and the rejection text in scripts/prices/publish.mjs and scripts/prices/report.mjs
- [X] T021 [US2] Wire failure outcomes in .github/workflows/publish.yml: код 1 у publish.mjs → report `failed-before-deploy` без rsync; сбой любого шага от rsync до push → report `failed-after-deploy`; код 3 → успешная выкладка и падение финального шага, чтобы GitHub прислал письмо (FR-016)
- [ ] T022 [US2] (автор) Set the sheet's sharing setting «Редакторы могут изменять разрешения и открывать доступ» to off and share the sheet with Lada as editor (FR-006); выполнить quickstart.md §2 под учётной записью-редактором

**Checkpoint**: все ошибки тестового набора SC-004 остаются вне сайта

---

## Phase 5: User Story 3 - Developer changes the price list structure (Priority: P2)

**Goal**: перестройка таблицы после правки структуры в репозитории сохраняет суммы Лады

**Independent Test**: добавить позицию в копию prices.json, выполнить перестройку, сравнить таблицу (spec.md §US3)

### Tests for User Story 3

- [X] T023 [P] [US3] Write tests for rebuild merging in scripts/prices/rebuild-sheet.test.mjs: сохранившийся ключ с `published` = prices.json сохраняет `D` Лады; ключ с расхождением (правка в git) получает `D` = `E` = prices.json; новый ключ — `D` = `E` = prices.json; исчезнувший ключ пропадает; порядок — по prices.json

### Implementation for User Story 3

- [X] T024 [US3] Extract the merge as a pure function `mergeRows(prices, currentSheetRows)` in scripts/prices/sheet-layout.mjs and use it in scripts/prices/rebuild-sheet.mjs
- [X] T025 [US3] Add the hint «перестрой таблицу: Actions → publish → mode rebuild-sheet» to the Conflict and StructureMismatch messages in scripts/prices/reconcile.mjs

**Checkpoint**: правка структуры → перестройка → публикация проходит без конфликта

---

## Phase 6: User Story 4 - One publication path for everyone (Priority: P3)

**Goal**: тот же workflow выкладывает изменения автора; пробный прогон ничего не меняет; выкладка без root

**Independent Test**: quickstart.md §4 и §5.1

### Implementation for User Story 4

- [X] T026 [US4] Implement `mode: dry-run` (`PRICES_SHEET_ID_DRY_RUN`, без commit, rsync, сброса кэша и report) and `mode: rebuild-sheet` (только rebuild-sheet.mjs) in .github/workflows/publish.yml
- [X] T027 [US4] (автор, root на сервере) Install rrsync from rsync 3.1.2 sources to /usr/local/bin/rrsync and create /home/lada/.ssh/authorized_keys (`700`/`600`, `lada:lada`) with `command="/usr/local/bin/rrsync /home/lada/public_html",restrict` по quickstart.md §1.1; агент готовит пару ключей ed25519 в docs/_local/ и команды
- [ ] T028 [US4] (автор) Create the GCP project, Sheets API, keyless service account, WIF pool and provider with condition `assertion.repository == 'nofikoff/test-lada-kiev-ua' && assertion.ref == 'refs/heads/main'`, the two sheets shared with the service account, GitHub environment `production` (main only) with secrets and variables of contracts/publish-workflow.md, the PAT (`Actions: Read and write`, один репозиторий) and the Apps Script install by quickstart.md §1.2–§1.6
- [X] T029 [US4] Rewrite docs/runbook-deploy.md: единственный путь — Actions → publish (ручной запуск, dry-run, rebuild-sheet, `allow_large_change`); откат — revert в `main` и ручной запуск; что делать при каждом статусе FR-015; ротация PAT; ручная выкладка от root удаляется (Assumptions «Переходный период»)

**Checkpoint**: сайт выкладывается только через workflow

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 [P] Write ADR «price input via Google Sheet, not a CMS or admin» in docs/adr/ (номер из get-id), Rejected — из research.md §R1, §R4
- [X] T031 [P] Write ADR «single CI deploy path, no manual root rsync» in docs/adr/ (номер из get-id), Rejected — из research.md §R5, §R6
- [X] T032 [P] Update docs/specs/content-model.md §Инварианты: суммы принадлежат таблице, структура — репозиторию; правка суммы в git в обход таблицы останавливает публикацию; ссылки на оба ADR
- [X] T033 [P] Add CLAUDE.md map rows: `scripts/prices/`, `.github/workflows/publish.yml`, `apps-script/` → docs/specs/content-model.md и docs/runbook-deploy.md; ADR в «Уже отвергнуто»; правило «всё в `main` уходит на сайт при следующей публикации» в шапке (FR-020)
- [X] T034 Run all local gates (`npm run check`, `lint`, `test:unit`, `build`, `test:e2e`, `test:invalid-data`, `analyze`)
- [ ] T035 (автор + агент) Run quickstart.md §3–§5 and record in research.md §R10: время публикации (SC-001), время отката revert + ручной запуск (SC-008), что перестройка создала защиту листа с нужным списком редакторов (R8)
- [ ] T036 Update memory notes deploy-target-ssh and cloudflare-cache-purge to the workflow path once T035 passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1** зависит от Phase 2. **US2** дополняет файлы US1 (publish, report, workflow), поэтому идёт после US1. **US3** зависит только от Phase 2. **US4** зависит от workflow US1.
- Задачи «(автор)» T022, T027, T028 не блокируют код, но блокируют T035.

### Parallel Opportunities

- T002, T003 параллельно с T001.
- T004 ∥ T006 ∥ T008; T005 после T004, T007 после T006.
- T010 ∥ T011 ∥ T012 ∥ T015.
- T030 ∥ T031 ∥ T032 ∥ T033.

## Parallel Example: User Story 1

```bash
Task: "Write tests for the publish CLI in scripts/prices/publish.test.mjs"
Task: "Write tests for the report CLI in scripts/prices/report.test.mjs"
Task: "Write tests for cache purge URL derivation in scripts/purge-cache.test.mjs"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

Phase 1 → Phase 2 → Phase 3. Проверка: пробный прогон и одна публикация с копии таблицы. Без US2 пометки и письма неполные, поэтому Ладе доступ выдаётся только после Phase 4.

### Incremental Delivery

US1 → US2 (доступ Ладе) → US3 → US4 (переход на единственный путь, регламент) → Polish.

## Notes

- `test:unit` покрывает `scripts/prices/*.test.mjs` и `scripts/purge-cache.test.mjs` — T001 включает оба пути.
- T027, часть агента, сделана 2026-10-12: пара ключей и `known_hosts` сервера — `docs/_local/deploy/`. Установка `rrsync` и `authorized_keys` на сервере — за автором.
- Измерено 2026-10-12 на копии `src/data/prices.json`: `publish.mjs` с подставной таблицей из `mergeRows` даёт 110 строк, код 0, одну изменённую строку файла при одной правке.
- Commit — одна задача или логическая группа.
