---
description: "Task list for feature implementation"
---

# Tasks: Визуальный редизайн шаблона страниц

> **Reviewed:** 2026-09-07 by /plan
> **Fixed:** 2026-09-07 by /plan-fix
> **Analyzed:** 2026-09-07 by /speckit-analyze — 18 находок закрыты правкой артефактов

**Input**: Design documents from `/specs/002-visual-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: включены. Спека требует три автоматические проверки (SC-001, SC-006, SC-007). Каждая пишется до реализации и помечается `test.fixme()`; пометка снимается в том шаге, где проверка обязана позеленеть. Без пометки полный прогон краснеет на каждом промежуточном шаге и останавливает работу на не своей причине.

**Организация**: шаги в каноническом виде для `/orchestrate-plan`; внутри шага — задачи чеклистом. Пользовательские истории спеки: US1 первый экран (P1), US2 прайс (P2), US3 категории (P3), US4 деградация (P4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно вести параллельно — другой файл, нет зависимости от незавершённого
- **[Story]**: US1–US4 по спеке
- Путь к файлу указан в каждой задаче

---

## Phase 1: Setup

### Step 1.1: Снять отправную точку и визуальный эталон

<!-- plan-meta:
allowed_paths:
  - "specs/002-visual-redesign/**"
  - ".playwright-mcp/**"
gate_commands:
  test_quick: "npm run build && npm run analyze"
-->

Отправная точка — это то, с чем сравнивается результат. Визуальный эталон нужен отдельно: к моменту финальной сверки (Step 7.1) старая вёрстка уже перезаписана, и требование FR-034 «ничего не исчезло» станет непроверяемым, если сверять не с чем.

- [x] T001 Снять вес исполняемого кода: `npm run build && npm run analyze`, записать значение (ожидается 732 Б) в раздел «Отправная точка» файла `specs/002-visual-redesign/quickstart.md`
- [x] T002 Снять оценки Lighthouse на мобильном профиле по трём адресам (`/`, `/ru/`, `/en/`) и записать туда же
- [x] T003 Снять полностраничные снимки трёх языковых версий главной и четырёх страниц категорий в `.playwright-mcp/baseline/`; составить в `specs/002-visual-redesign/quickstart.md` перечень интерактивных и невербальных элементов (иконки, ссылки, разделители, подписи) — предмет сверки для FR-034. Снимки остаются локальным артефактом: `.playwright-mcp/` в `.gitignore`, и это осознанно — бинарные слепки старой вёрстки уйдут вместе с пакетом при `/speckit-retire`. Пережить очистку рабочего дерева и смену сессии обязан именно перечень, поэтому он пишется словами и в git

### Step 1.2: Добавить движок WebKit в прогон

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/routes.spec.ts --project=webkit"
  test_full: "npm run build && npm run test:e2e"
-->

Сегодня оба проекта прогона — Chromium (`playwright.config.ts:23-26`). Возможности, на которых стоит редизайн, в WebKit самые свежие из трёх движков, и проверять их в Chromium значит не проверять вовсе (SC-013).

- [x] T004 Добавить проект `webkit` в `playwright.config.ts` рядом с `desktop` и `mobile`, выполнить `npx playwright install webkit` и убедиться, что унаследованные проверки зелены во всех трёх проектах

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Ни одна пользовательская история не начинается, пока эта фаза не завершена.**

### Step 2.1: Токены, гарнитура и компонентный слой одним изменением

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/fonts.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

Три файла, одно изменение. Разделить их нельзя: `@apply bg-lada-red` в `src/index.css:17` перестаёт собираться в тот момент, когда токен исчезает из `tailwind.config.js`, а `<Font cssVariable="--font-playfair" />` в `src/layouts/BaseLayout.astro:59` перестаёт находить семейство, как только оно уходит из `astro.config.mjs`. Между такими задачами сборка красная, и любой промежуточный гейт остановит работу на ложной причине.

Четвёртый файл того же изменения — `tests/fonts.spec.ts`. Он назван эталоном гарнитуры (`fonts.spec.ts:91` требует дословно `Playfair Display`), и смена заявленной гарнитуры делает его утверждение ложным. Это единственное во всей работе исключение из правила «унаследованные проверки не правятся»: правило запрещает подгонять проверку под сломанную реализацию, а здесь меняется сам эталон — по FR-005 и решению [research.md §R1](./research.md).

- [x] T005 Объявить токены палитры, шкалы и ритма в `src/index.css` слоем `@layer base` на `:root` — каналами, не hex, по таблице [data-model.md](./data-model.md)
- [x] T006 Связать токены с утилитами в `tailwind.config.js` форматом `rgb(var(--x) / <alpha-value>)`; удалить `lada-*` целиком; `fontFamily.serif` перевести на `--font-cormorant`
- [x] T007 Заменить Playfair Display на Cormorant в `astro.config.mjs`: начертания 300/400/500, курсив 300/400, подмножества прежние, запасные `['Georgia', 'serif']`
- [x] T007a **Тем же коммитом** перевести `tests/fonts.spec.ts` на Cormorant: ожидаемое семейство в `fonts.spec.ts:91` и начертание запроса `document.fonts.load` в `fonts.spec.ts:100` — с `700` на `500`, потому что 700 у Cormorant в загрузке нет (T007) и запрос вернул бы пустой список faces, то есть проверка осталась бы красной уже по своей причине
- [x] T008 Перевести предзагрузку в `src/layouts/BaseLayout.astro` на `--font-cormorant`, сохранив отбор по подмножеству без указания начертания (причина — в комментарии `BaseLayout.astro:28-39`)
- [x] T009 Переписать компонентный слой `src/index.css`: `.btn-primary` на латунь с угольным текстом, `.btn-quiet` (переименование `.btn-secondary`), `.eyebrow`, `.lede`, `.section-title`, `.card` без сплошной заливки. Носители мерцания (FR-012) назначаются здесь и только здесь: `.rule` — блик по волоску, `.btn-primary` — блик и пульсирующее кольцо, `.eyebrow` — тление
- [x] T009a **Тем же коммитом** заменить `.btn-secondary` на `.btn-quiet` в `src/components/Certificates.astro:31` и `src/components/NotFound.astro:29`. Оба компонента пересобираются только в Step 7.1, а отсутствующий класс не роняет ни сборку, ни один гейт — кнопки просто останутся без оформления на пять шагов, и заметит это человек, а не прогон
- [x] T010 Добавить в `src/index.css` видимое состояние `:focus-visible` на латуни (FR-030) и отключение плавной прокрутки внутри `@media (prefers-reduced-motion: reduce)` (FR-016)

### Step 2.2: Слой анимаций

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npm run analyze"
  test_full: "npm run build && npm run test:e2e"
-->

Отдельный файл, а не часть `index.css`: фоновый слой — единственная часть работы, которую при откате нужно снять целиком, не трогая палитру и шкалу.

- [x] T011 Создать `src/styles/ambience.css`: keyframes `breath-a/b`, `silk-a/b`, `lamp-pulse`, `rise`, `grain-shift`, `sweep`, `ember`, `drift`, `wake`, `veil-breath`, `reveal`, `door-lit` по периодам из [contracts/motion.md](./contracts/motion.md)
- [x] T012 Оформить правила отключения: `@media (prefers-reduced-motion: reduce)` гасит анимации, переходы и плавную прокрутку; невидимость проявления объявляется **внутри** `@supports (animation-timeline: view())`, а не снаружи (contracts/motion.md §4)

### Step 2.3: Примитивы раскладки

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/routes.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T013 [P] Создать `src/components/Glow.astro`: пятно света с параметрами размера, положения, периода и фазы
- [x] T014 [P] Создать `src/components/Monogram.astro`: монограмма LN как inline SVG в трёх режимах — знак в шапке, водяной знак секции, обрезанный краем
- [x] T015 [P] Создать `src/components/SectionHeading.astro`: пара «надзаголовок + заголовок»; надзаголовок без заголовка невозможен
- [x] T016 Создать `src/components/Section.astro`: роль секции (`hero|air|work|tight`) → фон, вертикальный отступ, слой света и проявление содержимого при въезде в кадр (FR-013). Класс `.reveal` навешивает примитив, а не каждый компонент вручную. Зависит от keyframes `reveal` из T011

### Step 2.4: Сквозной фон

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npm run analyze"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T017 Создать `src/components/Ambience.astro`: свет, шёлковые кривые, порох, зерно, конус лампы. Зависит от `Glow.astro` (T013)
- [x] T018 Подключить `Ambience` и `src/styles/ambience.css` в `src/layouts/BaseLayout.astro`; перевести фоны секций на полупрозрачные, чтобы слой просвечивал

### Step 2.5: Новые строки словаря

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run check"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T019 Добавить подписи контактов, инструментов и надзаголовки секций в `src/i18n/ui.ts` во всех трёх локалях по таблице [data-model.md](./data-model.md); убедиться, что `npm run check` падает при пропуске любой локали — это принцип II конституции в действии

### Step 2.6: Проверка контраста

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/contrast.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T020 Написать `tests/contrast.spec.ts`: обход текстовых элементов собранной страницы с расчётом контраста по WCAG (research.md §R11), три прохода — покой, наведение, фокус (FR-032). Проверка принимает список адресов параметром, чтобы шаг US1 не краснел из-за ещё не пересобранного прайса
- [x] T020a Прогнать проверку **до** пометок и приложить красный вывод к отчёту шага. Это единственный момент, когда видно, что она измеряет реальную страницу: после T021 гейт шага зелен тривиально, потому что под пометкой оказываются все адреса сразу
- [x] T021 Пометить `test.fixme()` те адреса, которые пересобираются позже; пометка снимается в Step 3.1 (главная), Step 4.1 (прайс) и Step 5.2 (категории)

---

## Phase 3: User Story 1 — Первый экран (Priority: P1) 🎯 MVP

**Independent Test**: открыть `/`, `/ru/`, `/en/` — текст читается с первого кадра, фотография различима, серого прямоугольника вместо логотипа нет, контраст держится в любой фазе анимации.

### Step 3.1: Первый экран

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/contrast.spec.ts tests/content-parity.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T022 [US1] Пересобрать `src/components/Hero.astro`: смещённая влево композиция в колонке 46 знаков, надзаголовок с адресом и часами, направленное затемнение, статичная подложка под текстом (FR-017), обрезанная краем монограмма
- [x] T023 [US1] Добавить раскрытие `wake`, дыхание завесы и дрейф кадра; текст в анимациях не участвует — иначе страдает LCP
- [x] T024 [US1] Заменить «мышку» с подпрыгиванием на вертикальный волосок с каплей света
- [x] T025 [US1] Снять `test.fixme()` с главной в `tests/contrast.spec.ts` и убедиться, что все три прохода зелёные

### Step 3.2: Шапка и монограмма

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/interaction.spec.ts tests/seo-contract.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T026 [US1] Пересобрать `src/components/Header.astro`: монограмма вместо растрового логотипа, прозрачная шапка на первом экране, уплотнение при прокрутке через `animation-timeline: scroll()` под `@supports`
- [x] T027 [US1] Убрать растровый логотип из `src/components/Footer.astro`, заменив монограммой; в `src/components/SeoHead.astro:120` изображение организации оставить прежним — там нужен растр, и это решение владельца
- [x] T028 [US1] Проверить порядок разметки первого экрана против визуального порядка (FR-033) и клавиатурный обход шапки с видимым фокусом (FR-030)

---

## Phase 4: User Story 2 — Прайс и услуги (Priority: P2)

**Independent Test**: открыть прайс на главной и на странице категории, сверить три произвольные суммы с `src/data/prices.json`, проверить выравнивание цифр по колонке.

### Step 4.1: Прайс как набор меню

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/interaction.spec.ts tests/no-script.spec.ts tests/contrast.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T029 [US2] Пересобрать `src/components/PriceGroup.astro`: строка «название — точечная выноска — цена», `tabular-nums`, отказ от сплошной заливки карточки
- [x] T030 [US2] Пересобрать вкладки в `src/components/PriceTabs.astro`: активная на латуни, неактивные — текстовые переключатели с волоском; область нажатия не меньше 24×24 px (FR-031). **Тем же коммитом** синхронизировать классы во встроенном скрипте того же файла — расхождение проявится только после первого переключения вкладки, то есть мимо статической проверки
- [x] T031 [US2] Добавить надзаголовки групп через `SectionHeading` в `src/components/PriceTabs.astro` и `src/components/ServicePage.astro`
- [x] T032 [US2] Снять `test.fixme()` с адресов прайса в `tests/contrast.spec.ts`

### Step 4.2: Карточки услуг

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/content-parity.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T033 [US2] Пересобрать `src/components/ServicesOverview.astro`: карточки-двери с подписью инструмента, без круглых подложек под иконками, с прочерчиванием волоска при наведении и обходом света по очереди (FR-020)

---

## Phase 5: User Story 3 — Страницы категорий (Priority: P3)

**Independent Test**: открыть четыре категории на трёх языках, измерить длину строки, увидеть отличие вводного абзаца от остальных.

### Step 5.1: Проверка типографики

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/typography.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T034 [P] [US3] Написать `tests/typography.spec.ts`: длина строки ≤ 68 знаков на двенадцати страницах категорий и в повествовательной секции главной, при ширинах 1440 и 2560 (research.md §R12). Тем же файлом — размер области нажатия переключателей прайса не меньше 24×24 px (FR-031). До Step 5.2 файл помечен `test.fixme()`

### Step 5.2: Страницы категорий и повествовательная секция

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/typography.spec.ts tests/contrast.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T035 [US3] Пересобрать `src/components/ServicePage.astro`: мера строки 62–68 знаков, вводный абзац крупнее остальных, надзаголовки у разделов текста, врезка после вступления, водяной знак за заголовком
- [x] T036 [US3] Добавить буквицу через `initial-letter` под `@supports` (research.md §R9) — без поддержки абзац начинается обычной буквой
- [x] T037 [US3] Пересобрать `src/components/About.astro` на примитивы: надзаголовок, лид, мера строки, прочерчиваемый волосок вместо статичного разделителя. ~~Заголовок секции обязан остаться `h3` внутри `#about`: на этот локатор опирается `tests/fonts.spec.ts:84`~~ — **требование снято в Step 7.1a как ошибочное**: до пересборки `h3` был вторым заголовком секции, под `h2`, а надзаголовок примитива заголовком не является. Сохранив уровень, шаг оставил `h3` сразу за `h1` страницы и уронил доступность до 98. Локатор проверки переставляется, уровень — нет
- [x] T038 [US3] Снять `test.fixme()` с `tests/typography.spec.ts` и с адресов категорий в `tests/contrast.spec.ts`

---

## Phase 6: User Story 4 — Деградация (Priority: P4)

**Independent Test**: прогон с эмуляцией уменьшенного движения, прогон без скриптов, ручной проход в Firefox.

### Step 6.1: Деградация и бюджет кода

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/reduced-motion.spec.ts tests/no-script.spec.ts --project=desktop && npm run analyze"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T039 [P] [US4] Написать `tests/reduced-motion.spec.ts`: отсутствие действующих анимаций и переходов плюс неизменность положений секций, карточек услуг, строк прайса и элементов подвала через секунду (SC-007, research.md §R13)
- [x] T040 [US4] Добавить в `tests/reduced-motion.spec.ts` разбор собранного CSS (`dist/**/*.css`): правила, задающие нулевую непрозрачность **носителю проявления** — классу `.reveal` и всему, что его несёт, — обязаны лежать внутри `@supports (animation-timeline: view())` (SC-012, contracts/motion.md §4). Область сужена намеренно: `rise`, `ring` и `door-lit` законно объявляют `opacity: 0` вне блока поддержки — это стартовые кадры бесконечных анимаций, чья невидимость длится доли секунды и не зависит от таймлайна. Проверка «любая нулевая непрозрачность внутри `@supports`» покраснела бы на них, и это была бы её собственная ошибка, а не дефект. Глазами это не проверяется: движки прогона таймлайн поддерживают, поэтому пустую страницу увидит только посетитель Firefox — то есть уже после сдачи
- [x] T041 [US4] Прогнать `npm run analyze`: исполняемый код не превышает 732 Б — порога, снятого до работ (SC-005). Прирост означает скрипт там, где должен быть CSS; убыль означает обратное и допустима. Вышло 560 Б: оформление вкладок выведено из `aria-selected`, и списки классов ушли из встроенного скрипта совсем. Прежняя формулировка требовала 732 Б байт в байт — то есть требовала не трогать T030, чего сама же работа и не предполагала

---

## Phase 7: Polish & Cross-Cutting

### Step 7.1: Оставшиеся компоненты и чистка токенов

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npm run test:e2e"
  test_full: "npm run build && npm run test:e2e"
-->

- [x] T042 [P] Пересобрать `src/components/Certificates.astro`: рамка с бликом по кромке, латунная кнопка
- [x] T043 [P] Пересобрать `src/components/Footer.astro`: инверсия карты (FR-024), надзаголовки блоков контактов (FR-025), копирайт на `--muted`
- [x] T043a **Тем же коммитом** снять `test.fixme()` с области «шапка и подвал» в `tests/contrast.spec.ts` — четвёртой, заведённой в Step 2.6. Она держалась дольше трёх остальных, потому что шапка и подвал стоят на всех пятнадцати страницах, а пересобираются здесь; копирайт `white/40` на 3.82:1 и есть та единственная непройденная проверка контраста, из-за которой доступность стоит на 96 (SC-002)
- [x] T044 [P] Пересобрать `src/components/NotFound.astro` на примитивы
- [x] T045 Убедиться, что старых токенов не осталось: `grep -rnE "#[0-9a-fA-F]{3,6}|text-white/|\blada-(dark|darker|gray|gray-light|gold|red)\b" src/ --include="*.astro" --include="*.ts"` не находит ничего, кроме объявлений в `src/index.css`. Имена токенов перечислены поимённо намеренно: голое `lada-` ловит `src/assets/massage-kiev-lada-novikova.jpg` в двух импортах и выдаёт имя файла за живой токен
- [x] T045a Снять начертание 600 у Inter в `astro.config.mjs` и убедиться, что `font-semibold` не осталось ни в одном компоненте. Начертание держалось всю работу, потому что крупные акценты уходят в антикву постепенно, компонент за компонентом ([data-model.md](./data-model.md): «600 больше не нужен»); этот шаг — последний, после которого утверждение модели данных становится правдой, а не намерением. Пропустить — значит закончить пакет с лишним файлом шрифта в загрузке и с моделью, которая расходится с конфигурацией
- [x] T046 Сверить каждый видимый элемент с эталоном из Step 1.1 (FR-034): иконки, ссылки, разделители, подписи — то, чего нет в словаре и что `content-parity.spec.ts` не видит

### Step 7.1a: Порядок заголовков

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/fonts.spec.ts tests/headings.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

Заведён после приёмки: она нашла, что SC-002 не выполнен — доступность 98, а не 100. Контраст закрыт полностью, но появился новый провал, `heading-order`: в «Про нас» `h3` идёт сразу за `h1` страницы.

Причина — в этом плане, а не в реализации. До редизайна секция несла два заголовка: `<h2 class="section-title">{t.about.title}</h2>` и `<h3>{t.about.heading}</h3>`. T037 свернул их в `SectionHeading`, где первый стал надзаголовком — то есть перестал быть заголовком вообще, — а второму этот план предписал остаться `h3`, чтобы не сломать локатор `#about h3` в унаследованной проверке гарнитуры. Предписание защищало локатор ценой структуры документа; переставить локатор было и дешевле, и правильнее.

Проверить это было нечем: порядок заголовков не покрыт ни одной проверкой прогона, а Lighthouse снимался до работ и потом только на приёмке. Поэтому шаг чинит не только сам разрыв.

- [ ] T046a Снять `level="h3"` в `src/components/About.astro:37` — умолчание примитива `SectionHeading` и так `h2`. **Тем же коммитом** перевести локатор `#about h3` → `#about h2` в `tests/fonts.spec.ts:84`. Визуально не меняется ничего: кегль задаёт класс `.section-title`, а не уровень элемента
- [ ] T046b Написать `tests/headings.spec.ts`: на каждой из восемнадцати собранных страниц ровно один `h1`, и уровни заголовков не перескакивают через ступень. Это и есть проверка, которой не было: SC-002 требует ста баллов доступности, а из четырёх её составляющих прогон до сих пор мерил только контраст
- [ ] T046c Закрыть тот же разрыв на трёх страницах 404, где `h1` соседствует с `h3` подвала: секций с `h2` там нет. Дефект унаследованный, но подвал пересобирала эта работа (T043), и цена правки — уровень одного элемента
- [ ] T046d Исправить подпись бюджета в `scripts/analyze-bundle.mjs`: печатается «Бюджет SC-006», тогда как в нумерации этого пакета бюджет исполняемого кода — SC-005, а SC-006 — длина строки

### Step 7.1b: Подпись домена и значок вкладки

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "astro.config.mjs"
  - "tailwind.config.js"
  - "playwright.config.ts"
gate_commands:
  lint: "npm run lint"
  type: "npm run check"
  test_quick: "npm run build && npx playwright test tests/seo-contract.spec.ts tests/content-parity.spec.ts tests/contrast.spec.ts --project=desktop"
  test_full: "npm run build && npm run test:e2e"
-->

Заведён по решению владельца в ходе реализации (FR-035, FR-036). Домен `lada.kiev.ua` лаконичен, и подвал — единственное место, где его подпись не избыточна: на первом экране и в шапке посетитель уже на сайте. Довод не эстетический: страницу пересылают снимком экрана, а на снимке адресной строки нет.

- [ ] T051 Вывести подпись домена в нижнюю полосу `src/components/Footer.astro` рядом с `Lada N`, через тот же разделитель. Источник — `Astro.site` (то есть `SITE` из `astro.config.mjs`), отображаемая форма — хост без `www.`; вторая копия домена в разметке или в словаре запрещена (FR-035). Оформление: строчными, разрядка как у надзаголовков, `--muted`; не ссылка
- [ ] T052 Заменить эмодзи-значок вкладки в `src/layouts/BaseLayout.astro` на монограмму LN во встроенном `data:`-URI — латунь `#C9A961` на прозрачном, читается и на светлой, и на тёмной вкладке. Сетевого запроса не появляется (FR-036). Гарнитура внутри значка — `Georgia, serif`: гарнитуры сайта значку недоступны, а `Georgia` и есть объявленная запасная для Cormorant
- [ ] T053 Убедиться, что подпись домена не ломает сверку полноты контента: `content-parity.spec.ts` сравнивает текст страницы со словарём предыдущей версии, и новая строка в подвале ей безразлична, но проверить это надо прогоном, а не рассуждением

### Step 7.2: Приёмка и закрытие пакета

<!-- plan-meta:
allowed_paths:
  - "specs/002-visual-redesign/**"
  - ".playwright-mcp/**"
gate_commands:
  test_quick: "npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze"
-->

- [ ] T047 Полный прогон: `npm run check`, `npm run lint`, `npm run build`, `npm run test:e2e` во всех трёх проектах, `npm run test:invalid-data`, `npm run analyze`
- [ ] T048 Снять оценки Lighthouse на трёх адресах: производительность ≥ 95, поиск 100, доступность 100. Отдельно выписать LCP и CLS каждого адреса и сверить с порогом SC-004 (≤ 2.5 с и < 0.1): сквозной фон и раскрытие первого экрана бьют ровно по этим двум величинам, а общая оценка производительности их усредняет и может остаться зелёной при провале любой из них
- [ ] T049 Ручные проходы по [quickstart.md](./quickstart.md): Firefox без проявлений, карта под фильтром в WebKit, темп движения против [prototype.html](./prototype.html), частота изменений яркости не чаще трёх в секунду ни у одного слоя (FR-015a). Периоды сверять **не по `ambience.css`** — там лежат только траектории: длительности заданы на элементах в `src/index.css` (`ember`, `sweep`, `ring`), `Ambience.astro` (`lamp-pulse`, `silk`, `grain`), `Hero.astro` (`drift`, `wake`, `veil-breath`, `drip`), `Header.astro` (`head-dense`), `Certificates.astro` (`sweep`), `ServicesOverview.astro` (`door-lit`)
- [ ] T050 Записать итоги приёмки в `specs/002-visual-redesign/spec.md`, закрыть оставшиеся пункты `specs/002-visual-redesign/checklists/a11y.md`, записать гейт `converge` в журнал пакета

---

## Dependencies & Execution Order

### Порядок шагов

- **Step 1.1, 1.2** — без зависимостей
- **Step 2.1** — блокирует всё: до него ни один компонент не может ссылаться на новые токены
- **Step 2.2 → 2.3 → 2.4** — keyframes до примитивов (`Section` использует `reveal`), `Glow` до `Ambience`
- **Step 2.5, 2.6** — параллельны фазе 2 после 2.1
- **Step 3.1, 3.2** (US1) — после фазы 2
- **Step 4.1, 4.2** (US2) — после фазы 2, независимы от US1
- **Step 5.1 → 5.2** (US3) — проверка до реализации
- **Step 6.1** (US4) — после того, как анимации появились, то есть после 3.1 минимум
- **Step 7.1 → 7.2** — после всех историй

### Правило пересборки

Каждая команда прогона начинается с `npm run build`. Без этого Playwright поднимает `preview` над предыдущей сборкой и проверяет вчерашний день — ошибка, которая выглядит как «проверка почему-то зелёная».

### Правило пометок

`test.fixme()` на новой проверке — не костыль, а способ держать полный прогон честным до того шага, где проверка обязана позеленеть. Снятие пометки — отдельная задача внутри соответствующего шага (T025, T032, T038), и она обязана быть в том же коммите, что и реализация.

### Параллельные возможности

- T013–T015 — три новых файла, ни один не зависит от других
- T042–T044 — три независимых компонента
- US2 и US3 можно вести параллельно с US1, если фаза 2 закрыта

---

## Implementation Strategy

**MVP** — до конца Step 3.1: палитра, гарнитура, движение и монограмма уже работают, и видно, состоялся ли редизайн.

**Инкрементально** — фаза 2 → US1 → US2 → US3 → US4 → полировка. Каждая история проверяема отдельно и ничего не ломает в предыдущих.

---

## Notes

- Коммит после каждого шага; задачи внутри шага — один логический коммит
- Унаследованные проверки не правятся: покрасневшая унаследованная проверка означает покрасневшую реализацию. Единственное исключение — `tests/fonts.spec.ts` в T007a, и оно исключение по причине, а не по удобству: проверка утверждает имя гарнитуры, а спека это имя меняет. Всё остальное красное — реализация
- T020, T034, T039 обязаны сначала падать; зелёная новая проверка до реализации означает, что она ничего не измеряет. Для `contrast.spec.ts` это предъявляется отдельной задачей T020a, потому что пометки T021 гасят её в том же шаге

---

## Session Map

- [x] S1 (~540K) Steps 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 — done 2026-09-07
- [x] S2 (~530K) Steps 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 7.1 — done 2026-09-07
- [ ] S3 (~260K) Steps 7.1a, 7.1b, 7.2 — **current**

---

## Progress Log

### S1.step-1.1 — 2026-09-07
**Completed steps:** 1.1
**Commits:** 515dc18

### S1.step-1.2 — 2026-09-07
**Completed steps:** 1.2
**Commits:** e6dfe38

### S1.step-2.1 — 2026-09-07
**Completed steps:** 2.1
**Commits:** 727ba25

### S1.step-2.2 — 2026-09-07
**Completed steps:** 2.2
**Commits:** fc02550

### S1.step-2.3 — 2026-09-07
**Completed steps:** 2.3
**Commits:** e502d32

### S1.step-2.4 — 2026-09-07
**Completed steps:** 2.4
**Commits:** ed8b18e

### S1.step-2.5 — 2026-09-07
**Completed steps:** 2.5
**Commits:** 69beac5

### S1.step-2.6 — 2026-09-07
**Completed steps:** 2.6
**Commits:** a38297b

### S1 — observations (2026-09-07, dispatch 1)

plan-wrong: TaskCreate в этом harness нет — контракт предполагал инструмент, которого нет; бандл вёлся без него.
plan-wrong: T006 требует удалить `lada-*` целиком, а T009a перечисляет из последствий только два вызова `.btn-secondary`. При этом `src/components/ServicePage.astro:106,122` держит `text-lada-gold` внутри `@apply` — это не мёртвый класс, а ошибка сборки в ту же секунду. Пришлось перевести и этот блок стилей, за пять шагов до пересборки компонента (Step 5.2).
plan-wrong: T009 назначает `.btn-primary` «блик и пульсирующее кольцо», но ни список keyframes T011, ни таблица состава motion.md кольца не содержат: в прототипе оно сделано `box-shadow`, а motion.md §1 оставляет ровно одно исключение из «только transform и opacity», и оно занято `ember`. Кольцо за край несовместимо с обрезкой, которая нужна блику. Завёл keyframes `ring` на transform+opacity — волна света по лицу кнопки.
plan-wrong: таблица пометок в quickstart.md знает три строки (главная / прайс / категории), но шапка и подвал стоят на каждой странице, а пересобираются последними (Step 7.1, T043). Оставь их внутри «главной» — и T025 не смог бы её позеленить в Step 3.1 из-за копирайта 3.82:1. В contrast.spec.ts заведена четвёртая область со снятием в Step 7.1; строку в quickstart.md добавить некому — файл вне allowed_paths шага 2.6.
plan-wrong: data-model говорит «Inter 600 больше не нужен», но снятие 600 не назначено ни одной задаче: T007 про антикву, T045 ищет hex/text-white/lada-. Оставил Inter [300,400,500,600] — `font-semibold` живёт в разметке до Step 7.1. Иначе пакет закончится в противоречии со своей же моделью данных.
plan-wrong: «проверка принимает список адресов параметром» (T020) сама по себе недостаточна — прайс живёт на тех же пятнадцати адресах, что и всё остальное, поэтому областью стала пара «адрес + корень», а не адрес.
plan-wrong: T040 (Step 6.1) обязан сузить разбор CSS до носителей проявления: `rise`, `ring` и `door-lit` законно объявляют `opacity: 0` вне `@supports`, и проверка «любая нулевая непрозрачность внутри @supports» покраснеет на них. В собранном CSS вложенность `reveal` подтверждена: @keyframes reveal < @supports (animation-timeline:view()) < @media (prefers-reduced-motion:no-preference).
redone: contrast.spec.ts написан дважды. Первый вариант заносил измерение в браузер через `new Function(browserMeasure.toString())` — работает, но это индирекция ради индирекции; переписан на одну самодостаточную функцию, отдаваемую прямо в page.evaluate, с меткой `data-contrast-probe` для проходов наведения и фокуса.
redone: тот же файл прошёл `npx playwright test` и упал на `npm run check` четырьмя ошибками типов — `elementHandles()` отдаёт `ElementHandle<Node>` (нет setAttribute), а spread расширил `mode` до `string`. Транспиляция Playwright мягче, чем astro check; поймал именно типовой гейт. Заменил хэндлы на локаторы.
redone: в проходы наведения и фокуса добавлена защита от холостого зелёного — сломайся метка элемента, списки остались бы пустыми, а «ни одной пары ниже порога» верно и для пустого списка. Теперь длина замеров сверяется с числом интерактивных элементов.
redone: у SectionHeading свойство сначала звалось `as`; astro check выдал «'Props' is declared but never used» — на имени-ключевом слове TS генерация TSX в Astro теряет неявную привязку Props. Переименовано в `level`, что и по смыслу точнее.
redone: keyframes `grain-shift` переписаны с шести шагов прототипа на два состояния: `steps(8)` поверх девяти остановок даёт 64 скачка за цикл, а не восемь, которые motion.md §6 фиксирует как бюджет мерцания.
decided: тона свечения — три силы латуни и brass-lt, без янтарного и розового пятен прототипа: этих двух цветов нет среди восьми токенов, а правило 3 контракта разрешает один акцент. Фон вышел более монохромным, чем одобренный прототип; вернуть розовый — это правка палитры, то есть спеки, а не решение исполнителя.
decided: Cormorant объявлен как weights [300,400,500] × styles [normal,italic], потому что конфигурация Astro перемножает массивы и «курсив только 300/400» (§R2) выразить не может. Лишний курсив 500 объявлен, но нигде не употреблён, поэтому браузер его не грузит; курсив держится вне критического пути отбором `preload={[{ subset, style: 'normal' }]}` — это отбор по начертанию, а не по толщине, поэтому оговорка в комментарии BaseLayout цела.
decided: отмена плавной прокрутки при уменьшенном движении объявлена только в index.css, рядом с самим `scroll-behavior: smooth`, а не продублирована в ambience.css, как в образце motion.md §5; слой анимаций на неё ссылается. Если позже кто-то удалит блок из index.css в расчёте, что его несёт слой движения, плавная прокрутка переживёт отключение — то есть ровно то, что §5 и запрещает.
decided: `.mote` объявлен в ambience.css, а не в Ambience.astro: motion.md даёт этому слою два дома (сквозной фон и первый экран), и правило на двоих принадлежит общему файлу. Step 3.1 берёт тот же класс.
decided: в T018 фоны секций не переписывались покомпонентно — каждый `bg-lada-*` умер вместе с токеном в Step 2.1, поэтому секции уже прозрачны и слой просвечивает. Осталось переименование мёртвых классов, и оно принадлежит шагу пересборки каждого компонента.
decided: Lighthouse снят заново, а не перенесён. Первый прогон `/` дал 88 и LCP 3.9 с на непрогретом кэше вариантов кадра, повтор — 99; в quickstart.md записан повтор и оговорка про первый. Числа совпали с пакетом 001 (99/99/100, 96, 100).
decided: `contrast.spec.ts` складывает подложку только из `background-color`; картинка и градиент в счёт не идут. Для первого экрана это осознанно — проверка меряет уголь, который обязан держать `hero__floor` (FR-017). Следствие, которое надо знать S2: СЕГОДНЯ первый экран зелен ложно — завесы нет вовсе (её градиент был на мёртвых токенах), текст стоит на фотографии, и настоящим этот замер станет только после Step 3.1.

### S2.step-3.1 — 2026-09-07
**Completed steps:** 3.1
**Commits:** f6d3aea

### S2.step-3.2 — 2026-09-07
**Completed steps:** 3.2
**Commits:** e9632f8

### S2.step-4.1 — 2026-09-07
**Completed steps:** 4.1
**Commits:** 56a4bd6

### S2.step-4.2 — 2026-09-07
**Completed steps:** 4.2
**Commits:** f8ac496

### S2.step-5.1 — 2026-09-07
**Completed steps:** 5.1
**Commits:** 6fb0f1a

### S2.step-5.2 — 2026-09-07
**Completed steps:** 5.2
**Commits:** c41ff10

### S2.step-6.1 — 2026-09-07
**Completed steps:** 6.1
**Commits:** 348b85f

### S2.step-7.1 — 2026-09-07
**Completed steps:** 7.1
**Commits:** c746d74

### S2 — observations (2026-09-07, dispatch 1)

plan-wrong: TaskCreate в этом harness по-прежнему нет — контракт предполагает инструмент, которого не существует; бандл вёлся без него.
plan-wrong: сжатие CSS через lightningcss (умолчание сборки) сворачивает `animation: reveal linear both` + `animation-timeline: view()` в `animation: linear both reveal view()`. Сокращённая запись таймлайна браузерами не принята (CSS.supports → false в Chrome 153 и WebKit), правило отбрасывается целиком. То есть весь слой проявления из Step 2.2 в собранном сайте не работал с S1, и заметить это было нечем: вложенность верна, а исходное состояние — видимое. Переключил на esbuild в astro.config.mjs и завёл сторожа в reduced-motion.spec.ts.
plan-wrong: T031 назначает надзаголовки групп «через SectionHeading в PriceTabs.astro и ServicePage.astro», но группы живут в PriceGroup.astro, который в задаче не назван. Прочитал как надзаголовок секции прайса в обоих файлах; заголовок группы остался h3 с оформлением надзаголовка.
plan-wrong: T035 требует врезку после вступления, а текст категории приходит из markdown одним куском — вставить в него нечего. Врезка лежит последней в разметке и выводится вторым элементом сетки через `order`; `data-service-copy` при этом пришлось сузить до обёртки самого текста, иначе унаследованная проверка уникальности абзацев справедливо краснела (врезка одинакова на всех четырёх категориях).
plan-wrong: data-model даёт `about.eyebrow`, который для uk/ru дословно повторяет `about.title`, а для en короче его. Взять его надзаголовком значило бы напечатать «Про нас» дважды подряд либо потерять «About Us», которое ищет сверка полноты. Надзаголовком стоит `about.title`, ключ `about.eyebrow` остался неупотреблённым.
plan-wrong: T041 требует «остаться 732 Б», но любая правка вкладок меняет размер скрипта. Вышло 560 Б: оформление вкладок выведено из `aria-selected`, и списки классов ушли из скрипта совсем. SC-005 («не превышает») выполнен, буквальная формулировка T041 — нет.
plan-wrong: grep из T045 ловит `src/assets/massage-kiev-lada-novikova.jpg` в двух импортах — «lada-» внутри имени файла. Токенов не осталось; правило стоит переписать на границу слова.
plan-wrong: перечень FR-034 называет маркированные списки, полужирные вставки и подчёркнутые ссылки внутри текста категорий — в контенте их нет ни на одной из двенадцати страниц и не было в отправной точке. Оформление объявлено, сверять было нечего.
redone: разбор CSS в T040 сначала читал только `dist/**/*.css` — часть стилей Astro встраивает в разметку (`inlineStylesheets: 'auto'`), и сверку FR-034 это увело в ложные «не найдено». Сама проверка T040 защищена утверждением «носителей найдено больше нуля», но знать про два дома стилей нужно всякому, кто читает собранный CSS.
redone: `--measure` сузил с 34rem до 33rem. На 34rem самый плотный абзац (английская «Brows, lashes and makeup») давал 67.5 знака при пороге 68 в обоих движках — полползнака запаса, то есть красная проверка от правки одного слова. На 33rem тот же абзац даёт 64.2.
redone: класс, отданный дочернему компоненту (`<SectionHeading class=…>`, `<Icon class=…>`), в области видимости стилей родителя не оказывается — Astro не переносит cid на корень дочернего. Отступ надзаголовка услуг молча не применялся; переписано на обёртку и на глобальную утилиту.
redone: проверки Step 6.1 позеленели с первого прогона, потому что реализация отключения написана в S1. Чтобы не сдать проверку, которая ничего не меряет, прогнал три мутации: снял блок `prefers-reduced-motion`, вынес `opacity: 0` наружу `@supports`, вернул lightningcss. Покраснели ровно те проверки, которые обязаны, — кроме сравнения положений: бесконечные анимации фона ключевые блоки не двигают, и снимок один этого класса не ловит (что §R13 и утверждает).
decided: два пятна света оставлены внутри первого экрана, а не отданы сквозному слою: кадр закрывает фиксированный фон целиком, и без них перечень FR-034 терял бы элемент. Если позже фон вынесут поверх кадра — эти два `Glow` лишние.
decided: надзаголовок раздела текста категории — номер раздела (`counter`, `01`, `02`), а не слово: новое слово потребовало бы трёх строк словаря на каждый раздел каждой категории. Если номера сочтут лишними, менять придётся только псевдоэлемент `h2::before`.
decided: врезка несёт расписание, приписку про запись, адрес и телефон — единственный набор фактов, который можно собрать из существующих строк словаря, не сочиняя текст. Экранный диктор прочтёт её последней; всё её содержимое дословно повторено в подвале той же страницы.
decided: `drip` (капля подсказки прокрутки), `head-dense` (уплотнение шапки) и `draw` (прочерчивание волоска) добавлены в таблицу contracts/motion.md на реализации — T049 сверяет периоды по ней, и незаписанный период сверять не с чем.
decided: кнопка сертификатов переведена с `.btn-quiet` на `.btn-primary` (T042 «латунная кнопка»), хотя перечень FR-034 фиксировал `.btn-quiet` после T009a. Записано в таблицу расхождений в quickstart.md.

### S3 — observations (2026-09-07, dispatch 1 — BLOCKED, ни одного шага не закрыто)

plan-wrong: TaskCreate в этом harness нет третий бандл подряд — контракт предполагает инструмент, которого не существует; шаг вёлся без него.
plan-wrong: SC-002 утверждает, что контраст — единственная непройденная проверка доступности и что после ухода white/40 будет 100. Контраст действительно закрыт (color-contrast: ноль замечаний), но Step 5.2 внёс новый провал — h1 -> h3 в «Про нас», — и оценка встала на 98. Проверить это было нечем: heading-order не покрыт ни одной проверкой прогона, а Lighthouse снимался последний раз до работ.
plan-wrong: T049 велит сверять периоды «в src/styles/ambience.css», но в этом файле лежат только траектории. Периоды заданы на элементах в шести других местах: index.css (ember, sweep, ring), Ambience.astro (lamp-pulse, silk, grain), Hero.astro (drift, wake, veil-breath, drip), Header.astro (head-dense), Certificates.astro (sweep), ServicesOverview.astro (door-lit). Сверка возможна, но не по названному файлу.
plan-wrong: три строки таблицы contracts/motion.md разошлись с кодом — ring 4.5 с против 6 с, sweep на .gift::before 11 с при заявленных «5–7 с», строка glow не знает двух пятен первого экрана (19 и 27 с). Из-за первого §6 называет самым быстрым носителем яркости ember (0.36/с), хотя быстрее ring (0.44/с). Порог FR-015a при этом соблюдён с семикратным запасом.
plan-wrong: чеклист a11y.md по своей же таблице закрыт правкой спеки на двенадцати пунктах, а не на десяти (CHK001–CHK006, CHK009, CHK012, CHK014, CHK015, CHK022, CHK023); открытыми остаются шестнадцать, и три из них эта приёмка закрывает измерением — CHK007 (подписи на инвертированной карте читаются), CHK026 (CLS 0.012/0.015/0 после смены гарнитуры), CHK028 (жесты в карте под фильтром проверены).
plan-wrong: scripts/analyze-bundle.mjs печатает «Бюджет SC-006», хотя в нумерации пакета 002 бюджет исполняемого кода — SC-005, а SC-006 — длина строки. Правка в коде, вне этого шага.
redone: сверка жестов карты переписана дважды. Первый вариант мерил зум голым колесом — встроенный кадр Google отдаёт колесо странице, и снимок «после зума» показал блок сертификатов вместо карты. Переписано на двойной клик и ctrl+колесо с пересчётом области под каждый снимок. Заодно выяснилось, что сравнение хэшей снимков не доказывает ничего: область не байт-стабильна и в покое, поэтому вердикт перенесён на попадание указателя в девяти точках плюс осмотр снимков.
redone: проверка Firefox сначала не запускалась из scratchpad — ESM не разрешает голое имя пакета вне дерева проекта; импорт переписан на абсолютный путь к node_modules.
decided: Lighthouse записан по повторному прогону, первый прогон / отброшен как холодный (84 и LCP 4.2 с против 97 и 2.3 с) — ровно та оговорка, которую Step 1.1 оставил в quickstart.md. Если позже кто-то сравнит с 84, он сравнит с непрогретым кэшем вариантов кадра.
decided: гипотеза «поднять заголовок до h2 и станет 100» не оставлена гипотезой, а измерена на копии dist в scratchpad — доступность 100, ноль непройденных проверок. Дерево при этом не тронуто, стоимость проверки — один прогон Lighthouse.
decided: шаг оставлен незакрытым и ни один документ не записан. Записать «итоги приёмки» и закрыть чеклист при непройденном SC-002 значило бы объявить пакет принятым; всё измеренное перечислено в блокере и ложится в spec.md одним проходом после правки заголовка.

**Ответ оркестратора:** заведён Step 7.1a. Требование «остаться `h3`» в T037 — правка этого плана после `/speckit-analyze`, сделанная ради локатора `tests/fonts.spec.ts:84`; она и есть источник регрессии, и снята как ошибочная. Измеренное приёмкой не переснимается, кроме Lighthouse.
