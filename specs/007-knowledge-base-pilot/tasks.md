---

description: "Task list for feature implementation"
---

# Tasks: Knowledge Base Pilot

**Input**: Design documents from `/specs/007-knowledge-base-pilot/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: проверки пишутся первыми и краснеют до реализации — практика репозитория: Playwright против `astro preview` над собранным `dist/` ([ADR-012](../../docs/adr/adr-012-tests-against-built-dist.md)), случаи `scripts/test-invalid-data.mjs`, модульные `node --test`. Ожидаемые проверки и исходы — [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/`, `scripts/`, `public/`, `docs/` at repository root — структура из [plan.md](plan.md) §Project Structure.
- Комментарии кода — на русском, один язык на файл; в `.astro` только `{/* */}`: HTML-комментарий в `dist/` краснит `tests/build-output.spec.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: ветка кода и предпосылки

- [ ] T001 Создать ветку кода `git switch -c 007-knowledge-base-pilot --no-track origin/main` и вести в ней все задачи ниже: всё, что попадает в `main`, уходит на сайт со следующей публикацией ([ADR-026](../../docs/adr/adr-026-single-ci-deploy-path.md)); первый push — `git push -u origin 007-knowledge-base-pilot`
- [ ] T002 [P] Убедиться, что `docs/seo/map.md` содержит строки §Pages `depilation-guide`, `depilation-vs-epilation`, `lada` на uk и ru с адресами из [contracts/routes.md](contracts/routes.md) и рёбра §Links из [contracts/links.md](contracts/links.md) §Pilot edges; расхождение правит `/seo map`, а не задача
- [ ] T003 [P] Добавить `scripts/seo-map.test.mjs` в скрипт `test:unit` файла `package.json` рядом с `scripts/prices/*.test.mjs scripts/purge-cache.test.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: разбор карты, коллекции, индекс базы знаний, обобщённая ссылка на страницу, общие компоненты и тестовые литералы — всё, на чём стоят четыре истории

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Написать `scripts/seo-map.test.mjs` (красный): `parseSeoMap` на тексте `docs/seo/map.md` возвращает строки §Pages и §Links с полями data-model.md §Seo map; столбцы находятся по имени заголовка — перестановка и лишний столбец разбор не меняют; нет §Pages, нет §Links, нет нужного столбца — исключение с текстом `docs/seo/map.md: <что не найдено>`; `linksFrom` отдаёт рёбра в порядке строк §Links только к собранным адресам; `displayAnchor('uk', 'депіляція київ')` → `Депіляція Київ`, `displayAnchor('ru', 'депиляция воском киев')` → `Депиляция воском Киев`
- [ ] T005 Реализовать `src/data/seo-map.ts`: чистая `parseSeoMap(text)` без импортов Astro (импортируется из `node --experimental-strip-types`), чтение `docs/seo/map.md` от `process.cwd()`, `linksFrom` по data-model.md §Seo map; колонка `status` и §Site не читаются (research R3)
- [ ] T006 [P] Создать `src/i18n/guide.ts`: `Record<GuideLocale, GuideDictionary>` только для uk и ru — подписи блока ссылок (`eyebrow` + `title` уровня `h2`, правило 7 `docs/specs/design-tokens.md`), «Опубліковано» / «Оновлено» и ru-пары, заголовок списка статей эксперта, словарь регистра имён собственных (`Київ`, `Киев`) и `displayAnchor(locale, anchor)` из research R3; T004 зеленеет после T005 и T006
- [ ] T007 [P] Добавить в `src/content.config.ts` коллекции по research R1 и data-model.md: `guide` — `glob({ pattern: '**/*.md', base: './src/content/guide' })`, схема `.strict()` с полями `page`, `title`, `description` («120–160 знаков»), `heading`, `published`, `modified` (`z.coerce.date()`, «`>= published` (схема, `path: ['modified']`)», равенство допустимо); `expert` — `glob({ pattern: '+(uk|ru).md', base: './src/content/expert' })`, поля `title`, `description` (120–160), `heading`; ключ `slug` и любой неизвестный ключ останавливают сборку
- [ ] T008 Обобщить ссылку на страницу в `src/i18n/paths.ts` по research R4 и data-model.md §Page reference: `PageRef = ServicePageRef | GuidePageRef | ExpertPageRef`, `ServicePageRef` получает `kind?: undefined`; `pagePath` (guide — `${prefix}/guide/${category}/${article ? article + '/' : ''}`, expert — `${prefix}/lada/`), `pageLocales` (guide — `ref.locales`, expert — uk и ru), `languageAlternates` (`x-default` — uk, если она среди языков страницы, иначе единственная версия); тип `page` в `src/layouts/BaseLayout.astro` и `src/components/SeoHead.astro` → `PageRef`; `tests/types/subpage-refs.ts` компилируется без правки
- [ ] T009 Реализовать `src/data/guide.ts`: `guideIndex()` с кэшем промиса на модуль, производные поля data-model.md §Guide entry (`locale` из первого сегмента `entry.id`, «`uk` или `ru`»; `category` — «одна из `serviceCategories`»; `article` — «`^[a-z0-9]+(-[a-z0-9]+)*$`; глубже третьего сегмента — ошибка»), методы `hubOf`, `articlesOf` (`published` по убыванию, затем `heading`), `articles`, `pathsOf`, `guideStaticPaths(locale)`; остановки 3–11 [contracts/content-files.md](contracts/content-files.md) §Build stops в указанном порядке с указанными сообщениями (depends on T005, T007, T008)
- [ ] T010 Вынести узел основательницы в `src/data/founder.ts` — `founderNode(locale)` по research R7 и [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) §Founder node; `founder` главной в `src/components/SeoHead.astro` строится им, JSON-LD главных трёх языков не меняется ни на байт (depends on T008: тот же файл)
- [ ] T011 [P] Вынести крошки в `src/components/Breadcrumbs.astro` вместе со стилями `.crumbs*`, типографику текста из Markdown — в класс `.copy` в `@layer components` файла `src/index.css` (research R8); `src/components/ServicePage.astro` использует оба, разметка и классы страниц услуг не меняются; правила `order` и `.insert` остаются в `ServicePage.astro`
- [ ] T012 Создать `src/components/MapLinks.astro`: `<aside>` с `SectionHeading` из словаря `src/i18n/guide.ts` и списком ссылок `linksFrom` страницы; рёбер к собранным страницам нет — компонент ничего не выводит; адрес со слешем, текст — `displayAnchor` (depends on T005, T006, T009)
- [ ] T013 [P] Добавить литералы в `tests/support/site.ts` по research R10, не включая их пока в `allPages`: `GUIDE_PAGES` (путь, язык, вид, категория, slug, языки страницы) для четырёх адресов пилота, `EXPERT_PAGES` для `/lada/` и `/ru/lada/`, запросы статьи («депіляція чи епіляція», «депиляция и эпиляция»), запреты хаба из [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) §Head, `GUIDE_COPY_SELECTOR = '[data-guide-copy]'`, `EXPERT_COPY_SELECTOR = '[data-expert-copy]'`; `queryOf` проверяет запрос по виду страницы и для действующих страниц возвращает прежнее
- [ ] T014 [P] Добавить в `scripts/test-invalid-data.mjs` помощники для добавленного и перемещённого файла: добавленный удаляется, перемещённый возвращается в `finally`; действующие случаи не меняются

**Checkpoint**: `npm run check`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:e2e` зелёные; сайт собирается теми же 22 файлами, новых адресов ещё нет

---

## Phase 3: User Story 1 - Answer to "depilation or epilation" (Priority: P1) 🎯 MVP

**Goal**: статья `/guide/depilation/vs-epilation/` и `/ru/guide/depilation/vs-epilation/` с хабом депиляции, без которого статья не собирается (FR-004); ссылки статьи и хаба из карты, разметка `Article` / `CollectionPage`, 404 на корень раздела

**Independent Test**: в собранном сайте статья на обоих языках отвечает 200, запрос стоит в заголовке, описании, `h1` и первом абзаце, ссылка ведёт на `/depilation/` своего языка; `hreflang` — uk, ru, `x-default` → uk; `/guide/` и `/ru/guide/` — 404

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [US1] Включить четыре страницы базы знаний из `GUIDE_PAGES` в `allPages` в `tests/support/site.ts`: их сразу покрывают `routes`, `sitemap`, `llms`, уникальность пары «заголовок + описание», превью, хост, `headings`, запрет «майстерня», `build-output`
- [ ] T016 [P] [US1] Добавить в `tests/routes.spec.ts` ожидание 404 на `/guide/`, `/ru/guide/` и `/en/guide/depilation/vs-epilation/` (preview; прод — T035 и quickstart.md шаг 5)
- [ ] T017 [P] [US1] Добавить в `tests/voice.spec.ts`: у статьи запрос в `<title>`, `<h1>`, первой половине описания и первом абзаце `[data-guide-copy]`; у хаба в `<title>`, `<h1>` и описании нет ни одной запрещённой формулировки своего языка
- [ ] T018 [P] [US1] Добавить в `tests/seo-contract.spec.ts` проверки [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) §Checks для хаба и статьи: `hreflang` по языкам `GUIDE_PAGES` и правило `x-default`; `Article.author['@id']` равен `@id` основательницы главной своего языка, `publisher['@id']` — `@id` организации; `datePublished <= dateModified`; видимые `<time datetime>` равны датам JSON-LD; `BreadcrumbList` повторяет видимые крошки; `CollectionPage.hasPart` — адреса статей списка хаба в его порядке; ≥ 400 слов в `[data-guide-copy]` статьи; абзацы статьи и хаба не повторяют другие страницы своего языка; нет `FAQPage`
- [ ] T019 [P] [US1] Создать `tests/links.spec.ts`: читает `docs/seo/map.md`; для каждого ребра, у которого `from` — страница базы знаний или эксперта, а обе страницы есть в `allPages`, в HTML страницы `from` есть `<a href=to>` с текстом, равным анкору после trim, схлопывания пробелов и нижнего регистра; каждая внутренняя ссылка новых страниц, включая ссылки тела Markdown, ведёт на адрес из `allPages` в форме со слешем
- [ ] T020 [P] [US1] Перевести `tests/sitemap.spec.ts` с разбиения «три или две альтернативы» на ожидание по языкам страницы из `tests/support/site.ts`: у страницы на одном языке альтернатив нет (research R6)
- [ ] T021 [P] [US1] Добавить в `tests/build-output.spec.ts`: каталоги `dist/` без `index.html` — ровно `_astro/`, `guide/`, `ru/guide/`; для `guide/` в `dist/.htaccess` и для `ru/guide/` в `dist/ru/.htaccess` есть правило `RedirectMatch 404` ([contracts/routes.md](contracts/routes.md) §Directories without index)
- [ ] T022 [P] [US1] Включить хаб и статью обоих языков в области `tests/contrast.spec.ts` и `tests/typography.spec.ts` (мера колонки, контраст текста и блока ссылок)

### Content for User Story 1

- [ ] T023 [P] [US1] Проверить источники в `specs/007-knowledge-base-pilot/research.md` §Sources по правилам R11: открыть каждую страницу, вписать дословную цитату и дату; FDA «Removing Hair Safely» открыть в первоисточнике на fda.gov, Healthline — по адресу статьи; найти второй источник для списка методов депиляции; строка без открытого источника остаётся `кандидат`, и её утверждение в текст не идёт
- [ ] T024 [US1] Написать статью `src/content/guide/uk/depilation/vs-epilation.md` (depends on T023): frontmatter по [contracts/content-files.md](contracts/content-files.md) §Frontmatter (`page: depilation-vs-epilation`, `title` в форме `<текст> — Lada N` ≤ 70 знаков, `description` 120–160 знаков с запросом в первой половине, `heading`, временные даты — день написания); первый абзац отвечает формулировкой FR-012 и содержит «депіляція чи епіляція»; следом — оговорка о терминах; методы обоих способов, срок результата и ощущения; что делает студия — только строки research.md §Practice claims; эпиляции в студии нет; не меньше 400 слов; «ми» студии, Лада только в третьем лице, личный опыт Лады — нейтральной формой; ни одного утверждения без строки §Sources или §Practice claims; ссылки тела — в форме со слешем
- [ ] T025 [US1] Написать `src/content/guide/ru/depilation/vs-epilation.md` — перевод T024 с запросом «депиляция и эпиляция» в тех же четырёх местах, тот же `page`, те же даты
- [ ] T026 [P] [US1] Написать хаб `src/content/guide/uk/depilation.md`: `page: depilation-guide`, `title`, `heading` и `description` называют тему раздела без «депіляція у Києві», «воскова депіляція», «депіляція чи епіляція»; вступление — от «ми», абзацы не повторяют страницу `/depilation/`; даты как у T024
- [ ] T027 [P] [US1] Написать хаб `src/content/guide/ru/depilation.md` — перевод T026 без «депиляция в Киеве», «депиляция воском», «депиляция и эпиляция»

### Implementation for User Story 1

- [ ] T028 [P] [US1] Создать `src/data/guide-structured-data.ts`: `Article`, `CollectionPage` и `BreadcrumbList` по [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) §Article, §Hub; `author` — узел `founderNode(locale)` с `@id`, `name`; `publisher` — `@id` организации главной с `name` и `url`; даты `YYYY-MM-DD`; `hasPart` — статьи хаба в порядке списка
- [ ] T029 [US1] Научить `src/components/SeoHead.astro` страницам `kind: 'guide'`: `<title>`, описание из frontmatter, `hreflang` и `og:locale:alternate` из `pageLocales`, `og:type` `website`, один `<script type="application/ld+json">` с `@graph` из T028 (depends on T028)
- [ ] T030 [P] [US1] Создать `src/components/GuideArticle.astro`: `Section rhythm="air"`, колонка `max-w-4xl`, `Breadcrumbs` «главная → хаб → статья» (`nav.home`, `heading` хаба), `<h1>`, даты публикации и правки в `<time datetime="YYYY-MM-DD">` с `Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })` (research R9), тело в `.copy` с `data-guide-copy`, `MapLinks` после текста; без `<script>`
- [ ] T031 [P] [US1] Создать `src/components/GuideHub.astro`: крошки «главная → хаб», `<h1>`, вступление в `.copy` с `data-guide-copy`, список `articlesOf(locale, category)` с текстом анкора ребра «хаб → статья», затем `MapLinks` с остальными рёбрами ([contracts/links.md](contracts/links.md) §Placement); без `<script>`
- [ ] T032 [US1] Создать маршруты `src/pages/guide/[...slug].astro` и `src/pages/ru/guide/[...slug].astro`: `getStaticPaths` из `guideStaticPaths(locale)`, страница выбирает `GuideHub` или `GuideArticle` по виду и передаёт `GuidePageRef` в `BaseLayout` (depends on T029, T030, T031)
- [ ] T033 [P] [US1] Добавить `RedirectMatch 404 ^/guide/?$` в `public/.htaccess` и `RedirectMatch 404 ^/ru/guide/?$` в `public/ru/.htaccess` с однострочным комментарием «почему» по-русски (research R5: без правила Apache отвечает 403)
- [ ] T034 [P] [US1] Обновить `public/llms.txt` по [contracts/routes.md](contracts/routes.md) §llms.txt: раздел `## Knowledge base` между `## Pages` и `## Services` с абсолютными адресами хаба и статьи на uk и ru; вводная часть без счёта страниц и с прайсом только у страниц услуг; строка `Sitemap` — «all pages with their language alternates»
- [ ] T035 [P] [US1] Добавить в шаг `smoke` файла `.github/workflows/publish.yml` проверки 404 на `$SITE_ORIGIN/guide/` и `$SITE_ORIGIN/ru/guide/` и `lang="ru"` в ответе на `/ru/guide/` ([contracts/routes.md](contracts/routes.md) §Post-deploy checks)
- [ ] T036 [US1] Прогнать `npm run build && npx playwright test tests/routes.spec.ts tests/voice.spec.ts tests/seo-contract.spec.ts tests/links.spec.ts tests/sitemap.spec.ts tests/llms.spec.ts tests/build-output.spec.ts tests/headings.spec.ts tests/contrast.spec.ts tests/typography.spec.ts`: всё, что T015–T022 сделали красным, зелёное

**Checkpoint**: статья и хаб пилота собраны и проходят свои проверки; подписи и страницы эксперта ещё нет

---

## Phase 4: User Story 2 - Who answers for the text (Priority: P2)

**Goal**: страница эксперта `/lada/` и `/ru/lada/`, подпись Лады в статье со ссылкой на неё, `ProfilePage` и общий узел основательницы

**Independent Test**: из статьи по подписи открывается `/lada/` своего языка; на `/lada/` статья есть в списке; `Article.author['@id']` и `ProfilePage.mainEntity['@id']` равны `@id` основательницы главной

### Tests for User Story 2 ⚠️

- [ ] T037 [US2] Включить `EXPERT_PAGES` в `allPages` в `tests/support/site.ts`
- [ ] T038 [P] [US2] Добавить в `tests/routes.spec.ts` ожидание 404 на `/en/lada/`
- [ ] T039 [P] [US2] Добавить в `tests/voice.spec.ts`: «Лада Новикова» в `<title>`, `<h1>` и описании эксперта; на каждой статье подпись — `signatureName` и `signatureRole` из `ABOUT` своего языка — ведёт на `/lada/` или `/ru/lada/`
- [ ] T040 [P] [US2] Добавить в `tests/seo-contract.spec.ts`: `ProfilePage` с `mainEntity['@id']`, равным `@id` основательницы главной своего языка; `author.url` статьи и `mainEntity.url` — страница эксперта своего языка; у эксперта нет `BreadcrumbList` и видимых крошек; `hreflang` эксперта — uk, ru, `x-default` → `/lada/`; ни один абзац `[data-expert-copy]` не совпадает с абзацем `[data-about-copy]` главной своего языка; список статей эксперта равен статьям `GUIDE_PAGES` его языка
- [ ] T041 [P] [US2] Включить `/lada/` и `/ru/lada/` в области `tests/contrast.spec.ts` и `tests/typography.spec.ts`

### Content for User Story 2

- [ ] T042 [P] [US2] Написать `src/content/expert/uk.md` и `src/content/expert/ru.md`: `title` «Лада Новикова: … — Lada N» ≤ 70 знаков, `description` 120–160 знаков с «Лада Новикова», `heading: "Лада Новикова"`; тело в третьем лице — только факты [contracts/content-files.md](contracts/content-files.md) §Expert facts; без стажа, курсов, сертификатов и обещаний лечения ([docs/specs/voice.md](../../docs/specs/voice.md)); ни одна фраза не говорит, что депиляцию или перманент делает Лада; ни один абзац не повторяет и не пересказывает «Про нас» своего языка

### Implementation for User Story 2

- [ ] T043 [P] [US2] Создать `src/data/expert.ts`: `expertCopy(locale)` по образцу `aboutCopy` в `src/data/about.ts`; нет файла — исключение «нет текста страницы эксперта: src/content/expert/<lang>.md»
- [ ] T044 [US2] Добавить в `src/data/guide-structured-data.ts` `ProfilePage` по [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) §Expert и `"url": "E"` к узлу основательницы в `Article.author` и `ProfilePage.mainEntity`; научить `src/components/SeoHead.astro` странице `kind: 'expert'` (depends on T043)
- [ ] T045 [US2] Создать `src/components/ExpertPage.astro`: портрет из `portrait()` (`src/data/gallery.ts`) с `alt` своей локали, `<h1>`, текст в `.copy` с `data-expert-copy`, список `guideIndex().articles(locale)` — `heading` статьи и дата публикации; без крошек и без `<script>` (depends on T043)
- [ ] T046 [US2] Создать маршруты `src/pages/lada.astro` и `src/pages/ru/lada.astro` с `ExpertPageRef` (depends on T044, T045)
- [ ] T047 [US2] Добавить подпись в `src/components/GuideArticle.astro`: под `<h1>`, рядом с датами — `signatureName` и `signatureRole` из `aboutCopy(locale)` ссылкой на страницу эксперта своего языка ([contracts/links.md](contracts/links.md) §Placement)
- [ ] T048 [P] [US2] Добавить `/lada/` и `/ru/lada/` в раздел `## Knowledge base` файла `public/llms.txt`
- [ ] T049 [US2] Прогнать `npm run build && npx playwright test tests/routes.spec.ts tests/voice.spec.ts tests/seo-contract.spec.ts tests/links.spec.ts tests/sitemap.spec.ts tests/llms.spec.ts tests/headings.spec.ts tests/contrast.spec.ts tests/typography.spec.ts`: зелёные

**Checkpoint**: истории 1 и 2 работают вместе; подпись ведёт на собранную страницу эксперта

---

## Phase 5: User Story 3 - From a category to the knowledge base (Priority: P2)

**Goal**: блок «категория → хаб» на `/depilation/` и `/ru/depilation/` из рёбер карты; три другие категории блока не получают

**Independent Test**: на `/depilation/` и `/ru/depilation/` есть ссылка на хаб своего языка вне `[data-service-copy]`; на `/massage/`, `/permanent/`, `/beauty/` и их ru-версиях ссылок в `/guide/` нет

### Tests for User Story 3 ⚠️

- [ ] T050 [P] [US3] Расширить общее правило `tests/links.spec.ts` на рёбра, у которых `from` — страница услуги, и добавить явные ожидания [contracts/links.md](contracts/links.md) §Pilot edges для категорий: `/depilation/` → `/guide/depilation/` с текстом «Депіляція», `/ru/depilation/` → `/ru/guide/depilation/` с «Депиляция»; ссылка стоит после `[data-service-copy]` и вне его; на остальных категориях и подстраницах всех языков ссылок на `/guide/` и `/ru/guide/` нет

### Implementation for User Story 3

- [ ] T051 [US3] Вставить `MapLinks` в `src/components/ServicePage.astro` сразу после `.service-copy`, вне `[data-service-copy]`; тексты категорий в `src/content/services/` не правятся; объём слов категории в `seo-contract` не меняется
- [ ] T052 [US3] Прогнать `npm run build && npx playwright test tests/links.spec.ts tests/seo-contract.spec.ts tests/contrast.spec.ts tests/typography.spec.ts tests/content-parity.spec.ts`: зелёные

**Checkpoint**: вход в раздел с категории работает; шапка сайта не менялась

---

## Phase 6: User Story 4 - Next article without template changes (Priority: P3)

**Goal**: следующая статья добавляется файлами и правками по списку мест, а порча останавливает сборку с именем файла

**Independent Test**: `npm run test:invalid-data` проходит каждый случай [quickstart.md](quickstart.md) §3 и восстанавливает дерево; допустимая вторая статья появляется в хабе, у эксперта и в карте сайта без правки шаблонов

### Tests for User Story 4 ⚠️

- [ ] T053 [US4] Добавить в `scripts/test-invalid-data.mjs` случаи остановок по [quickstart.md](quickstart.md) §3 с проверкой выделенной части сообщения [contracts/content-files.md](contracts/content-files.md) §Build stops: удалена ru-статья (№ 9); удалён ru-хаб (№ 8); добавлен `uk/depilation/copy.md` с `page: depilation-vs-epilation` (№ 6); ru-статья перемещена в `ru/depilation/other.md` (№ 7); `modified` раньше `published` (№ 1); `slug:` во frontmatter (№ 2); добавлены `uk/depilation/vs-epilation/deep.md` (№ 3), `en/depilation.md` (№ 4), `uk/nails.md` (№ 5); `page` нет в карте (№ 10); удалено ребро `depilation-guide → depilation-vs-epilation` uk из `docs/seo/map.md` (№ 11); нет `src/content/expert/ru.md` (№ 13)
- [ ] T054 [US4] Добавить в `scripts/test-invalid-data.mjs` допустимый случай: добавлен `src/content/guide/uk/depilation/aftercare.md` с `page: depilation-aftercare` → сборка проходит; `/guide/depilation/aftercare/` есть в списке `/guide/depilation/`, в списке `/lada/` и в `sitemap-0.xml`; его `hreflang` — только `uk` и `x-default`; на `/ru/guide/depilation/` и `/ru/lada/` его нет

### Implementation for User Story 4

- [ ] T055 [US4] Довести `src/data/guide.ts`, `src/data/seo-map.ts` и `src/data/expert.ts` до прохождения T053 и T054: порядок остановок и тексты сообщений — ровно как в контракте, шаблоны и маршруты не правятся
- [ ] T056 [US4] Записать в `docs/specs/routes.md` рядом со списком подстраниц список «Новая статья — правка во всех местах» (FR-016) из [plan.md](plan.md) §Structure Decision: семь мест и какие из них ловит прогон, какие — только вычитка
- [ ] T057 [US4] Прогнать `npm run test:invalid-data`: `✓` на каждом случае, `git status` после прогона чистый

**Checkpoint**: все четыре истории работают; база знаний расширяется без кода

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: живые документы, ADR, даты пилота, ручная приёмка и гейты

- [ ] T058 [P] Написать `docs/adr/adr-029-knowledge-base-collection-links-from-seo-map.md` по `docs/adr/adr-template.md` (номер 029 выдан get-id 2026-10-18): решение из [plan.md](plan.md) §ADR decision и четыре `- **Rejected: …**` оттуда же — TS-реестр, корень `/guide/`, анкоры копией, флаг черновика
- [ ] T059 [P] Перенести в `docs/specs/routes.md` строки [contracts/routes.md](contracts/routes.md) и [contracts/links.md](contracts/links.md): маршруты раздела и эксперта со ссылкой на ADR-029, `/guide/` → 404 и причина 403, §Directories without index, правило вывода ссылок из карты, `llms.txt`, «двадцать пять страниц» карты сайта и альтернативы по языкам страницы
- [ ] T060 [P] Обновить `docs/specs/page-head.md`: `hreflang` по существующим версиям страницы и правило `x-default`; строки запросов статьи и эксперта в §Целевые запросы; хаб без запроса ядра и таблица его запретов; форма заголовка новых страниц
- [ ] T061 [P] Обновить `docs/specs/structured-data.md`: разделы `Article`, `CollectionPage`, `ProfilePage` и `founderNode(locale)` как общий источник `founder` главной, автора статьи и предмета страницы эксперта
- [ ] T062 [P] Добавить `docs/specs/content-model.md` §Knowledge base: раскладка файлов, frontmatter и даты, таблица остановок сборки, §Claim kinds, §Expert facts и место для §Sources / §Practice claims (таблицы переносятся при `/speckit-retire`)
- [ ] T063 [P] Обновить `docs/specs/voice.md`: подпись статьи «Лада Новикова, засновниця студії» / «основательница студии», статьи и хаб — от «ми», Лада на `/lada/` — в третьем лице; в строку **Code** — `src/content/guide/`, `src/content/expert/`
- [ ] T064 [P] Обновить `docs/runbook-deploy.md`: в списке проверок после выкладки — 404 на `/guide/` и `/ru/guide/` и `lang="ru"`; в таблице статусов — «ошибка, сайт не изменён» с `docs/seo/map.md` или `src/content/guide/` в журнале: карта разошлась с контентом, правку карты откатить или довести `/seo map` в ветке
- [ ] T065 [P] Добавить в `CLAUDE.md` §Что открыть строку: `docs/seo/map.md`, `src/content/guide/` → [docs/specs/content-model.md](../../docs/specs/content-model.md) — сборка читает карту: переименование `page`, смена адреса или удаление ребра «хаб → статья» останавливает публикацию, в том числе галочку Лады, а правка анкора в `main` меняет текст ссылки на сайте со следующей публикацией
- [ ] T066 Поставить `published` и `modified` — день слияния ветки в `main` — в `src/content/guide/uk/depilation.md`, `src/content/guide/ru/depilation.md`, `src/content/guide/uk/depilation/vs-epilation.md`, `src/content/guide/ru/depilation/vs-epilation.md` последним коммитом перед слиянием
- [ ] T067 Ручная приёмка по [quickstart.md](quickstart.md) §4 над `dist/`: `validator.schema.org` на шести страницах — 0 ошибок (SC-002); `/seo audit` по собранному сайту — нет `internal-links.5` по новым анкорам, конфликт разводит `/seo map` правкой карты; вычитка текстов по §Text rules, §Claim kinds, §Expert facts — в `research.md` §Sources ни одного кандидата при утверждении в тексте
- [ ] T068 Прогнать семь гейтов из `CLAUDE.md` §Гейты: `npm run check && npm run lint && npm run test:unit && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze` — все зелёные (SC-005); `npm run analyze` подтверждает ноль байт нового клиентского JS

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: зависимостей нет
- **Foundational (Phase 2)**: после Setup; блокирует все истории
- **User Stories (Phase 3+)**: после Foundational
  - US1 — первой: хаб и статья — то, на что ссылаются подпись (US2), блок категории (US3) и допустимая вторая статья (US4)
  - US2 и US3 — после US1, друг от друга не зависят
  - US4 — после US2: допустимый случай проверяет список статей на `/lada/`
- **Polish (Final Phase)**: после всех историй; T066 — последний коммит перед слиянием, T068 — после T066

### User Story Dependencies

- **User Story 1 (P1)**: после Foundational; без зависимостей от других историй
- **User Story 2 (P2)**: после US1 — подпись ставится в `GuideArticle.astro`, список эксперта перечисляет статьи пилота
- **User Story 3 (P2)**: после US1 — блоку категории нужен собранный хаб; от US2 не зависит
- **User Story 4 (P3)**: после US1 и US2

### Within Each User Story

- Проверки пишутся первыми и краснеют до реализации
- Источники (T023) — до текста статьи (T024), uk-текст — до ru-перевода
- Данные и JSON-LD — до `SeoHead.astro`, компоненты — до маршрутов
- История закрывается прогоном своих проверок до перехода к следующей

### Parallel Opportunities

- Setup: T002, T003
- Foundational: T004, T006, T007, T011, T013, T014 — разные файлы; T005 → T009 → T012 и T008 → T010 — цепочки
- US1: проверки T016–T022; источники T023 параллельно с проверками; хабы T026, T027; T028, T030, T031, T033, T034, T035
- US2: T038–T042, T043, T048
- US3 и US2 можно вести параллельно после US1: пересекаются только `tests/links.spec.ts` (T050) и `tests/seo-contract.spec.ts` (T040), поэтому эти две задачи — последовательно
- Polish: T058–T065

---

## Parallel Example: User Story 1

```bash
# Проверки истории 1 — вместе, после T015:
Task: "T016 404 на корне раздела в tests/routes.spec.ts"
Task: "T017 запрос статьи и запреты хаба в tests/voice.spec.ts"
Task: "T018 заголовочная часть и JSON-LD в tests/seo-contract.spec.ts"
Task: "T019 связи карты в tests/links.spec.ts"
Task: "T020 альтернативы по языкам в tests/sitemap.spec.ts"
Task: "T021 каталоги без index.html в tests/build-output.spec.ts"

# Независимые файлы реализации — вместе:
Task: "T028 src/data/guide-structured-data.ts"
Task: "T030 src/components/GuideArticle.astro"
Task: "T031 src/components/GuideHub.astro"
Task: "T033 public/.htaccess и public/ru/.htaccess"
Task: "T034 public/llms.txt"
Task: "T035 .github/workflows/publish.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: T036 зелёный, статья и хаб открываются в `astro preview`
5. В `main` не сливать: статья без подписи эксперта не выполняет FR-006, а всё из `main` уходит на сайт со следующей публикацией. Слияние — только после US1–US4 и Polish

### Incremental Delivery

1. Setup + Foundational → сайт собирается как прежде, разбор карты и индекс готовы
2. US1 → статья и хаб
3. US2 → эксперт и подпись
4. US3 → вход с категории
5. US4 → проверки порчи и список мест для следующей статьи
6. Polish → документы, даты, приёмка, гейты → слияние одним MR `feat(guide): …`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group (`/commit`)
- После выкладки, вне задач пакета: проверки [quickstart.md](quickstart.md) шаг 5 на проде; `/seo map` сверяет карту с сайтом и переводит страницы пилота в `published`; через 8 недель — показы статьи в Search Console на каждом языке (SC-003)
