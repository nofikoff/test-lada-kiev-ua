# Research: Knowledge Base Pilot

Неизвестных из Technical Context не осталось: всё ниже решено по коду репозитория, исходникам зависимостей в `node_modules` и замерам 2026-10-18. Измеренное помечено датой и способом повторить.

## R1. Collection layout and entry identity

**Decision**: коллекция `guide` — `glob({ pattern: '**/*.md', base: './src/content/guide' })`, идентификатор по умолчанию (`uk/depilation`, `uk/depilation/vs-epilation`). Язык, категория и slug выводятся из `entry.id`, сообщения называют `entry.filePath` (`src/content/guide/uk/depilation/vs-epilation.md`). Frontmatter: `page`, `title`, `description` (120–160), `heading`, `published`, `modified`. Схема объекта — `.strict()`: неизвестный ключ останавливает сборку. Главный случай — `slug`: загрузчик `glob` берёт `data.slug` идентификатором записи (`node_modules/astro/dist/content/loaders/glob.js:12`), и без запрета файл молча получил бы чужой адрес. Коллекция `expert` — `glob({ pattern: '+(uk|ru).md', base: './src/content/expert' })`, frontmatter `title`, `description` (120–160), `heading`; пропуск ловит `expertCopy`, как `aboutCopy`.

**Rationale**: путь файла один раз задаёт адрес, язык и категорию; второй записи этих фактов нет. Шаблон `**/*.md` загружает и ошибочно положенный файл — тогда его ловит проверка формы пути (R2), а не обход загрузчиком.

**Alternatives considered**:
- шаблон по перечню категорий, как у `services`, — файл `uk/nails/x.md` загрузчик просто не прочитал бы, и статья пропала бы без сообщения;
- поле `category` во frontmatter — второй источник того, что уже сказано каталогом;
- отдельные коллекции хабов и статей — одинаковая схема дважды, а пары хаб/статья всё равно проверяются между коллекциями.

## R2. Where the build-stopping checks live

**Decision**: правило одной записи — в схеме (`modified >= published`, `.refine` с `path: ['modified']`). Межфайловые правила — в `src/data/guide.ts`, функция `guideIndex()` с кэшем промиса на модуль. Её вызывают `getStaticPaths` маршрутов раздела, страница эксперта, `MapLinks` и `SeoHead`, поэтому любая сборка проходит через проверки. Порядок проверок и тексты сообщений — [contracts/content-files.md](contracts/content-files.md) §Build stops.

Порядок групп: форма пути → язык и категория → повтор `page` в языке → общий адрес версий одного `page` на разных языках → пары хаб/статья → чтение и разбор карты (№ 12, первая из остановок карты) → соответствие карте → файл эксперта.

**Rationale**: так устроены `gallery.ts` и `serviceCopy` — схема видит одну запись, нарушение возникает между записями. Исключение в `getStaticPaths` останавливает `astro build` с текстом исключения, и `test:invalid-data` проверяет именно этот текст. Фиксированный порядок нужен потому, что одна порча нарушает несколько правил сразу. Пример: дубль `page` в новом файле одновременно расходится с адресом в карте. Тест ожидает сообщение первого сработавшего правила.

**Alternatives considered**:
- собственный загрузчик поверх `glob` — исключение из пользовательского `parser` загрузчик `file()` проглатывает (комментарий в `src/content.config.ts`), а у `glob` ошибка чтения файла только пишется в журнал (`scripts/test-invalid-data.mjs`, `STRAY_COPY`); надёжной остановки там нет;
- `superRefine` на коллекции — zod получает одну запись, межзаписевого контекста нет;
- проверки на уровне модуля `content.config.ts` — `getCollection` там недоступен.

## R3. Link source and anchors

**Decision**: `src/data/guide.ts` читает `docs/seo/map.md` от корня проекта (`process.cwd()`) и кладёт разобранную карту в индекс. Чистый модуль `src/data/seo-map.ts` (без Astro, без чтения файлов, только `import type`) отдаёт `parseSeoMap(text)` и `linksFrom(map, locale, path, builtPaths)`; обёртка `src/data/map-links.ts` собирает собранные адреса и вызывает `linksFrom` (data-model.md §Seo map). `parseSeoMap` разбирает §Pages и §Links по колонкам контракта `/seo` (`~/.claude/skills/seo/references/contract.md` §Map). Столбцы находятся по имени в строке заголовка, а не по позиции: `/seo map` вправе переставить или добавить столбец, и разбор этого не заметит. Лишние столбцы и §Site не читаются. Ребро выводится, если `from` — текущая страница, а адрес `to` в §Pages её языка — собранная страница сайта. Статус `planned/published` из карты сборка не читает: опубликованной страницу делает файл в контенте (spec, Clarifications). Анкор карты выводится функцией `displayAnchor(locale, anchor)`. Она поднимает первую букву и восстанавливает регистр имён собственных из словаря раздела (`Київ`, `Киев`), иначе на странице стояло бы «депіляція київ». `/seo audit` сравнивает анкоры после trim, схлопывания пробелов и нижнего регистра (`~/.claude/skills/seo/references/checklist.md` §Anchor stop-list), поэтому регистр на соответствие карте не влияет.

Проверки карты в `guide.ts`: страница коллекции есть в §Pages с тем же `page`, `lang` и `url`, что выводит её путь; у каждой статьи есть ребро «хаб → статья» её языка, иначе хаб не сможет её перечислить. Разбор, не нашедший §Pages или §Links или нужных колонок, останавливает сборку.

**Rationale**: карта — источник истины для ссылок и анкоров, её пишет `/seo map`. Копия рёбер в коде делает каждую правку карты правкой в двух местах. Чтение карты сборкой делает FR-010 и US4 одним механизмом: следующая статья появляется в хабе и получает свои ссылки без правки шаблонов. Тест ссылок тоже читает `map.md`. Это не «проверка константой реализации»: карта — внешний контракт `/seo`, и тест сверяет с ним собранный HTML.

**Alternatives considered**:
- рёбра и анкоры копией в TS-модуле — вторая запись карты, расходится молча до прогона;
- анкоры во frontmatter — меняет согласованный состав frontmatter и всё равно копирует карту;
- анкор карты как есть, без регистра — «київ» строчной в видимом тексте;
- статус `published` из карты — карта переводит страницу в `published` только после выкладки (`/seo map` сверяет сайт), то есть пилот никогда не вывел бы ссылок;
- один модуль `seo-map.ts`, который читает карту и сам спрашивает `guideIndex()` о собранных адресах, — первая версия этого плана. `guide.ts` импортирует разбор карты для остановок 10–11, поэтому модули импортировали бы друг друга, а модульный тест под `node` не загрузил бы модуль с `astro:content`.

**Risk**: анкор «депіляція» карта ведёт на хаб, а одинаковый текст ссылки на `/depilation/` дал бы находку `internal-links.5` (low). Код на 2026-10-18 такой ссылки не выводит: карточка главной содержит ещё описание, крошка подстраницы — полный `heading` категории. После сборки ветки прогнать `/seo audit` по `dist/`. Найденный конфликт разводит `/seo map` правкой анкора в карте, а не код.

## R4. Page reference and language alternates

**Decision**: в `src/i18n/paths.ts` появляется `PageRef = ServicePageRef | GuidePageRef | ExpertPageRef`; `ServicePageRef` получает `kind?: undefined`, чтобы сужение по `kind` работало без правки существующих литералов `{ category }`.

```ts
type GuidePageRef = {
  readonly kind: 'guide';
  readonly category: ServiceCategory;
  readonly article?: string;          // нет у хаба
  readonly locales: readonly GuideLocale[];  // из guideIndex(): какие файлы есть
};
type ExpertPageRef = { readonly kind: 'expert' };
```

`pagePath`: guide — `${prefix}/guide/${category}/${article ? article + '/' : ''}`, expert — `${prefix}/lada/`. `pageLocales`: guide — `ref.locales`, expert — `guideLocales`. `languageAlternates`: `xDefault` — uk, если она среди языков страницы, иначе первая версия. `guideStaticPaths(locale)` возвращает `{ params: { slug }, props: { page } }`, где `page` уже несёт языки.

**Rationale**: ADR-008 держится: соответствие версий — подстановка префикса, таблицы нет. Языки страницы базы знаний — свойство набора файлов, а не реестра. Поэтому их вычисляет индекс, и они приходят в ссылку из одного места. `og:locale:alternate` читает тот же `pageLocales` и меняется вместе с `hreflang`.

**Alternatives considered**:
- асинхронный `pageLocales`, читающий коллекцию сам, — `paths.ts` синхронный и импортируется из `content.config.ts`, где `astro:content` недоступен;
- обязательный `kind` у всех ссылок — правка каждого литерала `{ category }` в страницах, компонентах и `tests/types/subpage-refs.ts` без выигрыша в типах.

## R5. Section root and Apache

**Decision**: `public/.htaccess` — `RedirectMatch 404 ^/guide/?$`, `public/ru/.htaccess` — `RedirectMatch 404 ^/ru/guide/?$`; `ErrorDocument` раздела отдаёт страницу ошибки своего языка. `publish.yml` после выкладки проверяет 404 на `https://www.lada.kiev.ua/guide/` и `/ru/guide/`. Строка в `runbook-deploy.md` перечисляет новую проверку.

**Rationale**: сборка создаёт каталог `dist/guide/` без `index.html`. Каталог без индекса прод отдаёт кодом 403 со страницей Apache, а не 404 (замер 2026-10-18: `curl -s -o /dev/null -w '%{http_code}' https://www.lada.kiev.ua/_astro/` → `403`). FR-002 требует 404. `astro preview` этой ветки Apache не воспроизводит, поэтому локальный 404 на `/guide/` ничего не доказывает о проде. `RedirectMatch` с кодом не из 3xx отвечает этим кодом без перенаправления (mod_alias). Директивам нужен `AllowOverride FileInfo` — тот же, что уже работает для `ErrorDocument`. Шаблон с `/?$` закрывает и форму без слеша до перенаправления `DirectorySlash`.

**Alternatives considered**:
- `Options -Indexes` — даёт 403, а не 404;
- страница `/guide/` с `noindex` — страница без запроса, отвергнута в spec, Assumptions;
- оставить как есть — прод отвечал бы 403 там, где контракт адресов обещает 404.

## R6. Sitemap

**Decision**: конфигурация `@astrojs/sitemap` не меняется. Шесть новых адресов попадают в карту сами, а языковые альтернативы интеграция вычисляет по пути без префикса.

**Rationale**: `node_modules/@astrojs/sitemap/dist/generate-sitemap.js` (3.7.4) группирует адреса по пути без локали; при одной версии (`links.length <= 1`) альтернатив нет. Хаб, статья и эксперт на uk и ru получают по две альтернативы `uk-UA`/`ru-UA`; будущая статья только на uk — ни одной; `x-default` интеграция не пишет нигде. `tests/sitemap.spec.ts` получает ожидание по языкам страницы из `tests/support/site.ts` вместо разбиения «три или две».

**Alternatives considered**: `lastmod` из `modified` через `serialize` — конфигурация не видит `astro:content`, понадобился бы второй разбор Markdown в `astro.config.mjs`. Это вне пакета.

## R7. Structured data

**Decision**: узел основательницы строит `founderNode(locale)` в `src/data/founder.ts`. Он даёт `@id` = `<главная локали>#founder`, `name` из подписи «Про нас», `jobTitle` из `meta.founderRole`, портрет и `alumniOf`. Его используют `founder` главной (без изменений вывода), `ProfilePage.mainEntity` и `Article.author`. На странице эксперта и в статье узел дополняется `url` страницы эксперта своего языка. Состав узлов — [contracts/page-head-and-jsonld.md](contracts/page-head-and-jsonld.md). `og:type` остаётся `website` на всех страницах: контракт `page-head.md` не меняется, даты статьи несёт JSON-LD.

**Rationale**: «тот же Person `@id`, что на главной» проверяется равенством строк. Один построитель исключает расхождение имени или роли между тремя местами. Узлы с одним `@id` поисковик сливает, поэтому `url` на странице эксперта главную не противоречит.

**Alternatives considered**:
- `author` ссылкой только по `@id` — валидатор принимает, но Google для `Article` рекомендует `name` и `url` автора на самой странице;
- `og:type: article` с `article:published_time` — расширяет контракт заголовочной части ради поля, которого не требует ни одно FR.

## R8. Shared presentation

**Decision**:
- `Breadcrumbs.astro` выносится из `ServicePage.astro` вместе со стилями `.crumbs*`; разметка и классы не меняются.
- Типографика текста из Markdown (`p`, лид первого абзаца с буквицей, `h2` со счётчиком разделов, `h3`, `ul`, `strong`, `a`) переезжает в `@layer components` в `src/index.css` классом `.copy`. Правила сетки и врезки (`order`, `.insert`) остаются в `ServicePage.astro`.
- Статья и хаб — `Section rhythm="air"` с колонкой `max-w-4xl`. Блок ссылок — `<aside>` с `SectionHeading` (`eyebrow` + `title` уровня `h2` из словаря раздела, правило 7 `design-tokens.md`) и списком ссылок.
- Страница эксперта — портрет из `portrait()` (`src/data/gallery.ts`) с `alt` своей локали, текст, список статей.
- Подписи — `src/i18n/guide.ts`, `Record<GuideLocale, GuideDictionary>`.

**Rationale**: копия стилей в двух компонентах расходится на первой правке. Вынос проверяют существующие `typography.spec.ts` (мера колонки) и `contrast.spec.ts` на страницах услуг, а новые страницы добавляются в их области. Ключи `ui.ts` обязаны быть и в `en`, а у раздела английских страниц нет: строки `en` были бы мёртвыми данными.

**Alternatives considered**: обёртка-компонент `Prose.astro` — ломает приём `display: contents` + `order` у врезки страницы услуги; ключи раздела в `ui.ts` с английскими заглушками.

## R9. Dates

**Decision**: `published` и `modified` — `z.coerce.date()` (YAML `2026-10-20` уже приходит датой, строка в кавычках тоже проходит). Видимая форма — `Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })` в `<time datetime="YYYY-MM-DD">`; в JSON-LD — `YYYY-MM-DD`. `timeZone: 'UTC'` обязателен: дата без времени разбирается в полночь UTC, и в часовом поясе запада она показалась бы предыдущим днём.

**Rationale**: даты ставит автор (spec, Clarifications), вычислять их из git нечем и не нужно — опечатка не двигает дату правки.

**Alternatives considered**: дата из `git log` — двигается на каждой опечатке, а в CI `actions/checkout` по умолчанию берёт историю глубиной 1.

## R10. Tests

**Decision**:
- `tests/support/site.ts` получает литералы `GUIDE_PAGES` (путь, язык, вид, категория, slug, языки страницы) и `EXPERT_PAGES`, запросы статей и запрещённые хабу формулировки, а также `GUIDE_COPY_SELECTOR = '[data-guide-copy]'` и `EXPERT_COPY_SELECTOR = '[data-expert-copy]'`. `allPages` включает новые страницы, поэтому их автоматически покрывают `routes`, `sitemap`, `llms`, уникальность пары «заголовок + описание», превью, хост `www`, карта в подвале. `builtPages` покрывает `headings` и запрет «майстерня».
- `queryOf` перестаёт обслуживать все страницы. Проверка запроса идёт по видам: у статьи — формулировка кластера без «Києва», у эксперта — имя, у хаба — отсутствие запросов категории и его статей.
- `tests/links.spec.ts` (новый) читает `docs/seo/map.md`. Для каждого ребра, у которого обе страницы есть в `allPages`, в HTML `from` есть `<a href=to>` с текстом, равным анкору после нормализации. Ни одна внутренняя ссылка новых страниц и блока категории не ведёт на несобранный адрес. Рёбра пилота «статья → хаб» и «статья → услуга» на uk и ru тест проверяет ещё и литералами `PILOT_EDGES` из `tests/support/site.ts`, не читая карту ([contracts/links.md](contracts/links.md) §Pilot edges).
- `scripts/test-invalid-data.mjs` получает помощник для добавленных и перемещённых файлов. Действующий `withCorruption` читает исходник и не умеет файл, которого не было. Добавленный файл удаляется, перемещённый возвращается в `finally`. Случаи — [quickstart.md](quickstart.md) §3; публикация после проверки порченых данных пересобирает `dist/` перед `analyze` и выкладкой (шаг `Gate — analyze` в `publish.yml`).
- `tests/seo-contract.spec.ts` сверяет видимые даты подписи (`<time datetime>`) с `datePublished` / `dateModified` и список статей на странице эксперта с `GUIDE_PAGES` её языка.
- `tests/build-output.spec.ts` сверяет каталоги `dist/` без `index.html` со списком [contracts/routes.md](contracts/routes.md) §Directories without index и для `guide/`, `ru/guide/` ищет правило `RedirectMatch 404` в `.htaccess` своего раздела. Проект `build` входит в `test:publish`, поэтому проверка идёт и на публикации Лады.
- `scripts/seo-map.test.mjs` проверяет `parseSeoMap` на таблицах карты и на испорченных таблицах; `test:unit` в `package.json` включает его.

**Rationale**: ADR-012 и правило CLAUDE.md о литералах. Разбор карты — чистая функция, её дешевле проверить модульно, чем полной сборкой на каждый вид порчи.

**Alternatives considered**: импорт `guideIndex` в проверки — проверка доказала бы только непротиворечивость; e2e на `astro dev` — запрещено ADR-012.

## R11. Pilot content and sources

**Decision**: тексты пишутся при реализации. Каждое общее утверждение статьи получает строку в §Sources ниже. Виды утверждений и источник каждого — [contracts/content-files.md](contracts/content-files.md) §Claim kinds. Утверждения о практике студии — только из `docs/specs/studio-practice.md`, прайса (`women*`/`men*` группы — воск и паста, позиции триммера и бритвы) и текста категории; их соответствие — §Practice claims ниже. При `/speckit-retire` обе таблицы уходят в `docs/specs/content-model.md` §Knowledge base; тот же раздел становится местом источников следующих статей (список FR-016 в `routes.md` на него ссылается). На странице источники не выводятся: FR-013 требует запись в репозитории, а блок источников на странице — вёрстка, которую никто не согласовывал.

Запись источника — строка §Sources:

- **Утверждение** — как оно стоит в тексте, по-русски;
- **Источник** — адрес страницы, открытой при проверке, не пересказ;
- **Цитата** — дословный фрагмент страницы на её языке, подтверждающий утверждение;
- **Проверено** — дата, когда страница была открыта;
- **Статус** — `проверен` или `кандидат`.

Кандидат — источник, найденный, но не открытый. Утверждение с кандидатом в текст не попадает: к слиянию в таблице нет ни одного кандидата при утверждении, стоящем в тексте. Утверждение, для которого источник не нашёлся, из текста убирается.

**Rationale**: FR-013 требует источник в пакете; после ретайра пакета источники опубликованной статьи не должны пропасть. Цитата нужна потому, что адрес без неё не отличает прочитанный источник от найденного поиском.

**Terminology conflict (measured 2026-10-18)**: согласованный первый абзац («депиляция удаляет волос без разрушения фолликула, эпиляция его разрушает») совпадает с русской Википедией, но расходится с другими источниками:

- украинская Википедия называет депиляцией удаление только видимой части волоса;
- англоязычная терминология относит воск и сахарную пасту к epilation, потому что они удаляют волос с корнем.

Текст поэтому говорит, что держится согласованного деления на этой странице, и одной фразой ниже — что часть справочников относит воск и пасту к эпиляции. Деление принятым в салонной практике текст не называет: источника такого утверждения нет.

Значение закреплено (spec FR-012): эпиляция в пилоте — методы, разрушающие фолликул, то есть лазерная, электро- и фотоэпиляция; студия не делает ни одного из них. Воск и сахарная паста — депиляция в смысле страницы. Оговорка о терминах называет именно это определение, чтобы читатель англоязычного источника не прочёл фразу «эпиляции в студии нет» как ложную. Иначе первый абзац утверждал бы общее правило, которое опровергает первый же открытый словарь.

### Sources

Цитаты строк, прочитанных при планировании, вписываются при написании текста: страница открывается повторно, и дата проверки обновляется.

Каждая страница открыта `curl -sL` 2026-10-18; цитата сверена с текстом страницы без разметки. Утверждение — так, как оно стоит в статье пилота.

| Утверждение | Источник | Цитата | Проверено | Статус |
|---|---|---|---|---|
| эпиляция разрушает волосяной фолликул, после депиляции волосы отрастают снова; лазерная, электро- и фотоэпиляция — методы эпиляции | [ru.wikipedia.org/wiki/Эпиляция](https://ru.wikipedia.org/wiki/Эпиляция) | «искусственное удаление волос (от фр. épiler — удалять волосы) посредством разрушения волосяных луковиц тем или иным способом»; «Удалённые при эпиляции волосы заново уже не отрастают, в отличие от депиляции, после которой волосы через некоторое время появляются вновь на тех же местах»; «В современной косметологии применяют несколько методов эпиляции: электроэпиляцию, лазерную эпиляцию, фотоэпиляцию, элос эпиляцию.» | 2026-10-18 | проверен; список методов депиляции в этой статье помечен «источник не указан», поэтому список в тексте держит следующая строка |
| к депиляции относятся бритьё, пинцет, нить и воск | [ru.wikipedia.org/wiki/Депиляция](https://ru.wikipedia.org/wiki/Депиляция) по Дрибноход О. Ю., «Косметика и косметология: от А до Я», гл. 6 «Косметические процедуры в салоне», 2007, с. 261 | «При депиляции используются бритва, выщипывающие механизмы, в том числе электрические выщипывающие машинки, воск, щипцы»; «удаление волосков с помощью пинцета или нити (тридинг)» | 2026-10-18 | проверен; второй источник списка методов |
| часть справочников называет депиляцией только удаление видимой части волоса над кожей — бритьё и кремы | [uk.wikipedia.org/wiki/Депіляція](https://uk.wikipedia.org/wiki/Депіляція) | «термін, яким називають методи видалення волосся, за допомогою яких видаляється тільки видима частина волосини. Депіляцію слід відрізняти від епіляції, при якій здійснюється вплив на корінь волосини.»; «Найбільш поширеним методом депіляції є гоління.»; «Також поширеним методом є використання хімічних засобів (хімічна депіляція), наприклад, шляхом депіляції спеціальними кремами, лосьйонами або піною.» | 2026-10-18 | проверен; расходится с согласованным определением — основание оговорки о терминах |
| часть справочников относит воск и пасту к эпиляции, потому что они удаляют волос вместе с корнем; паста удаляет волосы так же, как воск | [dermnetnz.org/topics/epilation](https://dermnetnz.org/topics/epilation) | «Epilation is the term used to describe removal of body hair, including the hair root, by means of mechanical device, tweezer, or wax.»; «Waxing is the most effective method of epilation»; «Sugaring is similar to waxing but instead of using wax a sugar mixture is used.» | 2026-10-18 | проверен; основание оговорки о терминах |
| электроэпиляция разрушает фолликул и считается постоянным методом; лазер — «permanent hair reduction», а не удаление | FDA, «Removing Hair Safely», `fda.gov/consumers/consumer-updates/removing-hair-safely` | — | 2026-10-18 | кандидат: fda.gov отвечает 404; есть только копия web.archive.org от 2021-07-28 со строкой «Content current as of: 06/30/2010», то есть страница снята первоисточником. Электро- и лазерную эпиляцию в тексте держат строки AAD ниже; «permanent hair reduction» в текст не идёт |
| бритва срезает волос на уровне кожи; результат короткий — бриться приходится каждый день или раз в несколько дней; бритьё безболезненно, если не порезаться | [aad.org — How to remove unwanted hair](https://www.aad.org/public/everyday-care/skin-care-basics/hair/remove-unwanted-hair) | «the razor cuts the hairs at the surface of your skin»; «The results are short-lived, so you may need to shave daily or every few days to maintain your results.»; «Shaving is painless (unless you cut yourself), unlike waxing or laser hair removal.» | 2026-10-18 | проверен |
| крем растворяет волос | там же | «people can dissolve unwanted hair using products called depilatories» | 2026-10-18 | проверен |
| воск выдёргивает волосы; снятие воска может быть болезненным | там же | «You apply wax (hot or cold) to your skin and then quickly remove it, which pulls out the hairs.»; «Removing the wax can be painful.» | 2026-10-18 | проверен |
| нить выдёргивает только лишние волоски и подходит там, где часть волос нужно оставить, например на бровях | там же | «rolling two twisted cotton threads over the unwanted hairs, which rips them out»; «Since threading removes only the unwanted hair, it’s an option for areas, such as your eyebrows, where you want to keep some hair.» | 2026-10-18 | проверен |
| луч лазера поглощается пигментом волоса и со временем разрушает фолликул; нужна серия процедур; на светлых, седых и рыжих волосах лазер не работает | там же | «The laser emits a beam of light, which the pigment (color) in your hair absorbs. Over time, this can destroy the hair follicle, so the hair cannot grow back.»; «While it takes about 6 treatments from a dermatologist to destroy a follicle»; «Laser hair removal won’t work on blonde, white, gray, or red hair» | 2026-10-18 | проверен |
| электроэпиляция пропускает через фолликул ток и повреждает его, волос больше не растёт; действует и на светлые волосы; может удалить волосы навсегда, но нужно несколько сеансов; при обработке каждого волоса — жгучее покалывание | там же | «This method sends an electrical current through a hair follicle, which will damage the follicle and prevent hair from growing. Because hair grows in cycles, it takes several sessions to get permanent hair removal.»; «It works on all hair types, including light-colored hairs, which lasers cannot remove.»; «Electrolysis can permanently remove unwanted hair.»; «each time a hair is treated, you feel a stinging sensation» | 2026-10-18 | проверен |
| лазерные импульсы — тёплые уколы или щелчок резинки по коже; после курса волос нет месяцами или годами, отросшие — реже, тоньше и светлее; для поддержания иногда нужны дополнительные процедуры | [aad.org — Laser hair removal: FAQs](https://www.aad.org/public/cosmetic/hair-removal/laser-hair-removal-faqs) | «Many patients say that the laser pulses feel like warm pinpricks or a rubber band being snapped against the skin.»; «To remove the hair, most patients need 2 to 6 laser treatments.»; «most patients do not see any hair on the treated skin for several months or even years. When the hair regrows, there tends to be less of it. The hairs also tend to be finer and lighter in color.»; «To keep the area free of hair, a patient may need maintenance laser treatments.» | 2026-10-18 | проверен |
| фотоэпиляция направляет на фолликул световые импульсы, волос выпадает и перестаёт расти; на светлых волосах, как правило, не действует | [dermnetnz.org/topics/intense-pulsed-light-therapy](https://dermnetnz.org/topics/intense-pulsed-light-therapy) | «Light pulses targeted at the hair follicle causing the hair to fall out and prevent further growth. Generally ineffective for light coloured hair.» | 2026-10-18 | проверен |
| после воска новые волосы обычно появляются через 3–4 недели, результат держится до шести недель; после сахарной пасты — примерно столько же | [healthline.com — How Long Does Waxing Actually Last?](https://www.healthline.com/health/beauty-skin-care/how-long-does-waxing-last) | «results from waxing can last up to 6 weeks. You’ll probably start to see new hair growth around 3 to 4 weeks.»; «Sugaring will likely last the same length as waxing — up to 6 weeks, with new hair growth around 3 to 4 weeks.» | 2026-10-18 | проверен; адрес из плана `/health/how-long-does-waxing-last` отвечает 404, статья живёт под `/health/beauty-skin-care/` |

### Practice claims

| Утверждение статьи | Источник в репозитории |
|---|---|
| студия делает депиляцию воском и сахарной пастой, женщинам и мужчинам | `src/data/prices.json` группы `womenDepilation`, `combos`, `menDepilation`, `menCombos` (подпись категории «Віск / Цукор»); текст категории `src/content/services/<lang>/depilation.md`, абзац 2 |
| у мужчин есть зоны триммером или бритвой | прайс, группы `menTrimmer`, `menTrimmerCombos` («Тример / Бритва»); текст категории, абзац 1 |
| эпиляции в студии нет — ни лазерной, ни электро-, ни фото- | прайс: из 14 групп ни одна не содержит эпиляции (замер 2026-10-18, `grep -ci 'laser\|лазер\|епіляц\|эпиляц' src/data/prices.json` → 0); текст категории и «Про нас» называют только воск и пасту |
| паста — Epilax разной плотности | `studio-practice.md` §Sugaring, 1 |
| паста снимает волос по направлению роста, поэтому вросших волос меньше; некоторые клиенты переносят её легче, чем воск | `studio-practice.md` §Sugaring, 7, нейтральная форма — §From answer to page text |
| повторный визит на пасту — через 3–4 недели | `studio-practice.md` §Sugaring, 4 |

Срока повторного визита на воск Лада не называла, поэтому про воск статья говорит только общим утверждением со строкой §Sources — «зазвичай», без слов «у нас».
