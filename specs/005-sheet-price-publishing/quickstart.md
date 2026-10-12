# Quickstart: Sheet-driven price publishing

Проверка от настройки до приёмки. Внешние учётные записи — GCP, PAT, секреты GitHub, сервер — настраивает автор: у агента нет `gcloud`-входа и `gh`.

## 0. Local

```bash
npm run test:unit        # reconcile, sheet-layout
npm run lint && npm run check && npm run build
```

## 1. One-time setup

1. **Сервер, root**: поставить `rrsync` из исходников rsync 3.1.2 в `/usr/local/bin/rrsync`, создать `/home/lada/.ssh/authorized_keys` (`700`/`600`, владелец `lada`) со строкой `command="/usr/local/bin/rrsync /home/lada/public_html",restrict ssh-ed25519 …`, добавить `lada` в `AllowUsers` и блок `Match User lada` (research.md §R5). Проверка: `ssh lada@host id` отвечает «is not rsync», вход по паролю — `Permission denied (publickey)`, `rsync -n -rlpt --delete --chmod=D755,F644 dist/ lada@host:` проходит. Сделано 2026-10-12.
2. **GCP** (личный gmail): проект, Sheets API, service account без ключей, пул WIF с провайдером `token.actions.githubusercontent.com` и условием `assertion.repository == 'nofikoff/test-lada-kiev-ua' && assertion.ref == 'refs/heads/main'`, роль `roles/iam.workloadIdentityUser` пулу на service account.
3. **Таблицы**: две пустые таблицы (боевая и копия для пробного прогона) с доступом «редактор» для service account.
4. **GitHub**: environment `production` с правилом ветки `main`; секреты и переменные — [contracts/publish-workflow.md](contracts/publish-workflow.md) §Job invariants.
5. **Перестройка**: Actions → publish → `mode: rebuild-sheet`, потом то же для копии. Таблица выглядит как [contracts/sheet-layout.md](contracts/sheet-layout.md), `D` = `E` = суммы `prices.json`.
6. **Apps Script**: Расширения → Apps Script, вставить `apps-script/Code.js` и `appsscript.json`, выполнить `setup()` от имени автора. Функция просит PAT, кладёт его в UserProperties и создаёт установленные триггеры. PAT: fine-grained, один репозиторий, `Actions: Read and write`, без срока (research.md §R5).

Пункты 2–6 сделаны 2026-10-12. Таблица, созданная через sheets.new, приходит с пустым листом `Sheet1` — его удаляют вручную, чтобы Лада видела один лист.

## 2. Structure protection (SC-003, R8)

Под тестовой учётной записью-редактором — не владельцем — попытаться:

- вставить строку и столбец;
- удалить строку и столбец;
- перетащить строку;
- поправить `B4` и `E4`;
- ввести в `D4` `0`, `-5`, `12.5`, `abc` и пустое значение.

Ожидаемо: всё отклонено. Если вставка или удаление строки прошли — R8 «Если вставка возможна» переходит в обязательную фазу tasks.md.

## 3. Mobile trigger (FR-005, R4)

С телефона, приложение Google Sheets, под учётной записью-редактором: изменить сумму на копии, поставить галочку. Ожидаемо: в `C1` «публикация запущена» в течение минуты, в Actions новый запуск `source: sheet`. Если запуск не появился — переход на запасной вариант R4.

## 4. Dry run

Actions → publish → `mode: dry-run`. Ожидаемо: все гейты зелёные, в логе отчёт `reconcile`, в `main`, на сайте и в таблице изменений нет.

## 5. First publish

1. Ручной запуск без изменений сумм. Ожидаемо: «опубликовано, изменений цен нет», сайт совпадает с `main`, проверки после выкладки зелёные, владелец файлов `lada:lada`.
2. Одна настоящая правка с телефона. Ожидаемо: сумма на `/`, `/ru/`, `/en/`, на странице категории и в JSON-LD `Offer`; commit `chore(prices): …` в `main`; подсветка снята; время от галочки до сайта записано в research.md §R10.
3. Скачок: `D` = 10 × прежней. Ожидаемо: строка красная с пометкой, статус «кроме 1 позиции», письмо автору, сайт прежний.
4. Ручной запуск с `allow_large_change: <ключ>`. Ожидаемо: сумма на сайте, пометка снята.
