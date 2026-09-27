# Contract: опубликованный текст и заголовочная часть

Проверяется по собранному `dist/` (ADR-012). Эталоны — литералы в `tests/support/site.ts`.

## Единое название (FR-001, FR-019)

```
builtPages (18 файлов) + public/llms.txt:
  текст и <head> не содержат /майстерн|мастерск|workshop/i
```

«майстер», «майстри», «мастер» — допустимы (человек, а не заведение).

## Заголовок окна (FR-012)

```
allPages (15):
  title ~ /^.+ — Lada N$/
  title.length <= 70
  каждое выражение карты запросов страницы находится в title
```

## Описание (FR-013)

```
allPages (15):
  120 <= description.length <= 160           # прежнее правило page-head.md
  пара (title, description) уникальна         # прежнее правило
  основное выражение карты: индекс совпадения < description.length / 2
  каждое выражение карты находится в description
```

## Главный заголовок (FR-014, FR-015)

```
allPages (15): ровно один h1; каждое выражение карты находится в тексте h1
главная: h1 = [.display "Lada N"] + [.hero__sub "<строка первого экрана>"]; отдельного p.hero__sub нет
главная, первый экран: множество запрошенных файлов шрифтов = множеству до пакета
```

## Текст категории (FR-016)

```
categoryPages (12):
  первый <p> в [data-service-copy] содержит каждое выражение карты
  слов в [data-service-copy] >= 400; тексты локали не повторяют друг друга   # прежнее правило
depilation (3): [data-service-copy] ~ /шугаринг|sugaring/i
massage (3):    [data-service-copy] содержит <a href="<главная локали>#about">
```

## Обращение «Про нас» (FR-003, FR-004)

```
homePages (3):
  #about [data-about-copy]: 150 <= слов <= 250
  #about содержит подпись: signatureName и signatureRole локали, вне [data-about-copy]
  #about h2 = heading обращения
```

## Машиночитаемое описание (FR-017, FR-018)

```
homePages (3): HealthAndBeautyBusiness.founder
  @type = Person; name = имя локали; jobTitle = роль локали
  image = второй элемент HealthAndBeautyBusiness.image
  alumniOf.@type = CollegeOrUniversity
  alumniOf.name = "Національний університет фізичного виховання і спорту України"
  alumniOf.sameAs = "https://uni-sport.edu.ua/"
```

Форма узла — [data-model.md](../data-model.md) §Основательница.

## Карта запросов

Первое выражение — основное. `Ки(їв|єв)` покрывает «Київ, Києва, Києві»; `Киев` — «Киев, Киева, Киеве».

| Страница | uk | ru | en |
|---|---|---|---|
| главная | `студі[яї] масажу та краси`, `Ки(їв\|єв)` | `студи[яи] массажа и красоты`, `Киев` | `massage and beauty studio`, `Kyiv` |
| massage | `масаж`, `Ки(їв\|єв)` | `массаж`, `Киев` | `massage`, `Kyiv` |
| depilation | `депіляці`, `шугаринг`, `Ки(їв\|єв)` | `депиляци`, `шугаринг`, `Киев` | `waxing`, `sugaring`, `Kyiv` |
| permanent | `перманентн\S* макіяж`, `Ки(їв\|єв)` | `перманентн\S* макияж`, `Киев` | `permanent makeup`, `Kyiv` |
| beauty | `ламінуванн`, `макіяж`, `Ки(їв\|єв)` | `ламинировани`, `макияж`, `Киев` | `lamination`, `makeup`, `Kyiv` |

Все выражения — без учёта регистра.
