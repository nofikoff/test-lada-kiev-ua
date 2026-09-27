# Implementation Plan: Лада Новикова на главной — портрет первого экрана и лента работ

**Branch**: `003-lada-photos-home` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-lada-photos-home/spec.md`

## Summary

Портрет Лады (фото 20) встаёт на первый экран вместо стокового кадра. На широком экране это колонка справа, на телефоне — блок над текстом ([ADR-002](../../docs/adr/adr-002-hero-portrait-column-not-full-bleed.md)). Между «О нас» и обзором услуг появляется лента из 13 фото на CSS scroll-snap, без автопрокрутки ([ADR-001](../../docs/adr/adr-001-gallery-css-scroll-strip-no-autoplay.md)). Кнопки листания и событие `gallery_click` для GA4 даёт небольшой скрипт. Фото и их описания на трёх языках живут в коллекции `gallery` со схемой, которая роняет сборку при пропуске. Превью ссылок и JSON-LD переходят на портрет. Потолок кода страницы поднимается до 1.5 КБ и начинает проверяться автоматически.

## Technical Context

**Language/Version**: TypeScript, Astro 7.3.1 (`output: 'static'`), Node ≥ 22.12

**Primary Dependencies**: `astro:assets` (`Picture`, `getImage`, sharp), `astro:content` (`file()` + `image()`), Tailwind; новых зависимостей нет

**Storage**: `src/data/gallery.json` + `src/assets/gallery/*` (12 исходников)

**Testing**: Playwright e2e на `npm run preview` (Chromium, WebKit, проект `@build`), `astro check`, `scripts/analyze-bundle.mjs`, Lighthouse вручную

**Target Platform**: статический сайт на Apache за Cloudflare ([deploy runbook](../../docs/runbook-deploy.md))

**Project Type**: статический многоязычный сайт (uk/ru/en), 15 страниц

**Performance Goals**: пороги 001 и 002 без просадки — производительность ≥ 95, LCP ≤ 2.5 с, CLS < 0.1, доступность 100

**Constraints**: исполняемый код ≤ 1536 Б и ≤ 5 КБ на страницу; ни одного фото ленты до прокрутки к ней; исходники не шире 1440 px

**Scale/Scope**: 12 фото, 36 описаний, 1 новая секция, 1 переделанная секция, 3 главные страницы; страницы категорий меняются только в `og:image`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Как выполняется | До / после дизайна |
|---|---|---|
| I. Zero client-side framework | Кнопки и событие — ванильный обрабатываемый `<script>`, как у вкладок прайса | pass / pass |
| II. Контент — данные | Фото и alt — коллекция с `localized` и `image()`; строки секции — `ui.ts` под `UiDictionary` (research.md §R1) | pass / pass |
| III. URL — публичный контракт | Адреса страниц не меняются. Ссылки ленты ведут на существующие адреса категорий. Превью — ресурс, не страница | pass / pass |
| IV. Страница самодостаточна для машинного читателя | Лента и портрет отдаются в HTML; JSON-LD и `og:image` обновляются, не пропадают | pass / pass |
| V. Готовность доказывается прогоном | quickstart.md: check, lint, build, analyze, полный e2e, Lighthouse | pass / pass |
| Внешние скрипты — только аналитика | Новых внешних скриптов нет; событие идёт в существующий gtag | pass / pass |

Нарушений нет, раздел Complexity Tracking не нужен.

## Project Structure

### Documentation (this feature)

```text
specs/003-lada-photos-home/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── gallery.md
│   └── hero.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
docs/adr/
├── adr-001-gallery-css-scroll-strip-no-autoplay.md
└── adr-002-hero-portrait-column-not-full-bleed.md
```

### Source Code (repository root)

```text
src/
├── assets/
│   ├── gallery/                    # новые: 12 исходников, имена = id из data-model.md
│   └── massage-kiev-lada-novikova.jpg   # удаляется
├── data/gallery.json               # новый: 12 записей коллекции gallery
├── data/gallery.ts                 # новый: portrait()/strip() и проверки между записями
├── content.config.ts               # + коллекция gallery
├── components/
│   ├── Gallery.astro               # новый: секция ленты, скрипт кнопок и события
│   ├── Hero.astro                  # портрет колонкой/блоком, без монограммы
│   ├── HomePage.astro              # + <Gallery> между About и ServicesOverview
│   └── SeoHead.astro               # og:image через getImage, JSON-LD image
└── i18n/ui.ts                      # + ключ gallery × 3 локали
public/assets/lada.kiev.ua-website.png   # удаляется
scripts/analyze-bundle.mjs          # маркеры сниппета + потолок 1536 Б + каталог аргументом
scripts/test-invalid-data.mjs       # + три порчи gallery.json
docs/runbook-deploy.md              # строка про сброс превью в кэше CDN уходит
tests/
├── gallery.spec.ts                 # новый
├── hero.spec.ts                    # новый: FR-002…FR-005 по размерам экрана
├── analyze-bundle.spec.ts          # новый, @build: маркеры и оба порога анализатора
├── fixtures/bundle/                # новый: три страницы для analyze-bundle.spec.ts
├── no-script.spec.ts, reduced-motion.spec.ts, contrast.spec.ts,
│   seo-contract.spec.ts, headings.spec.ts   # дополняются
└── support/site.ts                 # ожидаемые данные ленты, если тестам нужен общий источник
```

**Structure Decision**: раскладка проекта не меняется. Новая секция живёт там же, где остальные секции главной, и собирается `HomePage.astro`. Данные лежат рядом с `prices.json` и описаны в `content.config.ts` тем же способом. Правка маркеров в `analyze-bundle.mjs` — фундамент, она идёт до первого нового скрипта: иначе код события выпадет из учёта незамеченным (research.md §R3).
