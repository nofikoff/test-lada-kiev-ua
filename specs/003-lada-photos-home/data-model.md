# Data Model: Лада Новикова на главной

## Photo — коллекция `gallery` (`src/data/gallery.json`)

| Поле | Тип | Правило |
|---|---|---|
| `id` | string | Уникален; совпадает с базовым именем файла без расширения. |
| `photo` | `image()` | Путь относительно `src/data/gallery.json` → `../assets/gallery/<id>.<ext>`. Отсутствующий файл роняет сборку. |
| `role` | `'portrait' \| 'strip'` | `portrait` — ровно одна запись. Проверяет компонент при сборке. |
| `position` | целое > 0 | Только у `strip`; значения 1…13 без пропусков и повторов. Проверяет компонент при сборке (research.md §R1). |
| `alt` | `localized` | uk/ru/en, каждая строка непустая (FR-006, FR-016, FR-020). Внутри одной локали повторов нет (проверяет `gallery.spec.ts`). |
| `category` | `ServiceCategory?` | Только у `strip`. Есть → карточка-ссылка на `pagePath(locale, category)` с подписью `ui[locale].services[category].name` (FR-015). |
| `focus` | string | Значение `object-position` для обрезки до 4:5 (FR-017). |
| `fit` | `'cover' \| 'contain'`? | По умолчанию кадр обрезается; `contain` вписывает его целиком, когда смысл на краях (16, FR-017). |
| `previewPosition` | `'top' \| 'center' \| 'bottom'` | Только у портрета, обязательно: откуда sharp режет превью 1200×630 (research.md §R2). Проценты CSS sharp не принимает. |

Связь: `category` ссылается на существующую `ServiceCategory` (`src/i18n/paths.ts:9`). Новых категорий фича не заводит.

## Соответствие отбору

Нумерация 01–29 — порядок имён файлов в выгрузке автора, `~/Downloads/_lada.kiev.ua`. Префикс имени исходника у всех файлов — `lada_n_kyiv_`, суффикс — `_1552222305`. Состав пересмотрен 2026-09-27: лента — работа, а не позирование (spec.md §Clarifications).

| № | Исходник (середина имени) | Размер | `id` | `role` / `position` | `category` |
|---|---|---|---|---|---|
| 20 | `1691439543_3164346701099310766.jpg` | 1440×1800 | `lada-novikova-portrait` | portrait | — |
| 09 | `1656431777_2870680271738779363.webp` | 1440×1440 | `lada-novikova-brows-client` | strip / 1 | beauty |
| 13 | `1665658019_2948075602402768079.webp` | 1440×1800 | `lada-novikova-sugaring` | strip / 2 | depilation |
| 25 | `1705933044_3285927000576116490.jpg` | 1440×1801 | `massage-room` | strip / 3 | massage |
| 28 | `1760123146_3740506367233702705.heic` (внутри JPEG) | 1154×1440 | `lada-novikova-brow-tint` | strip / 4 | beauty |
| 16 | `1691428297_3164252362839101596.jpg` | 1075×1075 | `anti-cellulite-before-after` | strip / 5 | massage |
| 12 | `1664450539_2937946523750005968.webp` | 1440×1800 | `sugaring-close-up` | strip / 6 | depilation |
| 01 | `1524945767_1767695676646670173.jpg` | 960×1200 | `lada-novikova-makeup-client` | strip / 7 | beauty |
| 18 | `1691428802_3164256593096558383.jpg` | 1440×1800 | `massage-tools` | strip / 8 | massage |
| 19 | `1691431967_3164283143552716729.jpg` | 1440×1800 | `depilation-wax-beads` | strip / 9 | depilation |
| 08 | `1623950689_2598209160373111745.jpg` | 937×1171 | `disposable-tools` | strip / 10 | — |
| 10 | `1660215227_2902418149871181913.webp` | 1440×1800 | `lada-novikova-certificate` | strip / 11 | — |
| 11 | `1662551762_2922018425082871754.webp` | 1440×1440 | `makeup-station` | strip / 12 | — |
| 26 | `1720362391_3406969130869742762.jpg` | 1440×1800 | `studio-terrace` | strip / 13 | — |

Квадратные исходники (09, 16, 11) при обрезке до 4:5 теряют края по бокам; их `focus` задан по горизонтали.

## Описания (alt)

Единственный источник — `src/data/gallery.json`: у каждой записи три языка, и сборка падает на пропуске (FR-020). Второй копии здесь нет, чтобы не разойтись с ней.

## Строки интерфейса — `ui.ts`, ключ `gallery`

| Ключ | uk | ru | en |
|---|---|---|---|
| `eyebrow` | Студія Лади Новикової | Студия Лады Новиковой | Lada Novikova's studio |
| `title` | Процес і результат | Процесс и результат | Process and results |
| `region` | Фотографії Лади Новикової | Фотографии Лады Новиковой | Photos of Lada Novikova |
| `prev` | Попереднє фото | Предыдущее фото | Previous photo |
| `next` | Наступне фото | Следующее фото | Next photo |

Недостающий ключ ловит `astro check` через тип `UiDictionary` (`src/i18n/ui.ts:131`).

## Удаляется

- `src/assets/massage-kiev-lada-novikova.jpg` — стоковый кадр первого экрана и JSON-LD.
- `public/assets/lada.kiev.ua-website.png` — скриншот в роли превью.
