# Quickstart: validating service subpages

## Gates

```bash
npm run check && npm run lint && npm run build && npm run test:e2e && npm run test:invalid-data && npm run analyze
```

Все шесть зелёные (spec SC-006). `test:e2e` идёт против `astro preview` на 4329 над свежей сборкой — без `npm run build` проверяется прошлая.

## Scenarios

| # | Проверка | Ожидание | Контракт |
|---|---|---|---|
| 1 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:4329/depilation/sugaring/` (и три других адреса) | `200` | [contracts/subpage.md](contracts/subpage.md) §Routes |
| 2 | то же для `/en/depilation/sugaring/` | `404` | §Routes |
| 3 | `grep -o 'hreflang="[a-z-]*"' dist/depilation/sugaring/index.html` | `uk`, `ru`, `x-default`, без `en` | §Head |
| 4 | `grep -c 'шугаринг' <<< "$(grep -o '<title>[^<]*' dist/depilation/index.html)"` | `0` | §Category pages |
| 5 | в `dist/sitemap-0.xml` найти `depilation/sugaring` | две `xhtml:link`, uk-UA и ru-UA | §Sitemap |
| 6 | в JSON-LD `dist/permanent/brows/index.html` | `BreadcrumbList` из трёх, `Offer` без коррекции (доля) | §JSON-LD, [data-model.md](data-model.md) |
| 7 | временно задать `"sugar": {"kind":"fixed","amount":999}` позиции `women-depilation-underarms`, собрать | 999 на `/depilation/sugaring/`, 400 на `/depilation/`; вернуть | data-model §Price item |
| 8 | временно задать `"sugar": false` той же позиции | позиции нет на `/depilation/sugaring/`, есть на `/depilation/` | data-model §Price item |
| 9 | `npm run test:invalid-data` | падает сборка на `sugar` у позиции бровей и на `sugar` с видом `share` | data-model §Price item |

Сценарии 7–8 закрепляет `scripts/test-invalid-data.mjs` (`npm run test:invalid-data`): кроме порчи, которая обязана ронять сборку, он получает допустимые правки прайса, после которых проверяет собранный `dist/`, и откатывает их так же, как порчу. Сегодня у прайса нет полей `sugar`, поэтому e2e по настоящим данным ветку «цена пастой» не видит, и без этого случая она осталась бы непроверенной.

## After deploy (author's word only)

```bash
curl -sI https://www.lada.kiev.ua/depilation/sugaring/ | head -1     # HTTP/2 200
```

Через 8 недель — `gsc_fetch.py fetch --site sc-domain:lada.kiev.ua`: строки с `depilation/sugaring` и `permanent/brows` (spec SC-007).
