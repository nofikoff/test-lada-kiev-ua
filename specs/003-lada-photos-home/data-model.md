# Data Model: Лада Новикова на главной

## Photo — коллекция `gallery` (`src/data/gallery.json`)

| Поле | Тип | Правило |
|---|---|---|
| `id` | string | Уникален; совпадает с базовым именем файла без расширения. |
| `photo` | `image()` | Путь относительно `src/data/gallery.json` → `../assets/gallery/<id>.<ext>`. Отсутствующий файл роняет сборку. |
| `role` | `'portrait' \| 'strip'` | `portrait` — ровно одна запись. Проверяет компонент при сборке. |
| `position` | целое > 0 | Только у `strip`; значения 1…11 без пропусков и повторов. Проверяет компонент при сборке (research.md §R1). |
| `alt` | `localized` | uk/ru/en, каждая строка непустая (FR-006, FR-016, FR-020). Внутри одной локали повторов нет (проверяет `gallery.spec.ts`). |
| `category` | `ServiceCategory?` | Только у `strip`. Есть → карточка-ссылка на `pagePath(locale, category)` с подписью `ui[locale].services[category].name` (FR-015). |
| `focus` | string | Значение `object-position` для обрезки до 4:5 (FR-017); у портрета — ещё и точка кадра превью 1200×630. |

Связь: `category` ссылается на существующую `ServiceCategory` (`src/i18n/paths.ts:9`). Новых категорий фича не заводит.

## Соответствие отбору

Нумерация 01–29 — порядок имён файлов в выгрузке автора, `~/Downloads/_lada.kiev.ua`. Префикс имени исходника у всех файлов — `lada_n_kyiv_`, суффикс — `_1552222305`. Начальные значения `focus` уточняются визуальной проверкой при реализации.

| № | Исходник (середина имени) | Размер | `id` | `role` / `position` | `category` | `focus` |
|---|---|---|---|---|---|---|
| 20 | `1691439543_3164346701099310766.jpg` | 1440×1800 | `lada-novikova-portrait` | portrait | — | `50% 22%` |
| 15 | `1687702590_3132998862419317625.jpg` | 1440×1800 | `lada-novikova-massage-tea` | strip / 1 | massage | `50% 30%` |
| 21 | `1699219168_3229606918959315918.jpg` | 1440×1440 | `lada-novikova-wax-spatulas` | strip / 2 | depilation | `45% 50%` |
| 17 | `1691428297_3164252362855768260.jpg` | 1440×1440 | `lada-novikova-bamboo-sticks` | strip / 3 | massage | `50% 50%` |
| 07 | `1608988100_2472693861476408285.jpg` | 1440×1800 | `lada-novikova-studio-portrait` | strip / 4 | — | `50% 35%` |
| 13 | `1665658019_2948075602402768079.webp` | 1440×1800 | `lada-novikova-sugaring` | strip / 5 | depilation | `50% 40%` |
| 19 | `1691431967_3164283143552716729.jpg` | 1440×1800 | `depilation-wax-beads` | strip / 6 | depilation | `55% 50%` |
| 22 | `1699229227_3229691306082323694.jpg` | 1440×1800 | `lada-novikova-candles` | strip / 7 | — | `40% 40%` |
| 27 | `1736312239_3540766156454738055.jpg` | 1440×1499 | `lada-novikova-warm-wax` | strip / 8 | depilation | `45% 45%` |
| 06 | `1607945191_2463945308003220550.jpg` | 1080×1080 | `lada-novikova-makeup-mirror` | strip / 9 | beauty | `68% 50%` |
| 18 | `1691428802_3164256593096558383.jpg` | 1440×1800 | `massage-tools` | strip / 10 | massage | `50% 60%` |
| 26 | `1720362391_3406969130869742762.jpg` | 1440×1800 | `studio-terrace` | strip / 11 | — | `50% 50%` |

Квадратные исходники (21, 17, 06) и почти квадратный 27 при обрезке до 4:5 теряют края по бокам, поэтому у них фокус задан по горизонтали.

## Описания (alt)

| № | uk | ru | en |
|---|---|---|---|
| 20 | Лада Новикова, майстриня масажу та депіляції, у студії Lada N | Лада Новикова, мастер массажа и депиляции, в студии Lada N | Lada Novikova, massage and hair removal specialist, at the Lada N studio |
| 15 | Лада Новикова з чашкою чаю поруч із моделлю хребта та олією для масажу | Лада Новикова с чашкой чая рядом с моделью позвоночника и маслом для массажа | Lada Novikova with a cup of tea beside a spine model and massage oil |
| 21 | Лада Новикова в рукавичках тримає шпателі для воскової депіляції | Лада Новикова в перчатках держит шпатели для восковой депиляции | Lada Novikova in gloves holding wax spatulas |
| 17 | Лада Новикова з бамбуковими паличками для масажу | Лада Новикова с бамбуковыми палочками для массажа | Lada Novikova holding bamboo massage sticks |
| 07 | Студійний портрет Лади Новикової в синьому светрі | Студийный портрет Лады Новиковой в синем свитере | Studio portrait of Lada Novikova in a blue sweater |
| 13 | Лада Новикова робить шугаринг ніг | Лада Новикова делает шугаринг ног | Lada Novikova performing a leg sugaring treatment |
| 19 | Гранули синього воску для депіляції, розсипані на столі | Гранулы синего воска для депиляции, рассыпанные на столе | Blue hair removal wax beads spilled on a table |
| 22 | Лада Новикова у кріслі поруч зі свічками та чайником | Лада Новикова в кресле рядом со свечами и чайником | Lada Novikova in an armchair beside candles and a teapot |
| 27 | Лада Новикова набирає теплий віск шпателями | Лада Новикова набирает тёплый воск шпателями | Lada Novikova scooping warm wax with spatulas |
| 06 | Лада Новикова наносить макіяж перед дзеркалом | Лада Новикова наносит макияж перед зеркалом | Lada Novikova applying makeup in front of a mirror |
| 18 | Бамбукові палички, лаванда та олія для масажу на столі студії | Бамбуковые палочки, лаванда и масло для массажа на столе студии | Bamboo sticks, lavender and massage oil on a studio table |
| 26 | Тераса студії Lada N із квітами на вікнах | Терраса студии Lada N с цветами на окнах | The Lada N studio terrace with flowers on the windows |

После реализации единственный источник этих строк — `src/data/gallery.json`. Таблица здесь нужна до того, как файл появился.

## Строки интерфейса — `ui.ts`, ключ `gallery`

| Ключ | uk | ru | en |
|---|---|---|---|
| `eyebrow` | Робота | Работа | At work |
| `title` | Лада за роботою | Лада за работой | Lada at work |
| `region` | Фотографії Лади Новикової | Фотографии Лады Новиковой | Photos of Lada Novikova |
| `prev` | Попереднє фото | Предыдущее фото | Previous photo |
| `next` | Наступне фото | Следующее фото | Next photo |

Недостающий ключ ловит `astro check` через тип `UiDictionary` (`src/i18n/ui.ts:131`).

## Удаляется

- `src/assets/massage-kiev-lada-novikova.jpg` — стоковый кадр первого экрана и JSON-LD.
- `public/assets/lada.kiev.ua-website.png` — скриншот в роли превью.
