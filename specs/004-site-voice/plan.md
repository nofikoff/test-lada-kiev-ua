# Implementation Plan: Site voice and SEO copy

**Branch**: `004-site-voice` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-site-voice/spec.md`

## Summary

Сайт получает один голос и одно название: «Про нас» становится подписанным обращением Лады от первого лица (150–250 слов, образование — реабилитолог, НУФВСУ), всё остальное говорит «ми» от лица студии, «майстерня/мастерская/workshop» исчезают. Заголовки окна, описания, главные заголовки и первые абзацы пятнадцати страниц переписываются по карте запросов, выбранной без статистики; в JSON-LD главной появляется основательница. Технически: новая коллекция `about` вместо четырёх строк словаря, `h1` главной вбирает подзаголовок без смены шрифтов, новые проверки по `dist/` с эталонами-литералами.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Astro 7, Node ≥ 22.12

**Primary Dependencies**: Astro content collections (`glob`, `file` из `astro/loaders`, `z` из `astro/zod`), Tailwind 3 через PostCSS (ADR-010), шрифты через Astro Fonts API (ADR-009)

**Storage**: файлы в репозитории — `src/content/about/*.md` (новое), `src/content/services/*/*.md`, `src/i18n/ui.ts`, `public/llms.txt`

**Testing**: Playwright против `astro preview` на 4329 по `dist/` (`npm run test:e2e`), `scripts/test-invalid-data.mjs`, Lighthouse 12.8.2 мобильный профиль

**Target Platform**: статические файлы на Apache за Cloudflare

**Project Type**: статический многоязычный сайт

**Performance Goals**: LCP на `/` и `/ru/` ≤ 2.5 с (база 2.48 с)

**Constraints**: без новых шрифтовых файлов на странице; без клиентского скрипта; без новых адресов; фикстура прежнего контента правится тем же коммитом, что текст

**Scale/Scope**: 15 страниц × 3 языка; 12 файлов категорий, 3 новых файла обращения, словарь, 2 компонента, 1 новый и 4 правленых файла проверок, 5 документов, 3 ADR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус |
|---|---|
| I. Zero client-side framework | ✓ скриптов не добавляется |
| II. Контент — данные со схемой, пропуск перевода роняет сборку | ✓ коллекция `about` со схемой; нет файла локали → ошибка сборки (R6) |
| III. URL — публичный контракт | ✓ адреса не меняются; отдельные страницы под запросы отвергнуты (ADR) |
| IV. Полный HTML, метаданные, валидный JSON-LD | ✓ `founder` проверяется валидатором (SC-005) |
| V. Готовность доказывается прогоном | ✓ шесть гейтов + Lighthouse (quickstart.md) |
| Сторонний скрипт в критическом пути — после замера | ✓ не добавляется |
| Нет комментариев в `dist/` | ✓ в `.astro` только `{/* */}`; Markdown обращения без HTML-комментариев |

Повторная проверка после Phase 1: нарушений нет, Complexity Tracking не заполняется.

## Project Structure

### Documentation (this feature)

```text
specs/004-site-voice/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/page-copy.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── content.config.ts            # + коллекция about
├── content/about/{uk,ru,en}.md  # новое: обращение Лады
├── content/services/*/*.md      # title, description, heading, первый абзац; шугаринг; ссылка на «Про нас»
├── data/about.ts                # новое: aboutCopy(locale), throw при отсутствии
├── i18n/ui.ts                   # hero.subtitle, meta.title/description, − about.heading/text1..4, + meta.founderRole
└── components/
    ├── About.astro              # запись коллекции, data-about-copy, подпись в .about__close
    ├── Hero.astro               # h1 = .display + .hero__sub
    └── SeoHead.astro            # founder в HealthAndBeautyBusiness
public/llms.txt                  # основательница, шугаринг
scripts/test-invalid-data.mjs    # + случай «нет файла обращения»
tests/
├── support/site.ts              # карта запросов, имена и роли, состав шрифтов, ABOUT_COPY_SELECTOR
├── voice.spec.ts                # новое: название, обращение, запросы, шугаринг, ссылка, шрифты
├── seo-contract.spec.ts         # + founder; счёт слов через общий countWords
└── fixtures/legacy-content.json # − заменённые строки
docs/
├── specs/voice.md               # новое + строка в CLAUDE.md
├── specs/{page-head,structured-data,content-model,home-hero}.md
└── adr/adr-0NN-*.md             # 3 ADR, номера из get-id
```

**Structure Decision**: существующая структура репозитория; новое — только коллекция `about`, её модуль чтения, `tests/voice.spec.ts` и `docs/specs/voice.md`.

## Complexity Tracking

Нарушений конституции нет.
