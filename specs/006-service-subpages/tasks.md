---

description: "Task list for service subpages: sugaring and brow permanent makeup"
---

# Tasks: Service subpages for sugaring and brow permanent makeup

**Input**: Design documents from `specs/006-service-subpages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/subpage.md, quickstart.md

**Tests**: включены — правило репозитория «новая возможность приходит с проверкой» и гейты по собранному сайту (constitution §V, ADR-012). Проверки пишутся до реализации своей истории и сначала краснеют.

**Organization**: по пользовательским историям spec.md: US1 шугаринг (P1), US2 брови (P1), US3 передача запросов категориями (P2), US4 машинные читатели (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых задач)
- **[Story]**: к какой истории относится задача

## Path Conventions

Статический сайт Astro: код в `src/`, проверки в `tests/` (Playwright по `dist/`), порча данных в `scripts/test-invalid-data.mjs`, контракты в `docs/specs/`.

---

## Phase 1: Setup

**Purpose**: решение и внешняя зависимость, без которых нельзя писать тексты

- [ ] T001 Получить номер ADR из get-id (`resolve_project` с `git remote get-url origin` → `next_id`, `type: ADR`, имя `commercial-service-subpages`) и написать `docs/adr/adr-NNN-commercial-service-subpages.md` по `docs/adr/adr-template.md`: заголовок на английском, `> **Supersedes:** ADR-021 (частично — коммерческие подстраницы), ADR-023 (частично — пункт Rejected о /sugaring/ и /powder-brows/)`; Context из spec §Context (цифры Keyword Planner, Search Console, выдача — research R1); Decision «отдельная коммерческая страница допускается, когда выдача кластера занята специализированными страницами, а категория отдаёт ей запрос; адрес `/<категория>/<slug>/`, языки — как у кластера ядра»; Consequences и `- **Rejected: …**` — плоские адреса, перенацеливание категорий без новых адресов, ожидание Search Console, версия en (research R2, R1, spec §Context)
- [ ] T002 Добавить строку `> **Superseded by:** [ADR-NNN](…) (частично — …)` в `docs/adr/adr-021-no-query-landing-pages.md` и `docs/adr/adr-023-knowledge-base-pages-for-informational-queries.md` (тело смёрженных ADR не править); в `CLAUDE.md` §Что открыть дописать ссылку на ADR-NNN в строке про ADR-021 и ADR-023; в `docs/specs/page-head.md` §Целевые запросы — последний пункт со ссылкой на ADR-NNN
- [x] T003 [P] Передать автору вопросы интервью из research R11 (шугаринг 8, брови 8) одним сообщением; ответы, когда придут, записать дословно в `specs/006-service-subpages/interview.md` с датой и пометкой «со слов Лады через автора» — получены 2026-10-13; четыре уточняющих вопроса там же, тексты их не ждут

**Checkpoint**: решение записано; ответы интервью в `interview.md`

---

## Phase 2: Foundational

**Purpose**: реестр, модель данных, чтение прайса способом, общий шаблон и заголовочная часть — всё, на чём стоят US1–US4

**⚠️ CRITICAL**: ни одна история не начинается до конца этой фазы

### Tests for Foundational

- [ ] T004 Обновить `tests/support/site.ts`: литерал `SERVICE_SUBPAGES` (`sugaring` → родитель `depilation`, группы `womenDepilation`, `combos`, `menDepilation`, `menCombos` — без триммера, способ `sugar`; `brows` → `permanent`, `permanentBrows`, способ `base`; языки `uk`, `ru`); `subpagePages` с путями `/depilation/sugaring/`, `/ru/depilation/sugaring/`, `/permanent/brows/`, `/ru/permanent/brows/`; `servicePages` = категории + подстраницы; `allPages` — девятнадцать, `builtPages` — двадцать два; `expectedOfferCount` принимает категорию или подстраницу и считает цену способом (`sugar === false` — 0, `sugar ?? price`); `priceRange` учитывает суммы `sugar`; тип `PriceRecord` получает `sugar?: PriceValue | false`; комментарии с числами страниц привести к новым
- [ ] T005 [P] Дописать в `scripts/test-invalid-data.mjs` случаи порчи: `sugar` у позиции `permanent-brows-powder` (ожидание — сообщение с `sugar`), `sugar` у `men-trimmer-underarms` (группа триммера, ожидание `sugar`), `sugar` вида `share` у `women-depilation-underarms` (ожидание `sugar`), удалённый `src/content/subpages/uk/sugaring.md` (ожидание `нет текста подстраницы: src/content/subpages/uk/sugaring.md`); и раздел допустимых правок, после которых проверяется `dist/`. Позиция — `women-depilation-upper-lip` («Ніс / Вуха / Брови / Шия», 200 на 2026-10-13): её название в прайсе единственное, а «Пахви» встречается ещё в комплексах и мужском прайсе. `sugar: {"kind":"fixed","amount":999}` → `999` в `dist/depilation/sugaring/index.html` и нет `999` в `dist/depilation/index.html` (в настоящем прайсе суммы 999 нет); `sugar: false` → в `dist/depilation/sugaring/index.html` нет «Ніс / Вуха / Брови / Шия», в `dist/depilation/index.html` есть. Название и сумму брать из `prices.json` в момент записи: прайс правит Лада. Откат — тем же `withCorruption`; итоговая восстановительная сборка остаётся

### Implementation for Foundational

- [ ] T006 Добавить реестр в `src/i18n/paths.ts`: `serviceSubpages` (`sugaring`: `parent: 'depilation'`, `locales: ['uk','ru']`, `groups: ['womenDepilation','combos','menDepilation','menCombos']`, `method: 'sugar'`; `brows`: `parent: 'permanent'`, `locales: ['uk','ru']`, `groups: ['permanentBrows']`, `method: 'base'`), типы `ServiceSubpage`, `PriceMethod = 'base' | 'sugar'`, `ServicePageRef = { category } | { category, subpage }`; `pagePath(locale, ref?)` → `<префикс>/<category>/<subpage>/`; `canonicalUrl(locale, ref?)`; `languageAlternates(ref?)` — только языки страницы, `x-default` украинский; `subpageStaticPaths(locale)` — пары `{ category, subpage }` для подстраниц, где есть `locale`. Правила данных «каждая группа принадлежит категории `parent`» и «`uk` есть в `locales`» (украинский — `x-default`) проверяются при загрузке модуля и роняют сборку
- [ ] T007 Расширить `src/content.config.ts`: у `prices` необязательное `sugar: fixed | variants | false` (переиспользовать ветки `priceValue`; `share` запрещён), `superRefine`: `sugar` есть, а группы нет в `groups` ни одной подстраницы со способом `sugar` (реестр T006) — ошибка с путём `sugar`; коллекция `subpages` — `glob` `+(uk|ru)/+(sugaring|brows).md` из `./src/content/subpages`, схема `subpage: z.enum(slugs)`, `title: z.string().min(1)`, `description: z.string().min(120).max(160)`, `heading: z.string().min(1)`
- [ ] T008 [P] Создать `src/data/subpages.ts`: `subpageCopy(locale, subpage)` — `getEntry('subpages', '<locale>/<slug>')`, при отсутствии `throw new Error('нет текста подстраницы: src/content/subpages/<locale>/<slug>.md')`; язык вне `locales` реестра — ошибка «текст подстраницы на языке, которого у неё нет»
- [ ] T009 [P] Расширить `src/data/price-list.ts`: `pricesOfGroups(groups, method = 'base')` возвращает записи с ценой способа — `base` → `price`; `sugar` → `sugar === false` исключается, иначе `sugar ?? price`; порядок файла сохраняется (docs/specs/content-model.md §Две ловушки); тип результата несёт выбранную цену, а не исходную запись
- [ ] T010 [P] `src/components/PriceGroup.astro`: проп `method` (по умолчанию `base`), читать `pricesOfGroups([group], method)`; при пустом списке не выводить группу вовсе
- [ ] T011 `src/components/ServicePage.astro`: проп `page: ServicePageRef` вместо `category`; текст — `serviceCopy` или `subpageCopy`; группы и способ — из категории или реестра; крошки подстраницы «главная / категория (ссылка, её `heading`) / подстраница (`aria-current="page"`)»; сноска `permanentNote` — для `permanent` и для `brows`; `[data-service-copy]` без изменений
- [ ] T012 `src/components/SeoHead.astro` и `src/layouts/BaseLayout.astro`: проп `page?: ServicePageRef` вместо `category`; `canonical`, `hreflang`, `x-default` из `languageAlternates(page)`; `og:locale:alternate` — только языки страницы; `title`/`description` из текста подстраницы; `offers` из `pricesOfGroups(groups, method)`; `BreadcrumbList` из трёх элементов для подстраницы (вторая — категория с её `heading` и адресом); `priceRange` — по всем суммам `price` и `sugar` (кроме `false`), долевые не участвуют. Обновить все вызовы `<BaseLayout category=…>` в `src/pages/**/[category].astro` на `page={{ category }}`
- [ ] T013 Создать маршруты `src/pages/[category]/[subpage].astro` (`locale = 'uk'`, `getStaticPaths = () => subpageStaticPaths('uk')`) и `src/pages/ru/[category]/[subpage].astro` (`ru`); файла под `en` не создавать — комментарий в uk-маршруте одной строкой: почему (spec FR-003)

- [ ] T014 Создать черновые `src/content/subpages/{uk,ru}/{sugaring,brows}.md` с frontmatter по data-model §Subpage copy и телом из одной строки «черновик до интервью» — без них сборка падает на `subpageCopy`; T019, T020, T024, T025 заменяют тело целиком. `test:e2e` на этих файлах краснеет на объёме текста — это ожидаемо до историй

### Price sheet rows for sugar amounts (spec FR-004c, data-model §Sheet row)

- [ ] T043 `scripts/prices/sheet-layout.test.mjs`: позиция с `sugar` вида `fixed` даёт строку `<id>/sugar` с вариантом `сахар` сразу за строкой общей цены и пустым `name`; `sugar` вида `variants` — строки `<id>/sugar@<count>` с вариантом `сахар, 60 мин`; `sugar: false` строк не даёт; `applyAmounts` меняет сумму пастой по её ключу и не трогает общую; неизвестный ключ `<id>/sugar` у позиции без `sugar` — ошибка `price list has no row`. Литерал «167 rows» не меняется: в настоящем прайсе `sugar` нет. В `scripts/prices/reconcile.test.mjs` — случай на фикстуре с `sugar`: изменённая в таблице сумма пастой попадает в `next[i].sugar.amount`, общая не меняется. В `scripts/prices/rebuild-sheet.test.mjs` (или тесте `mergeRows` в `sheet-layout.test.mjs`) — новый ключ `<id>/sugar` получает сумму из репозитория. Сначала краснеет
- [ ] T044 `scripts/prices/sheet-layout.mjs`: один обход сумм позиции — общая цена, затем цена пастой — для `rowsFromPrices` и `applyAmounts`, чтобы вид суммы знали не два места, а одно; `rowKey(id, count, method?)`; подпись варианта пастой — `сахар` / `сахар, <variantLabel>`. Docblock модуля — ссылка на data-model §Sheet row, без пересказа. `rebuild-sheet.mjs`: столбец `Вариант` (индекс 2) — в `WRAPPED_COLUMNS`, иначе `сахар, 60 мин` обрезается в 80 px; та же строка в `specs/005-sheet-price-publishing/contracts/sheet-layout.md` (перенос — у `B`, `C` и `F`). `publish.mjs`, `reconcile.mjs`, `report.mjs`, `apps-script/Code.js` не меняются: ключ для них непрозрачен (сверено 2026-10-13)

**Checkpoint**: `npm run build` собирает четыре адреса подстраниц; `npm run test:invalid-data` зелёный, включая допустимые правки прайса из T005; `npm run test:unit` зелёный с T043

---

## Phase 3: User Story 1 — Sugaring page (Priority: P1) 🎯 MVP

**Goal**: `/depilation/sugaring/` и `/ru/depilation/sugaring/` — страница целиком про шугаринг с прайсом депиляции по ценам пастой

**Independent Test**: собрать сайт; оба адреса 200, запрос «шугаринг у Києві» / «шугаринг в Киеве» в `<title>`, `<h1>`, описании и первом абзаце; прайс четырёх групп (женская, женские комплексы, мужская, мужские комплексы), групп триммера нет; крошки ведут на `/depilation/`; JSON-LD — `Service` с предложениями по ценам пастой и `BreadcrumbList` из трёх

### Tests for User Story 1

- [ ] T015 [P] [US1] `tests/routes.spec.ts`: `/depilation/sugaring/`, `/ru/depilation/sugaring/` — 200; `/en/depilation/sugaring/`, `/sugaring/` — 404; `/depilation/sugaring` без слеша — 301 на форму со слешем (contracts/subpage.md §Routes)
- [ ] T016 [P] [US1] `tests/voice.spec.ts`: добавить ключи `depilation/sugaring` в `QUERIES` (`tests/support/site.ts`) — uk `[/шугаринг/i]`, ru `[/шугаринг/i]`; цикл «первый абзац называет запрос» — по `servicePages`, а не `categoryPages`
- [ ] T017 [P] [US1] `tests/seo-contract.spec.ts`: существующая проверка языковых альтернатив по `allPages` (строка ~106) ждёт три языка — для подстраниц ветка с ожиданием `uk`, `ru`, `x-default`; для подстраниц — `canonical` на себя, `hreflang` ровно `uk`, `ru`, `x-default` (украинский), без `en`; `og:locale:alternate` только второй язык; JSON-LD `Service` с числом `Offer` = `expectedOfferCount(subpage)`, без нулевых цен; `BreadcrumbList` из трёх с адресом категории вторым; на странице шугаринга ровно четыре раздела прайса с подписями групп `womenDepilation`, `combos`, `menDepilation`, `menCombos` из словаря, без подписей групп триммера (spec FR-004), и названия позиций в разделах совпадают с `itemOffered` предложений JSON-LD (FR-004a); объём текста ≥ 400 слов и уникальность абзацев внутри языка — по `servicePages` (категории и подстраницы вместе)

### Implementation for User Story 1

- [ ] T018 [US1] Прогнать `tests/headings.spec.ts`, `tests/contrast.spec.ts`, `tests/brand-marks.spec.ts`, `tests/interaction.spec.ts`, `tests/typography.spec.ts` по 22 собранным страницам из `builtPages`; проверку, которая предполагает у каждой страницы категорию из `SERVICE_CATEGORIES`, перевести на `servicePages`. Результат — зелёный прогон и перечень правленых проверок в отчёте
- [ ] T019 [US1] Тело `src/content/subpages/uk/sugaring.md`: ≥ 400 слов, первый абзац с «шугаринг у Києві», разделы `##` — паста, длина волос и подготовка, зоны и длительность сеанса (женщины, комплексы, мужчины), после сеанса и как часто повторять, чем отличается от воска, кому не делаем, запись; утверждения из практики — только из `specs/006-service-subpages/interview.md` по его §How the answers reach the pages; без имён мастеров кроме Лады (ADR-019); без «майстерня» (docs/specs/voice.md); `title` ≤ 70 знаков формы `… — Lada N`, `description` 120–160 знаков с запросом в первой половине
- [ ] T020 [US1] Тело `src/content/subpages/ru/sugaring.md` — перевод T019 по смыслу, запрос «шугаринг в Киеве»; те же ограничения. Блокирован T019

**Checkpoint**: US1 проходит свои проверки; вместе с Phase 2 это MVP

---

## Phase 4: User Story 2 — Brow permanent makeup page (Priority: P1)

**Goal**: `/permanent/brows/` и `/ru/permanent/brows/` — страница перманента бровей с прайсом группы бровей

**Independent Test**: оба адреса 200; «перманентний макіяж брів» и «пудрові брови» / «перманентный макияж бровей» и «пудровые брови» в `<title>`, `<h1>`, описании, первом абзаце; «татуаж брів/бровей» в тексте; коррекция показана долей и не даёт `Offer`

### Tests for User Story 2

- [ ] T021 [P] [US2] `tests/routes.spec.ts`: `/permanent/brows/`, `/ru/permanent/brows/` — 200; `/en/permanent/brows/`, `/powder-brows/` — 404; `/permanent/brows` без слеша — 301 на форму со слешем
- [ ] T022 [P] [US2] `QUERIES` в `tests/support/site.ts`: `permanent/brows` uk `[/перманентн\S* макіяж\S* брів/i, /пудров\S* бров/i]`, ru `[/перманентн\S* макияж\S* бровей/i, /пудров\S* бров/i]`; в `tests/voice.spec.ts` — проверка «татуаж брів|татуаж бровей» в `[data-service-copy]` страниц бровей
- [ ] T023 [P] [US2] `tests/seo-contract.spec.ts`: для `brows` число `Offer` = 2 на язык (пудровые 2500, перекрытие 2800; коррекция — доля), подпись «50%» в прайсе страницы

### Implementation for User Story 2

- [ ] T024 [US2] Тело `src/content/subpages/uk/brows.md`: ≥ 400 слов; первый абзац с «перманентний макіяж брів у Києві» и «пудрові брови»; «татуаж брів» в тексте; разделы — пудровая техника, как проходит процедура и сколько длится, подготовка и уход, заживление (около месяца; корочки, шелушение, посветление — разбивку по дням не писать: Лада её не дала), коррекция через 28–60 днів (срок — из названия позиции в прайсе), сколько держится, перекриття старого перманенту, кому не робимо; практика — только из `interview.md`; те же ограничения, что T019
- [ ] T025 [US2] Тело `src/content/subpages/ru/brows.md` — по смыслу T024, запрос «перманентный макияж бровей в Киеве», «пудровые брови», «татуаж бровей». Блокирован T024

**Checkpoint**: US1 и US2 проходят независимо

---

## Phase 5: User Story 3 — Categories hand their queries over (Priority: P2)

**Goal**: категории uk и ru больше не держат запрос подстраниц и ведут на них

**Independent Test**: в `<title>`, `<h1>`, описании `/depilation/`, `/ru/depilation/` нет «шугаринг»; у `/permanent/`, `/ru/permanent/` нет формулировок запроса бровей; в тексте каждой — ссылка на подстраницу своего языка не ниже второго раздела; каждый текст ≥ 400 слов

### Tests for User Story 3

- [ ] T026 [P] [US3] `QUERIES` в `tests/support/site.ts`: `depilation` uk `[/депіляці/i, /воск/i]`, ru `[/депиляци/i, /воск/i]`; `permanent` без изменений; `en` без изменений
- [ ] T027 [P] [US3] `tests/voice.spec.ts`: для `depilation` uk и ru — нет `/шугаринг/i` в `<title>`, `<h1>`, описании; для `permanent` uk и ru — нет `/(перманент|татуаж|пудров)[^.]{0,40}бр(ів|ов)|бр(ів|ов)[^.]{0,40}(перманент|татуаж|пудров)/i` там же (spec FR-010 — запрет на формулировку, не на слово); в `[data-service-copy]` категории — `a[href="<путь подстраницы своего языка>"]`, ровно одна, не в первом абзаце и до третьего `h2` текста (spec FR-009, FR-010: «не ниже второго раздела»); тест «шугаринг назван» в тексте категории оставить

### Implementation for User Story 3

- [ ] T028 [US3] `src/content/services/uk/depilation.md` и `src/content/services/ru/depilation.md`: `title`, `description`, `heading` и первый абзац — «депіляція у Києві» + «воскова депіляція» / «депиляция в Киеве» + «депиляция воском», без «шугаринг»; абзацы, целиком про пасту, удалить (их содержание уже в T019/T020 своими словами — повтор абзацев запрещён); добавить абзац со ссылкой на `/depilation/sugaring/` (`/ru/depilation/sugaring/`) не ниже второго раздела — после первого абзаца и до третьего `h2`; объём ≥ 400 слов в каждом. `en/depilation.md` не трогать
- [ ] T029 [US3] `src/content/services/uk/permanent.md` и `src/content/services/ru/permanent.md`: `title`, `description`, `heading`, первый абзац — «перманентний макіяж у Києві» / «перманентный макияж в Киеве» без формулировок запроса бровей; ссылка на `/permanent/brows/` (`/ru/permanent/brows/`) не ниже второго раздела — после первого абзаца и до третьего `h2`; объём ≥ 400 слов. `en/permanent.md` не трогать
- [ ] T030 [US3] `docs/specs/page-head.md` §Целевые запросы: таблица — `depilation` uk «депіляція у Києві; воскова депіляція», ru «депиляция в Киеве; депиляция воском»; `permanent` uk «перманентний макіяж у Києві», ru «перманентный макияж в Киеве»; новые строки `depilation/sugaring` и `permanent/brows` (uk, ru; en — «—»); пункт о том, что запрос подстраницы не стоит в заголовках её категории

**Checkpoint**: US1–US3 проходят вместе; каннибализации нет

---

## Phase 6: User Story 4 — Machine readers find the new pages (Priority: P3)

**Goal**: карта сайта, `llms.txt` и контракты описывают девятнадцать страниц

**Independent Test**: в `dist/sitemap-0.xml` девятнадцать адресов, у подстраниц две `xhtml:link` (uk-UA, ru-UA); `/llms.txt` перечисляет обе подстраницы на uk и ru

### Tests for User Story 4

- [ ] T031 [P] [US4] `tests/sitemap.spec.ts`: ровно девятнадцать адресов (название проверки и сообщения); у адреса подстраницы `xhtml:link` ровно uk-UA и ru-UA, без `en`
- [ ] T032 [P] [US4] `tests/llms.spec.ts`: перечень — девятнадцать адресов (название проверки)

### Implementation for User Story 4

- [ ] T033 [US4] `public/llms.txt`: в §Pages — строки подстраниц в украинском блоке («Sugaring», «Brow permanent makeup» с одной строкой описания) и в русском перечне; фраза «The same fifteen pages exist in every language» → пятнадцать страниц во всех трёх языках плюс две подстраницы только на uk и ru; строка карты сайта «all fifteen pages» → девятнадцать. Расхождение про коррекцию 80% (research R14) не трогать

**Checkpoint**: все истории проходят независимо

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T034 [P] `docs/specs/routes.md` §Route map: строка подстраниц (четыре адреса — 200; en и плоские — 404), «пятнадцать страниц» → девятнадцать, ссылка на ADR-NNN
- [ ] T035 [P] `docs/specs/page-head.md` §Состав и §Языковые альтернативы: исключение для подстраниц — две ссылки `hreflang` плюс `x-default`, пример `/depilation/sugaring/`; все вхождения числа страниц в файле (на 2026-10-13 — строки 3, 33, 37: «пятнадцати» → девятнадцати, «двенадцать заголовков» → шестнадцать с подстраницами)
- [ ] T036 [P] `docs/specs/structured-data.md`: раздел `## Service subpage` — `Service` с предложениями по ценам способа страницы, `BreadcrumbList` из трёх; `priceRange` учитывает цены пастой
- [ ] T037 [P] `docs/specs/content-model.md`: поле `sugar` в §Инварианты (только группы страницы шугаринга, без доли, `false` — «пастой не делается», цена способа страницы; сумма пастой — строка таблицы `<id>/sugar[@<count>]`); в `specs/005-sheet-price-publishing/data-model.md` §SheetRow, строка `key` — `<id>/sugar` и `<id>/sugar@<count>` для цены пастой и порядок строк по data-model §Sheet row этого пакета (если 005 к тому времени растворён — в документ, который его заменил по `specs/RETIRED.md`); раздел о текстах подстраниц (ровно файлы языков из реестра, ≥ 400 слов, уникальность абзацев вместе с категориями)
- [ ] T038 [P] `docs/runbook-deploy.md` §Changing the price list: шаг 2 — ключи `<id>/sugar` и `<id>/sugar@<count>` рядом с `<id>` и `<id>@<count>`; цена пастой у позиции и `sugar: false` относятся к структуре, после слияния `mode: rebuild-sheet`; строка пастой в таблице подписана «сахар» в столбце «Вариант». Списка адресов для сброса кэша нет — его берут из `dist/` (ADR-026), правка не нужна
- [ ] T039 Комментарии с числами страниц в `tests/seo-contract.spec.ts`, `tests/contrast.spec.ts`, `src/components/SeoHead.astro` (`двенадцати страницах` — заголовки категорий и подстраниц), `src/data/services.ts` — привести к факту
- [ ] T040 Прогнать гейты `CLAUDE.md` §Гейты (`npm run check`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:e2e`, `npm run test:invalid-data`, `npm run analyze`) и сценарии `specs/006-service-subpages/quickstart.md`; вывод — в отчёт
- [ ] T041 `/seo core`: `target_url` кластера `shuharynh` → `/depilation/sugaring/` (uk) и `/ru/depilation/sugaring/` (ru), `permanentnyi-makiiazh-briv` → `/permanent/brows/`, `/ru/permanent/brows/`; затем `/seo map` против собранного сайта. Ручная правка `docs/seo/*` запрещена
- [ ] T042 Закрыть пакет: отметить задачи, записать в `spec.md` фактические отклонения, если были; выкладка — только по слову автора; `/speckit-retire 006` после слияния

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002; T003 независим и стартует сразу
- **Foundational (Phase 2)**: после T001; T004, T005 — до реализации (краснеют); T006 → T007 → (T008, T009, T010 параллельно) → T011 → T012 → T013 → T014; T043 → T044 — после T007 (поле `sugar` в схеме), с остальной фазой не связаны
- **US1, US2 (Phase 3, 4)**: после Phase 2; ответы интервью получены (T003)
- **US3 (Phase 5)**: после Phase 2; T028 — после T019/T020 (абзацы про пасту уходят из категории только тогда, когда тема раскрыта на подстранице)
- **US4 (Phase 6)**: после Phase 2
- **Polish (Phase 7)**: после всех историй; T041 — после зелёного T040

### User Story Dependencies

- **US1**: от Phase 2
- **US2**: от Phase 2; от US1 не зависит
- **US3**: T028 от US1; T029 от US2 не зависит (абзацы о бровях в категории остаются, меняется только запрос)
- **US4**: только от Phase 2

### Within Each User Story

- проверки пишутся и краснеют до реализации
- текст uk → текст ru

### Parallel Opportunities

- T003 параллельно всему
- T004 ∥ T005; T008 ∥ T009 ∥ T010 ∥ T043–T044
- проверки историй T015–T017, T021–T023, T026–T027, T031–T032 — параллельно между собой (разные файлы или разные блоки; `QUERIES` в T016, T022, T026 — один объект в `tests/support/site.ts`, их править последовательно)
- Polish T034–T038 — параллельно

---

## Parallel Example: User Story 1

```bash
# проверки US1 одновременно:
Task: "T015 [US1] routes.spec.ts — 200/404/301 для шугаринга"
Task: "T017 [US1] seo-contract.spec.ts — head и JSON-LD подстраниц"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (вопросы автору уходят первыми — ответы идут параллельно разработке)
2. Phase 2 целиком
3. Phase 3: проверки → тексты по ответам
4. **STOP and VALIDATE**: гейты по US1

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 → US3 (снимает каннибализацию; без неё US1 и US2 делят запрос с категориями) → US4 → Polish. В main сливается всё вместе: выкладка Лады выкладывает main целиком (пакет 005, FR-020), и полуготовая каннибализация на проде хуже отсутствия подстраниц.
