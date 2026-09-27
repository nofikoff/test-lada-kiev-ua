# Машиночитаемое описание (JSON-LD)

Реализация — `src/components/SeoHead.astro`, проверка — `tests/seo-contract.spec.ts`. Что сознательно не размечается и почему — [ADR-013](../adr/adr-013-structured-data-no-zero-price-offers.md). Приёмка контракта — вывод `validator.schema.org` без ошибок: типы подобраны по общему знанию словаря, валидатор и есть источник. Принято в пакете 001, 2026-09-06; изображения организации изменены в пакете 003 ([home-hero.md](home-hero.md)).

## Главная, три локали

`HealthAndBeautyBusiness`:

| Поле | Источник |
|---|---|
| `name` | `Lada N` |
| `address` | словарь интерфейса, на языке страницы |
| `telephone` | `+380995570045` |
| `openingHoursSpecification` | часы работы, ежедневно |
| `priceRange` | вычисляется: минимум и максимум сумм прайса, долевые позиции не участвуют. Вписанный строкой, он разойдётся с ценами на первой правке |
| `sameAs` | профиль Instagram |
| `knowsLanguage` | `uk`, `ru`, `en` — не `availableLanguage`, [ADR-022](../adr/adr-022-business-languages-knowslanguage.md) |
| `founder` | `Person` `#founder`: `name` — подпись обращения своей локали (`src/content/about/<locale>.md`), `jobTitle` — `meta.founderRole` словаря, `image` — тот же портрет, что второй элемент `image`, `alumniOf` — `CollegeOrUniversity` «Національний університет фізичного виховання і спорту України», `sameAs` `https://uni-sport.edu.ua/` (сайт университета и реестр ЕДЕБО, проверено 2026-09-27). Роль — только подтверждённое автором ([voice.md](voice.md)). Принято в пакете 004 |

Разметки `FAQPage` нет — [ADR-020](../adr/adr-020-no-faqpage-markup.md).

## Страница категории

`Service` с `OfferCatalog` и `BreadcrumbList` (главная → категория, названия на языке страницы).

- `provider` — ссылка на `#business` главной, `areaServed` — город из адреса словаря.
- Позиция с одной ценой — один `Offer`; с вариантами — `Offer` на каждый вариант, объём варианта — свойством предложения; с долевой ценой — не публикуется.
- Валюта `UAH`, наличие — в наличии.
- Число предложений = число позиций категории минус долевые; ни одно предложение не имеет нулевой цены.
