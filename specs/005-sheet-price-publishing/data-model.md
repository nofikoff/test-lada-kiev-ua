# Data Model: Sheet-driven price publishing

## PriceItem — `src/data/prices.json`

Без изменений (ADR-006, `src/content.config.ts`). Публикация меняет только `price.amount` у `fixed` и `price.variants[i].amount` у `variants` — и те же суммы цены пастой `sugar`, когда она у позиции есть (пакет 006, [content-model.md](../../docs/specs/content-model.md) §Инварианты). Состав, порядок, `id`, `group`, `name`, `description`, `unit`, `count`, `share` не трогает.

## SheetRow

Одна строка листа «Цены» на одну сумму, в порядке `prices.json`, варианты — в порядке массива `variants`. Строки цены пастой стоят сразу за строками общей цены своей позиции и несут её `group`, поэтому заголовка не получают и группу не разрывают ([content-model.md](../../docs/specs/content-model.md) §Инварианты).

| Поле | Столбец | Кто пишет | Значение |
|---|---|---|---|
| `key` | A (скрыт) | rebuild | `<id>` для `fixed`, `<id>@<count>` для варианта; цена пастой — `<id>/sugar` и `<id>/sugar@<count>` |
| `name` | B | rebuild | `name.ru`; у второго и третьего варианта позиции и у строк пастой пусто |
| `variant` | C | rebuild | `60 мин`, `5 сеансов`, `1 сеанс`; у `fixed` пусто; у строк пастой — `сахар`, `сахар, 60 мин` |
| `amount` | D | Лада | целое > 0; проверка ввода таблицы |
| `published` | E | workflow после выкладки, rebuild | сумма на сайте, снимок синхронизации |
| `mark` | F | workflow | пусто или причина отклонения |

Лист «Цены», строки 1–3: галочка «Опубликовать» (B1), статус (C1), шапка столбцов (строка 3). Данные с строки 4, строки 1–3 закреплены. Между строками сумм стоят строки GroupHeader. Точные адреса ячеек — [contracts/sheet-layout.md](contracts/sheet-layout.md).

Подписи вариантов: `minutes` → `<count> мин`; `sessions` → `1 сеанс`, `2–4 сеанса`, `5+ сеансов` по правилам русского склонения.

## GroupHeader

Строка листа перед первой SheetRow каждой группы (FR-032, research.md §R12). Пишет только rebuild.

| Столбец | Значение |
|---|---|
| A | пусто — по пустому ключу publish и rebuild отличают заголовок от SheetRow |
| B | `ui.ru.priceList.sections[group]`, жирный, серая заливка на `A:F` |
| C–F | пусто, защищено |

- Заголовок появляется при смене `group` в порядке `prices.json`; группа без SheetRow (только `share`) его не получает.
- `group`, встреченная второй раз после другой группы, — ошибка rebuild с именем группы.
- В Reconcile заголовок не участвует: структура сверяется по ключам SheetRow.

## Reconcile

```text
reconcile(prices, rows, { allowLarge: Set<key> }) →
  { ok: true,  next: prices', applied: Change[], rejected: Rejection[] }
| { ok: false, error: StructureMismatch | Conflict | InvalidAmount }
```

Порядок проверок. Каждая следующая выполняется, только если прошли предыдущие:

1. **StructureMismatch** — последовательность `key` строк не равна последовательности ключей из `prices` (без `share`): лишний ключ, пропавший или переставленный. Весь запуск падает.
2. **Conflict** — для какого-то ключа сумма в `prices` ≠ `published`. Значит, кто-то правил сумму в git в обход таблицы, или таблица не перестроена после правки. Весь запуск падает с перечнем ключей и подсказкой «перестрой таблицу».
3. **InvalidAmount** — `amount` не целое > 0. Проверка ввода таблицы такого не пропускает, поэтому это признак обхода. Весь запуск падает.
4. Для каждой строки с `amount ≠ published`:
   - `amount > 2 × published` или `amount < published / 2`, и ключа нет в `allowLarge` → `Rejection { key, from, to, reason: 'jump' }`, сумма в `next` прежняя;
   - иначе → `Change { key, from, to }`, сумма в `next` новая.

`allowLarge` с ключом, которого нет среди строк, — ошибка вызова, а не молчаливый пропуск.

## Publication

| Поле | Значение |
|---|---|
| `source` | `sheet` (галочка) или `manual` (автор) |
| `mode` | `publish`, `dry-run`, `rebuild-sheet` |
| `allowLarge` | ключи, только при `source = manual` |
| `applied`, `rejected` | из `reconcile` |
| `status` | см. переходы |

### Status transitions (ячейка C1)

```text
(галочка) ──► «публикация запущена в ЧЧ:ММ» ──► «публикация идёт с ЧЧ:ММ» ──┬─► «опубликовано ДД.ММ ЧЧ:ММ»
 Apps Script        Apps Script            workflow, старт        ├─► «опубликовано ДД.ММ ЧЧ:ММ, кроме N позиций — см. пометки»
                                                                   ├─► «опубликовано ДД.ММ ЧЧ:ММ, изменений цен нет»
                                                                   ├─► «ошибка, сайт не изменён, Руслан уведомлён»
                                                                   ├─► «ошибка после выкладки, сайт обновлён, Руслан уведомлён»
                                                                   └─► (статус «идёт» старше 25 мин, триггер таблицы)
                                                                        «ошибка, Руслан уведомлён»
 Apps Script: dispatch вернул 401/403/404 ──► «нет доступа к публикации, Руслан уведомлён»
 Apps Script: dispatch вернул иной код     ──► «ошибка запуска, Руслан уведомлён»
```

«После выкладки» — любой сбой после начала rsync: сам rsync, сброс кэша, проверки после выкладки, push.

После любого исхода галочку снимает Apps Script сразу после dispatch, а не workflow. Повторная галочка во время публикации ставит в очередь новый запуск (R7).

## Commit message

```text
chore(prices): publish prices from the sheet

full-body-massage-harmony@60: 1600 → 1700
sugaring-legs-full: 900 → 950

Source: sheet
Rejected: brows-lamination 800 → 1800 (jump)
```

`Source: manual` у ручного запуска; `Allowed: <keys>` — если передан `allowLarge`.
