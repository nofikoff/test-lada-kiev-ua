# Audit: internal-links

**Date:** 2026-11-19

## Scope

| source | snapshot | date | note |
|---|---|---|---|
| site-crawl | docs/_local/seo/site/2026-11-19-links.csv | 2026-11-19 | страниц: 44; адресов без строки: 0 |
| gsc | docs/_local/seo/gsc/2026-11-19-lada-kiev-ua.csv | 2026-11-19 | окно 2026-08-19 — 2026-11-16 |
| core | docs/seo/core.csv | 2026-10-18 |  |
| map | docs/seo/map.md | 2026-10-21 |  |

## Findings

| id | rule | severity | evidence | page | detail | measured | action_type | action | sources | remeasure | status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | internal-links.6 | medium | C | /ru/guide/permanent/what-is/ |  | позиция 14.9, показов 157; доноры без ссылки: /guide/permanent/harm/ (1) | code | Действие снято: рёбра карты выводятся только на страницах одного языка (docs/specs/routes.md §Links from the map, ADR-029), а донор /guide/permanent/harm/ украинский, цель русская — такую ссылку карта не выражает. Доноров в своём языке цель получает ребром permanent-contraindications → permanent-what-is (ru) в docs/seo/map.md; украинской версии what-is и русской harm нет. | BOBBINK-CASE | gsc: позиция и клики страницы, 6 недель после applied | applied 2026-11-19 |

## PageRank

| page | before | after | delta | note |
|---|---|---|---|---|

## Skipped

| rule | reason |
|---|---|

## Sources

| id | title | url | read | class |
|---|---|---|---|---|
| BOBBINK-CASE | My second most effective SEO strategy of 2026 was also not publishing more. (LinkedIn) | https://www.linkedin.com/posts/jbobbink_my-second-most-effective-seo-strategy-of-share-7506631149780340736-GCWp/ | 2026-10-16 | C |
