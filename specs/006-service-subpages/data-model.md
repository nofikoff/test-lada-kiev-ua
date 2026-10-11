# Data Model: Service subpages

## Service subpage (registry, `src/i18n/paths.ts`)

| Поле | Значение | Правило |
|---|---|---|
| `slug` | `sugaring` \| `brows` | латиница, одинаковый во всех языках подстраницы; уникален внутри родителя |
| `parent` | `ServiceCategory` | `depilation` для `sugaring`, `permanent` для `brows` |
| `locales` | `['uk', 'ru']` | подмножество `locales`; украинский обязателен — он `x-default` |
| `groups` | группы прайса | `sugaring` → все группы категории `depilation` (`womenDepilation`, `combos`, `menDepilation`); `brows` → `permanentBrows`. Каждая группа принадлежит категории `parent` |
| `method` | `'base'` \| `'sugar'` | `sugaring` → `sugar`, `brows` → `base` |

Путь: `<префикс языка>/<parent>/<slug>/`. Языковые альтернативы — по `locales`, `x-default` — украинский адрес.

Связи: подстраница → одна категория; категория → ноль или больше подстраниц. Вид страницы услуги — категория или подстраница; `ServicePage.astro`, `SeoHead.astro` и `BaseLayout.astro` принимают его вместо голой категории.

## Subpage copy (collection `subpages`, `src/content/subpages/<locale>/<slug>.md`)

| Поле | Правило |
|---|---|
| `subpage` | slug из реестра, совпадает с именем файла |
| `title` | `<текст с запросом> — Lada N`, не длиннее 70 знаков; пара с `description` уникальна по сайту |
| `description` | 120–160 знаков, запрос в первой половине |
| `heading` | `<h1>` и последний элемент крошек; запрос подстраницы |
| тело | не меньше 400 слов в `[data-service-copy]`; без абзацев, повторяющих другие страницы языка |

Файлов ровно столько, сколько пар «подстраница × язык» в реестре — сейчас четыре. Недостающий роняет сборку в `subpageCopy()`; файл под язык, которого нет в `locales`, роняет сборку там же, — иначе он лежал бы мёртвым текстом.

## Price item (`src/data/prices.json`, collection `prices`) — new optional field

| Поле | Тип | Правило |
|---|---|---|
| `sugar` | `fixed` \| `variants` \| `false`, необязательное | разрешено только у групп категории `depilation`; вид `share` запрещён; `false` — «пастой не делается» |

Цена позиции способом страницы:

```
method 'base'  → price
method 'sugar' → sugar === false ? (позиция скрыта) : (sugar ?? price)
```

Группа, в которой после скрытия не осталось позиций, не выводится. Сегодня поля `sugar` нет ни у одной позиции.

Затронутые расчёты:
- `priceRange` организации (главная) — минимум и максимум по всем суммам `price` и `sugar` (кроме `false`), долевые не участвуют.
- `Offer` подстраницы — по ценам её способа; число предложений = фиксированные + варианты − долевые − скрытые.

## Target query (`tests/support/site.ts` `QUERIES`, `docs/specs/page-head.md` §Целевые запросы)

| Страница | uk | ru |
|---|---|---|
| depilation | депіляція у Києві; воскова депіляція | депиляция в Киеве; депиляция воском |
| depilation/sugaring | шугаринг у Києві | шугаринг в Киеве |
| permanent | перманентний макіяж у Києві | перманентный макияж в Киеве |
| permanent/brows | перманентний макіяж брів у Києві; пудрові брови | перманентный макияж бровей в Киеве; пудровые брови |

`en` не меняется: `depilation` — waxing and sugaring, `permanent` — permanent makeup; powder brows. Отрицательное правило: запрос подстраницы не стоит в `<title>`, `<h1>` и описании её категории того же языка.
