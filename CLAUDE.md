# lada.kiev.ua

Статический сайт студии на Astro 7, три языка (`uk` на корне, `/ru/`, `/en/`). Прод — статические файлы из `dist/` на Apache за Cloudflare, выкладка вручную по [docs/runbook-deploy.md](docs/runbook-deploy.md).

## Гейты

`npm run check`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm run test:invalid-data`, `npm run analyze` — все зелёные до слияния; правила сверх них — [.specify/memory/constitution.md](.specify/memory/constitution.md).

- e2e идёт против `astro preview` над `dist/` на `PREVIEW_PORT` (4329, `astro.config.mjs`), не против `astro dev` на 4321. Прогон без свежей `npm run build` проверяет прошлую сборку и выглядит необъяснимо зелёным.
- `tests/support/site.ts` держит хост, телефон, состав ленты литералами, а не импортом из `src/`: проверка, читающая константу реализации, доказывает только непротиворечивость.

## Документация

Пишется то, чего нет в коде: отвергнутые варианты, внешние договорённости, правило «во всех N местах», мёртвые зоны, ловушки для агентов. Структура, алгоритмы и журналы работ не пишутся — это код и git.

- `docs/adr/` — одно решение с отвергнутыми альтернативами на файл. `docs/specs/` — живые контракты. `docs/techdebt/` — долг, открыт пока файл существует. `specs/NNN-*/` — пакеты Spec Kit на время работы; закрытые растворены в `docs/`, журнал — [specs/RETIRED.md](specs/RETIRED.md). `docs/_local/` — author-local, в git не идёт.
- **Номера ADR и пакетов — только из get-id** (`resolve_project` с `git remote get-url origin` → `next_id`), не из `ls`.
- **ADR без статуса.** После слияния текст не правится: добавляется только `Superseded by:` или строка `> Correction YYYY-MM-DD: …`. Изменённое решение — новый ADR с `Supersedes:`. Форма — [docs/adr/adr-template.md](docs/adr/adr-template.md).
- **Новый `docs/specs/*.md` создаётся вместе со строкой в карте ниже — или не создаётся.** Документ без строки в карте для агента не существует.

## Что открыть, когда трогаешь

Перед тем как предлагать зависимость, фреймворк или переписывание подсистемы — `docs/adr/`. Уже отвергнуто: React/Next с пререндерингом ([ADR-004](docs/adr/adr-004-static-astro-no-client-framework.md)), `IntersectionObserver` для проявлений ([ADR-015](docs/adr/adr-015-motion-css-scroll-driven-no-script.md)), отложенная загрузка GA4 ([ADR-011](docs/adr/adr-011-analytics-snippet-unchanged-not-deferred.md)), Tailwind 4 вместе с правкой вёрстки ([ADR-010](docs/adr/adr-010-tailwind-3-via-postcss-no-integration.md)).

| Трогаешь | Открой | Потому что |
|---|---|---|
| `.htaccess`, адреса, `paths.ts`, карту сайта, `llms.txt` | [docs/specs/routes.md](docs/specs/routes.md) | адрес без слеша или без `www` указывает на перенаправление; `llms.txt` расходится с разметкой молча |
| `SeoHead.astro`, `<title>`, описания, `hreflang` | [docs/specs/page-head.md](docs/specs/page-head.md) | уникальность пары «заголовок + описание» ломается между файлами, схема её не видит |
| JSON-LD | [docs/specs/structured-data.md](docs/specs/structured-data.md) | долевая цена в `Offer` описывает бесплатную услугу |
| `prices.json`, `content.config.ts`, тексты категорий, `ui.ts`, фикстуру контента | [docs/specs/content-model.md](docs/specs/content-model.md) | `getCollection('prices')` молча переставляет прайс; правка старой строки краснит `content-parity` |
| любой текст сайта, название студии, «Про нас» | [docs/specs/voice.md](docs/specs/voice.md) | «майстерня» запрещена во всей сборке и в `llms.txt`; обращение Лады — без биографии сверх образования и без обещаний лечения |
| цвета, кегли, отступы, `tailwind.config.js` | [docs/specs/design-tokens.md](docs/specs/design-tokens.md) | hex в переменной выключает модификаторы прозрачности без ошибки; `--muted` на `--raised` проваливает контраст |
| анимации, `ambience.css`, `cssMinify` | [docs/specs/motion.md](docs/specs/motion.md) | `opacity: 0` вне `@supports` даёт пустую страницу там, где таймлайна нет; lightningcss выбрасывает правила с таймлайном |
| фокус, контраст, клавиатура, поведение без скриптов | [docs/specs/accessibility.md](docs/specs/accessibility.md) | часть требований прогон не меряет — там же список |
| первый экран, портрет, превью ссылок | [docs/specs/home-hero.md](docs/specs/home-hero.md) | LCP на `/` и `/ru/` стоит на 2.48 с при пороге 2.5 |
| ленту фото | [docs/specs/home-gallery.md](docs/specs/home-gallery.md) | фото 24 не публикуется никогда; подпись поверх фото проходит проверку контраста, ничего не доказав |
| выкладку | [docs/runbook-deploy.md](docs/runbook-deploy.md) | клиент выкладки по умолчанию теряет `.htaccess`, а Cloudflare держит постоянные адреса четыре часа |
