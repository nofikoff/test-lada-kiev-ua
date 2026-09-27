# Quickstart: проверка пакета 004

Предусловие: `npm ci`, ветка `004-site-voice`. `astro dev` автора на 4321 прогону не мешает — e2e и Lighthouse идут по preview на 4329.

## 1. Гейты

```sh
npm run check && npm run lint && npm run build
npm run test:e2e          # против свежего dist/ — без build проверяется прошлая сборка
npm run test:invalid-data # включает случай «нет src/content/about/<locale>.md»
npm run analyze
```

Ожидается: всё зелёное; в `test:invalid-data` строка `✓ отсутствующий файл обращения`.

## 2. Контракт текста

Проверки [contracts/page-copy.md](contracts/page-copy.md) входят в `test:e2e`. Точечно:

```sh
npx playwright test tests/voice.spec.ts tests/seo-contract.spec.ts tests/content-parity.spec.ts tests/headings.spec.ts
```

## 3. Шрифты первого экрана не изменились (FR-015)

`tests/voice.spec.ts` сравнивает состав загруженных начертаний на `/` и `/ru/` — пары «гарнитура, начертание, насыщенность» из `document.fonts` со статусом `loaded` — с литералом, снятым на `main` до правки. Литерал, а не хэшированные имена `.woff2`: имена меняются при обновлении шрифтов без изменения состава.

## 4. Первый экран (SC-004)

Процедура — docs/specs/home-hero.md §Производительность: Lighthouse 12.8.2, мобильный профиль, `--throttling-method=simulate`, прогретый preview на 4329, два прогона на `/` и `/ru/`. Ожидается LCP ≤ 2.5 с.

## 5. Разметка (SC-005)

`dist/index.html` и `dist/massage/index.html` — блоки `application/ld+json` в [validator.schema.org](https://validator.schema.org/) (вставкой кода): 0 ошибок.
