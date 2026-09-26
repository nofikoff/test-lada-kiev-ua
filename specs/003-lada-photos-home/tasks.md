---

description: "Task list for 003-lada-photos-home"
---

# Tasks: Лада Новикова на главной — портрет первого экрана и лента работ

**Input**: Design documents from `/specs/003-lada-photos-home/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: тесты запрошены. Спека называет их в SC-001…SC-011, quickstart.md сводит их в таблицу. Тест пишется до реализации своей истории и должен падать.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Один проект: `src/`, `tests/`, `scripts/` в корне репозитория (plan.md §Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: исходники фото в дереве проекта

- [ ] T001 Скопировать 12 исходников из `~/Downloads/_lada.kiev.ua` в `src/assets/gallery/<id>.<исходное расширение>` строго по таблице «Соответствие отбору» в `specs/003-lada-photos-home/data-model.md`. Фото 13 остаётся `.webp`, остальные — `.jpg`. Имя файла равно `id`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: учёт бюджета, данные и строки, от которых зависят все три истории

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Написать тест анализатора бюджета `tests/analyze-bundle.spec.ts` с меткой `@build` на фикстуре `tests/fixtures/bundle/`. Три страницы:
  - встроенный модуль с `gtag('event', …)` засчитывается в бюджет;
  - сниппет счётчика — пара `gtag('js'` + `gtag('config'` и внешний `googletagmanager.com` — не засчитывается;
  - страница с 1537 байтами собственного кода завершает анализатор с кодом ≠ 0.

  Тест обязан падать на текущем анализаторе (research.md §R3).
- [ ] T003 В `scripts/analyze-bundle.mjs`:
  - принимать каталог сборки аргументом, по умолчанию `dist`;
  - заменить `ANALYTICS_MARKERS` признаками сниппета: `['googletagmanager.com']` и `["gtag('js'", "gtag('config'"]`;
  - добавить `CEILING_BYTES = 1536` («1536 несжатых байт», FR-024) рядом с `BUDGET_BYTES` и выходить с кодом 1 при превышении любого порога;
  - обновить шапку файла: SC-005 пакета 002 заменён FR-024 пакета 003.

  T002 должен стать зелёным.
- [ ] T004 Добавить коллекцию `gallery` в `src/content.config.ts`: `file('src/data/gallery.json')`, схема `({ image }) => z.object({ … })`:
  - `photo: image()`;
  - `role: z.enum(['portrait', 'strip'])`;
  - `position: positiveInteger.optional()`;
  - `alt: localized`;
  - `category: z.enum(serviceCategories).optional()`;
  - `focus: z.string().regex(/^\d{1,3}% \d{1,3}%$/)`.

  Комментарий — одна строка о том, почему это коллекция (research.md §R1), без пересказа.
- [ ] T005 Создать `src/data/gallery.json`: 12 записей из data-model.md — `id`, `photo: "../assets/gallery/<файл>"`, `role`, `position`, `category`, `focus`, `alt` из таблицы «Описания», все три языка дословно.
- [ ] T006 Создать `src/data/gallery.ts`: `portrait()` и `strip()` поверх `getCollection('gallery')`. Проверки при сборке, каждая бросает исключение с `id` записи:
  - `portrait` — ровно одна запись, без `position` и `category`;
  - `strip` — `position` 1…N без пропусков и повторов.

  `strip()` возвращает записи, отсортированные по `position`.
- [ ] T026 [P] Дополнить `scripts/test-invalid-data.mjs` тремя порчами `src/data/gallery.json` по образцу существующих случаев: удалён `alt.en` у одной записи, `category: "nails"`, `photo` указывает на несуществующий файл. Каждая должна ронять `npm run build`, откат — в `finally`. `npm run test:invalid-data` зелёный (FR-020).
- [ ] T007 [P] Добавить ключ `gallery` (`eyebrow`, `title`, `region`, `prev`, `next`) в три локали `src/i18n/ui.ts`, значения — из data-model.md §Строки интерфейса. `npm run check` без ошибок.

**Checkpoint**: `npm run build` и `npm run check` зелёные; анализатор считает по новым правилам.

---

## Phase 3: User Story 1 — Посетитель видит Ладу на первом экране (Priority: P1) 🎯 MVP

**Goal**: портрет Лады на первом экране вместо стока, раскладка по contracts/hero.md

**Independent Test**: spec.md §User Story 1 — три главные на широком экране и на 360×740: лицо видно, текст не на лице, кнопка звонка видна без прокрутки.

### Tests for User Story 1 ⚠️

- [ ] T008 [P] [US1] Написать `tests/hero.spec.ts` для `/`, `/ru/`, `/en/` на 320×640, 360×740, 390×844, 1366×768, 1920×1080, 2560×1440. На 320×640 проверяется только геометрия портрета, без кнопки звонка. Проверки:
  - у `img` портрета и его `picture` вычисленный `animationName` равен `none` (FR-007);
  - прямоугольник портрета не пересекает прямоугольник текстовой колонки и не уходит верхом под фиксированную шапку `header.head`;
  - кнопка `tel:` первого экрана целиком в области просмотра на 360×740 и 1366×768;
  - от 62rem ширина портрета ≤ 720 CSS px;
  - у портрета непустой `alt`, нет `aria-hidden`, нет `loading="lazy"`, есть `fetchpriority="high"`;
  - в секции первого экрана нет `.monogram`;
  - в HTML нет `massage-kiev-lada-novikova`;
  - в DOM `h1` идёт раньше портрета.

### Implementation for User Story 1

- [ ] T009 [US1] Переделать `src/components/Hero.astro` по contracts/hero.md.
  - Портрет берётся из `portrait()` (`src/data/gallery.ts`): `<Picture>` avif/webp, `widths={[480, 720, 960, 1440]}`, `sizes="(min-width: 62rem) 40vw, 100vw"`, `priority`, `alt` на языке страницы, `object-position` из `focus`.
  - От 62rem — колонка справа 4:5, высота до 86vh, ширина ≤ 720px, маска левого и нижнего края.
  - Уже 62rem — блок над текстом через `order`, высота подбирается под T008.
  - Горизонтальная ориентация при малой высоте — разделённая раскладка.
  - `wake` и `veil-breath` — на накрывающем слое внутри рамки портрета; прозрачность `<img>` не анимируется (research.md §R4). `drift` — на рамке. `hero__floor` не меняется (FR-017 из 002).
  - Удалить `<Monogram mode="edge" />` и импорт стокового кадра. Шапочный комментарий файла обновить: FR-018 из 002 заменён FR-008 из 003, одна строка со ссылкой на ADR-002.
- [ ] T010 [US1] Прогнать `tests/hero.spec.ts`, `tests/contrast.spec.ts`, `tests/reduced-motion.spec.ts`, `tests/headings.spec.ts`, `tests/typography.spec.ts`. Чинить компонент, а не ослаблять проверки.
- [ ] T011 [US1] Снять скриншоты главной на 360×740, 1366×768 и 1920×1080 для трёх языков в `.playwright-mcp/003/` и проверить их глазами:
  - лицо не срезано шапкой;
  - у края маски нет видимой границы;
  - текст не лежит на лице.

  Поправить `focus` портрета в `src/data/gallery.json` и размеры в `Hero.astro`.

**Checkpoint**: US1 работает без ленты — первый экран с портретом на трёх языках.

---

## Phase 4: User Story 2 — Посетитель листает ленту работ и переходит к услуге (Priority: P2)

**Goal**: лента из 11 фото по contracts/gallery.md, кнопки и событие GA4

**Independent Test**: spec.md §User Story 2 — пролистать ленту свайпом, кнопками, клавиатурой и без скриптов; фото с процедурой открывает страницу услуги того же языка.

### Tests for User Story 2 ⚠️

- [ ] T012 [P] [US2] Написать `tests/gallery.spec.ts` для трёх главных.
  - **Разметка:**
    - `#gallery` стоит между `#about` и секцией обзора услуг; 11 `li` в порядке `position`;
    - у каждого `img` непустой `alt`, внутри локали без повторов;
    - 8 ссылок ведут на `pagePath(locale, category)` и отвечают 200 — всего 24 проверки;
    - `figcaption` равна `ui[locale].services[category].name`, у 07, 22 и 26 нет ни `a`, ни `figcaption`;
    - у всех `img` ленты `loading="lazy"`;
    - `[data-gallery]` несёт `role="region"`, `tabindex="0"` и непустой `aria-label`.
  - **Поведение:**
    - на 360×740 без прокрутки нет ни одного запроса к файлам фото ленты (SC-004);
    - фокус на ленте и `ArrowRight` увеличивают `scrollLeft`;
    - кнопки видимы, «вперёд» сдвигает на ширину карточки ±2px, «назад» `disabled` в начале, «вперёд» `disabled` в конце;
    - при `reducedMotion: 'reduce'` сдвиг кнопкой происходит сразу, без плавности;
    - без действий пользователя `scrollLeft` не меняется за 3 с (FR-012);
    - у обеих кнопок непустое доступное имя на языке страницы (FR-014);
    - у ссылки карточки и у кнопки в фокусе цвет `outline` отличается от фона секции контрастом ≥ 3:1 (FR-013).
  - **Событие:**
    - `googletagmanager.com` подменён пустым ответом через `page.route`, а `dataLayer.push` обёрнут в `addInitScript` с записью в `sessionStorage`;
    - клик по карточке депиляции на `/ru/` даёт ровно одну запись `['event','gallery_click',{service:'depilation',locale:'ru'}]`, и страница депиляции открыта;
    - при `route.abort()` для `googletagmanager.com` переход тоже состоялся (SC-011);
    - клик с `ControlOrMeta` по карточке даёт ровно одно событие (FR-026).
- [ ] T013 [P] [US2] Дополнить `tests/no-script.spec.ts`: на трёх главных лента видна, в ней 11 `img`, обе кнопки с атрибутом `hidden`.

### Implementation for User Story 2

- [ ] T014 [US2] Создать `src/components/Gallery.astro` по contracts/gallery.md.
  - Разметка: `Section id="gallery"`, `SectionHeading` с `ui.gallery.eyebrow` и `title`, `div[role=region][tabindex=0][data-gallery]#gallery-strip` > `ul` > `li`.
  - Карточка с `category` — это `a[href=pagePath]` вокруг `figure` с `figcaption` под фото на сплошной поверхности карточки (research.md §R8).
  - `<Picture>` avif/webp, `widths={[360, 540, 720, 1080]}` не шире исходника, `sizes="(min-width: 62rem) 22rem, 78vw"`, `loading="lazy"`, `object-position` из `focus`.
  - CSS: `grid-auto-flow: column`, `grid-auto-columns: min(78vw, 22rem)`, `scroll-snap-type: x mandatory`, `aspect-ratio: 4 / 5`, `overscroll-behavior-x: contain`, растворение правого края; фокус с контрастом ≥ 3:1 (FR-013).
  - Кнопки `button[type=button][aria-controls=gallery-strip][hidden]` с подписями `ui.gallery.prev/next`.
- [ ] T015 [US2] Добавить в `src/components/Gallery.astro` обрабатываемый `<script>`, по образцу `src/components/PriceTabs.astro:149`.
  - Кнопки: снять `hidden`; `scrollBy` на ширину первой карточки плюс `column-gap`; `behavior: 'auto'` при `matchMedia('(prefers-reduced-motion: reduce)')`, иначе `'smooth'`; `disabled` на краях пересчитывается пассивным `scroll` + `requestAnimationFrame`.
  - Событие: `click` на `a` внутри `[data-gallery]` → `gtag('event', 'gallery_click', { service, locale })`, если `typeof window.gtag === 'function'`, без `preventDefault`. `service` берётся из `data-service` на ссылке, `locale` — из `document.documentElement.lang` через словарь локалей.
- [ ] T016 [US2] Вставить `<Gallery locale={locale} />` между `<About>` и `<ServicesOverview>` в `src/components/HomePage.astro`.
- [ ] T017 [US2] Прогнать `tests/gallery.spec.ts`, `tests/no-script.spec.ts`, `tests/contrast.spec.ts`, `tests/headings.spec.ts`, `tests/reduced-motion.spec.ts`, `tests/interaction.spec.ts` и `npm run analyze`: не больше 1536 Б на главной, код ленты засчитан. Скриншоты ленты на 360×740 и 1366×768 в `.playwright-mcp/003/` проверить глазами и поправить `focus` карточек 21, 17, 06 и 27.

**Checkpoint**: US1 и US2 работают вместе и по отдельности.

---

## Phase 5: User Story 3 — Ссылка на сайт показывает лицо Лады (Priority: P3)

**Goal**: превью ссылок и JSON-LD на портрете, скриншот и сток удалены

**Independent Test**: spec.md §User Story 3 — `og:image` 1200×630 ≤ 300 КБ из портрета; JSON-LD `image` = логотип + портрет.

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Дополнить `tests/seo-contract.spec.ts`:
  - на всех 15 страницах `og:image` указывает на файл из `/_astro/`, а не на `/assets/lada.kiev.ua-website.png`;
  - JSON-LD `LocalBusiness.image` на главных — ровно два абсолютных адреса: логотип и портрет с `lada-novikova-portrait` в имени;
  - стокового кадра в JSON-LD нет.

  Существующая проверка веса и размеров превью остаётся без изменений.

### Implementation for User Story 3

- [ ] T019 [US3] В `src/components/SeoHead.astro`:
  - убрать импорт `massage-kiev-lada-novikova.jpg` и константу `OG_IMAGE`;
  - превью строить `getImage({ src: portrait.photo, width: 1200, height: 630, fit: 'cover', position: portrait.focus, format: 'jpeg' })`, а `og:image:width/height` брать из результата;
  - `business.image = [absoluteUrl(logo.src), absoluteUrl(portrait.photo.src)]`.
- [ ] T020 [US3] Удалить `src/assets/massage-kiev-lada-novikova.jpg` и `public/assets/lada.kiev.ua-website.png`. `git grep` по обоим именам вне `specs/` должен вернуть пусто.
- [ ] T021 [P] [US3] В `docs/runbook-deploy.md:23` убрать `/assets/lada.kiev.ua-website.png` из списка сброса кэша. Превью теперь в `_astro/` с хэшем в имени.

**Checkpoint**: все три истории работают.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: мёртвый код, полный прогон, закрытие пакета

- [ ] T022 [P] Режим `edge` в `src/components/Monogram.astro` больше никем не используется (`git grep 'mode="edge"'` пусто). Удалить его из типа `mode`, из `class:list` и из стилей `monogram--edge`.
- [ ] T023 Полный прогон из quickstart.md §Автоматически: `npm run check`, `npm run lint`, `npm run build`, `npm run analyze`, `npx playwright test` — все зелёные, вывод приложить к отчёту.
- [ ] T024 Lighthouse, мобильный профиль, на `npm run preview` для `/`, `/ru/`, `/en/`: доступность 100, производительность ≥ 95, LCP ≤ 2.5 с, CLS < 0.1 (SC-002, SC-003). Результаты записать в `specs/003-lada-photos-home/quickstart.md` с датой.
- [ ] T025 Закрыть пакет: отметить выполненные задачи в `specs/003-lada-photos-home/tasks.md`, записать фактические отклонения от плана в `specs/003-lada-photos-home/research.md`, если они были.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: без зависимостей.
- **Foundational (Phase 2)**: после T001; T002 идёт раньше T003, а T003 — раньше T015 (research.md §R3). T004 → T005 → T006 → T026; T007 независима.
- **User Stories (Phase 3+)**: после Phase 2, по порядку P1 → P2 → P3. US3 (T019) берёт портрет из `gallery.ts` и от US1 не зависит.
- **Polish (Phase 6)**: после всех историй.

### User Story Dependencies

- **US1**: только Phase 2.
- **US2**: только Phase 2; с US1 общих файлов нет.
- **US3**: только Phase 2. Стоковый кадр удаляется в T020, после того как его перестали импортировать и `Hero.astro` (T009), и `SeoHead.astro` (T019).

### Within Each User Story

- Тест пишется первым и падает, затем реализация, затем прогон.

### Parallel Opportunities

- T007 параллельно T004–T006.
- T008, T012, T013 и T018 — разные файлы тестов, их можно писать параллельно.
- T021 и T022 параллельны всему, что после их историй.

---

## Parallel Example: User Story 2

```bash
Task: "Написать tests/gallery.spec.ts по T012"
Task: "Дополнить tests/no-script.spec.ts по T013"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

Phase 1 → Phase 2 → Phase 3. Первый экран с портретом уже выполняет главную цель спеки и может уйти в прод без ленты.

### Incremental Delivery

US1 → US2 → US3. После каждой истории полный прогон тестов и коммит.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Коммит — после каждой задачи или логической группы, через `/commit`.
