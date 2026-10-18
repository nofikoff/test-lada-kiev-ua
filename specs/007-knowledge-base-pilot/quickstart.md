# Quickstart: Knowledge Base Pilot

Как доказать, что пакет работает. Что именно проверяется — [contracts/](contracts/); здесь только порядок запуска и ожидаемый исход.

## Prerequisites

- Ветка `007-knowledge-base-pilot`: код в `main` ушёл бы на сайт с ближайшей галочкой Лады ([ADR-026](../../docs/adr/adr-026-single-ci-deploy-path.md)).
- `npm ci`; для полного e2e — `npx playwright install chromium webkit`.
- `docs/seo/map.md` содержит строки `depilation-guide`, `depilation-vs-epilation`, `lada` на uk и ru и их рёбра §Links (на 2026-10-18 содержит).

## 1. Build

```bash
npm run build
ls dist/guide/depilation/index.html dist/guide/depilation/vs-epilation/index.html \
   dist/ru/guide/depilation/index.html dist/ru/guide/depilation/vs-epilation/index.html \
   dist/lada/index.html dist/ru/lada/index.html
test ! -e dist/guide/index.html && test ! -e dist/en/guide && test ! -e dist/en/lada
```

Ожидается: шесть файлов есть, корня раздела и английских версий нет.

## 2. Gates

```bash
npm run check && npm run lint && npm run test:unit && npm run build \
  && npm run test:e2e && npm run test:invalid-data && npm run analyze
```

Все семь зелёные. Новые случаи по сценариям spec:

| Сценарий | Где видно |
|---|---|
| US1: статья отвечает 200, запрос в 4 местах, ссылка на `/depilation/` своего языка | `routes`, `voice`, `links` |
| FR-006, FR-010: рёбра пилота «статья → хаб» и «статья → услуга» на uk и ru — литералами `PILOT_EDGES`, без чтения карты | `links` |
| FR-005: заголовок хаба — формула раздела и категории; проверка запроса в описании у хаба пропущена | `voice` |
| US1-2: `hreflang` статьи — uk, ru, `x-default` → uk | `seo-contract` |
| US1-3, FR-012–FR-014: правдивость, оговорка о терминах, переводы, голос | вычитка, шаг 4 |
| US2: подпись ведёт на `/lada/` своего языка; `author['@id']` = `#founder` главной; `ProfilePage.mainEntity` — тот же узел | `voice`, `seo-contract` |
| US2-2: абзацы эксперта не повторяют «Про нас» | `seo-contract`; пересказ — вычитка |
| US2-3, FR-008: список статей эксперта равен статьям `GUIDE_PAGES` своего языка | `seo-contract`; вторая статья — шаг 3 |
| US3: на `/depilation/` и `/ru/depilation/` ссылка на хаб, на трёх других категориях ссылок в раздел нет | `links` |
| FR-002: 404 на `/guide/`, `/ru/guide/`, `/en/guide/depilation/vs-epilation/`, `/en/lada/` | `routes` (preview); прод — шаг 5 |
| FR-002: в `dist/` нет каталога без `index.html`, кроме `_astro/`, `guide/`, `ru/guide/`; у двух последних есть правило 404 | `build-output` |
| FR-005: запрос статьи и эксперта в своих местах; хабу запрещённые формулировки отсутствуют; пара «заголовок + описание» уникальна | `voice`, `seo-contract` |
| FR-006: крошки, подпись, видимые даты равны датам JSON-LD | `seo-contract` |
| FR-007: список хаба и `hasPart` — все статьи категории и языка | `links`, `seo-contract` |
| FR-009: `Article`, `CollectionPage`, `ProfilePage`, `BreadcrumbList` | `seo-contract`; валидатор — шаг 4 |
| FR-011: шесть адресов в карте сайта с альтернативами и в `llms.txt` | `sitemap`, `llms` |
| FR-012: ≥ 400 слов в `[data-guide-copy]`, абзацы статьи и хаба уникальны в языке | `seo-contract` |
| FR-015: ноль нового JS, вёрстка из действующих примитивов | `analyze`, `contrast`, `typography`, `headings`, `build-output` |
| FR-016: список мест в `routes.md` | вычитка при слиянии |

## 3. Invalid data (US4, SC-004)

`npm run test:invalid-data` печатает `✓` на каждом случае и восстанавливает дерево:

- удалён `src/content/guide/ru/depilation/vs-epilation.md` → сборка остановлена, сообщение называет `src/content/guide/ru/depilation.md` (хаб без статьи);
- удалён `src/content/guide/ru/depilation.md` → называет `src/content/guide/ru/depilation/vs-epilation.md` (статья без хаба);
- добавлен `src/content/guide/uk/depilation/copy.md` с `page: depilation-vs-epilation` → называет оба файла (повтор `page`);
- `src/content/guide/ru/depilation/vs-epilation.md` перемещён в `ru/depilation/other.md` → называет оба файла: версии `depilation-vs-epilation` лежат по разным адресам;
- `modified` раньше `published` у uk-статьи → ошибка схемы по `modified`;
- `slug:` во frontmatter uk-статьи → ошибка схемы с именем ключа;
- добавлен `src/content/guide/uk/depilation/vs-epilation/deep.md` → путь не хаба и не статьи;
- добавлен `src/content/guide/en/depilation.md` → язык «en» в базе знаний не публикуется;
- добавлен `src/content/guide/uk/nails.md` → категории «nails» нет;
- `page` нет в карте: в uk- и ru-статье `page` заменён одним и тем же значением, которого нет в §Pages, → называет файл и `docs/seo/map.md` (№ 10). Правка только одного языка дала бы № 7 — разные `page` по одному пути;
- из `docs/seo/map.md` §Links удалена строка `depilation-guide → depilation-vs-epilation` (uk) → называет uk-статью и недостающее ребро;
- допустимая правка: добавлен `src/content/guide/uk/depilation/aftercare.md` с `page: depilation-aftercare` → сборка проходит. Новый адрес `/guide/depilation/aftercare/` есть в списке `/guide/depilation/`, в списке `/lada/` и в `sitemap-0.xml`; его `hreflang` — только `uk` и `x-default`; на `/ru/guide/depilation/` и `/ru/lada/` его нет. Шаблоны при этом не правились.

Порча разбора карты — нет §Pages, §Links или нужного столбца, столбцы в другом порядке — проверяется модульно в `scripts/seo-map.test.mjs` (`npm run test:unit`), а не сборкой на каждый случай. Нет файла эксперта — тот же образец, что «отсутствующий файл обращения».

## 4. Manual before merge

Выполняет оркеструющая сессия после прогона реализации: у implementer нет браузера и Skill `/seo`.

- `validator.schema.org` на шести страницах из `dist/` (вставкой HTML): 0 ошибок (SC-002).
- `/seo audit` по собранному сайту: нет `internal-links.5` по новым анкорам (research R3, Risk).
- Вычитка текстов по [contracts/content-files.md](contracts/content-files.md) §Text rules, §Claim kinds, §Expert facts: тон, «ми» студии и третье лицо Лады, ни одного утверждения о практике вне research.md §Practice claims, каждое общее утверждение — строка research.md §Sources со статусом `проверен`, цитатой и датой; оговорка о терминах стоит в статье; uk и ru говорят одно и то же; даты обеих версий — день слияния и не в будущем.

## 5. After deploy

SC-001 на проде: шесть адресов отвечают 200 и перечислены в карте сайта, корень раздела и английские адреса отвечают 404.

```bash
for p in /guide/depilation/ /ru/guide/depilation/ /guide/depilation/vs-epilation/ \
         /ru/guide/depilation/vs-epilation/ /lada/ /ru/lada/; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://www.lada.kiev.ua$p"; done      # 200 ×6
for p in /guide/ /ru/guide/ /guide /ru/guide /en/guide/depilation/vs-epilation/ /en/lada/; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://www.lada.kiev.ua$p"; done      # 404 ×6, не 403 и не 301
curl -s https://www.lada.kiev.ua/ru/guide/ | grep -o '<html lang="[a-z]*"'           # lang="ru"
curl -s https://www.lada.kiev.ua/sitemap-0.xml \
  | grep -cE '<loc>https://www.lada.kiev.ua/(ru/)?(guide/depilation/(vs-epilation/)?|lada/)</loc>'  # 6
```

Затем `/seo map` переводит страницы карты в `published`. Через 8 недель — показы статьи в Search Console на каждом языке больше нуля (SC-003); срок записан строкой `Follow-up:` в ADR-029.
