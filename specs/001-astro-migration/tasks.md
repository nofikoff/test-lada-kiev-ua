---
description: "Task list for 001-astro-migration"
---

# Tasks: Статический многоязычный сайт вместо клиентского SPA

> **Reviewed:** 2026-09-06 by /plan
> **Fixed:** 2026-09-06 by /plan-fix

**Input**: Design documents from `specs/001-astro-migration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: включены. Спека требует машинных проверок как условия приёмки (FR-036, SC-001, SC-010), поэтому тестовые задачи здесь не опция.

**Organization**: шаг — единица коммита. Внутри шага перечислены задачи `T0NN`, они закрываются вместе с шагом. Порядок фаз определяется зависимостями, а не приоритетом историй: эталоны снимаются до того, как что-либо ломается, а перенос прайса в данные стоит в основании, потому что без него не собирается ни одна страница.

`allowed_paths` во всех шагах, кроме документарных, даны корнем исходников. Миграция по своей природе тянет за собой файлы, которые автор шага перечислить не может: удаляемый компонент тащит за собой всех, кто его импортирует.

---

## Phase 0: Эталоны

**Ничего не ломается до конца этой фазы.** Оба шага снимают то, с чем потом сравнивается результат; снятые позже, они бесполезны.

### Step 0.1: Отправная точка измерений с прода

<!-- plan-meta:
allowed_paths:
  - "specs/001-astro-migration/baseline/**"
gate_commands:
  test_quick: "test -d specs/001-astro-migration/baseline && test \"$(ls -A specs/001-astro-migration/baseline | wc -l)\" -gt 0"
-->

Замер снимается с работающего прода `https://www.lada.kiev.ua`, а не с локальной сборки: локальная перестанет собираться уже на Phase 1, а эталоном для сравнения является то, что видит посетитель.

- [x] T009 Снять Lighthouse на мобильном профиле для `/`, `/ru`, `/en` — медиана трёх прогонов на адрес, один прогон шумит на десятки пунктов и сравнению не годится. Скриншоты тех же трёх адресов в ширинах 375, 768, 1440. Всё сохранить в `specs/001-astro-migration/baseline/`

**Done when**: в `baseline/` лежат три отчёта и девять скриншотов, у каждого отчёта указана дата снятия.

### Step 0.2: Эталонная фикстура контента

<!-- plan-meta:
allowed_paths:
  - "scripts/**"
  - "tests/**"
gate_commands:
  test_quick: "node scripts/extract-legacy-content.mjs && node -e \"const f=require('./tests/fixtures/legacy-content.json');if(!f.uk?.length||!f.ru?.length||!f.en?.length)throw new Error('fixture incomplete')\""
-->

- [x] T010 Написать `scripts/extract-legacy-content.mjs`: рекурсивный обход `src/i18n/translations.ts`, сбор всех строковых значений по локалям, запись в `tests/fixtures/legacy-content.json`. Ручной перенос строк запрещён — он воспроизводит ровно ту ошибку, которую фикстура должна ловить
- [x] T011 Выполнить скрипт и закоммитить `tests/fixtures/legacy-content.json`

**Done when**: фикстура содержит непустые массивы по трём локалям и переживёт удаление `translations.ts` в Step 7.4.

---

## Phase 1: Setup

### Step 1.1: Astro, конфигурация, интеграции

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "public/**"
  - "scripts/**"
  - "docs/**"
gate_commands:
  test_quick: "npx astro --version"
-->

- [x] T001 `npm i astro@7.3.1 @astrojs/sitemap@3.7.4 @astrojs/tailwind@6.0.2`, `npm rm @supabase/supabase-js react-router-dom`
- [x] T002 Создать `astro.config.mjs`: `site: 'https://www.lada.kiev.ua'`, `output: 'static'`, `build.format: 'directory'`, блок `i18n` с `defaultLocale: 'uk'`, `locales: ['uk','ru','en']`, `routing.prefixDefaultLocale: false`
- [x] T003 Подключить интеграцию sitemap с блоком `i18n` (`uk: 'uk-UA'`, `ru: 'ru-UA'`, `en: 'en'`) и интеграцию Tailwind

**Done when**: `npx astro --version` печатает 7.3.1, конфигурация читается без ошибок.

### Step 1.2: Tailwind, TypeScript, скрипты

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  test_quick: "npx astro --version && node -e \"const p=require('./package.json');['dev','build','preview','check','test:content','test:e2e','test:invalid-data','analyze'].forEach(s=>{if(!p.scripts[s])throw new Error('missing script: '+s)})\""
-->

- [x] T004 Расширить `content` в `tailwind.config.js` на `./src/**/*.{astro,ts,md}`, сохранив текущие цвета и шрифтовые семейства без изменений
- [x] T005 Заменить `tsconfig.json` на конфигурацию Astro (`extends: 'astro/tsconfigs/strict'`), удалить `tsconfig.app.json` и `tsconfig.node.json`
- [x] T006 Заменить скрипты в `package.json`: `dev`, `build`, `preview`, `check` (`astro check`), `test:content`, `test:e2e`, `test:invalid-data`, `analyze`. Набор должен совпадать с командами, на которые ссылается [quickstart.md](./quickstart.md)

**Done when**: все семь скриптов присутствуют, цветовая палитра в конфигурации Tailwind не изменилась.

### Step 1.3: eslint и Playwright

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  lint: "npx eslint ."
  test_quick: "npx playwright --version"
-->

- [x] T007 Настроить eslint под `.astro` в `eslint.config.js`, убрав правила React-плагинов
- [x] T008 `npm i -D @playwright/test`, создать `playwright.config.ts` с запуском против `npm run preview`

**Done when**: `npx eslint .` проходит на текущем дереве, Playwright установлен.

---

## Phase 2: Foundational

### Step 2.1: Словарь интерфейса, пути, конфигурация вкладок

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [x] T012 Создать `src/i18n/ui.ts`: перенести все подписи интерфейса из `translations.ts` как объект `as const`, ключ `ua` переименовать в `uk`. Длительности хранить шаблоном, а не готовой строкой ([data-model.md](./data-model.md) §Словарь интерфейса)
- [x] T013 Создать `src/i18n/paths.ts`: построение адреса страницы по локали и категории, набор языковых альтернатив, абсолютный канонический адрес с `www` и завершающим слешем
- [x] T014 Создать `src/i18n/tabs.ts`: состав вкладок главной страницы поверх групп прайса, ровно как в [data-model.md](./data-model.md) §Конфигурация вкладок

**Done when**: `astro check` проходит; тип словаря выведен из основной локали, поэтому недостающий ключ в `ru` или `en` — ошибка компиляции.

### Step 2.2: Перенос прайса в данные

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  type: "npx astro check"
  test_quick: "node -e \"const p=require('./src/data/prices.json');const ids=new Set(p.map(x=>x.id));if(ids.size!==p.length)throw new Error('duplicate ids');p.forEach(x=>['uk','ru','en'].forEach(l=>{if(!x.name?.[l])throw new Error('missing '+l+' for '+x.id)}))\""
-->

Самый тяжёлый шаг плана и единственный, где ошибка тиха: перепутанный идентификатор в группе перманента даст не падение сборки, а неверную цену на странице.

- [x] T015 Перенести данные прайса из `src/components/PriceList.tsx` в `src/data/prices.json` по схеме [data-model.md](./data-model.md) §Позиция прайса. Идентификаторы строить от группы: три позиции повторяются между группами с разными ценами и от названия схлопнутся в одну. Долевые цены (`kind: 'share'`) не хранить нулевой суммой

**Done when**: число позиций в JSON равно числу позиций в старом `PriceList.tsx`; идентификаторы уникальны; у каждой позиции есть все три локали.

### Step 2.3: Коллекции и схемы валидации

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [x] T016 Создать `src/content.config.ts`: коллекция `prices` через `file()` с zod-схемой (все три локали обязательны, `amount` и `minutes` — целые положительные, `percent` 1–99, `id` уникален) и коллекция `services` через `glob()`

**Done when**: схема отвергает неполный перевод, отрицательную цену и долю вне диапазона 1–99.

### Step 2.4: Каркас страницы, иконки, изображения

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "public/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [ ] T017 Создать `src/layouts/BaseLayout.astro`: каркас страницы, счётчик аналитики с прежним идентификатором `G-WZT8TJLSDP` и прежним способом загрузки
- [ ] T018 Создать `src/components/Icon.astro` с инлайн-SVG вместо `lucide-react`: телефон, меню, крест, карта, часы, Instagram, подарок
- [ ] T019 Перенести изображения из `public/assets/` в `src/assets/`, кроме изображения предпросмотра — оно остаётся в `public/` с постоянным адресом

**Done when**: каркас собирается, иконки отрисовываются без внешней библиотеки.

---

## Phase 3: User Story 1 — Поисковая система индексирует содержимое (P1)

**Goal**: каждая языковая версия отдаётся готовым HTML с собственными метаданными и машиночитаемым описанием.

**Independent Test**: запросить три адреса без выполнения скриптов; весь текст на месте, метаданные уникальны, языковые альтернативы полны.

### Step 3.1: Тесты SEO-контракта, адресов и интерактива

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

Тесты пишутся до страниц и на этом шаге обязаны падать — падать по существу, а не по синтаксису.

- [ ] T020 `tests/content-parity.spec.ts`: каждая строка `tests/fixtures/legacy-content.json` присутствует в HTML своей локали, сравнение по нормализованным пробелам и кавычкам
- [ ] T021 `tests/seo-contract.spec.ts` по [contracts/page-head.md](./contracts/page-head.md): язык документа, один заголовок первого уровня, канонический адрес, четыре языковые альтернативы, уникальность пары «заголовок + описание» по всем страницам, метаданные предпросмотра, счётчик аналитики. Отдельной проверкой — что **все** абсолютные адреса используют хост с `www` и ни один не ведёт на перенаправление (SC-013)
- [ ] T022 Дописать в `tests/seo-contract.spec.ts` проверки машиночитаемого описания по [contracts/structured-data.md](./contracts/structured-data.md): разбор разметки, соответствие ценового диапазона данным прайса, отсутствие предложений с нулевой ценой
- [ ] T022a `tests/routes.spec.ts` по [contracts/routes.md](./contracts/routes.md): код ответа каждого адреса таблицы, приход `/ru` без слеша на `/ru/`, код 404 на несуществующем адресе, язык страницы ошибки по разделу (SC-008)
- [ ] T022b `tests/interaction.spec.ts`: открытие и закрытие мобильного меню, переключение вкладок мышью, стрелками, Home и End, корректность `aria-selected` и `aria-controls` (FR-027, SC-012)

**Done when**: пять файлов проверок написаны и синтаксически валидны; `astro check` проходит.

### Step 3.2: SeoHead и машиночитаемое описание

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [ ] T023 Создать `src/components/SeoHead.astro`: заголовок, описание, канонический адрес, языковые альтернативы с версией по умолчанию, метаданные предпросмотра с локалью страницы
- [ ] T024 Добавить машиночитаемое описание организации для главной страницы; ценовой диапазон вычислять из `prices.json`, не вписывать строкой

**Done when**: компонент принимает локаль и путь, отдаёт полный набор из [contracts/page-head.md](./contracts/page-head.md).

### Step 3.3: Перенос статических компонентов

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

Вёрстка переносится один в один. Любое расхождение в отображении — дефект переноса, а не улучшение.

- [ ] T025 `src/components/Hero.tsx` → `Hero.astro`
- [ ] T026 `src/components/About.tsx` → `About.astro`
- [ ] T027 `src/components/Certificates.tsx` → `Certificates.astro`
- [ ] T028 `src/components/Footer.tsx` → `Footer.astro`, включая встроенную карту

**Done when**: четыре компонента отрисовываются с теми же классами Tailwind, что в исходных `.tsx`.

### Step 3.4: Header с меню на нативном раскрытии

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [ ] T029 `src/components/Header.tsx` → `Header.astro`: мобильное меню на `<details>`/`<summary>` без скрипта, переключатель языков на ссылках из `src/i18n/paths.ts`

**Done when**: меню открывается и закрывается без единой строки JavaScript и управляется с клавиатуры.

### Step 3.5: Прайс и обзор услуг

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [ ] T030 `src/components/PriceGroup.astro`: блок группы позиций, обе формы цены и долевая цена с подписью вместо суммы
- [ ] T031 `src/components/PriceTabs.astro`: вкладки с `role="tablist"`, `aria-selected`, `aria-controls`. Разметка отдаётся со всеми видимыми блоками, скрытие неактивных выполняет скрипт при инициализации — иначе при отключённых скриптах не видно ничего
- [ ] T032 `src/components/ServicesOverview.astro` со ссылками на страницы категорий

**Done when**: при отключённых скриптах виден весь прайс; при включённых работают вкладки и клавиатура.

### Step 3.6: Страницы главной, robots, прогон проверок

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "public/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

- [ ] T033 Создать `src/pages/index.astro`, `src/pages/ru/index.astro`, `src/pages/en/index.astro` — тонкие обёртки, передающие локаль
- [ ] T034 Создать `public/robots.txt` со ссылкой на карту сайта
- [ ] T035 Прогнать `npm run check`, `npm run build`, `npm run test:content`, `npm run test:e2e` и предъявить вывод

**Done when**: три языковые версии главной собираются, сверка полноты контента и проверки SEO-контракта зелёные.

---

## Phase 4: User Story 2 — Посетитель с телефона получает страницу быстро (P2)

**Independent Test**: измерить страницу на мобильном профиле и сравнить с отправной точкой; исполняемый код помимо аналитики не более 5 КБ.

### Step 4.1: Изображения

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "public/**"
gate_commands:
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

- [ ] T036 Перевести изображение первого экрана с фонового CSS-свойства на компонент изображения с `priority` в `Hero.astro`, с абсолютным позиционированием и `object-fit: cover`
- [ ] T037 Перевести логотип на компонент изображения в `Header.astro` и `Footer.astro`
- [ ] T040 Пережать изображение предпросмотра до 250 КБ и меньше, положить в `public/` под постоянным именем, обновить ссылки в `SeoHead.astro`

**Done when**: сборка отдаёт AVIF и WebP с набором размеров; изображение предпросмотра весит не больше 300 КБ.

### Step 4.2: Шрифты

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

- [ ] T038 Настроить шрифты в `astro.config.mjs` через Fonts API: Inter и Playfair Display, подмножества `latin` и `cyrillic`; удалить обращения к стороннему домену шрифтов
- [ ] T039 Проверить рендером наличие кириллического начертания у Playfair Display на украинском заголовке; при отсутствии — заменить семейство и записать решение в [research.md](./research.md) §R8

**Done when**: в собранном HTML нет обращений к `fonts.googleapis.com` и `fonts.gstatic.com`; украинский заголовок отрисован заявленным шрифтом.

### Step 4.3: Измерение веса и скорости

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "specs/001-astro-migration/**"
gate_commands:
  test_quick: "npm run build && npm run analyze"
-->

- [ ] T041 Добавить скрипт `analyze`, считающий суммарный размер исполняемого кода сборки помимо аналитики
- [ ] T042 Снять измерения новой сборки и сравнить с `specs/001-astro-migration/baseline/`; предъявить оба отчёта

**Done when**: исполняемый код помимо аналитики не превышает 5 КБ; сравнение с отправной точкой приложено.

---

## Phase 5: User Story 3 — Страницы категорий услуг (P3)

**Independent Test**: открыть каждую страницу, проверить уникальность текста, совпадение цен с главной и сохранение категории при смене языка.

### Step 5.1: Проверки страниц категорий и карты сайта

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  type: "npx astro check"
  test_quick: "npx astro check"
-->

- [ ] T043 Дописать в `tests/seo-contract.spec.ts`: цепочка навигации, описание услуги с перечнем предложений, языковые альтернативы ведут на ту же категорию
- [ ] T044 Проверка объёма и уникальности текста: не менее 400 слов на страницу, отсутствие совпадающих абзацев между категориями внутри одной локали. Счётчик слов принимается как рабочее определение «содержательного текста» из FR-017
- [ ] T044a `tests/sitemap.spec.ts`: карта сайта отдаёт XML, содержит ровно пятнадцать адресов, у каждого есть три языковые альтернативы, ни один адрес не отвечает кодом, отличным от 200 (FR-040, SC-003, SC-014)

**Done when**: три проверки написаны и падают по существу.

### Step 5.2: Украинские тексты категорий

<!-- plan-meta:
allowed_paths:
  - "src/content/**"
  - "tests/**"
gate_commands:
  test_quick: "npx astro check"
-->

- [ ] T045 Написать `src/content/services/uk/{massage,depilation,permanent,beauty}.md` на основе существующих описаний услуг: не менее 400 слов на страницу, frontmatter с `category`, `title`, `description`, `heading`

**Done when**: четыре файла проходят схему коллекции; тексты не повторяют друг друга.

### Step 5.3: Переводы текстов категорий

<!-- plan-meta:
allowed_paths:
  - "src/content/**"
  - "tests/**"
gate_commands:
  test_quick: "npx astro check"
-->

- [ ] T046 Перевести четыре текста в `src/content/services/ru/`
- [ ] T047 Перевести четыре текста в `src/content/services/en/`

**Done when**: для каждой из четырёх категорий существуют ровно три файла — по одному на локаль.

### Step 5.4: Страницы категорий

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

- [ ] T048 Создать `src/pages/[category].astro` с генерацией путей из перечисления категорий: заголовок и текст из коллекции, перечень позиций из `prices.json` по группам категории
- [ ] T049 Создать `src/pages/ru/[category].astro` и `src/pages/en/[category].astro`
- [ ] T050 Добавить в `SeoHead.astro` описание услуги с перечнем предложений и цепочку навигации; долевые позиции в перечень не включать
- [ ] T051 Прогнать полный набор проверок и предъявить вывод

**Done when**: пятнадцать страниц в карте сайта, каждая с собственным содержанием и своими метаданными.

---

## Phase 6: User Story 4 — Правка цены в одном месте (P4)

### Step 6.1: Приёмка модели данных

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "specs/001-astro-migration/**"
gate_commands:
  test_quick: "npm run test:invalid-data"
  test_full: "npm run build && npm run test:content && npm run test:e2e && npm run test:invalid-data"
-->

- [ ] T052 Написать `scripts/test-invalid-data.mjs` и скрипт `test:invalid-data`: три случая порчи во временной копии — отсутствующий перевод названия позиции, отсутствующий файл текста категории, отрицательная цена. Каждый ожидает ненулевой код возврата сборки, сообщение указывает на конкретное поле. Порча откатывается автоматически
- [ ] T053 Изменить цену одной позиции, пересобрать и убедиться, что новое значение появилось на главной, на странице категории и в машиночитаемом описании на всех трёх языках; изменение откатить
- [ ] T054 Записать результат обеих проверок в [quickstart.md](./quickstart.md) как подтверждённые

**Done when**: три случая порчи данных роняют сборку автоматически; правка одной цены отражается во всех местах отображения.

---

## Phase 7: Polish

**Порядок внутри фазы обязателен: старый код удаляется только после того, как сверка полноты прошла на новом.**

### Step 7.1: Страницы ошибок и конфигурация сервера

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "public/**"
gate_commands:
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

- [ ] T055 Создать `src/pages/404.astro`, `src/pages/ru/404.astro`, `src/pages/en/404.astro`
- [ ] T056 Переписать `public/.htaccess` по [contracts/routes.md](./contracts/routes.md): удалить подстановку главной страницы, добавить страницы ошибок по разделам, правила кэширования и сжатие

**Done when**: несуществующий адрес отвечает кодом 404 и страницей на языке раздела.

### Step 7.2: Файл описания для языковых моделей

<!-- plan-meta:
allowed_paths:
  - "public/**"
  - "tests/**"
gate_commands:
  test_quick: "npm run build"
-->

- [ ] T057 Обновить `public/llms.txt` под новую структуру страниц; контакты, адрес и часы работы сверить с разметкой страниц и машиночитаемым описанием

**Done when**: контактные данные совпадают во всех трёх источниках.

### Step 7.3: Удаление старого кода

<!-- plan-meta:
allowed_paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
gate_commands:
  lint: "npx eslint ."
  type: "npx astro check"
  test_quick: "npm run build"
  test_full: "npm run build && npm run test:content && npm run test:e2e"
-->

Выполняется только после того, как Step 3.6 показал зелёную сверку полноты. Фикстура из Step 0.2 — единственное, что делает этот шаг безопасным.

- [ ] T058 Удалить `src/App.tsx`, `src/main.tsx`, `src/components/*.tsx`, `src/i18n/translations.ts`, `src/i18n/index.ts`, `index.html`, `vite.config.ts`, а также одноразовый `scripts/build-prices-from-legacy.mjs` (он читает удаляемый словарь). Снять из `package.json` `react`, `react-dom`, `lucide-react`, `@vitejs/plugin-react`, `vite`. Убрать из `tsconfig.json` исключения `src/**/*.tsx`, `src/i18n/index.ts` и `vite.config.ts` — они существуют только ради удаляемых файлов

  **`postcss.config.js` НЕ удалять.** Интеграция `@astrojs/tailwind` в проект не встала (её peer-диапазон заканчивается на Astro 5), поэтому Tailwind подключён именно через этот файл — см. [research.md](./research.md) §R9. Удалённый, он оставит сборку без единой утилиты и при этом не уронит её: страницы просто отрисуются без стилей.
- [ ] T059 Прогнать `npm run check`, `npm run build`, `npm run test:content`, `npm run test:e2e` после удаления — сверка полноты обязана пройти на фикстуре, снятой в Step 0.2

**Done when**: в дереве не осталось React-кода, все проверки зелёные.

### Step 7.4: Ручная приёмка

<!-- plan-meta:
allowed_paths:
  - "specs/001-astro-migration/**"
  - "tests/**"
gate_commands:
  test_quick: "npm run build"
-->

- [ ] T060 Проверить поведение при отключённых скриптах: весь прайс виден, навигация работает
- [ ] T061 Снять скриншоты новой сборки в трёх ширинах и сверить с отправной точкой; расхождение — дефект переноса, а не улучшение
- [ ] T062 Прогнать три страницы через валидатор структурированных данных, вывод приложить к приёмке

**Done when**: результаты трёх проверок приложены к пакету.

### Step 7.5: Закрытие пакета

<!-- plan-meta:
allowed_paths:
  - "docs/**"
  - "specs/001-astro-migration/**"
gate_commands:
  test_quick: "test -f docs/runbook-deploy.md"
-->

- [ ] T063 Записать процедуру выкладки в `docs/runbook-deploy.md`: удаление файлов предыдущей сборки, выкладка, сброс кэша сети доставки для постоянных адресов, проверка что отдаётся собственный файл правил для роботов
- [ ] T064 Отметить пункты [checklists/migration-seo.md](./checklists/migration-seo.md), записать в [spec.md](./spec.md) фактический результат по каждому критерию приёмки

**Done when**: инструкция по выкладке существует, пакет закрыт фактическими результатами.

---

## Dependencies

```text
Phase 0 (0.1, 0.2)  — эталоны, ничего не ломается
   └─> Phase 1 (1.1 → 1.2 → 1.3)
          └─> Phase 2 (2.1 → 2.2 → 2.3 → 2.4)
                 └─> Phase 3 (3.1 → 3.2 → 3.3, 3.4, 3.5 → 3.6)   🎯 MVP
                        ├─> Phase 4 (4.1, 4.2 → 4.3)
                        └─> Phase 5 (5.1 → 5.2 → 5.3 → 5.4)
                               └─> Phase 6 (6.1)
                                      └─> Phase 7 (7.1 → 7.2 → 7.3 → 7.4 → 7.5)
```

**Единственная жёсткая связь через весь план**: Step 0.2 → Step 7.3. Фикстура снимается со старого словаря; удалённый раньше, он делает проверку полноты невозможной, и потеря текста при переносе останется незамеченной навсегда.

Вторая по важности: Step 0.1 → Step 4.3. Отправная точка снимается с работающего прода до начала работ; снятая позже, она уже измеряет не то состояние.

## Implementation Strategy

**MVP — фазы 0–3.** Три языковые версии главной страницы, отдаваемые готовым HTML с корректными метаданными, решают главную проблему: сегодня поисковик не видит содержимого вовсе. Это состояние публикуемо само по себе.

**Инкремент 2 — фаза 4.** Скорость. Отделена намеренно: оптимизация изображений и шрифтов не меняет разметку, поэтому её измеримый эффект виден отдельно от эффекта самой миграции.

**Инкремент 3 — фазы 5–6.** Страницы категорий. Единственная часть, зависящая от готовности текстов; при неготовности вычитки публикуется без неё, остальные критерии приёмки не страдают.

**Выкладка — фаза 7.** Удаление старого кода и правка конфигурации сервера идут последними, потому что до этого момента откат стоит одну команду.

## Соответствие требованиям

Сквозная сверка выполнена `/speckit-analyze` 2026-09-06: покрытие 100%, нарушений конституции нет. Задачи T022a, T022b и T044a добавлены по её результатам — они закрывают SC-008, FR-027 с SC-012 и связку FR-040, SC-003, SC-014.

Ревью `/plan` 2026-09-06 добавило Phase 0 и пофазные `gate_commands`: эталоны обязаны сниматься до того, как Setup ломает старую сборку, а `astro check` и Playwright не могут быть гейтами шагов, которые их устанавливают.

## Session Map

- [x] S1 (~570K) Steps 0.1, 0.2, 1.1, 1.2, 1.3, 2.1, 2.2, 2.3 — done 2026-09-06
- [ ] S2 (~590K) Steps 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 — **current**
- [ ] S3 (~520K) Steps 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
- [ ] S4 (~550K) Steps 5.4, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5

## Progress Log

### S1.step-0.1 — 2026-09-06
**Completed steps:** 0.1
**Commits:** e0d101e

### S1.step-0.2 — 2026-09-06
**Completed steps:** 0.2
**Commits:** 9ca038f

### S1.step-1.1 — 2026-09-06
**Completed steps:** 1.1
**Commits:** 1733b90

### S1.step-1.2 — 2026-09-06
**Completed steps:** 1.2
**Commits:** 38e9e2a

### S1.step-1.3 — 2026-09-06
**Completed steps:** 1.3
**Commits:** 1f14dec

### S1.step-2.1 — 2026-09-06
**Completed steps:** 2.1
**Commits:** b5da9c4

### S1.step-2.2 — 2026-09-06
**Completed steps:** 2.2
**Commits:** 21e2744

### S1.step-2.3 — 2026-09-06
**Completed steps:** 2.3
**Commits:** 78089ff

### S1 — observations (2026-09-06, dispatch 1)
plan-wrong: TaskCreate is not available in this harness — the contract's mandatory first action could not be performed; bundle tracked without it.
plan-wrong: Step 1.1/1.2/1.3/2.3 allowed_paths list only src/tests/public/scripts/docs, but T002 requires creating astro.config.mjs, T005/T006 require tsconfig.json and package.json, T007/T008 require eslint.config.js and playwright.config.ts — all top-level. The orchestrator's UNION lease covered them; the per-step lists in the plan are unsatisfiable as written.
plan-wrong: package-lock.json is in no allowed_paths list at all, yet every npm step rewrites it. Committed alongside package.json — a lock left out of the commit would be a worse defect.
plan-wrong: T003 requires @astrojs/tailwind@6.0.2; its peerDependencies are astro ^3||^4||^5 and npm stops on ERESOLVE against astro 7. Tailwind 3 wired through the pre-existing postcss.config.js instead (that is all the integration does). Consequence recorded in research.md §R9: postcss.config.js must be REMOVED from T058's deletion list in Step 7.3, or the site builds with no utilities at all and does not fail while doing it.
plan-wrong: research.md §R11 says site: 'https://lada.kiev.ua'; §R15, T002 and contracts/routes.md say www. Used www. §R11 still carries the apex form and will mislead whoever reads it next.
plan-wrong: data-model.md §Позиция прайса had no price form for exotic-anti-cellulite, which the legacy component prices by session count (950 / 4500 / 8500 via the session/sessions5/sessions10 dictionary keys), not by duration. Storing it as minutes 1/5/10 would render '5 хв' against 4500 грн — exactly the silent error Step 2.2 is flagged for. Extended variants to {count, unit:'minutes'|'sessions'} and wrote the correction into data-model.md. Three price forms still, but Step 3.5 rendering and Step 3.2 structured data must read the unit.
plan-wrong: eslint-plugin-astro (both 2.x and 3.x) requires eslint >= 10; the project was on eslint 9 with typescript-eslint 8.8.1, and `npx eslint .` was already crashing before I touched it (no-unused-expressions rule schema mismatch). T007 does not mention the eslint 10 upgrade it implies.
plan-wrong: T006 lists eight scripts but the step's Done-when says seven; the gate command checks all eight. Implemented all eight plus lint.
plan-wrong: .astro/ is generated by every sync/check/build and is absent from .gitignore, which I may not edit. Parked in .git/info/exclude so the worktree stays clean — a human should add `.astro/` to .gitignore, since the exclude file is local-only and does not survive a fresh clone.
plan-wrong: astro sync warns that src/content/services/ does not exist (files arrive in Step 5.2). Expected, but it is a warning on every gate run from here to Phase 5.
redone: prices.json was generated once with the permanent groups before browsLashes/makeupHair; an independent re-extraction of every amount straight out of PriceList.tsx flagged 61 mismatches from index 56 on — all of them the ordering, none of them a value. Reordered to the component's declaration order and the cross-check went clean on all 73 items (names in 3 locales, descriptions, every amount, every unit, order).
redone: the duplicate-id guard was first written as a throwing `parser` on the file() loader. astro sync exited 0 — the loader catches parser exceptions, logs, and returns, so the whole price collection would have loaded as empty with a green build. Replaced with prerenderConflictBehavior: 'error' in astro.config.mjs, which makes the loader's own duplicate detection throw; re-verified that a duplicated id now exits 1.
redone: eslint.config.js written twice — tseslint.config() is deprecated in typescript-eslint 8.69 and astro check reported it as a hint; switched to defineConfig from eslint/config.
decided: prices.json is generated by scripts/build-prices-from-legacy.mjs rather than hand-written. 73 items x 3 locales is 219 strings and hand-copying reproduces exactly the error the fixture exists to catch — the plan makes that argument itself for T010. Only ids, groups and amounts are hand-authored; every name and description is pulled from translations.ts by the same key the component uses. The script is one-shot and should be deleted with translations.ts in Step 7.3.
decided: the 50% touch-up name is stored without its trailing '50%' (name 'Коррекция (28-60 дней)', note '50%'), since the share note now renders that. If Step 3.5 does not place the note immediately after the name, the content-parity test will fail on the fixture string 'Коррекция (28-60 дней) 50%' — that is the fixture working, not a bug.
decided: tsconfig.json excludes src/**/*.tsx, src/i18n/index.ts and vite.config.ts. verbatimModuleSyntax from astro/tsconfigs/strict makes src/i18n/index.ts:2 a hard TS1484 error, and that dead React tree would have poisoned every astro check gate from 2.1 to 7.3. The excludes must be deleted together with the files in Step 7.3.
decided: added src/data/price-groups.ts beyond the three modules T012-T014 name — tabs.ts cannot be typed against price groups without a single home for the group-to-category table from data-model.md §Группа прайса. content.config.ts reads its group enum from the same place.
decided: ui.ts carries meta (title + description, all three verified inside 120-160 chars) and error-page text, which page-head.md and data-model.md source from the dictionary but T012 does not enumerate; also sections.exotic, which the legacy tab does not render but the /massage/ category page needs, or that block lands unlabelled. Renamed services.makeup to services.beauty so the key matches the category id; displayed text unchanged.
decided: baseline keeps only the median run per URL (3 reports, not 9) with all nine scores tabulated in baseline/README.md — the six discarded reports were 9.5 MB. Screenshots are full-page captures via CDP, not viewport crops, since Step 7.4 compares block composition and order.
