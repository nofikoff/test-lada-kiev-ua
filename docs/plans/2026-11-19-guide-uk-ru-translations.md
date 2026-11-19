# Plan: guide pages in uk and ru

Driving document for [ADR-030](../adr/adr-030-knowledge-base-pages-in-uk-and-ru.md). One page per `/seo` run (Hard rule 1 of the skill): the step is closed when the second version is on `main`, the gates are green and the row below is ticked with its commit.

## Order

By Search Console impressions of the existing version, 2026-08-19 … 2026-11-16 (`docs/_local/seo/gsc/2026-11-19-lada-kiev-ua.csv`): a page people already find gets its pair first.

| # | page | has | adds | impressions | done |
|---|---|---|---|---|---|
| 1 | bikini-depilation | ru | uk | 293 | `9b52c1a` |
| 2 | permanent-what-is | ru | uk | 157 | `05c1267` |
| 3 | permanent-lips-healing | uk | ru | 76 | `985ed65` |
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

- 2026-11-19 — step 1, `9b52c1a`: uk `/guide/depilation/bikini/`. Gates green, full `test:e2e` 3209 passed; snapshots 375 and 1280 read. The shared `guide-sources.md` section needed no change. Not yet published: `main` reaches the site with the next `publish` run.
- 2026-11-19 — publish run 44588862820 for step 1 failed before the build: `npx playwright install --with-deps chromium` hit the 4-minute step timeout in CI. Rerun of the failed job.
- 2026-11-19 — step 2, `05c1267`: uk `/guide/permanent/what-is/`, plus the uk contraindications → what-is edge mirroring the ru one. Gates green, full `test:e2e` 3269 passed; snapshots 375 and 1280 read.
- 2026-11-19 — steps 1 and 2 published (runs 44588862820 attempt 2, 44592623479); both pairs answer 200 and carry `hreflang` uk, ru, x-default.
- 2026-11-19 — step 3, `985ed65`: ru `/ru/guide/permanent/lips-healing/`. The first description was 163 characters and `npm run check` stopped it (limit 160). Gates green, full `test:e2e` 3329 passed; snapshots 375 and 1280 read.
