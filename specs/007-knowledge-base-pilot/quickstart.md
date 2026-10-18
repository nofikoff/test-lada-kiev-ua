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
| US1-2: `hreflang` статьи — uk, ru, `x-default` → uk | `seo-contract` |
| US2: подпись ведёт на `/lada/` своего языка; `author['@id']` = `#founder` главной; `ProfilePage.mainEntity` — тот же узел | `voice`, `seo-contract` |
| US2-2: абзацы эксперта не повторяют «Про нас» | `seo-contract` |
| US3: на `/depilation/` и `/ru/depilation/` ссылка на хаб, на трёх других категориях ссылок в раздел нет | `links` |
| FR-002: 404 на `/guide/`, `/ru/guide/`, `/en/guide/depilation/vs-epilation/`, `/en/lada/` | `routes` (preview); прод — шаг 5 |
| FR-011: шесть адресов в карте сайта с альтернативами и в `llms.txt` | `sitemap`, `llms` |

## 3. Invalid data (US4, SC-004)

`npm run test:invalid-data` печатает `✓` на каждом случае и восстанавливает дерево:

- удалён `src/content/guide/ru/depilation/vs-epilation.md` → сборка остановлена, сообщение называет `src/content/guide/ru/depilation.md` (хаб без статьи);
- удалён `src/content/guide/ru/depilation.md` → называет `src/content/guide/ru/depilation/vs-epilation.md` (статья без хаба);
- добавлен `src/content/guide/uk/depilation/copy.md` с `page: depilation-vs-epilation` → называет оба файла (повтор `page`);
- `modified` раньше `published` у uk-статьи → ошибка схемы по `modified`;
- `page` нет в карте → называет файл и `docs/seo/map.md`;
- допустимая правка: добавлен `src/content/guide/uk/depilation/aftercare.md` с `page: depilation-aftercare` → сборка проходит. Новый адрес `/guide/depilation/aftercare/` есть в списке `/guide/depilation/`, в списке `/lada/` и в `sitemap-0.xml`; его `hreflang` — только `uk` и `x-default`; на `/ru/guide/depilation/` и `/ru/lada/` его нет. Шаблоны при этом не правились.

## 4. Manual before merge

- `validator.schema.org` на шести страницах из `dist/` (вставкой HTML): 0 ошибок (SC-002).
- `/seo audit` по собранному сайту: нет `internal-links.5` по новым анкорам (research R3, Risk).
- Вычитка текстов по [contracts/content-files.md](contracts/content-files.md) §Text rules: тон, третье лицо Лады, ни одного утверждения о практике вне `studio-practice.md` и прайса, каждое общее утверждение — строка в research.md §Sources с датой проверки.

## 5. After deploy

```bash
for p in /guide/depilation/ /ru/guide/depilation/ /guide/depilation/vs-epilation/ \
         /ru/guide/depilation/vs-epilation/ /lada/ /ru/lada/; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://www.lada.kiev.ua$p"; done      # 200 ×6
for p in /guide/ /ru/guide/ /en/guide/depilation/vs-epilation/ /en/lada/; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://www.lada.kiev.ua$p"; done      # 404 ×4, не 403
curl -s https://www.lada.kiev.ua/ru/guide/ | grep -o '<html lang="[a-z]*"'           # lang="ru"
```

Через 8 недель — показы статьи в Search Console на каждом языке больше нуля (SC-003). Затем `/seo map` переводит страницы карты в `published`.
