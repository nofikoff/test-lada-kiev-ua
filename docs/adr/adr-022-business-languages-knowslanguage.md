# ADR-022: языки студии в JSON-LD — `knowsLanguage`, не `availableLanguage`

- **Related:** [docs/specs/structured-data.md](../specs/structured-data.md) · [ADR-013](adr-013-structured-data-no-zero-price-offers.md)

## Context

`availableLanguage` на `HealthAndBeautyBusiness` давал три предупреждения `UNKNOWN_FIELD` в `validator.schema.org`: его область — `ContactPoint`, `Course`, `LodgingBusiness`, `ServiceChannel`, `TouristAttraction`. ADR-013 оставил его, потому что перенос в `contactPoint` менял форму описания организации. `knowsLanguage` (область — `Organization`, `Person`, [schema.org](https://schema.org/knowsLanguage), проверено 2026-09-27) тогда не рассматривался.

## Decision

Языки студии — `knowsLanguage: ["uk", "ru", "en"]` прямо на `HealthAndBeautyBusiness`.

## Consequences

- Positive: 0 предупреждений валидатора; форма описания организации прежняя — один узел, тот же массив кодов.
- Отвергнуто: оставить `availableLanguage` с предупреждениями (ADR-013) — свойство вне словаря для этого типа, а замена без смены формы существует.
- Отвергнуто: `contactPoint` с `availableLanguage` — точнее описывает запись по телефону, но добавляет узел ради того же факта (довод ADR-013).
- Держит `tests/seo-contract.spec.ts`: `knowsLanguage` с тремя кодами и отсутствие `availableLanguage` у организации.
