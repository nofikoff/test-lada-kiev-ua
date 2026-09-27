# ADR-020: разметка `FAQPage` не публикуется

- **Related:** [docs/specs/structured-data.md](../specs/structured-data.md)

## Context

При усилении текстов под поиск (пакет 004) напрашивался блок вопросов и ответов с разметкой `FAQPage` ради расширенного сниппета. Google ограничил FAQ-сниппеты государственными и медицинскими сайтами в августе 2023 и перестал показывать их всем с 7 мая 2026 ([Search Engine Journal](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/), [Search Engine Land](https://searchengineland.com/faq-schema-rise-fall-seo-today-463993), проверено 2026-09-27).

## Decision

Не размечать `FAQPage` и не заводить блок вопросов-ответов ради разметки.

## Consequences

- Positive: нет вопросов и ответов, сочинённых под разметку, которых посетители не задавали.
- Отвергнуто: разметка «на будущее» — сниппет не показывается, а тексты вопросов пришлось бы писать и держать на трёх языках.
