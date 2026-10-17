# Contract: published subpage

Публичный контракт четырёх адресов в собранном `dist/`. Нарушение любой строки — регрессия. Переносится в `docs/specs/routes.md`, `page-head.md`, `structured-data.md`, `content-model.md` при закрытии пакета.

## Routes

| Адрес | Ответ |
|---|---|
| `/depilation/sugaring/`, `/ru/depilation/sugaring/`, `/permanent/brows/`, `/ru/permanent/brows/` | 200 |
| те же без конечного слеша | 301 на форму со слешем — делает Apache; `astro preview` отвечает 200, поэтому e2e проверяет `canonical` с формой со слешем (`tests/routes.spec.ts` §форма адреса со слешем) |
| `/en/depilation/sugaring/`, `/en/permanent/brows/` | 404, английская страница ошибки |
| `/sugaring/`, `/powder-brows/` | 404 |

## Head

```html
<html lang="uk">                                   <!-- ru на /ru/… -->
<title>…шугаринг у Києві… — Lada N</title>        <!-- ≤ 70 знаков, уникален в паре с description -->
<meta name="description" content="…">              <!-- 120–160 знаков, запрос в первой половине -->
<link rel="canonical" href="https://www.lada.kiev.ua/depilation/sugaring/">
<link rel="alternate" hreflang="uk" href="https://www.lada.kiev.ua/depilation/sugaring/">
<link rel="alternate" hreflang="ru" href="https://www.lada.kiev.ua/ru/depilation/sugaring/">
<link rel="alternate" hreflang="x-default" href="https://www.lada.kiev.ua/depilation/sugaring/">
<!-- hreflang="en" отсутствует; og:locale:alternate — только ru_RU (или uk_UA) -->
```

## Body

- `<h1>` = `heading` текста, содержит запрос подстраницы.
- Крошки: «главная» → ссылка на главную языка; «категория» → ссылка на категорию языка; «подстраница» — `aria-current="page"`.
- `[data-service-copy]` — не меньше 400 слов, первый абзац содержит запрос.
- Прайс: группы реестра, цены способа страницы, пустая группа не выводится; долевая цена — подписью.

## JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "<canonical>#service",
      "name": "<heading>",
      "url": "<canonical>",
      "provider": { "@id": "<home of locale>#business" },
      "areaServed": { "@type": "City", "name": "<city>" },
      "hasOfferCatalog": { "@type": "OfferCatalog", "name": "<heading>", "itemListElement": ["Offer…"] }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "position": 1, "name": "<home>", "item": "<home url>" },
        { "position": 2, "name": "<category heading>", "item": "<category url>" },
        { "position": 3, "name": "<heading>", "item": "<canonical>" }
      ]
    }
  ]
}
```

Число `Offer` = позиции групп реестра по ценам способа: фиксированная — 1, варианты — по одному, доля и скрытые — 0. Ни одного `Offer` с нулевой ценой.

## Sitemap

Четыре адреса; у каждого `xhtml:link` uk-UA и ru-UA, без `en`.

## Category pages (uk, ru)

`/depilation/`, `/ru/depilation/` — без «шугаринг» в `<title>`, `<h1>`, `description`; ссылка на подстраницу своего языка в `[data-service-copy]`. `/permanent/`, `/ru/permanent/` — без «брів/бровей/брови» в тех же трёх местах; ссылка на подстраницу бровей. `en` — без изменений.

## llms.txt

Перечень страниц содержит обе подстраницы на uk и ru; фраза о пятнадцати одинаковых страницах во всех языках уточняется: подстраницы есть только на uk и ru. Строка о перманенте называет обе услуги: коррекцию через 28–60 дней за 50% и обновление до 6 месяцев за 80% (research R14).
