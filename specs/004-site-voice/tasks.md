---

description: "Task list for 004-site-voice"
---

# Tasks: Site voice and SEO copy

**Input**: Design documents from `/specs/004-site-voice/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page-copy.md, quickstart.md

**Tests**: запрошены — FR-020 требует автоматической проверки по собранному сайту; проверки пишутся раньше реализации своей истории и должны сначала падать.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Один проект: `src/`, `tests/`, `scripts/`, `docs/`, `public/` в корне репозитория.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: база для сравнения до первой правки

- [X] T001 Снять состав загруженных начертаний до правки: `npm run build`, `npm run preview` (порт 4329), на `/` и `/ru/` собрать из `document.fonts` записи со статусом `loaded` как тройки «гарнитура, начертание, насыщенность»; записать литерал `HOME_FONT_FACES` в tests/support/site.ts с комментарием, что снят на `main` 95d57b5 (research.md §R1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: эталоны проверок и каркас нового файла проверок

- [X] T002 Добавить в tests/support/site.ts литералы по contracts/page-copy.md: `FORBIDDEN_NAME = /майстерн|мастерск|workshop/i`; `QUERY_MAP: Record<path, RegExp[]>` для всех пятнадцати страниц (первое выражение — основное, все с флагом `i`); `ABOUT_COPY_SELECTOR = '[data-about-copy]'`; `ABOUT: Record<Locale, { heading; signatureName; signatureRole }>` — «Масаж від реабілітолога» / «Массаж от реабилитолога» / «Massage by a rehabilitation specialist», «Лада Новикова» / «Лада Новикова» / «Lada Novikova», «засновниця студії» / «основательница студии» / «founder of the studio»; `FOUNDER_ROLE` — «засновниця студії, масажистка» / «основательница студии, массажистка» / «founder, massage therapist»; `ALUMNI = { name: 'Національний університет фізичного виховання і спорту України', sameAs: 'https://uni-sport.edu.ua/' }`; экспортировать `countWords(text)` тем же способом, что в tests/seo-contract.spec.ts:372 (`normalize(...).split(' ').filter(Boolean)`), и перевести seo-contract.spec.ts на него
- [X] T003 Создать tests/voice.spec.ts с описанием набора и ссылкой на docs/specs/voice.md и contracts/page-copy.md (проверки добавляются в фазах историй)

**Checkpoint**: эталоны на месте — истории можно вести

---

## Phase 3: User Story 1 - Посетитель узнаёт, кто стоит за студией (Priority: P1) 🎯 MVP

**Goal**: секция «Про нас» — подписанное обращение Лады от первого лица, 150–250 слов, на трёх языках

**Independent Test**: собрать сайт; на `/`, `/ru/`, `/en/` в `#about` тело `[data-about-copy]` 150–250 слов, `h2` = `ABOUT[locale].heading`, подпись вне тела; `test:invalid-data` роняет сборку без файла обращения

### Tests for User Story 1

- [X] T004 [P] [US1] В tests/voice.spec.ts для `homePages`: `#about [data-about-copy]` — `150 <= countWords <= 250`; `#about h2` = `ABOUT[locale].heading`; текст `#about` вне `[data-about-copy]` содержит `signatureName` и `signatureRole` локали; в `[data-about-copy]` подписи нет
- [X] T005 [P] [US1] В scripts/test-invalid-data.mjs добавить случай «отсутствующий файл обращения»: файл `src/content/about/uk.md`, `corrupt: (path) => rmSync(path)`, `expect: /нет обращения: src\/content\/about\/uk\.md/`

### Implementation for User Story 1

- [X] T006 [US1] В src/content.config.ts добавить коллекцию `about`: `glob({ pattern: `+(${locales.join('|')}).md`, base: './src/content/about' })`, схема `heading`, `signatureName`, `signatureRole` — каждое `translation` (непустое, хотя бы один видимый знак); docstring — одна строка WHY со ссылкой на `serviceCopy`, почему отсутствие ловится не схемой
- [X] T007 [US1] Создать src/data/about.ts: `aboutCopy(locale): Promise<CollectionEntry<'about'>>` через `getEntry('about', locale)`; нет записи → `throw new Error('нет обращения: src/content/about/<locale>.md')` (образец — src/data/services.ts)
- [X] T008 [P] [US1] Написать src/content/about/uk.md, ru.md, en.md: frontmatter из `ABOUT` (data-model.md §Обращение основательницы); тело — только абзацы, 150–250 слов, от первого лица единственного числа, на «ви»/«вы»/«you», по порядку FR-004: образование (фізичний реабілітолог, НУФВСУ) и «масаж веду сама» → масаж строится от задачи, а не от названия в прайсе → студия: команда майстрів без имён, четыре направления, Мала Житомирська біля Майдану → приглашение и запись по телефону. Запрещено: стаж, сертификаты, награды (FR-005); «лікую», «діагностую», «відновлю після травми» и любые обещания лечения (FR-006); слова «майстерня/мастерская/workshop»; HTML-комментарии (Markdown выводится в `dist/` как есть — конституция §Quality Gates)
- [X] T009 [US1] Переписать src/components/About.astro: `aboutCopy(locale)` + `render`; `SectionHeading eyebrow={t.about.title} title={entry.data.heading}`; `<div class="about__body" data-about-copy><Content /></div>`; первый абзац тела — оформление `lede` селектором `.about__body > :global(p:first-child)`; после тела — прежняя линия `.rule.rule--draw.about__rule` и подпись `<p class="about__close">{signatureName}, {signatureRole}</p>` вне `data-about-copy`; обновить docstring компонента (надзаголовок и заголовок теперь из разных источников)
- [X] T010 [US1] В src/i18n/ui.ts удалить `about.heading`, `about.text1`…`about.text4` во всех трёх локалях; `about.title` оставить
- [X] T011 [US1] В tests/fixtures/legacy-content.json удалить на каждом языке строку заголовка «Про нас» и четыре абзаца (uk строки 11–15 и эквиваленты ru/en) — тем же коммитом, что T009–T010 (docs/specs/content-model.md §Фикстура прежнего контента)
- [X] T012 [US1] В docs/specs/content-model.md добавить раздел об обращении: три файла `src/content/about/<locale>.md`, поля frontmatter, 150–250 слов в `[data-about-copy]`, отсутствие файла роняет сборку в `aboutCopy`

**Checkpoint**: US1 проходит `npm run build && npx playwright test tests/voice.spec.ts tests/content-parity.spec.ts tests/typography.spec.ts tests/fonts.spec.ts` и `npm run test:invalid-data`

---

## Phase 4: User Story 2 - Единое название и единый голос по всему сайту (Priority: P2)

**Goal**: «майстерня/мастерская/workshop» нет нигде; студия везде «студія»

**Independent Test**: на 18 собранных файлах (`builtPages`) и в `/llms.txt` ноль совпадений `FORBIDDEN_NAME`

### Tests for User Story 2

- [X] T013 [P] [US2] В tests/voice.spec.ts: для каждого из `builtPages` полный HTML ответа (текст и `<head>`) не совпадает с `FORBIDDEN_NAME`; то же для ответа `/llms.txt`

### Implementation for User Story 2

- [X] T014 [US2] В src/i18n/ui.ts заменить `hero.subtitle`: «Студія масажу та краси в центрі Києва» / «Студия массажа и красоты в центре Киева» / «Massage and beauty studio in central Kyiv»
- [X] T015 [US2] В src/i18n/ui.ts переписать `meta.title` и `meta.description` трёх локалей по contracts/page-copy.md: заголовок `«Студія масажу та краси в центрі Києва — Lada N»` и эквиваленты (≤ 70 знаков, форма «… — Lada N»); описание 120–160 знаков, основная формулировка карты в первой половине, без «майстерня/мастерская»
- [X] T016 [US2] В tests/fixtures/legacy-content.json удалить строку подзаголовка первого экрана на трёх языках («Майстерня масажу та краси», «Мастерская массажа и красоты», «Massage & Beauty Studio») — тем же коммитом, что T014
- [X] T017 [US2] Создать docs/specs/voice.md по форме docs/specs/reference-template.md: название («Lada N — студія Лади Новикової», запрещённые слова и почему «майстер» разрешён), кто говорит («Про нас» — «я» Лады с подписью; остальное — «ми» команды; Лада вне секции — в третьем лице), «ви», мастера без имён (ссылка на ADR), только образование из биографии, лечение не обещается (лицензии нет, автор 2026-09-27); раздел «Не измеряется»: тон, первое лицо, «ми» в текстах категорий, отсутствие обещаний лечения; ссылки на проверки tests/voice.spec.ts
- [X] T018 [US2] В CLAUDE.md добавить строку карты: «тексты, название студии, «Про нас», подписи» → docs/specs/voice.md, «потому что: «майстерня» запрещена во всех выводах, включая llms.txt; обращение Лады без биографии сверх образования»

**Checkpoint**: US2 проходит `npx playwright test tests/voice.spec.ts tests/content-parity.spec.ts tests/seo-contract.spec.ts`

---

## Phase 5: User Story 3 - Страница находится по своему запросу (Priority: P2)

**Goal**: заголовок окна, главный заголовок, описание и первый абзац каждой страницы — по карте запросов

**Independent Test**: для пятнадцати страниц выполняются все правила contracts/page-copy.md §Заголовок окна, §Описание, §Главный заголовок, §Текст категории; LCP `/` и `/ru/` ≤ 2.5 с

### Tests for User Story 3

- [ ] T019 [P] [US3] В tests/voice.spec.ts для `allPages`: `title` совпадает с `/^.+ — Lada N$/` и длина ≤ 70; каждое выражение `QUERY_MAP[path]` находится в `title`, в тексте единственного `h1` и в `description`; индекс основного выражения в `description` < `description.length / 2`
- [ ] T020 [P] [US3] В tests/voice.spec.ts для `categoryPages`: первый `<p>` в `[data-service-copy]` содержит каждое выражение карты; depilation — `[data-service-copy]` совпадает с `/шугаринг|sugaring/i`; massage — в `[data-service-copy]` есть `<a>` с `href` = путь главной локали + `#about` (`/#about`, `/ru/#about`, `/en/#about`)
- [ ] T021 [P] [US3] В tests/voice.spec.ts для `homePages`: `h1` содержит `.display` с текстом «Lada N» и `.hero__sub` со строкой первого экрана; вне `h1` элемента `.hero__sub` нет; состав загруженных начертаний на `/` и `/ru/` равен `HOME_FONT_FACES` (меряется вся страница — надмножество требования FR-015 о первом экране)

### Implementation for User Story 3

- [ ] T022 [US3] В src/components/Hero.astro: `<h1 class="hero__title"><span class="display">{t.hero.title}</span> <span class="hero__sub">{t.hero.subtitle}</span></h1>`, отдельный `<p class="hero__sub">` удалить; `.hero__title { display: grid; gap: inherit; }`, `.hero__sub { display: block; }` — гарнитура, начертание, размер и цвет прежние (FR-015); поправить docstring и комментарий `--primary` (подзаголовок теперь внутри заголовка)
- [ ] T023 [P] [US3] src/content/services/{uk,ru,en}/massage.md: `title`, `description`, `heading` по карте (`масаж`/`массаж`/`massage` + город; `title` ≤ 70, «… — Lada N»; `description` 120–160, основная формулировка в первой половине); первый абзац с запросом; абзац о том, что масаж ведёт Лада, реабилитолог за освітою, в третьем лице, со ссылкой `[…](/#about)` / `(/ru/#about)` / `(/en/#about)`; ≥ 400 слов, без повторов с другими страницами локали. Во всех T023–T026: без обещаний лечения, диагностики и восстановления после травм (FR-006) — образование Лады называется, результат не обещается
- [ ] T024 [P] [US3] src/content/services/{uk,ru,en}/depilation.md: то же по карте (`депіляці`+`шугаринг`/`депиляци`+`шугаринг`/`waxing`+`sugaring` + город); `heading` с городом (сейчас «Депіляція воском і цукровою пастою» без него); шугаринг назван синонимом депіляції цукровою пастою; хотя бы один подзаголовок `##` называет услугу
- [ ] T025 [P] [US3] src/content/services/{uk,ru,en}/permanent.md: то же по карте (`перманентн… макіяж`/`макияж`/`permanent makeup` + город; пудрові брови во втором ряду); `heading` с городом
- [ ] T026 [P] [US3] src/content/services/{uk,ru,en}/beauty.md: то же по карте (`ламінуванн`+`макіяж`/`ламинировани`+`макияж`/`lamination`+`makeup` + город); `heading` с городом
- [ ] T027 [US3] В docs/specs/page-head.md добавить раздел «Целевые запросы»: одна основная формулировка на страницу, таблица карты (ссылка на tests/support/site.ts как на эталон), форма «… — Lada N» и ≤ 70 знаков, основная формулировка в первой половине описания, запросы выбраны 2026-09-27 без статистики — перепроверить по данным Search Console
- [ ] T028 [US3] Перемерить первый экран по docs/specs/home-hero.md §Производительность (Lighthouse 12.8.2, мобильный, simulate, прогретый preview 4329, два прогона `/` и `/ru/`, плюс `/en/`); при LCP > 2.5 с сократить `hero.subtitle`; в docs/specs/home-hero.md записать состав `h1` и новую строку замера с датой

**Checkpoint**: US3 проходит `npx playwright test` целиком (включая seo-contract.spec.ts:295, headings.spec.ts, hero.spec.ts)

---

## Phase 6: User Story 4 - Машинный читатель видит основательницу (Priority: P3)

**Goal**: `founder` в `HealthAndBeautyBusiness` главной

**Independent Test**: на трёх главных `founder` соответствует contracts/page-copy.md §Машиночитаемое описание; validator.schema.org без ошибок

**Dependency**: имя основательницы берётся из `aboutCopy(locale).data.signatureName` — нужна коллекция из T006–T008

### Tests for User Story 4

- [ ] T029 [P] [US4] В tests/seo-contract.spec.ts для `homePages`: `business.founder` — `@type` Person, `name` = `ABOUT[locale].signatureName`, `jobTitle` = `FOUNDER_ROLE[locale]`, `image` = `business.image[1]`, `alumniOf` = `{ '@type': 'CollegeOrUniversity', name: ALUMNI.name, sameAs: ALUMNI.sameAs }`

### Implementation for User Story 4

- [ ] T030 [US4] В src/i18n/ui.ts добавить `meta.founderRole`: «засновниця студії, масажистка» / «основательница студии, массажистка» / «founder, massage therapist»
- [ ] T031 [US4] В src/components/SeoHead.astro добавить в `business` узел `founder` по data-model.md §Основательница: `@id` `${canonical}#founder`, `name` из `aboutCopy(locale)`, `jobTitle` из `t.meta.founderRole`, `image` — `absoluteUrl(face.photo.src)` (тот же, что второй элемент `image`), `alumniOf` с именем НУФВСУ и `sameAs: 'https://uni-sport.edu.ua/'` (research.md §R3) — константы рядом с `INSTAGRAM`
- [ ] T032 [US4] В docs/specs/structured-data.md строка таблицы `founder` и источник полей

**Checkpoint**: US4 проходит `npx playwright test tests/seo-contract.spec.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 [P] В public/llms.txt: строка об основательнице (Lada Novikova, physical rehabilitation specialist, graduate of the National University of Ukraine on Physical Education and Sport, leads massage sessions herself) и шугаринг в строке Hair removal; без «workshop»
- [ ] T034 [P] ADR с номерами из get-id (`resolve_project` → `next_id`, тип `ADR`), форма docs/adr/adr-template.md: мастера кроме Лады не называются по именам; `FAQPage` не размечается (research.md §R4 с источниками); отдельных страниц под запросы нет (docs/specs/routes.md); docs/specs/voice.md ссылается на первый
- [ ] T035 Прогнать все гейты: `npm run check`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm run test:invalid-data`, `npm run analyze` — все зелёные
- [ ] T036 Проверить JSON-LD `dist/index.html` и `dist/massage/index.html` валидатором schema.org (quickstart.md §5); результат — в этот файл
- [ ] T037 Закрыть пакет: отметить выполненные задачи в specs/004-site-voice/tasks.md, записать замер LCP и итог валидации

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → истории. T001 обязан пройти до любой правки `src/`: после неё база шрифтов не снимается.
- US1 и US2 независимы. US3 зависит от US2 только в T014 (строка первого экрана) — T022 берёт уже новую строку. US4 зависит от US1 (T006–T008).
- Внутри истории: проверки → данные/схема → компоненты → фикстура → документы. T011 и T016 идут одним коммитом со своей правкой текста.
- Polish — после всех историй; T035 — перед T036–T037.

## Parallel Example: User Story 3

```text
T019, T020, T021 — разные describe в одном файле, пишутся подряд, но независимы по смыслу
T023, T024, T025, T026 — разные файлы категорий, параллельно
```

## Implementation Strategy

MVP — US1: обращение Лады видно и подписано на трёх языках. Затем US2 (название), US3 (запросы и первый экран с перемером), US4 (разметка). Коммит — на каждую историю, фикстура в коммите своей правки.
