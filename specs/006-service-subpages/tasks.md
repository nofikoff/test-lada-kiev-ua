---

description: "Task list for service subpages: sugaring and brow permanent makeup"
---

# Tasks: Service subpages for sugaring and brow permanent makeup

**Input**: Design documents from `specs/006-service-subpages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/subpage.md, quickstart.md

**Tests**: включены — правило репозитория «новая возможность приходит с проверкой» и гейты по собранному сайту (constitution §V, ADR-012). Проверка пишется в том же шаге, что её реализация: шаг закрывается зелёным гейтом, поэтому красная проверка не переживает свой шаг.

**Organization**: по пользовательским историям spec.md: US1 шугаринг (P1), US2 брови (P1), US3 передача запросов категориями (P2), US4 машинные читатели (P3). Шаги `### Step N.M` — единицы исполнения `/orchestrate-plan`; задачи US4 стоят в Step 2.3 (причина — там же).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых задач)
- **[Story]**: к какой истории относится задача

## Path Conventions

Статический сайт Astro: код в `src/`, проверки в `tests/` (Playwright по `dist/`), порча данных в `scripts/test-invalid-data.mjs`, контракты в `docs/specs/`.

---

## Phase 1: Setup

**Purpose**: ветка, решение и ответы Лады, без которых нельзя писать тексты

### Step 1.1: Feature branch

<!-- plan-meta:
skip: true  # main session before the run: interview is done, the branch is created by hand
-->

- [x] T003 [P] Передать автору вопросы интервью из research R11 (шугаринг 8, брови 8) одним сообщением; ответы, когда придут, записать дословно в `specs/006-service-subpages/interview.md` с датой и пометкой «со слов Лады через автора» — получены 2026-10-13; четыре уточняющих вопроса там же, тексты их не ждут
- [x] T045 Основная сессия до прогона: `git switch -c 006-service-subpages --no-track main`. Весь код пакета идёт в этой ветке: всё, что лежит в `main`, уходит на сайт со следующей галочкой Лады (ADR-026)

### Step 1.2: Decision record

<!-- plan-meta:
allowed_paths:
  - "docs/**"
  - "CLAUDE.md"
gate_commands:
  lint: "npm run lint"
  test_quick: "npm run lint"
-->

- [x] T001 Написать `docs/adr/adr-028-commercial-service-subpages.md` по `docs/adr/adr-template.md` (номер получен из get-id 2026-10-17, имя `commercial-service-subpages`): заголовок на английском, `> **Supersedes:** ADR-021 (частично — коммерческие подстраницы), ADR-023 (частично — пункт Rejected о /sugaring/ и /powder-brows/)`; Context из spec §Context (цифры Keyword Planner, Search Console, выдача — research R1); Decision «отдельная коммерческая страница допускается, когда выдача кластера занята специализированными страницами, а категория отдаёт ей запрос; адрес `/<категория>/<slug>/`, языки — как у кластера ядра»; Consequences и `- **Rejected: …**` — плоские адреса, перенацеливание категорий без новых адресов, ожидание Search Console, версия en (research R2, R1, spec §Context)
- [x] T002 Добавить строку `> **Superseded by:** [ADR-028](adr-028-commercial-service-subpages.md) (частично — …)` в `docs/adr/adr-021-no-query-landing-pages.md` и `docs/adr/adr-023-knowledge-base-pages-for-informational-queries.md` (тело смёрженных ADR не править); в `CLAUDE.md` §Что открыть дописать ссылку на ADR-028 в строке про ADR-021 и ADR-023; в `docs/specs/page-head.md` §Целевые запросы — последний пункт со ссылкой на ADR-028

**Checkpoint**: ветка создана; решение записано; ответы интервью в `interview.md`

---

## Phase 2: Foundational

**Purpose**: реестр, модель данных, чтение прайса способом, общий шаблон, заголовочная часть и всё, что сайт целиком говорит о своих адресах, — на этом стоят US1–US4

**⚠️ CRITICAL**: ни одна история не начинается до конца этой фазы

### Step 2.1: Price method and page registry

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "public/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run check && npm run build"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
-->

- [x] T006 Добавить реестр в `src/i18n/paths.ts`: `serviceSubpages` (`sugaring`: `parent: 'depilation'`, `locales: ['uk','ru']`, `groups: ['womenDepilation','combos','menDepilation','menCombos']`, `method: 'sugar'`; `brows`: `parent: 'permanent'`, `locales: ['uk','ru']`, `groups: ['permanentBrows']`, `method: 'base'`), типы `ServiceSubpage`, `PriceMethod = 'base' | 'sugar'`, `ServicePageRef = { category } | { category, subpage }`; `pagePath(locale, ref?)` → `<префикс>/<category>/<subpage>/`; `canonicalUrl(locale, ref?)`; `languageAlternates(ref?)` — только языки страницы, `x-default` украинский; `subpageStaticPaths(locale)` — пары `{ category, subpage }` для подстраниц, где есть `locale`. Второй аргумент `pagePath`, `canonicalUrl` и `languageAlternates` меняется с категории на `ServicePageRef`, поэтому в этом же шаге все вызовы с категорией переходят на `{ category }`: `src/components/SeoHead.astro:53-54`, `src/components/ServicesOverview.astro:45`, `src/components/Gallery.astro:83` (сверено 2026-10-17; перед правкой — `grep` по `src/`). Правила данных «каждая группа принадлежит категории `parent`» и «`uk` есть в `locales`» (украинский — `x-default`) проверяются при загрузке модуля и роняют сборку
- [x] T007 Расширить `src/content.config.ts`: у `prices` необязательное `sugar: fixed | variants | false` (переиспользовать ветки `priceValue`; `share` запрещён), `superRefine`: `sugar` есть, а группы нет в `groups` ни одной подстраницы со способом `sugar` (реестр T006) — ошибка с путём `sugar`; коллекция `subpages` — `glob` `+(uk|ru)/+(sugaring|brows).md` из `./src/content/subpages`, схема `subpage: z.enum(slugs)`, `title: z.string().min(1)`, `description: z.string().min(120).max(160)`, `heading: z.string().min(1)`
- [x] T009 Расширить `src/data/price-list.ts`: `pricesOfGroups(groups, method = 'base')` возвращает те же записи `PriceEntry`, у которых `data.price` заменён ценой способа — `base` → `price`; `sugar` → `sugar === false` исключается, иначе `sugar ?? price`; порядок файла сохраняется (docs/specs/content-model.md §Две ловушки). Форма результата не меняется: `PriceGroup.astro` (`tiersOf(data.price)`) и `SeoHead.astro` читают его без правок (data-model §Price item)
- [x] T010 `src/components/PriceGroup.astro`: проп `method` (по умолчанию `base`), читать `pricesOfGroups([group], method)`; при пустом списке не выводить группу вовсе. Тот же шаг, что T009: правки одной цепочки чтения

**Checkpoint**: `npm run check` и `npm run build` зелёные; сайт собирается без изменений в `dist/`

### Step 2.2: Price sheet rows for sugar amounts

Spec FR-004c, data-model §Sheet row. Шаг строится поверх пакета 005 Phase 8 (заголовки групп), слитого в `main` 2026-10-17: `rowsFromPrices` кладёт `group` в каждую строку, `sheetLines(rows, labels)` бросает ошибку на группе не подряд, отчёт `publish` → `report` несёт `line` у каждой строки.

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "specs/005-sheet-price-publishing/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run test:unit"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
-->

- [x] T043 `scripts/prices/sheet-layout.test.mjs`: позиция с `sugar` вида `fixed` даёт строку `<id>/sugar` с вариантом `сахар` сразу за строкой общей цены, с пустым `name` и `group` своей позиции; `sugar` вида `variants` — строки `<id>/sugar@<count>` с вариантом `сахар, 60 мин`; `sugar: false` строк не даёт; `applyAmounts` меняет сумму пастой по её ключу и не трогает общую; неизвестный ключ `<id>/sugar` у позиции без `sugar` — ошибка `price list has no row`; `sheetLines` на строках с ценой пастой даёт столько же заголовков, сколько без неё, и не бросает ошибку «группа не подряд». В `scripts/prices/publish.test.mjs` — строка пастой получает свой `line` в отчёте. Литерал «167 rows» не меняется: в настоящем прайсе `sugar` нет. В `scripts/prices/reconcile.test.mjs` — случай на фикстуре с `sugar`: изменённая в таблице сумма пастой попадает в `next[i].sugar.amount`, общая не меняется. В `scripts/prices/rebuild-sheet.test.mjs` (или тесте `mergeRows` в `sheet-layout.test.mjs`) — новый ключ `<id>/sugar` получает сумму из репозитория. Сначала краснеет
- [x] T044 `scripts/prices/sheet-layout.mjs`: один обход сумм позиции — общая цена, затем цена пастой — для `rowsFromPrices` и `applyAmounts`, чтобы вид суммы знали не два места, а одно; `rowKey(id, count, method?)`; подпись варианта пастой — `сахар` / `сахар, <variantLabel>`; строка пастой несёт `group` своей позиции. Docblock модуля — ссылка на data-model §Sheet row, без пересказа. `rebuild-sheet.mjs`: столбец `Вариант` (индекс 2) — в `WRAPPED_COLUMNS`, иначе `сахар, 60 мин` обрезается в 80 px; та же строка в `specs/005-sheet-price-publishing/contracts/sheet-layout.md` (перенос — у `B`, `C` и `F`). `publish.mjs`, `reconcile.mjs`, `report.mjs`, `apps-script/Code.js` не меняются: ключ для них непрозрачен, `line` они получают по любой строке с непустым ключом (сверено 2026-10-13, перепроверить по коду 005 Phase 8 в начале шага)

**Checkpoint**: `npm run test:unit` зелёный с T043

### Step 2.3: Shared service page, routes and machine readers

Маршруты T013 меняют то, что сайт говорит о своих адресах целиком: карта сайта сразу отдаёт подстраницы с двумя альтернативами, а `allPages` из T004 входит в проверки `tests/sitemap.spec.ts`, `tests/llms.spec.ts`, `tests/voice.spec.ts` §карта запросов и проверки T018. Поэтому задачи US4 (T031–T033), T018 и запросы подстраниц стоят в этом шаге: без них шаг не проходит свой гейт.

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "public/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/routes.spec.ts tests/sitemap.spec.ts tests/llms.spec.ts tests/voice.spec.ts tests/seo-contract.spec.ts --project=desktop"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
-->

- [x] T004 Обновить `tests/support/site.ts`: литерал `SERVICE_SUBPAGES` (`sugaring` → родитель `depilation`, группы `womenDepilation`, `combos`, `menDepilation`, `menCombos` — без триммера, способ `sugar`; `brows` → `permanent`, `permanentBrows`, способ `base`; языки `uk`, `ru`); `subpagePages` с путями `/depilation/sugaring/`, `/ru/depilation/sugaring/`, `/permanent/brows/`, `/ru/permanent/brows/`; `servicePages` = категории + подстраницы; `allPages` — девятнадцать, `builtPages` — двадцать два; `QUERIES`: `depilation/sugaring` uk `[/шугаринг/i]`, ru `[/шугаринг/i]`; `permanent/brows` uk `[/перманентн\S* макіяж\S* брів/i, /пудров\S* бров/i]`, ru `[/перманентн\S* макияж\S* бровей/i, /пудров\S* бров/i]`; `expectedOfferCount` принимает категорию или подстраницу и считает цену способом (`sugar === false` — 0, `sugar ?? price`); `priceRange` учитывает суммы `sugar`; тип `PriceRecord` получает `sugar?: PriceValue | false`; комментарии с числами страниц привести к новым
- [x] T008 [P] Создать `src/data/subpages.ts`: `subpageCopy(locale, subpage)` — `getEntry('subpages', '<locale>/<slug>')`, при отсутствии `throw new Error('нет текста подстраницы: src/content/subpages/<locale>/<slug>.md')`; язык вне `locales` реестра — ошибка «текст подстраницы на языке, которого у неё нет»
- [x] T011 `src/components/ServicePage.astro`: проп `page: ServicePageRef` вместо `category`; текст — `serviceCopy` или `subpageCopy`; группы и способ — из категории или реестра; крошки подстраницы «главная / категория (ссылка, её `heading`) / подстраница (`aria-current="page"`)»; сноска `permanentNote` (обновление до 6 месяцев — 80%) — для `permanent` и для `brows`; `[data-service-copy]` без изменений. Обновить вызов `<ServicePage category=…>` в трёх маршрутах категорий — `src/pages/[category].astro`, `src/pages/ru/[category].astro`, `src/pages/en/[category].astro` — на `page={{ category }}`
- [x] T012 `src/components/SeoHead.astro` и `src/layouts/BaseLayout.astro`: проп `page?: ServicePageRef` вместо `category`; `canonical`, `hreflang`, `x-default` из `languageAlternates(page)`; `og:locale:alternate` — только языки страницы; `title`/`description` из текста подстраницы; `offers` из `pricesOfGroups(groups, method)`; `BreadcrumbList` из трёх элементов для подстраницы (вторая — категория с её `heading` и адресом); `priceRange` — по всем суммам `price` и `sugar` (кроме `false`), долевые не участвуют. Обновить все вызовы `<BaseLayout category=…>` в тех же трёх маршрутах категорий на `page={{ category }}`
- [x] T013 Создать маршруты `src/pages/[category]/[subpage].astro` (`locale = 'uk'`, `getStaticPaths = () => subpageStaticPaths('uk')`) и `src/pages/ru/[category]/[subpage].astro` (`ru`); файла под `en` не создавать — комментарий в uk-маршруте одной строкой: почему (spec FR-003)
- [x] T014 Создать `src/content/subpages/{uk,ru}/{sugaring,brows}.md`. Frontmatter окончательный (data-model §Subpage copy), потому что карта запросов `tests/voice.spec.ts` обходит `allPages`: `title` ≤ 70 знаков формы `… — Lada N`; `title`, `heading` и `description` содержат запрос страницы из `QUERIES` (T004); `description` 120–160 знаков, запрос в первой половине; пара «заголовок + описание» уникальна. Тело — одна строка «черновик»; T019, T020, T024, T025 заменяют его целиком. Проверки объёма, уникальности абзацев и первого абзаца до Step 3.1 обходят `categoryPages`, как сейчас, поэтому черновое тело их не краснит
- [x] T005 [P] Дописать в `scripts/test-invalid-data.mjs` случаи порчи: `sugar` у позиции `permanent-brows-powder` (ожидание — сообщение с `sugar`), `sugar` у `men-trimmer-underarms` (группа триммера, ожидание `sugar`), `sugar` вида `share` у `women-depilation-underarms` (ожидание `sugar`), удалённый `src/content/subpages/uk/sugaring.md` (ожидание `нет текста подстраницы: src/content/subpages/uk/sugaring.md`); и раздел допустимых правок, после которых проверяется `dist/`. Позиция — `women-depilation-upper-lip` («Ніс / Вуха / Брови / Шия», 200 на 2026-10-13): её название в прайсе единственное, а «Пахви» встречается ещё в комплексах и мужском прайсе. `sugar: {"kind":"fixed","amount":999}` → `999` в `dist/depilation/sugaring/index.html` и нет `999` в `dist/depilation/index.html` (в настоящем прайсе суммы 999 нет); `sugar: false` → в `dist/depilation/sugaring/index.html` нет «Ніс / Вуха / Брови / Шия», в `dist/depilation/index.html` есть. Название и сумму брать из `prices.json` в момент записи: прайс правит Лада. Откат — тем же `withCorruption`; итоговая восстановительная сборка остаётся
- [x] T018 [US1] Прогнать `tests/headings.spec.ts`, `tests/contrast.spec.ts`, `tests/brand-marks.spec.ts`, `tests/interaction.spec.ts`, `tests/typography.spec.ts` по 22 собранным страницам из `builtPages`; проверку, которая предполагает у каждой страницы категорию из `SERVICE_CATEGORIES`, перевести на `servicePages`. Результат — зелёный прогон и перечень правленых проверок в отчёте
- [x] T031 [P] [US4] `tests/sitemap.spec.ts`: ровно девятнадцать адресов (название проверки и сообщения); проверка «три языковые альтернативы» — у адреса подстраницы `xhtml:link` ровно uk-UA и ru-UA, без `en`, у остальных — три, как сейчас
- [x] T032 [P] [US4] `tests/llms.spec.ts`: перечень — девятнадцать адресов (название проверки)
- [x] T033 [US4] `public/llms.txt`: в §Pages — строки подстраниц в украинском блоке («Sugaring», «Brow permanent makeup» с одной строкой описания) и в русском перечне; фраза «The same fifteen pages exist in every language» → пятнадцать страниц во всех трёх языках плюс две подстраницы только на uk и ru; строка карты сайта «all fifteen pages» → девятнадцать; строка 27 «touch-up within 6 months costs 80% of the original price» называет обе услуги — «a correction 28–60 days after the procedure costs 50% of it; a refresh within 6 months costs 80%» (research R14: 50% — прайс, 80% — сноска `permanentNote`)

**Checkpoint**: `npm run build` собирает четыре адреса подстраниц; `npm run test:e2e` и `npm run test:invalid-data` зелёные, включая допустимые правки прайса из T005

---

## Phase 3: User Story 1 — Sugaring page (Priority: P1) 🎯 MVP

**Goal**: `/depilation/sugaring/` и `/ru/depilation/sugaring/` — страница целиком про шугаринг с прайсом депиляции по ценам пастой

**Independent Test**: собрать сайт; оба адреса 200, запрос «шугаринг у Києві» / «шугаринг в Киеве» в `<title>`, `<h1>`, описании и первом абзаце; прайс четырёх групп (женская, женские комплексы, мужская, мужские комплексы), групп триммера нет; крошки ведут на `/depilation/`; JSON-LD — `Service` с предложениями по ценам пастой и `BreadcrumbList` из трёх

### Step 3.1: Sugaring page

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "public/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/routes.spec.ts tests/voice.spec.ts tests/seo-contract.spec.ts --project=desktop"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
tier: strong
-->

**Tests:**

- [x] T015 [P] [US1] `tests/routes.spec.ts`: `/depilation/sugaring/`, `/ru/depilation/sugaring/` — 200; `/en/depilation/sugaring/`, `/sugaring/` — 404; `/depilation/sugaring` без слеша — 200 и `canonical` на форму со слешем, по образцу §форма адреса со слешем того же файла (301 делает Apache, `astro preview` его не повторяет; contracts/subpage.md §Routes)
- [x] T016 [P] [US1] `tests/voice.spec.ts`: цикл «первый абзац называет запрос» — по `categoryPages` и подстраницам шугаринга (`subpagePages` с `subpage === 'sugaring'`); на весь `servicePages` его переводит T023, когда тексты бровей написаны
- [x] T017 [P] [US1] `tests/seo-contract.spec.ts`: блок подстраниц по `subpagePages` — `canonical` на себя, `hreflang` ровно `uk`, `ru`, `x-default` (украинский), без `en`; `og:locale:alternate` только второй язык; JSON-LD `Service` с числом `Offer` = `expectedOfferCount(subpage)`, без нулевых цен; `BreadcrumbList` из трёх с адресом категории вторым; видимые крошки — ссылка на главную своего языка, ссылка на категорию своего языка, последний элемент с `aria-current="page"` (FR-011, SC-004); переключатель языка ведёт на главные языков, как на категории (FR-013). Существующие проверки альтернатив обходят `homePages` (строка 85) и `categoryPages` (строка 268) и подстраниц не касаются. На странице шугаринга — ровно четыре раздела прайса с подписями групп `womenDepilation`, `combos`, `menDepilation`, `menCombos` из словаря, без подписей групп триммера (spec FR-004); упорядоченный список названий позиций в разделах прайса совпадает с упорядоченным списком `Offer.name` (у варианта — часть до « — », позиция с вариантами — один раз; долевые позиции `Offer` не дают и из списка прайса исключаются) (FR-004a). Сравнивается упорядоченный список, не множество: «Пахви» стоит и в женской, и в мужской группе. Блок объёма (≥ 400 слов) и уникальности абзацев внутри языка — по тем же страницам, что T016; на весь `servicePages` его переводит T023

**Implementation:**

- [x] T019 [US1] Тело `src/content/subpages/uk/sugaring.md`: ≥ 400 слов, первый абзац с «шугаринг у Києві», разделы `##` — паста, длина волос и подготовка, зоны и длительность сеанса (женщины, комплексы, мужчины), после сеанса и как часто повторять, чем отличается от воска, кому не делаем, запись; утверждения из практики — только из `specs/006-service-subpages/interview.md` по его §How the answers reach the pages; без имён мастеров кроме Лады (ADR-019); без «майстерня» (docs/specs/voice.md); frontmatter из T014 правится, только если текст меняет формулировку, и с теми же ограничениями
- [x] T020 [US1] Тело `src/content/subpages/ru/sugaring.md` — перевод T019 по смыслу, запрос «шугаринг в Киеве»; те же ограничения. Блокирован T019

**Checkpoint**: US1 проходит свои проверки; вместе с Phase 2 это MVP

---

## Phase 4: User Story 2 — Brow permanent makeup page (Priority: P1)

**Goal**: `/permanent/brows/` и `/ru/permanent/brows/` — страница перманента бровей с прайсом группы бровей

**Independent Test**: оба адреса 200; «перманентний макіяж брів» и «пудрові брови» / «перманентный макияж бровей» и «пудровые брови» в `<title>`, `<h1>`, описании, первом абзаце; «татуаж брів/бровей» в тексте; коррекция показана долей и не даёт `Offer`

### Step 4.1: Brow permanent makeup page

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "public/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/routes.spec.ts tests/voice.spec.ts tests/seo-contract.spec.ts --project=desktop"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
tier: strong
-->

**Tests:**

- [ ] T021 [P] [US2] `tests/routes.spec.ts`: `/permanent/brows/`, `/ru/permanent/brows/` — 200; `/en/permanent/brows/`, `/powder-brows/` — 404; `/permanent/brows` без слеша — 200 и `canonical` на форму со слешем (как T015)
- [ ] T022 [P] [US2] `tests/voice.spec.ts`: проверка «татуаж брів|татуаж бровей» в `[data-service-copy]` страниц бровей (`QUERIES` бровей уже в T004)
- [ ] T023 [P] [US2] `tests/seo-contract.spec.ts`: для `brows` число `Offer` = `expectedOfferCount` страницы бровей (на 2026-10-17 это 2: пудровые и перекрытие; коррекция — доля), подпись доли коррекции в прайсе страницы — из `prices.json`, не литералом: суммы и доли правит Лада. Цикл «первый абзац называет запрос» (`tests/voice.spec.ts`, T016) и блок объёма и уникальности абзацев (T017) перевести на весь `servicePages` — категории и обе подстраницы вместе. Проверку длины строки в `tests/typography.spec.ts` распространить на страницы бровей (в 3.1 она получила только шугаринг). Число `Offer` бровей уже проверяет блок подстраниц из T017 (`expectedOfferCount(subpage)`) — второй такой проверки не заводить

**Implementation:**

- [ ] T024 [US2] Тело `src/content/subpages/uk/brows.md`: ≥ 400 слов; первый абзац с «перманентний макіяж брів у Києві» и «пудрові брови»; «татуаж брів» в тексте; разделы — пудровая техника, как проходит процедура и сколько длится, подготовка и уход, заживление (около месяца; корочки, шелушение, посветление — разбивку по дням не писать: Лада её не дала), коррекция через 28–60 днів (срок — из названия позиции в прайсе) и оновлення до 6 місяців — две разные услуги, обе называются; их доли текст не повторяет: 50% показывает прайс, 80% — сноска `permanentNote` (T011), а доли принадлежат прайсу и словарю. Позиция «Перекриття старого перманенту, оновлення, виправлення» — отдельная услуга прайса; срок, после которого обновление переходит в неё, Лада не называла, и текст его не пишет; сколько держится, перекриття старого перманенту, кому не робимо; практика — только из `interview.md`; те же ограничения, что T019
- [ ] T025 [US2] Тело `src/content/subpages/ru/brows.md` — по смыслу T024, запрос «перманентный макияж бровей в Киеве», «пудровые брови», «татуаж бровей». Блокирован T024

**Checkpoint**: US1 и US2 проходят независимо

---

## Phase 5: User Story 3 — Categories hand their queries over (Priority: P2)

**Goal**: категории uk и ru больше не держат запрос подстраниц и ведут на них

**Independent Test**: в `<title>`, `<h1>`, описании `/depilation/`, `/ru/depilation/` нет «шугаринг»; у `/permanent/`, `/ru/permanent/` нет формулировок запроса бровей; в тексте каждой — ссылка на подстраницу своего языка не ниже второго раздела; каждый текст ≥ 400 слов

### Step 5.1: Categories hand their queries over

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "docs/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/voice.spec.ts tests/seo-contract.spec.ts tests/content-parity.spec.ts --project=desktop"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
tier: strong
-->

**Tests:**

- [ ] T026 [P] [US3] `QUERIES` в `tests/support/site.ts`: `depilation` uk `[/депіляці/i, /воск/i]`, ru `[/депиляци/i, /воск/i]`; `permanent` без изменений; `en` без изменений
- [ ] T027 [P] [US3] `tests/voice.spec.ts`: для `depilation` uk и ru — нет `/шугаринг/i` в `<title>`, `<h1>`, описании; для `permanent` uk и ru — нет `/(перманент|татуаж|пудров)[^.]{0,40}бр(ів|ов)|бр(ів|ов)[^.]{0,40}(перманент|татуаж|пудров)/i` там же (spec FR-010 — запрет на формулировку, не на слово); в `[data-service-copy]` категории — `a[href="<путь подстраницы своего языка>"]`, ровно одна, не в первом абзаце и до третьего `h2` текста (spec FR-009, FR-010: «не ниже второго раздела»); тест «шугаринг назван» в тексте категории оставить

**Implementation:**

- [ ] T028 [US3] `src/content/services/uk/depilation.md` и `src/content/services/ru/depilation.md`: `title`, `description`, `heading` и первый абзац — «депіляція у Києві» + «воскова депіляція» / «депиляция в Киеве» + «депиляция воском», без «шугаринг»; абзацы, целиком про пасту, удалить (их содержание уже в T019/T020 своими словами — повтор абзацев запрещён); добавить абзац со ссылкой на `/depilation/sugaring/` (`/ru/depilation/sugaring/`) не ниже второго раздела — после первого абзаца и до третьего `h2`; объём ≥ 400 слов в каждом. `en/depilation.md` не трогать
- [ ] T029 [US3] `src/content/services/uk/permanent.md` и `src/content/services/ru/permanent.md`: `title`, `description`, `heading`, первый абзац — «перманентний макіяж у Києві» / «перманентный макияж в Киеве» без формулировок запроса бровей; ссылка на `/permanent/brows/` (`/ru/permanent/brows/`) не ниже второго раздела — после первого абзаца и до третьего `h2`; объём ≥ 400 слов. `en/permanent.md` не трогать
- [ ] T030 [US3] `docs/specs/page-head.md` §Целевые запросы: таблица — `depilation` uk «депіляція у Києві; воскова депіляція», ru «депиляция в Киеве; депиляция воском»; `permanent` uk «перманентний макіяж у Києві», ru «перманентный макияж в Киеве»; новые строки `depilation/sugaring` и `permanent/brows` (uk, ru; en — «—»); пункт о том, что запрос подстраницы не стоит в заголовках её категории, со ссылкой на ADR-028

**Checkpoint**: US1–US3 проходят вместе; каннибализации нет

---

## Phase 6: User Story 4 — Machine readers find the new pages (Priority: P3)

**Goal**: карта сайта, `llms.txt` и контракты описывают девятнадцать страниц

**Independent Test**: в `dist/sitemap-0.xml` девятнадцать адресов, у подстраниц две `xhtml:link` (uk-UA, ru-UA); `/llms.txt` перечисляет обе подстраницы на uk и ru

Задачи истории — T031, T032, T033 — стоят в Step 2.3: карта сайта и `llms.txt` расходятся с собранным сайтом в тот момент, когда появляются маршруты T013, и без них Step 2.3 не проходит свой гейт. Контракты — T034–T037 в Phase 7.

---

## Phase 7: Polish & Cross-Cutting Concerns

### Step 7.1: Living contracts and comments

<!-- plan-meta:
allowed_paths:
  - "docs/**"
  - "specs/**"
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run check && npm run lint"
  test_full: "npm run build && npm run test:e2e"
-->

- [ ] T034 [P] `docs/specs/routes.md` §Route map: строка подстраниц (четыре адреса — 200; en и плоские — 404; без слеша — 301 от Apache), «пятнадцать страниц» → девятнадцать, ссылка на ADR-028
- [ ] T035 [P] `docs/specs/page-head.md` §Состав и §Языковые альтернативы: исключение для подстраниц — две ссылки `hreflang` плюс `x-default`, пример `/depilation/sugaring/`; все вхождения числа страниц в файле (на 2026-10-13 — строки 3, 33, 37: «пятнадцати» → девятнадцати, «двенадцать заголовков» → шестнадцать с подстраницами)
- [ ] T036 [P] `docs/specs/structured-data.md`: раздел `## Service subpage` — `Service` с предложениями по ценам способа страницы, `BreadcrumbList` из трёх; `priceRange` учитывает цены пастой
- [ ] T037 [P] `docs/specs/content-model.md`: поле `sugar` в §Инварианты (только группы страницы шугаринга, без доли, `false` — «пастой не делается», цена способа страницы; сумма пастой — строка таблицы `<id>/sugar[@<count>]`); в `specs/005-sheet-price-publishing/data-model.md` §SheetRow, строка `key` — `<id>/sugar` и `<id>/sugar@<count>` для цены пастой и порядок строк по data-model §Sheet row этого пакета, строка пастой несёт `group` своей позиции (если 005 к тому времени растворён — в документ, который его заменил по `specs/RETIRED.md`); раздел о текстах подстраниц (ровно файлы языков из реестра, ≥ 400 слов, уникальность абзацев вместе с категориями)
- [ ] T038 [P] `docs/runbook-deploy.md` §Changing the price list: шаг 2 — ключи `<id>/sugar` и `<id>/sugar@<count>` рядом с `<id>` и `<id>@<count>`; цена пастой у позиции и `sugar: false` относятся к структуре, после слияния `mode: rebuild-sheet`; строка пастой в таблице подписана «сахар» в столбце «Вариант». Перенос текста в столбце «Вариант» (T044) вступает в силу при следующем `rebuild-sheet`; пока у позиций нет `sugar`, отдельно ради него перестройку не запускать. Списка адресов для сброса кэша нет — его берут из `dist/` (ADR-026), правка не нужна
- [ ] T039 Комментарии с числами страниц в `tests/seo-contract.spec.ts`, `tests/contrast.spec.ts`, `src/components/SeoHead.astro` (`двенадцати страницах` — заголовки категорий и подстраниц), `src/data/services.ts` — привести к факту

### Step 7.2: Gates and quickstart

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "public/**"
  - "docs/**"
  - "specs/**"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run check && npm run lint && npm run test:unit"
  test_full: "npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
-->

- [ ] T040 Прогнать гейты `CLAUDE.md` §Гейты (`npm run check`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:e2e`, `npm run test:invalid-data`, `npm run analyze`) и сценарии `specs/006-service-subpages/quickstart.md`; вывод — в отчёт

### Step 7.3: Core and map via /seo

<!-- plan-meta:
skip: true  # main session after the run: /seo is a skill, the implementer has no Skill tool
-->

- [ ] T041 `/seo core`: `target_url` кластера `shuharynh` → `/depilation/sugaring/` (uk) и `/ru/depilation/sugaring/` (ru), `permanentnyi-makiiazh-briv` → `/permanent/brows/`, `/ru/permanent/brows/`; затем `/seo map` против собранного сайта. Ручная правка `docs/seo/*` запрещена

### Step 7.4: Package closeout

<!-- plan-meta:
skip: true  # main session: closeout needs the author; /speckit-retire runs after merge
-->

- [ ] T042 Закрыть пакет: отметить задачи, записать в `spec.md` фактические отклонения, если были; выкладка — только по слову автора; `/speckit-retire 006` после слияния

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T003 сделан; T045 (ветка) — до прогона; T001 → T002
- **Foundational (Phase 2)**: после Step 1.2. Step 2.1: T006 → T007 → T009 → T010. Step 2.2: T043 → T044, после T007 (поле `sugar` в схеме). Step 2.3: T004 → T008 → T011 → T012 → T013 → T014 → T005 → T018, T031–T033
- **US1, US2 (Phase 3, 4)**: после Phase 2; ответы интервью получены (T003). Step 4.1 после Step 3.1: T023 переводит проверки текста на весь `servicePages`, когда оба текста написаны
- **US3 (Phase 5)**: после Phase 2; T028 — после T019/T020 (абзацы про пасту уходят из категории только тогда, когда тема раскрыта на подстранице)
- **US4 (Phase 6)**: в Step 2.3
- **Polish (Phase 7)**: после всех историй; T041 — после зелёного T040

### User Story Dependencies

- **US1**: от Phase 2
- **US2**: от Phase 2; по содержанию от US1 не зависит, по порядку шагов идёт после него (см. выше)
- **US3**: T028 от US1; T029 от US2 не зависит (абзацы о бровях в категории остаются, меняется только запрос)
- **US4**: только от маршрутов T013

### Within Each Step

- проверка шага пишется в том же шаге и сначала краснеет; шаг закрывается зелёным гейтом
- текст uk → текст ru

### Parallel Opportunities

- T004 ∥ T005 по файлам, но T005 проверяет `dist/` подстраниц и потому запускается после T013
- Step 2.2 не связан со Step 2.3 по файлам
- проверки внутри шага истории (T015–T017, T021–T023, T026–T027) — параллельно между собой; `QUERIES` в T004 и T026 — один объект в `tests/support/site.ts`
- Polish T034–T038 — параллельно

---

## Parallel Example: User Story 1

```bash
# проверки US1 одновременно:
Task: "T015 [US1] routes.spec.ts — 200/404 и canonical без слеша для шугаринга"
Task: "T017 [US1] seo-contract.spec.ts — head и JSON-LD подстраниц"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: ветка `006-service-subpages` от `main` (`--no-track`), ADR-028
2. Phase 2 целиком
3. Phase 3: проверки → тексты по ответам
4. **STOP and VALIDATE**: гейты по US1

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 → US3 (снимает каннибализацию; без неё US1 и US2 делят запрос с категориями) → Polish. Всё идёт в ветке `006-service-subpages`, а в main сливается одним слиянием: выкладка Лады выкладывает main целиком (ADR-026, пакет 005 FR-020), и полуготовая каннибализация на проде хуже отсутствия подстраниц.

## Session Map
<!-- packed-for: bundle 600K -->

- [x] S1 (~600K) Steps 1.2, 2.1, 2.2, 2.3, 3.1 — done 2026-10-17 12:40–13:15 (0h34m)
- [ ] S2 (~430K) Steps 4.1, 5.1, 7.1, 7.2 — **current**

## Progress Log

### S1.step-1.2 — 2026-10-17
**Completed steps:** 1.2
**Commits:** 7c0df16

### S1.step-2.1 — 2026-10-17
**Completed steps:** 2.1
**Commits:** 22aabf4

### S1.step-2.2 — 2026-10-17
**Completed steps:** 2.2
**Commits:** b86efa2

### S1.step-2.3 — 2026-10-17
**Completed steps:** 2.3
**Commits:** 600e7e7

### S1.step-3.1 — 2026-10-17
**Completed steps:** 3.1
**Commits:** 3fcd14c

### S1 — observations (2026-10-17, dispatch 1)
plan-wrong:
- TaskCreate is not exposed in this harness; the bundle was tracked without it.
- T018 puts typography.spec.ts on the 22-page run, but its line-measure check needs paragraphs and the subpage drafts have none, so in 2.3 it stays on categoryPages. 3.1 adds the sugaring pages. T023 (Step 4.1) does not mention typography: it must add the brow pages, or the brow texts go unmeasured.
- T017's head / JSON-LD / crumbs / language-switcher / Offer-order block does not depend on the text, and the 2.3 implementation already satisfies it, so in 3.1 only the text checks went red. The block runs on the brow pages too, so the brow Offer-count check that T023 plans to add already exists (expectedOfferCount(subpage)).
- T039 lists the page-count comment in contrast.spec.ts; it was fixed in 2.3 because that SCOPES block was edited anyway. The 'пятнадцати' comments in seo-contract.spec.ts and 'двенадцати страницах' in SeoHead.astro are left for T039.
- The comment on the sugar schema in content.config.ts points to docs/specs/content-model.md §Инварианты, which gets the sugar field only in T037 (Step 7.1).
- In commit 22aabf4 the subpages glob loader warns that src/content/subpages/ does not exist; the files appear in 2.3. Warning only, the build passes.
- T002: the last bullet of page-head.md §Целевые запросы was rewritten rather than appended to, because its old text ('Отдельных страниц под коммерческие запросы нет') is false once ADR-028 exists.
redone:
- SeoHead.astro: switching og:locale:alternate to pageLocales() dropped the `locales` import that knowsLanguage still needs; lint (no-undef) and the build caught it.
- seo-contract.spec.ts: the guard rename via replace_all missed `requireCategoryPage(request, entry.path)` (different argument), and the next Edit failed on old_string mismatch until the line was re-grepped.
- uk/ru sugaring texts: the first draft said which paste goes on which zone, offered advice by phone, implied a free choice between wax and paste, and said 'light scrub'. None of that is in the interview; all removed in a self-review against interview.md §How the answers reach the pages.
- sheet-layout header test passed vacuously before implementation; added the sugar row-count assertion so it was red first.
decided:
- ADR-021/023: the new Superseded-by line is a separate blockquote paragraph; if wrong, it only changes rendering.
- SubpageRef ties category to the subpage's registry parent at the type level; if wrong, only type-checking is affected.
- subpageCopy also fails when frontmatter `subpage` differs from the file name (data-model rule); if wrong, it blocks a deliberate rename.
- test-invalid-data uses 999 as the sugar amount, or the next amount not used in prices.json, so the check stays meaningful if Lada ever sets 999; if wrong, the output label just shows another number.
- llms.txt: besides T033, line 30 'touch-up' becomes 'correction' and line 45 mentions subpages' JSON-LD, to keep one term per concept; if wrong, it is wording only.
- The sugaring texts do not claim paste costs the same as wax: that sentence would go stale silently once a `sugar` price appears. The wax paragraph links to the category; if unwanted, it is one link per language.

### S1 — dispatch 1 (2026-10-17)
`kind=bundle agent=implementer tier=strong model=claude-opus-5-5 effort=xhigh turns=93 minutes=34.3 input=186 cache_write=375396 cache_read=21482229 output=144347`
