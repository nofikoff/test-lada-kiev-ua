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

- [ ] T001 Снять вес исполняемого кода: `npm run build && npm run analyze`, записать значение (ожидается 732 Б) в раздел «Отправная точка» файла `specs/002-visual-redesign/quickstart.md`
- [ ] T002 Снять оценки Lighthouse на мобильном профиле по трём адресам (`/`, `/ru/`, `/en/`) и записать туда же
- [ ] T003 Снять полностраничные снимки трёх языковых версий главной и четырёх страниц категорий в `.playwright-mcp/baseline/`; составить в `specs/002-visual-redesign/quickstart.md` перечень интерактивных и невербальных элементов (иконки, ссылки, разделители, подписи) — предмет сверки для FR-034. Снимки остаются локальным артефактом: `.playwright-mcp/` в `.gitignore`, и это осознанно — бинарные слепки старой вёрстки уйдут вместе с пакетом при `/speckit-retire`. Пережить очистку рабочего дерева и смену сессии обязан именно перечень, поэтому он пишется словами и в git

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

- [ ] T004 Добавить проект `webkit` в `playwright.config.ts` рядом с `desktop` и `mobile`, выполнить `npx playwright install webkit` и убедиться, что унаследованные проверки зелены во всех трёх проектах

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

- [ ] T005 Объявить токены палитры, шкалы и ритма в `src/index.css` слоем `@layer base` на `:root` — каналами, не hex, по таблице [data-model.md](./data-model.md)
- [ ] T006 Связать токены с утилитами в `tailwind.config.js` форматом `rgb(var(--x) / <alpha-value>)`; удалить `lada-*` целиком; `fontFamily.serif` перевести на `--font-cormorant`
- [ ] T007 Заменить Playfair Display на Cormorant в `astro.config.mjs`: начертания 300/400/500, курсив 300/400, подмножества прежние, запасные `['Georgia', 'serif']`
- [ ] T007a **Тем же коммитом** перевести `tests/fonts.spec.ts` на Cormorant: ожидаемое семейство в `fonts.spec.ts:91` и начертание запроса `document.fonts.load` в `fonts.spec.ts:100` — с `700` на `500`, потому что 700 у Cormorant в загрузке нет (T007) и запрос вернул бы пустой список faces, то есть проверка осталась бы красной уже по своей причине
- [ ] T008 Перевести предзагрузку в `src/layouts/BaseLayout.astro` на `--font-cormorant`, сохранив отбор по подмножеству без указания начертания (причина — в комментарии `BaseLayout.astro:28-39`)
- [ ] T009 Переписать компонентный слой `src/index.css`: `.btn-primary` на латунь с угольным текстом, `.btn-quiet` (переименование `.btn-secondary`), `.eyebrow`, `.lede`, `.section-title`, `.card` без сплошной заливки. Носители мерцания (FR-012) назначаются здесь и только здесь: `.rule` — блик по волоску, `.btn-primary` — блик и пульсирующее кольцо, `.eyebrow` — тление
- [ ] T009a **Тем же коммитом** заменить `.btn-secondary` на `.btn-quiet` в `src/components/Certificates.astro:31` и `src/components/NotFound.astro:29`. Оба компонента пересобираются только в Step 7.1, а отсутствующий класс не роняет ни сборку, ни один гейт — кнопки просто останутся без оформления на пять шагов, и заметит это человек, а не прогон
- [ ] T010 Добавить в `src/index.css` видимое состояние `:focus-visible` на латуни (FR-030) и отключение плавной прокрутки внутри `@media (prefers-reduced-motion: reduce)` (FR-016)

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

- [ ] T011 Создать `src/styles/ambience.css`: keyframes `breath-a/b`, `silk-a/b`, `lamp-pulse`, `rise`, `grain-shift`, `sweep`, `ember`, `drift`, `wake`, `veil-breath`, `reveal`, `door-lit` по периодам из [contracts/motion.md](./contracts/motion.md)
- [ ] T012 Оформить правила отключения: `@media (prefers-reduced-motion: reduce)` гасит анимации, переходы и плавную прокрутку; невидимость проявления объявляется **внутри** `@supports (animation-timeline: view())`, а не снаружи (contracts/motion.md §4)

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

- [ ] T013 [P] Создать `src/components/Glow.astro`: пятно света с параметрами размера, положения, периода и фазы
- [ ] T014 [P] Создать `src/components/Monogram.astro`: монограмма LN как inline SVG в трёх режимах — знак в шапке, водяной знак секции, обрезанный краем
- [ ] T015 [P] Создать `src/components/SectionHeading.astro`: пара «надзаголовок + заголовок»; надзаголовок без заголовка невозможен
- [ ] T016 Создать `src/components/Section.astro`: роль секции (`hero|air|work|tight`) → фон, вертикальный отступ, слой света и проявление содержимого при въезде в кадр (FR-013). Класс `.reveal` навешивает примитив, а не каждый компонент вручную. Зависит от keyframes `reveal` из T011

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

- [ ] T017 Создать `src/components/Ambience.astro`: свет, шёлковые кривые, порох, зерно, конус лампы. Зависит от `Glow.astro` (T013)
- [ ] T018 Подключить `Ambience` и `src/styles/ambience.css` в `src/layouts/BaseLayout.astro`; перевести фоны секций на полупрозрачные, чтобы слой просвечивал

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

- [ ] T019 Добавить подписи контактов, инструментов и надзаголовки секций в `src/i18n/ui.ts` во всех трёх локалях по таблице [data-model.md](./data-model.md); убедиться, что `npm run check` падает при пропуске любой локали — это принцип II конституции в действии

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

- [ ] T020 Написать `tests/contrast.spec.ts`: обход текстовых элементов собранной страницы с расчётом контраста по WCAG (research.md §R11), три прохода — покой, наведение, фокус (FR-032). Проверка принимает список адресов параметром, чтобы шаг US1 не краснел из-за ещё не пересобранного прайса
- [ ] T020a Прогнать проверку **до** пометок и приложить красный вывод к отчёту шага. Это единственный момент, когда видно, что она измеряет реальную страницу: после T021 гейт шага зелен тривиально, потому что под пометкой оказываются все адреса сразу
- [ ] T021 Пометить `test.fixme()` те адреса, которые пересобираются позже; пометка снимается в Step 3.1 (главная), Step 4.1 (прайс) и Step 5.2 (категории)

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

- [ ] T022 [US1] Пересобрать `src/components/Hero.astro`: смещённая влево композиция в колонке 46 знаков, надзаголовок с адресом и часами, направленное затемнение, статичная подложка под текстом (FR-017), обрезанная краем монограмма
- [ ] T023 [US1] Добавить раскрытие `wake`, дыхание завесы и дрейф кадра; текст в анимациях не участвует — иначе страдает LCP
- [ ] T024 [US1] Заменить «мышку» с подпрыгиванием на вертикальный волосок с каплей света
- [ ] T025 [US1] Снять `test.fixme()` с главной в `tests/contrast.spec.ts` и убедиться, что все три прохода зелёные

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

- [ ] T026 [US1] Пересобрать `src/components/Header.astro`: монограмма вместо растрового логотипа, прозрачная шапка на первом экране, уплотнение при прокрутке через `animation-timeline: scroll()` под `@supports`
- [ ] T027 [US1] Убрать растровый логотип из `src/components/Footer.astro`, заменив монограммой; в `src/components/SeoHead.astro:120` изображение организации оставить прежним — там нужен растр, и это решение владельца
- [ ] T028 [US1] Проверить порядок разметки первого экрана против визуального порядка (FR-033) и клавиатурный обход шапки с видимым фокусом (FR-030)

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

- [ ] T029 [US2] Пересобрать `src/components/PriceGroup.astro`: строка «название — точечная выноска — цена», `tabular-nums`, отказ от сплошной заливки карточки
- [ ] T030 [US2] Пересобрать вкладки в `src/components/PriceTabs.astro`: активная на латуни, неактивные — текстовые переключатели с волоском; область нажатия не меньше 24×24 px (FR-031). **Тем же коммитом** синхронизировать классы во встроенном скрипте того же файла — расхождение проявится только после первого переключения вкладки, то есть мимо статической проверки
- [ ] T031 [US2] Добавить надзаголовки групп через `SectionHeading` в `src/components/PriceTabs.astro` и `src/components/ServicePage.astro`
- [ ] T032 [US2] Снять `test.fixme()` с адресов прайса в `tests/contrast.spec.ts`

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

- [ ] T033 [US2] Пересобрать `src/components/ServicesOverview.astro`: карточки-двери с подписью инструмента, без круглых подложек под иконками, с прочерчиванием волоска при наведении и обходом света по очереди (FR-020)

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

- [ ] T034 [P] [US3] Написать `tests/typography.spec.ts`: длина строки ≤ 68 знаков на двенадцати страницах категорий и в повествовательной секции главной, при ширинах 1440 и 2560 (research.md §R12). Тем же файлом — размер области нажатия переключателей прайса не меньше 24×24 px (FR-031). До Step 5.2 файл помечен `test.fixme()`

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

- [ ] T035 [US3] Пересобрать `src/components/ServicePage.astro`: мера строки 62–68 знаков, вводный абзац крупнее остальных, надзаголовки у разделов текста, врезка после вступления, водяной знак за заголовком
- [ ] T036 [US3] Добавить буквицу через `initial-letter` под `@supports` (research.md §R9) — без поддержки абзац начинается обычной буквой
- [ ] T037 [US3] Пересобрать `src/components/About.astro` на примитивы: надзаголовок, лид, мера строки, прочерчиваемый волосок вместо статичного разделителя. Заголовок секции обязан остаться `h3` внутри `#about`: на этот локатор опирается `tests/fonts.spec.ts:84`, и `SectionHeading` вводит над ним надзаголовок, а не заменяет уровень
- [ ] T038 [US3] Снять `test.fixme()` с `tests/typography.spec.ts` и с адресов категорий в `tests/contrast.spec.ts`

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

- [ ] T039 [P] [US4] Написать `tests/reduced-motion.spec.ts`: отсутствие действующих анимаций и переходов плюс неизменность положений секций, карточек услуг, строк прайса и элементов подвала через секунду (SC-007, research.md §R13)
- [ ] T040 [US4] Добавить в `tests/reduced-motion.spec.ts` разбор собранного CSS (`dist/**/*.css`): ни одно правило, задающее носителям проявления нулевую непрозрачность, не лежит вне `@supports (animation-timeline: view())` (SC-012, contracts/motion.md §4). Глазами это не проверяется: движки прогона таймлайн поддерживают, поэтому пустую страницу увидит только посетитель Firefox — то есть уже после сдачи. Разбор текста CSS — единственный способ поймать перевёрнутую вложенность в прогоне
- [ ] T041 [US4] Прогнать `npm run analyze`: исполняемый код обязан остаться 732 Б. Любой прирост означает скрипт там, где должен быть CSS

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

- [ ] T042 [P] Пересобрать `src/components/Certificates.astro`: рамка с бликом по кромке, латунная кнопка
- [ ] T043 [P] Пересобрать `src/components/Footer.astro`: инверсия карты (FR-024), надзаголовки блоков контактов (FR-025), копирайт на `--muted`
- [ ] T044 [P] Пересобрать `src/components/NotFound.astro` на примитивы
- [ ] T045 Убедиться, что старых токенов не осталось: `grep -rn "#[0-9a-fA-F]\{3,6\}\|text-white/\|lada-" src/ --include="*.astro" --include="*.ts"` не находит ничего, кроме объявлений в `src/index.css`
- [ ] T046 Сверить каждый видимый элемент с эталоном из Step 1.1 (FR-034): иконки, ссылки, разделители, подписи — то, чего нет в словаре и что `content-parity.spec.ts` не видит

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
- [ ] T049 Ручные проходы по [quickstart.md](./quickstart.md): Firefox без проявлений, карта под фильтром в WebKit, темп движения против [prototype.html](./prototype.html), частота изменений яркости не чаще трёх в секунду ни у одного слоя (FR-015a) — сверить периоды в `src/styles/ambience.css` с таблицей [contracts/motion.md](./contracts/motion.md)
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
