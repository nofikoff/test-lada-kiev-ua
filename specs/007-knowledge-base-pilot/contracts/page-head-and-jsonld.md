# Contract: Page Head and JSON-LD

Дополнение к [docs/specs/page-head.md](../../../docs/specs/page-head.md) и [docs/specs/structured-data.md](../../../docs/specs/structured-data.md); при реализации переносится туда. Приёмка JSON-LD — `validator.schema.org`: 0 ошибок на хабе, статье и эксперте на обоих языках (SC-002). Обозначения: `H` — главная языка страницы (`https://www.lada.kiev.ua/` или `…/ru/`), `C` — канонический адрес страницы, `E` — страница эксперта того же языка.

## Head

| Элемент | Хаб, статья | Эксперт |
|---|---|---|
| `<title>`, `description`, `<h1>` | из frontmatter файла | из frontmatter файла |
| `hreflang` | языки, на которых есть файл страницы; `x-default` — uk, без неё — единственная версия | `uk`, `ru`, `x-default` → `/lada/` |
| `og:locale:alternate` | второй язык, если файл есть | `uk_UA` / `ru_RU` |
| `og:type` | `website` (research R7) | `website` |
| `og:image` | общий кадр портрета, как на всех страницах | то же |

```
/guide/depilation/vs-epilation/      → uk: /guide/depilation/vs-epilation/  ru: /ru/guide/depilation/vs-epilation/  x-default: /guide/depilation/vs-epilation/
/guide/depilation/aftercare/ (uk)    → uk: /guide/depilation/aftercare/  x-default: /guide/depilation/aftercare/
```

Запросы: строки в таблицу `page-head.md` §Целевые запросы.

| Страница | uk | ru |
|---|---|---|
| depilation-vs-epilation | депіляція чи епіляція | депиляция и эпиляция |
| хаб depilation-guide | — (тема раздела; запросов категории и статей нет) | — |
| lada | Лада Новикова | Лада Новикова |

## JSON-LD

Один блок `<script type="application/ld+json">` с `@graph`. Узла организации на этих страницах нет — на него ссылаются по `@id`.

### Founder node

`founderNode(locale)` из `src/data/founder.ts` — общий для главной, статьи и эксперта:

```json
{ "@type": "Person", "@id": "H#founder", "name": "<signatureName>", "jobTitle": "<meta.founderRole>",
  "image": "<портрет>", "alumniOf": { "@type": "CollegeOrUniversity", "name": "Національний університет фізичного виховання і спорту України", "sameAs": "https://uni-sport.edu.ua/" } }
```

На главной узел выводится без изменений. На статье и эксперте к нему добавляется `"url": "E"`.

### Article

```json
{ "@type": "Article", "@id": "C#article", "headline": "<heading>", "description": "<description>",
  "url": "C", "mainEntityOfPage": "C", "inLanguage": "uk",
  "datePublished": "2026-10-20", "dateModified": "2026-10-20", "image": "<og:image>",
  "author": { "@type": "Person", "@id": "H#founder", "name": "<signatureName>", "url": "E" },
  "publisher": { "@type": "HealthAndBeautyBusiness", "@id": "H#business", "name": "Lada N", "url": "H" } }
```

`BreadcrumbList`: `nav.home` → `H`, хаб `heading` → адрес хаба, статья `heading` → `C`. Видимые крошки называют звенья теми же строками.

### Hub

```json
{ "@type": "CollectionPage", "@id": "C#page", "name": "<heading>", "description": "<description>",
  "url": "C", "inLanguage": "uk",
  "hasPart": [ { "@type": "Article", "@id": "<адрес статьи>#article", "headline": "<heading статьи>", "url": "<адрес статьи>" } ] }
```

`hasPart` — статьи из списка хаба в его порядке. `BreadcrumbList`: `nav.home` → `H`, `heading` → `C`.

### Expert

```json
{ "@type": "ProfilePage", "@id": "C#page", "name": "<heading>", "url": "C", "inLanguage": "uk",
  "mainEntity": { …founderNode(locale), "url": "E" } }
```

Крошек у страницы эксперта нет. `FAQPage` не размечается нигде ([ADR-020](../../../docs/adr/adr-020-no-faqpage-markup.md)).

## Checks

`tests/seo-contract.spec.ts`:

- `hreflang` равны языкам из `GUIDE_PAGES` / `EXPERT_PAGES`, `x-default` — по правилу выше;
- `Article.author['@id']` и `ProfilePage.mainEntity['@id']` равны `@id` основательницы на главной своего языка;
- `publisher['@id']` равен `@id` организации главной;
- `datePublished <= dateModified`;
- `BreadcrumbList` повторяет видимые крошки;
- `CollectionPage.hasPart` — адреса статей из списка хаба;
- пара «заголовок + описание» уникальна по всем 25 страницам.
