# Plan: guide pages in uk and ru

Driving document for [ADR-030](../adr/adr-030-knowledge-base-pages-in-uk-and-ru.md). One page per `/seo` run (Hard rule 1 of the skill): the step is closed when the second version is on `main`, the gates are green and the row below is ticked with its commit.

## Order

By Search Console impressions of the existing version, 2026-08-19 … 2026-11-16 (`docs/_local/seo/gsc/2026-11-19-lada-kiev-ua.csv`): a page people already find gets its pair first.

| # | page | has | adds | impressions | done |
|---|---|---|---|---|---|
| 1 | bikini-depilation | ru | uk | 293 | |
| 2 | permanent-what-is | ru | uk | 157 | |
| 3 | permanent-lips-healing | uk | ru | 76 | |
| 4 | permanent-harm | uk | ru | 30 | |
| 5 | permanent-how-long | uk | ru | 19 | |
| 6 | permanent-aftercare | uk | ru | 19 | |
| 7 | sugaring-what-is | uk | ru | 13 | |
| 8 | depilation-aftercare | uk | ru | 9 | |
| 9 | massage-sessions | uk | ru, with the ru hub massage-guide | 0 | |
| 10 | sugaring-preparation | uk | ru | 0 | |
| 11 | build stop: a guide article without its second language fails the build, plus its `test:invalid-data` case | — | — | — | |

Planned pages (`massage-benefits`, `back-massage-frequency`, `lash-lamination-how-long`, `makeup-how-long`, `makeup-hair-order`) are written in both languages when their turn comes in `docs/seo/map.md`; they are not steps here.

## One step

1. `docs/seo/core.csv`: the cluster's query on the added language — from Keyword Planner, or the translation of the existing query with `volume` `unknown`.
2. `docs/seo/map.md`: the page row on the added language and its edges (hub → article, article → hub, article → service), anchors from that query.
3. The content file on the added language: a translation of the published text. A claim stays only with its `Sources` or `Practice claims` row in `docs/specs/guide-sources.md` — the section is shared by both versions.
4. The rest of the new-article list in `docs/specs/routes.md`: `GUIDE_PAGES` (both entries get `locales: ['uk', 'ru']`), `GUIDE_QUERIES`, `HUB_FORBIDDEN`, `page-head.md`, `public/llms.txt`, `SERVICE_GUIDE_EDGES` when a new service edge builds.
5. Gates of `CLAUDE.md`, the full `test:e2e` included; snapshots at 375 and 1280.

## Progress log
