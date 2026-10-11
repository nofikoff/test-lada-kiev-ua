# ADR-024: Articles published via git, no CMS admin

- **Related:** [ADR-004](adr-004-static-astro-no-client-framework.md) · [ADR-007](adr-007-content-formats-markdown-texts-ts-dictionary.md) · [ADR-023](adr-023-knowledge-base-pages-for-informational-queries.md) · [docs/runbook-deploy.md](../runbook-deploy.md)

## Context

ADR-023 открыл сайт для статей: страницы базы знаний на uk и ru, дальше возможен блог. Статьи и HTML-вставки к ним автор готовит с ИИ в Claude Code, и сам их публикует. Отсюда вопрос, нужна ли админка — WordPress или другая CMS.

## Decision

Статью публикует автор через git: Markdown в коллекции контента, сборка и выкладка по `runbook-deploy.md`, админки нет. Когда появится автор без git, ставится git-based CMS поверх тех же файлов, а не WordPress.

## Consequences

- Positive: статья проходит те же гейты, что и остальной сайт: схему коллекции в `astro check`, запреты `voice.md`, контракт `page-head.md`, e2e. Текст ИИ проверяет сборка, а не только вычитка.
- Positive: стек один. PHP, база данных и обновления плагинов на сервере не появляются.
- Negative: публикация и любая правка опубликованной статьи — полный цикл выкладки с машины автора. Опубликовать может только тот, у кого есть репозиторий и доступ к серверу.
- Negative: отложенной публикации и комментариев нет.
- Follow-up: условие пересмотра — статьи публикует человек без git (Лада, маркетолог). Тогда нужны git-based CMS и автоматическая сборка и выкладка вместо ручной. Решение оформляется новым ADR с `Supersedes: ADR-024`.
- **Rejected: WordPress рядом с Astro, например `/blog/` на том же Apache.** Шапку, подвал, дизайн-токены и запреты `voice.md` пришлось бы повторить в PHP-теме, и гейты её не видят. Запас LCP на `/` — 0.02 с (`home-hero.md`), и тема с плагинами его съест. `hreflang` через Polylang или WPML выходит из-под контракта `page-head.md`.
- **Rejected: headless WordPress, страницы рендерит Astro.** SEO и гейты сохраняются, но ради админки появляются сервер WordPress и webhook на сборку. Админкой при этом никто не пользуется: единственный автор работает в git.
- **Rejected: git-based CMS сразу (Decap, Keystatic, Sveltia).** Она даёт веб-интерфейс автору, которому он не нужен, и требует автоматической выкладки, которой у сайта нет. Отложена до условия пересмотра.
