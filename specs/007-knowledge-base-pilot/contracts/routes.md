# Contract: Routes

Дополнение к [docs/specs/routes.md](../../../docs/specs/routes.md) §Route map; при реализации строки переносятся туда, `<c>` — категория из `serviceCategories`, `<a>` — slug статьи.

| Адрес | Статус | Где держится |
|---|---|---|
| `/guide/<c>/`, `/ru/guide/<c>/` — хаб, если есть файл `src/content/guide/<lang>/<c>.md` | 200 | `src/pages/guide/[...slug].astro`, `src/pages/ru/guide/[...slug].astro` |
| `/guide/<c>/<a>/`, `/ru/guide/<c>/<a>/` — статья, если есть файл `…/<lang>/<c>/<a>.md` | 200 | те же маршруты |
| `/lada/`, `/ru/lada/` | 200 | `src/pages/lada.astro`, `src/pages/ru/lada.astro` |
| `/guide/`, `/ru/guide/` | 404 | `RedirectMatch 404` в `public/.htaccess` и `public/ru/.htaccess`; без правила Apache отдаёт 403 на каталог без индекса |
| `/en/guide/…`, `/en/lada/` | 404 | маршрута под `en` нет; `ErrorDocument` раздела `en` |
| хаб или статья без файла на этом языке | 404 | маршрут не собирает адрес |
| форма без слеша любого адреса выше | 301 на форму со слешем (Apache `DirectorySlash`); `/guide` и `/ru/guide` — сразу 404 | `astro preview` отвечает 200 — прогон проверяет `canonical` со слешем |

Пилот собирает ровно шесть новых адресов: `/guide/depilation/`, `/ru/guide/depilation/`, `/guide/depilation/vs-epilation/`, `/ru/guide/depilation/vs-epilation/`, `/lada/`, `/ru/lada/`. Всего страниц 25.

## Sitemap

- Каждый новый адрес — `<url>` в `sitemap-0.xml`.
- Альтернативы `xhtml:link` — по одной на каждый язык, на котором страница есть. Страница на одном языке альтернатив не получает: так ведёт себя `@astrojs/sitemap` 3.7.4 (research R6). `x-default` в карте сайта нет ни у одной страницы.

## llms.txt

Раздел `## Knowledge base` между `## Pages` и `## Services`. В нём абсолютные адреса хаба, статьи и эксперта на uk и ru с английским описанием в одну строку. Вводный абзац называет новый счёт страниц, строка `Sitemap` — «all twenty-five pages». Новая статья — новая строка раздела (список FR-016).

## Post-deploy checks

`publish.yml` после выкладки дополнительно ждёт 404 на `https://www.lada.kiev.ua/guide/` и `https://www.lada.kiev.ua/ru/guide/`. Локальный preview этого не доказывает: он не исполняет `.htaccess`.
