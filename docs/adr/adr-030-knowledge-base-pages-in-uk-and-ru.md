# ADR-030: Every knowledge-base page ships in Ukrainian and Russian

> **Supersedes:** [ADR-029](adr-029-knowledge-base-collection-links-from-seo-map.md), only its one-language exception

- **Related:** [docs/specs/content-model.md](../specs/content-model.md) · [docs/specs/routes.md](../specs/routes.md) · [docs/plans/2026-11-19-guide-uk-ru-translations.md](../plans/2026-11-19-guide-uk-ru-translations.md)

## Context

ADR-029 разрешил странице базы знаний жить на одном языке, и `/seo map` планировал язык страницы по тому, есть ли запрос в ядре на этом языке. На 2026-11-19 так вышло 15 одноязычных страниц из 47, из них 9 опубликованных. Частоты статей — около 10 запросов в месяц на любом языке, то есть шум, а русскоязычный спрос в Киеве большой: «массаж» — 6600 запросов в месяц (`docs/seo/core.csv`).

## Decision

Хаб и статья базы знаний выходят на `uk` и `ru` одновременно; у каждой версии свой целевой запрос в ядре и строка в карте.

## Consequences

- Positive: каждая статья получает пару `hreflang`. Перевод для Google не дубль: дублем [Google Search Central](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) называет похожий контент на разных адресах на одном языке, а для языковых версий советует отдельные адреса и `hreflang` — так сайт и устроен.
- Negative: запрос второго языка часто не измерен. Тогда в ядро идёт перевод запроса кластера с частотой `unknown`, и Keyword Planner заполняет её позже.
- Negative: до перевода девяти опубликованных страниц сборка правило не проверяет: остановка «у статьи нет версии на втором языке» сейчас уронила бы `main`. Её добавляет последний шаг плана переводов.
- Follow-up: план [2026-11-19-guide-uk-ru-translations.md](../plans/2026-11-19-guide-uk-ru-translations.md) — по странице за прогон `/seo`.
- **Rejected: язык страницы по наличию запроса в ядре (ADR-029 как был).** При частотах около 10 в месяц наличие строки в ядре говорит о том, что измеряли, а не о спросе, и русскоязычный читатель не находил статью на своём языке.
- **Rejected: английский третьим языком.** Раздела базы знаний и страницы эксперта на `/en/` нет (`routes.md`: `/en/guide/…` и `/en/lada/` отвечают 404); английская база знаний — открытие раздела, отдельное решение.
