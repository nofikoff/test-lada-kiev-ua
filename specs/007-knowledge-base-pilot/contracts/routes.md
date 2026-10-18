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

## Directories without index

Apache отвечает 403, а не 404, на каталог без `index.html` (research R5). Поэтому в `dist/` без `index.html` остаются только:

| Каталог | Почему | Чем закрыт |
|---|---|---|
| `_astro/` | файлы сборки | 403 допустим: адрес не публичный, замер 2026-10-18 |
| `guide/`, `ru/guide/` | родитель хабов, корня раздела нет | `RedirectMatch 404` |

Промежуточный каталог хаба без `index.html` возникнуть не может: статья без хаба своего языка останавливает сборку ([content-files.md](content-files.md) §Build stops, № 8). Новый каталог без индекса в будущем — например, маршрут `src/pages/x/y.astro` без `x/` — ловит `tests/build-output.spec.ts`: он сверяет каталоги `dist/` без `index.html` со списком выше, а для `guide/` и `ru/guide/` проверяет правило в `dist/.htaccess` и `dist/ru/.htaccess`.

## Sitemap

- Каждый новый адрес — `<url>` в `sitemap-0.xml`.
- Альтернативы `xhtml:link` — по одной на каждый язык, на котором страница есть. Страница на одном языке альтернатив не получает: так ведёт себя `@astrojs/sitemap` 3.7.4 (research R6). `x-default` в карте сайта нет ни у одной страницы.

## llms.txt

Раздел `## Knowledge base` между `## Pages` и `## Services`. В нём абсолютные адреса хаба, статьи и эксперта на uk и ru с английским описанием в одну строку. Новая статья — новая строка раздела (список FR-016).

Вводная часть перестаёт считать страницы и обещать прайс везде (FR-011):

- «Fifteen pages exist in all three languages, plus two service subpages…» → языки по видам страниц без чисел: главная и категории — на трёх языках; подстраницы услуг, база знаний и страница эксперта — на uk и ru.
- «every page carries its full price list» → «every service page carries…»: у хаба, статьи и эксперта прайса нет.
- Строка `Sitemap` — «all pages with their language alternates» вместо «all nineteen pages».

Число в тексте менялось бы с каждой статьёй, а `tests/llms.spec.ts` проверяет адреса, а не прозу, поэтому устаревшее число прошло бы молча.

## Post-deploy checks

`publish.yml` после выкладки дополнительно ждёт:

- 404 на `https://www.lada.kiev.ua/guide/` и `https://www.lada.kiev.ua/ru/guide/`;
- `lang="ru"` в ответе на `/ru/guide/` — страница ошибки своего раздела.

Локальный preview этого не доказывает: он не исполняет `.htaccess`. Формы без слеша (`/guide`, `/ru/guide`) закрывает тот же шаблон `/?$`; их проверка — ручная, quickstart.md шаг 5.
