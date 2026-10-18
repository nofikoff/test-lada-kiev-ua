# Implementation Plan: Knowledge Base Pilot

**Branch**: `007-knowledge-base-pilot` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-knowledge-base-pilot/spec.md`

## Summary

Раздел базы знаний `/guide/` и страница эксперта `/lada/` на uk и ru, пилот — хаб депиляции и статья «депіляція чи епіляція» / «депиляция и эпиляция». Страница базы знаний — Markdown-файл коллекции `guide`, путь которого повторяет адрес; языки страницы выводятся из того, какие файлы есть. Связность страницы с остальной базой и с услугами сборка берёт из `docs/seo/map.md`: адреса страниц карты и ссылки §Links с анкорами. Межфайловые правила (хаб без статьи, статья без хаба, повтор `page`, страница вне карты) проверяет модуль `src/data/guide.ts` и останавливает сборку сообщением с путём файла. Страница эксперта — коллекция `expert` по образцу `about`. `languageAlternates` перестаёт знать только категории и подстраницы: страница несёт свой набор языков, `x-default` — uk, а без неё — единственная версия. JSON-LD: `Article`, `CollectionPage`, `ProfilePage` с общим узлом основательницы `#founder` главной. Клиентского скрипта нет; новые шаблоны собраны из существующих примитивов, крошки и типографика текста выносятся из `ServicePage.astro` в общие места.

## Technical Context

**Language/Version**: TypeScript 5.5, Astro 7.3.1 (`output: 'static'`), Node ≥ 22.12

**Primary Dependencies**: `astro` (content layer: `glob`, `astro/zod`), `@astrojs/sitemap` 3.7.4; новых зависимостей нет

**Storage**: файлы репозитория — `src/content/guide/**`, `src/content/expert/*.md`, `docs/seo/map.md` (читается сборкой, пишет `/seo`)

**Testing**: Playwright 1.63 против `astro preview` над `dist/` ([ADR-012](../../docs/adr/adr-012-tests-against-built-dist.md)); `npm run test:invalid-data` для порченых данных; `node --test` для разбора карты

**Target Platform**: статический HTML на Apache за Cloudflare, выкладка только workflow `publish` ([ADR-026](../../docs/adr/adr-026-single-ci-deploy-path.md))

**Project Type**: статический многоязычный сайт

**Performance Goals**: ноль байт нового клиентского JS (`npm run analyze`); LCP меряется только на `/` и `/ru/` ([home-hero.md](../../docs/specs/home-hero.md)), новые страницы его не трогают

**Constraints**: без `en`; без HTML-комментариев в `dist/` (в `.astro` — только `{/* */}`); комментарии кода на русском, один язык на файл; код в ветке до слияния — всё из `main` уходит с ближайшей галочкой Лады

**Scale/Scope**: +6 адресов (19 → 25); следующие 31 страница карты добавляются файлами и правками по списку FR-016, без изменения шаблонов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип / ограничение | Вердикт | Чем держится |
|---|---|---|
| I. Zero client-side framework | complies | шаблоны без `<script>`, списки собираются на сборке; `npm run analyze` |
| II. Контент — данные | complies | две коллекции со схемой; межфайловые правила роняют сборку в `src/data/guide.ts`; исключение из «перевод обязателен»: перевод обязателен на языки страницы, а страница базы знаний может быть одноязычной — так же, как подстраница без `en`. Исключение записывают ADR-029 и `docs/specs/content-model.md` §Инварианты (задачи T058, T062): конституция ссылается на §Инварианты, и строка только в этом вердикте до неё не дошла бы |
| III. URL — публичный контракт | complies | действующие адреса не меняются; новые — в форме со слешем; `/guide/` и `/ru/guide/` отвечают 404 правилом `.htaccess` (research R5) |
| IV. Страница самодостаточна для машинного читателя | complies | `SeoHead.astro` на всех новых страницах; JSON-LD — [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md) |
| V. Готовность доказывается прогоном | complies | семь гейтов CLAUDE.md §Гейты, новые случаи — [quickstart.md](quickstart.md) |
| Technology Constraints | complies | Astro статикой, Tailwind 3 без смены версии, аналитика не трогается |
| Quality Gate: нет комментариев в `dist/` | complies | `tests/build-output.spec.ts` проходит по всем HTML, включая новые |

ADR, прочитанные вручную под пути плана (у ADR репозитория нет строк `Affects`, поэтому сопоставление по путям ничего не нашло):

| ADR | Вердикт |
|---|---|
| ADR-004 (статический Astro, без UI-фреймворка на клиенте) | complies |
| ADR-008 (адрес одинаков во всех языках, альтернативы — подстановкой префикса) | complies: slug общий для uk и ru, `languageAlternates` по-прежнему подставляет префикс |
| ADR-012 (проверки против собранного `dist/`) | complies |
| ADR-019 (по имени называется только Лада) | complies: автор всех статей — Лада, мастера не названы |
| ADR-020 (`FAQPage` не размечается) | complies |
| ADR-021 / ADR-023 / ADR-028 (страницы под запросы; база знаний под информационные; коммерческие подстраницы) | complies: информационный кластер получает страницу базы знаний; хаб и эксперт запросов ядра не держат |
| ADR-024 (статьи через git, без CMS) | complies: статья — файл в коллекции, проходит те же гейты |
| ADR-026 (единственный путь выкладки, `main` готов к выкладке) | complies: код в ветке `007-knowledge-base-pilot` до слияния |
| ADR-027 (полный e2e вне публикации) | complies: `test:publish` запускает `seo-contract.spec.ts`, новые страницы попадают в него через `allPages` |

**Re-check after Phase 1 design**: вердикты не изменились. Дизайн добавил чтение `docs/seo/map.md` сборкой и правило `.htaccess`; оба укладываются в II и III и записаны в Complexity Tracking и research R3, R5.

ADRs without Affects: 26 (`adr_affects.py match` 2026-10-18: `matched` пуст, `unmarked` 26, ещё 2 пропущены как частично заменённые — ADR-021 и ADR-023 несут `Superseded by`).

## Project Structure

### Documentation (this feature)

```text
specs/007-knowledge-base-pilot/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── routes.md
│   ├── content-files.md
│   ├── links.md
│   └── page-head-and-jsonld.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── content.config.ts                 # + коллекции guide и expert
├── content/
│   ├── guide/
│   │   ├── uk/depilation.md          # хаб /guide/depilation/
│   │   ├── uk/depilation/vs-epilation.md
│   │   ├── ru/depilation.md
│   │   └── ru/depilation/vs-epilation.md
│   └── expert/
│       ├── uk.md
│       └── ru.md
├── data/
│   ├── guide.ts                      # новый: индекс базы знаний, чтение карты, межфайловые проверки
│   ├── seo-map.ts                    # новый, чистый: parseSeoMap, linksFrom(map, locale, path, builtPaths)
│   ├── map-links.ts                  # новый: pageLinks(locale, path) — карта и адреса из guideIndex()
│   ├── expert.ts                     # новый: expertCopy(locale)
│   ├── founder.ts                    # новый: узел Person #founder для главной, статьи и эксперта
│   └── guide-structured-data.ts      # новый: Article, CollectionPage, ProfilePage, BreadcrumbList
├── i18n/
│   ├── paths.ts                      # PageRef: + guide и expert; pageLocales/languageAlternates
│   └── guide.ts                      # новый: словарь подписей раздела только для uk и ru
├── components/
│   ├── Breadcrumbs.astro             # новый: вынесен из ServicePage.astro
│   ├── MapLinks.astro                # новый: блок ссылок карты от страницы
│   ├── GuideHub.astro                # новый
│   ├── GuideArticle.astro            # новый
│   ├── ExpertPage.astro              # новый
│   ├── ServicePage.astro             # крошки → Breadcrumbs; + MapLinks после текста
│   └── SeoHead.astro                 # PageRef; заголовок/описание и JSON-LD новых видов
├── layouts/BaseLayout.astro          # тип page → PageRef
├── index.css                         # типографика текста из Markdown → @layer components
└── pages/
    ├── guide/[...slug].astro
    ├── ru/guide/[...slug].astro
    ├── lada.astro
    └── ru/lada.astro

public/
├── .htaccess                         # + 404 на /guide/
├── ru/.htaccess                      # + 404 на /ru/guide/
└── llms.txt                          # + раздел Knowledge base; вводная часть без счёта страниц

tests/
├── support/site.ts                   # + GUIDE_PAGES, EXPERT_PAGES, запросы; allPages
├── routes.spec.ts  sitemap.spec.ts  seo-contract.spec.ts  voice.spec.ts
├── contrast.spec.ts  typography.spec.ts
├── build-output.spec.ts              # + каталоги dist/ без index.html
└── links.spec.ts                     # новый: связи map.md §Links в HTML

scripts/
├── test-invalid-data.mjs             # + случаи базы знаний и допустимая вторая статья
└── seo-map.test.mjs                  # новый: разбор таблиц карты

.github/workflows/publish.yml         # + проверка 404 на /guide/ после выкладки
docs/ (при реализации)                # routes.md, page-head.md, structured-data.md, content-model.md,
                                      # voice.md, runbook-deploy.md, adr/adr-029-*.md, CLAUDE.md
```

**Structure Decision**: одна кодовая база сайта. Страницы `src/pages/**` остаются объявлением локали; состав страницы — в компонентах, данные и проверки — в `src/data/`, как у категорий и подстраниц. Почему так разложено:

- **Коллекция `guide` — путь файла и есть адрес** (research R1). `uk/depilation.md` — хаб `/guide/depilation/`, `uk/depilation/vs-epilation.md` — статья `/guide/depilation/vs-epilation/`. Загрузчик берёт `**/*.md`, а не шаблон по категориям: файл в неверном каталоге должен остановить сборку, а не молча выпасть из неё.
- **Межфайловые проверки живут в `src/data/guide.ts`** (R2), как у `gallery.ts` и `serviceCopy`: схема видит одну запись. Порядок фиксирован, чтобы порча давала одно предсказуемое сообщение: форма пути → язык и категория → повтор `page` → общий адрес версий одного `page` → пары хаб/статья → соответствие карте. Дата правки раньше даты публикации — правило одной записи, оно стоит в схеме.
- **`languageAlternates` обобщается через `PageRef`** (R4). `ServicePageRef` остаётся как есть; к объединению добавляются `{ kind: 'guide', category, article?, locales }` и `{ kind: 'expert' }`. Языки страницы базы знаний вычисляет `guide.ts` и кладёт в ссылку; `pageLocales` их возвращает, `x-default` — uk, а при её отсутствии — первая (единственная) версия.
- **Ссылки рисуются из `docs/seo/map.md`** (R3). Чистый `src/data/seo-map.ts` разбирает §Pages и §Links. `linksFrom(map, locale, path, builtPaths)` отдаёт рёбра, у которых `from` — эта страница, а `to` — собранная страница сайта. Файл карты читает `guide.ts`: ему карта нужна для остановок 10–11, и он кладёт её в индекс. Обёртка `src/data/map-links.ts` собирает `builtPaths` из индекса, страниц услуг и эксперта. Импорт идёт в одну сторону, `seo-map.ts` ← `guide.ts` ← `map-links.ts`: модуль, который и читал бы карту, и спрашивал `guideIndex()` о собранных адресах, замкнул бы цикл с `guide.ts` (data-model.md §Seo map). Анкор берётся из карты, регистр выводимого текста правит `displayAnchor` (первая буква и имена собственные из словаря); при сравнении `/seo audit` регистр не важен.
- **Блок «категория → хаб»** — компонент `MapLinks.astro` в `ServicePage.astro` сразу после `.service-copy`, вне `[data-service-copy]`. Он выводит рёбра карты от страницы услуги к страницам базы знаний. Пока хаба нет, рёбер к опубликованным страницам нет и блок не рендерится; тексты категорий не правятся. Тот же механизм позже даст `/depilation/sugaring/ → sugaring-what-is` без правки шаблона.
- **Карта сайта — без изменения конфигурации** (R6): интеграция сама группирует адреса по пути без префикса. Страница на двух языках получает две альтернативы, на одном — ни одной (проверено по исходнику 3.7.4).
- **`llms.txt` — раздел «Knowledge base» руками**, как остальной файл. Полноту держит `tests/llms.spec.ts` через расширенный `allPages`. Вводная часть теряет счёт страниц и обещание прайса на каждой странице ([contracts/routes.md](contracts/routes.md) §llms.txt): иначе каждая статья правила бы число, которое ничто не проверяет.
- **`/guide/` → 404 на Apache** (R5): каталог без `index.html` прод отдаёт как 403 (замер 2026-10-18 на `/_astro/`). `RedirectMatch 404` в корневом и `ru/` `.htaccess` плюс проверка в `publish.yml` после выкладки. Каталоги `dist/` без индекса сверяет со списком `tests/build-output.spec.ts` ([contracts/routes.md](contracts/routes.md) §Directories without index).
- **Новая статья — список мест (FR-016)**, пишется в `routes.md` рядом со списком подстраниц:
  - файл на каждый язык в `src/content/guide/`, хаб своего языка — если его ещё нет;
  - строки страницы и рёбра в `docs/seo/map.md`, их пишет `/seo map`;
  - запись в `GUIDE_PAGES`, запрос статьи и его запрет хабу того же языка в `tests/support/site.ts`;
  - строка запроса в `page-head.md`;
  - строка в разделе Knowledge base `public/llms.txt`;
  - строки §Sources и §Practice claims в `content-model.md` §Knowledge base;
  - имя собственное в новом анкоре карты, кроме «Київ» / «Киев», — в словарь регистра `src/i18n/guide.ts`.

  Пропуск файла, карты, `tests/support/site.ts` или `llms.txt` краснит сборку или прогон: `sitemap.spec.ts` и `llms.spec.ts` сверяют собранные адреса с `allPages`. Строку `page-head.md`, источники и словарь регистра не ловит ничто: документ и источники держит вычитка, а анкор со строчным именем тест ссылок пропускает, потому что сравнивает без регистра.
- **Документы при реализации**: `routes.md` (строки маршрутов, `/guide/` → 404, список FR-016), `page-head.md` (`hreflang` по существующим версиям, хаб и эксперт без запроса ядра, строки запросов), `structured-data.md` (`Article`, `CollectionPage`, `ProfilePage`, `founderNode`), `content-model.md` (коллекции `guide` и `expert`, остановки сборки, источники), `voice.md` (подпись статьи, Лада в третьем лице на `/lada/`), `runbook-deploy.md` (проверки `/guide/` после выкладки; строка в таблице статусов: «ошибка, сайт не изменён» с `docs/seo/map.md` или `src/content/guide/` в журнале — карта разошлась с контентом, правка карты откатывается или доводится `/seo map` в ветке), `accessibility.md` не меняется — новые страницы входят в действующие проверки. В `CLAUDE.md` строка карты: трогаешь `docs/seo/map.md` или `src/content/guide/` → открой `content-model.md` §Knowledge base, потому что сборка читает карту — переименование `page`, смена адреса или удаление ребра «хаб → статья» останавливает публикацию, в том числе галочку Лады, а правка анкора в `main` меняет текст ссылки на сайте со следующей публикацией. Содержимое `contracts/` уходит в эти документы при реализации; пакет держит его только до ретайра.
- **Словарь раздела — отдельный модуль `src/i18n/guide.ts` на uk и ru.** Ключи `ui.ts` обязаны существовать и в `en`, а английских страниц раздела нет. Подпись автора — `signatureName` и `signatureRole` из коллекции `about`, тот же источник, что у «Про нас» и у `founder.name`.

**ADR decision**: одно решение, ADR-029 (номер выдан get-id 2026-10-18, имя `knowledge-base-collection-links-from-seo-map`). Файл `docs/adr/adr-029-knowledge-base-collection-links-from-seo-map.md` пишется при реализации, в ветке. Решение: страница базы знаний — Markdown-файл коллекции, путь которого повторяет адрес, а её ссылки сборка берёт из `docs/seo/map.md`. Rejected-пункты, которые кто-нибудь предложит снова:

- TS-реестр по образцу `serviceSubpages` — вторая запись того, что уже сказано файлом и картой, плюс правка кода на каждую статью;
- корневая страница `/guide/` — в карте её нет, а список без своего запроса размывает хабы;
- анкоры копией в коде или во frontmatter — вторая запись карты, расходится на первой правке `/seo map`;
- флаг черновика — черновик живёт в `docs/seo/drafts/`, и флаг означал бы файл в контенте, который не публикуется.

В Consequences ADR-029 записываются ещё две строки. Первая — исключение из принципа II конституции: «перевод обязателен на языки страницы; страница базы знаний может быть одноязычной». Вторая — `Follow-up:` проверка решения через 8 недель после выкладки: у статьи пилота больше нуля показов в Search Console на каждом языке (SC-003).

Отдельного ADR для корня `/guide/` нет: это пункт того же решения о структуре раздела. Таблица маршрутов `routes.md` ссылается на ADR-029.

## Complexity Tracking

Нарушений конституции нет. Два решения дороже простой альтернативы, поэтому записаны здесь:

| Решение | Зачем | Чем плоха простая альтернатива |
|---|---|---|
| Сборка читает `docs/seo/map.md` | один источник ссылок и анкоров; новая статья не требует правки кода ссылок | копия рёбер в TS или во frontmatter расходится с картой молча; проверка ловит расхождение, но каждая правка `/seo map` становится правкой в двух местах |
| Вынос крошек и типографики текста из `ServicePage.astro` | статья и хаб выглядят как текст услуги без копии стилей | копия стилей в двух компонентах расходится на первой правке; вынос проверяют существующие `typography.spec.ts` и `contrast.spec.ts` на страницах услуг |
