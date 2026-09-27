# Data Model: Site voice and SEO copy

## Обращение основательницы — коллекция `about`

Три файла `src/content/about/{uk,ru,en}.md`, идентификатор записи — код локали.

| Поле | Тип | Правило |
|---|---|---|
| `heading` | строка, ≥ 1 видимый знак | «Масаж від реабілітолога» / «Массаж от реабилитолога» / «Massage by a rehabilitation specialist» |
| `signatureName` | строка, ≥ 1 видимый знак | «Лада Новикова» / «Лада Новикова» / «Lada Novikova» |
| `signatureRole` | строка, ≥ 1 видимый знак | «засновниця студії» / «основательница студии» / «founder of the studio» |
| тело | Markdown, только абзацы | 150–250 слов; порядок содержания — FR-004 |

- Отсутствующий файл локали → сборка падает с `нет обращения: src/content/about/<locale>.md` (FR-009).
- Словарь `src/i18n/ui.ts`: `about.title` остаётся; `about.heading`, `about.text1..4` удаляются из всех трёх локалей (тип `UiDictionary` выводится из `uk`, поэтому удаление в одной локали без остальных — ошибка `astro check`).

## Строки словаря, меняющие текст

| Ключ | Было (uk) | Станет (uk) |
|---|---|---|
| `hero.subtitle` | Майстерня масажу та краси | Студія масажу та краси в центрі Києва |
| `meta.title` | Lada N — майстерня масажу та краси на Майдані Незалежності | Студія масажу та краси в центрі Києва — Lada N |
| `meta.description` | …Майстерня Lada N на вул. Мала Житомирська 10… | запрос в первой половине, 120–160 знаков |

ru и en — эквиваленты; en `hero.subtitle` — «Massage and beauty studio in central Kyiv».

## Frontmatter категорий

`title`, `description`, `heading` двенадцати файлов `src/content/services/<locale>/<category>.md` переписываются по карте запросов (contracts/page-copy.md). Схема `services` не меняется: `description` уже ограничено 120–160 схемой.

## Основательница — узел `founder` в `HealthAndBeautyBusiness`

```json
"founder": {
  "@type": "Person",
  "@id": "<canonical главной>#founder",
  "name": "Лада Новикова",
  "jobTitle": "засновниця студії, масажистка",
  "image": "<абсолютный адрес портрета — тот же, что второй элемент image организации>",
  "alumniOf": {
    "@type": "CollegeOrUniversity",
    "name": "Національний університет фізичного виховання і спорту України",
    "sameAs": "https://uni-sport.edu.ua/"
  }
}
```

- `name` и `jobTitle` — на языке страницы; `alumniOf.name` — украинское официальное название на всех трёх языках (имя собственное организации).
- Имя и роль основательницы берутся из frontmatter обращения своей локали (`signatureName`) и словаря (`jobTitle` — новый ключ `meta.founderRole`), а не третьей записью: подпись и разметка не могут разойтись.

## Карта запросов — литералы проверок

`tests/support/site.ts`: для каждой из пятнадцати страниц — упорядоченный список регулярных выражений; первое — основное. Значения — contracts/page-copy.md §Карта запросов.
