<!--
Sync Impact Report
Version change: 1.1.0 → 1.1.1
Modified principles: I–V и Technology Constraints — текст заменён ссылками на источники,
  появившиеся при растворении пакетов 001 и 002 (docs/specs, ADR-004…018, CLAUDE.md). Смысл не менялся.
Added sections: none
Removed sections: none
Deferred TODOs: none
Note: принципы без источника в репозитории помечены «источника нет» и держат текст здесь.
-->

# lada.kiev.ua Constitution

## Core Principles

### I. Zero client-side framework

Интерактив — средствами платформы, UI-фреймворк в клиентской сборке — только отдельным ADR: [ADR-004](../../docs/adr/adr-004-static-astro-no-client-framework.md), [ADR-005](../../docs/adr/adr-005-native-details-menu-inline-tab-script.md).

### II. Контент — это данные, а не разметка

Цены, тексты и подписи живут в данных со схемой; пропущенный перевод роняет сборку: [docs/specs/content-model.md](../../docs/specs/content-model.md) §Инварианты.

### III. URL — публичный контракт

Действующие адреса не меняются, смена адреса — только с 301 и обновлением `canonical`/`hreflang`: [docs/specs/routes.md](../../docs/specs/routes.md).

### IV. Страница самодостаточна для машинного читателя

Полный HTML, собственные метаданные и валидный JSON-LD на каждой странице: [docs/specs/page-head.md](../../docs/specs/page-head.md), [docs/specs/structured-data.md](../../docs/specs/structured-data.md).

### V. Готовность доказывается прогоном

Работа закончена, когда предъявлен вывод гейтов против собранного сайта: [CLAUDE.md](../../CLAUDE.md) §Гейты, [ADR-012](../../docs/adr/adr-012-tests-against-built-dist.md).

## Technology Constraints

- Статический Astro, выкладка директорией на Apache, SSR вне контракта: [ADR-004](../../docs/adr/adr-004-static-astro-no-client-framework.md), [docs/runbook-deploy.md](../../docs/runbook-deploy.md).
- Смена мажорной версии Tailwind не совмещается с правкой вёрстки: [ADR-010](../../docs/adr/adr-010-tailwind-3-via-postcss-no-integration.md).
- Аналитика грузится как есть: [ADR-011](../../docs/adr/adr-011-analytics-snippet-unchanged-not-deferred.md).
- Node ≥ 22.12 — требование Astro 7. Источника в репозитории нет: `package.json` не объявляет `engines`.
- Любой другой сторонний скрипт в критическом пути — только после замера его влияния на LCP. Источника нет.

## Quality Gates

Команды-гейты — [CLAUDE.md](../../CLAUDE.md) §Гейты. Сверх них, источника нет:

- В собранном `dist/` нет ни одного комментария кода — ни в HTML, ни в скриптах и стилях; проверяет `tests/build-output.spec.ts`. Astro выводит `<!-- -->` из разметки как есть, поэтому в шаблонах `.astro` комментарий пишется только выражением `{/* */}`.

## Governance

Конституция — файл ссылок: каждый принцип — строка о том, что он ограничивает, и ссылка на источник. Текст правила здесь пишется только там, где источника нет, и помечается так. Поправка — изменение этого файла с новой версией по semver: MAJOR — удаление или несовместимое переопределение принципа, MINOR — новый принцип, PATCH — формулировка и ссылки.

**Version**: 1.1.1 | **Ratified**: 2026-09-06 | **Last Amended**: 2026-09-27
