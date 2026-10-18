# Language switcher marks the home link as the current page

- **Owner:** unassigned
- **Filed:** 2026-10-18
- **Source:** найдено при сборке подстраниц услуг (пакет 006), было в `main` до него

## Context

Переключатель языка ведёт на главную выбранного языка ([page-head.md](../specs/page-head.md) §Языковые альтернативы), но ссылка текущего языка несёт `aria-current="page"` на любой странице: на `/depilation/sugaring/` экранный чтец объявляет ссылку на `/` текущей страницей. Пакет 006 вёрстку шапки не трогал.

## Action

`src/components/Header.astro:71` и `:119`: `aria-current="page"` только когда страница — главная своего языка; на прочих страницах текущий язык отмечается без `aria-current` (например, `aria-current="true"` или только видимым состоянием) — выбор по [accessibility.md](../specs/accessibility.md).

## Definition of Done

- [ ] На `/depilation/` и `/depilation/sugaring/` ни одна ссылка переключателя не несёт `aria-current="page"`; на `/` — несёт ссылка `uk`.
- [ ] Проверка в `tests/` по собранному HTML, красная до правки.
