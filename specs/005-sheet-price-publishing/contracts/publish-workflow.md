# Contract: Publish workflow

`.github/workflows/publish.yml`, событие `workflow_dispatch`, только `ref: main`.

## Inputs

| Input | Тип | По умолчанию | Смысл |
|---|---|---|---|
| `source` | choice `manual` \| `sheet` | `manual` | `sheet` передаёт только Apps Script |
| `mode` | choice `publish` \| `dry-run` \| `rebuild-sheet` | `publish` | `dry-run`: копия таблицы, без commit, rsync, сброса кэша и записи в таблицу; `rebuild-sheet`: только перестройка таблицы |
| `allow_large_change` | string, ключи через запятую | `''` | игнорируется с ошибкой запуска, если `source = sheet` (FR-026) |
| `e2e` | boolean | `false` | полный e2e вместо `test:publish` (ADR-027); галочка его не передаёт |

## Dispatch from the sheet

```http
POST https://api.github.com/repos/nofikoff/test-lada-kiev-ua/actions/workflows/publish.yml/dispatches
Authorization: Bearer <PAT из UserProperties автора>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28

{"ref":"main","inputs":{"source":"sheet"}}
```

`204` → `C1 = «публикация запущена в ЧЧ:ММ»`. `401`, `403` или `404` → `C1 = «нет доступа к публикации, Руслан уведомлён»` и письмо автору через `MailApp` от его имени. Любой другой код → `C1 = «ошибка запуска, Руслан уведомлён»` и такое же письмо.

## Job invariants

- `environment: production`; `permissions: { contents: write, id-token: write }`; `timeout-minutes: 20`; `concurrency: { group: publish, cancel-in-progress: false, queue: max }`.
- Секреты environment: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `CLOUDFLARE_API_TOKEN`. Переменные: `CLOUDFLARE_ZONE_ID`, `DEPLOY_HOST`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `PRICES_SHEET_ID`, `PRICES_SHEET_ID_DRY_RUN`, `PRICES_SHEET_OWNER`.
- Гейты: `check`, `lint`, `test:unit`, `build`, `test:publish` (или `test:e2e` при `e2e: true`), `test:invalid-data`, `analyze`. Любой красный → rsync не выполняется. Почему полный e2e не в каждой публикации — ADR-027.
- Шаг `report` идёт с `if: always()` при `mode ≠ dry-run`; он пишет статус и для упавшего запуска.
- FR-028 держат `timeout-minutes` на каждом долгом шаге, а не только на job: шаг, прерванный по своему тайм-ауту, считается упавшим, и `report` после него выполняется. Тайм-аут job (20 мин) — страховка, после которой статус в таблице может остаться «публикация идёт». Этот случай закрывает письмо GitHub о неудачном запуске.
- Запуск помечается неудачным, если `rejected` не пуст, — так GitHub шлёт письмо автору (FR-016). Сайт и commit при этом уже обновлены остальными суммами.

## Exit codes of `publish.mjs`

| Код | Смысл | Дальше |
|---|---|---|
| 0 | `reconcile` прошёл, `rejected` пуст | гейты |
| 3 | прошёл, `rejected` не пуст | гейты; запуск в конце помечается неудачным |
| 1 | StructureMismatch, Conflict, InvalidAmount или ошибка вызова | стоп, `report` пишет «ошибка» |

Отчёт для `report.mjs` и тела commit — `$RUNNER_TEMP/prices-report.json`.
