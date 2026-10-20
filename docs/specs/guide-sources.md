# Knowledge base sources

- **Maintainer:** —
- **Related ADRs:** [ADR-029](../adr/adr-029-knowledge-base-collection-links-from-seo-map.md)
- **Code:** `src/content/guide/`

## Purpose

Откуда взято каждое утверждение опубликованной статьи базы знаний: общее — из какого внешнего источника и какой цитатой, о практике студии — из какого места репозитория. Виды утверждений — [content-model.md](content-model.md) §Claim kinds; на странице этих таблиц нет.

## Contract

- Строка `Sources`: утверждение как оно стоит в тексте, адрес страницы, открытой при проверке, дословная цитата на её языке, дата проверки, статус `проверен` или `кандидат`. Адрес без цитаты не отличает прочитанный источник от найденного поиском.
- Кандидат — источник, найденный, но не открытый: утверждение с кандидатом в текст не попадает. Если источник не нашёлся, утверждение убирают из текста.
- Строка `Practice claims`: утверждение статьи и место в репозитории, откуда оно взято.
- Утверждение в таблице повторяет текст статьи. Правка формулировки в статье правит и строку, а цитата должна по-прежнему её подтверждать.
- Раздел на страницу — `## <page>` из `docs/seo/map.md` §Pages с подразделами `### Sources` и `### Practice claims`; версии на двух языках — один раздел, утверждения пишутся по-русски. Новая статья дописывает свой раздел (список «Новая статья» в [routes.md](routes.md)).
- Каждая страница открыта `curl -sL`; цитата сверена с текстом страницы без разметки (`grep -F`).
- Рекомендация, которую источник даёт для соседней техники — мікроблейдинга вместо пудровых бровей, татуировки вместо перманента, — в тексте называет эту технику. Без оговорки читатель принимает её за правило для своей процедуры.

## depilation-vs-epilation

**Термины** (замер 2026-10-18). Деление «депиляция не разрушает фолликул, эпиляция разрушает» совпадает с русской Википедией. Украинская Википедия называет депиляцией только удаление видимой части волоса, а англоязычная терминология относит воск и пасту к epilation. Поэтому статья говорит, что держится этого деления на своей странице, и одной фразой называет другое. Без оговорки фраза «эпиляцию мы не делаем» читалась бы ложной для читателя англоязычного источника.

### Sources

| Утверждение | Источник | Цитата | Проверено | Статус |
|---|---|---|---|---|
| эпиляция разрушает волосяной фолликул, после депиляции волосы отрастают снова; лазерная, электро- и фотоэпиляция — методы эпиляции | [ru.wikipedia.org/wiki/Эпиляция](https://ru.wikipedia.org/wiki/Эпиляция) | «искусственное удаление волос (от фр. épiler — удалять волосы) посредством разрушения волосяных луковиц тем или иным способом»; «Удалённые при эпиляции волосы заново уже не отрастают, в отличие от депиляции, после которой волосы через некоторое время появляются вновь на тех же местах»; «В современной косметологии применяют несколько методов эпиляции: электроэпиляцию, лазерную эпиляцию, фотоэпиляцию, элос эпиляцию.» | 2026-10-18 | проверен; список методов депиляции в этой статье помечен «источник не указан», поэтому список в тексте держит следующая строка |
| к депиляции относятся бритьё, пинцет, нить и воск | [ru.wikipedia.org/wiki/Депиляция](https://ru.wikipedia.org/wiki/Депиляция) по Дрибноход О. Ю., «Косметика и косметология: от А до Я», гл. 6 «Косметические процедуры в салоне», 2007, с. 261 | «При депиляции используются бритва, выщипывающие механизмы, в том числе электрические выщипывающие машинки, воск, щипцы»; «удаление волосков с помощью пинцета или нити (тридинг)» | 2026-10-18 | проверен; второй источник списка методов |
| часть справочников называет депиляцией только удаление видимой части волоса над кожей — бритьё и кремы | [uk.wikipedia.org/wiki/Депіляція](https://uk.wikipedia.org/wiki/Депіляція) | «термін, яким називають методи видалення волосся, за допомогою яких видаляється тільки видима частина волосини. Депіляцію слід відрізняти від епіляції, при якій здійснюється вплив на корінь волосини.»; «Найбільш поширеним методом депіляції є гоління.»; «Також поширеним методом є використання хімічних засобів (хімічна депіляція), наприклад, шляхом депіляції спеціальними кремами, лосьйонами або піною.» | 2026-10-18 | проверен; основание оговорки о терминах |
| часть справочников относит воск и пасту к эпиляции, потому что они удаляют волос вместе с корнем; паста удаляет волосы так же, как воск | [dermnetnz.org/topics/epilation](https://dermnetnz.org/topics/epilation) | «Epilation is the term used to describe removal of body hair, including the hair root, by means of mechanical device, tweezer, or wax.»; «Waxing is the most effective method of epilation»; «Sugaring is similar to waxing but instead of using wax a sugar mixture is used.» | 2026-10-18 | проверен; основание оговорки о терминах |
| электроэпиляция разрушает фолликул и считается постоянным методом; лазер — «permanent hair reduction», а не удаление | FDA, «Removing Hair Safely», `fda.gov/consumers/consumer-updates/removing-hair-safely` | — | 2026-10-18 | кандидат: fda.gov отвечает 404; есть только копия web.archive.org от 2021-07-28 со строкой «Content current as of: 06/30/2010», то есть страница снята первоисточником. Электро- и лазерную эпиляцию в тексте держат строки AAD ниже; «permanent hair reduction» в текст не идёт |
| бритва срезает волос на уровне кожи; результат короткий — бриться приходится каждый день или раз в несколько дней; бритьё безболезненно, если не порезаться | [aad.org — How to remove unwanted hair](https://www.aad.org/public/everyday-care/skin-care-basics/hair/remove-unwanted-hair) | «the razor cuts the hairs at the surface of your skin»; «The results are short-lived, so you may need to shave daily or every few days to maintain your results.»; «Shaving is painless (unless you cut yourself), unlike waxing or laser hair removal.» | 2026-10-18 | проверен |
| крем растворяет волос | там же | «people can dissolve unwanted hair using products called depilatories» | 2026-10-18 | проверен |
| воск выдёргивает волосы; снятие воска бывает ощутимым | там же | «You apply wax (hot or cold) to your skin and then quickly remove it, which pulls out the hairs.»; «Removing the wax can be painful.» | 2026-10-18 | проверен; формулировка смягчена по [voice.md](voice.md) §Contract (2026-10-18), цитата её подтверждает |
| нить выдёргивает только лишние волоски и подходит там, где часть волос нужно оставить, например на бровях | там же | «rolling two twisted cotton threads over the unwanted hairs, which rips them out»; «Since threading removes only the unwanted hair, it’s an option for areas, such as your eyebrows, where you want to keep some hair.» | 2026-10-18 | проверен |
| луч лазера поглощается пигментом волоса и со временем разрушает фолликул; нужна серия процедур; на светлых, седых и рыжих волосах лазер не работает | там же | «The laser emits a beam of light, which the pigment (color) in your hair absorbs. Over time, this can destroy the hair follicle, so the hair cannot grow back.»; «While it takes about 6 treatments from a dermatologist to destroy a follicle»; «Laser hair removal won’t work on blonde, white, gray, or red hair» | 2026-10-18 | проверен |
| электроэпиляция пропускает через фолликул ток и повреждает его, волос больше не растёт; действует и на светлые волосы; может удалить волосы навсегда, но нужно несколько сеансов; при обработке каждого волоса — жгучее покалывание | там же | «This method sends an electrical current through a hair follicle, which will damage the follicle and prevent hair from growing. Because hair grows in cycles, it takes several sessions to get permanent hair removal.»; «It works on all hair types, including light-colored hairs, which lasers cannot remove.»; «Electrolysis can permanently remove unwanted hair.»; «each time a hair is treated, you feel a stinging sensation» | 2026-10-18 | проверен |
| лазерные импульсы — тёплые уколы или щелчок резинки по коже; после курса волос нет месяцами или годами, отросшие — реже, тоньше и светлее; для поддержания иногда нужны дополнительные процедуры | [aad.org — Laser hair removal: FAQs](https://www.aad.org/public/cosmetic/hair-removal/laser-hair-removal-faqs) | «Many patients say that the laser pulses feel like warm pinpricks or a rubber band being snapped against the skin.»; «To remove the hair, most patients need 2 to 6 laser treatments.»; «most patients do not see any hair on the treated skin for several months or even years. When the hair regrows, there tends to be less of it. The hairs also tend to be finer and lighter in color.»; «To keep the area free of hair, a patient may need maintenance laser treatments.» | 2026-10-18 | проверен |
| фотоэпиляция направляет на фолликул световые импульсы, волос выпадает и перестаёт расти; на светлых волосах, как правило, не действует | [dermnetnz.org/topics/intense-pulsed-light-therapy](https://dermnetnz.org/topics/intense-pulsed-light-therapy) | «Light pulses targeted at the hair follicle causing the hair to fall out and prevent further growth. Generally ineffective for light coloured hair.» | 2026-10-18 | проверен |
| после воска новые волосы обычно появляются через 3–4 недели, результат держится до шести недель; после сахарной пасты — примерно столько же | [healthline.com — How Long Does Waxing Actually Last?](https://www.healthline.com/health/beauty-skin-care/how-long-does-waxing-last) | «results from waxing can last up to 6 weeks. You’ll probably start to see new hair growth around 3 to 4 weeks.»; «Sugaring will likely last the same length as waxing — up to 6 weeks, with new hair growth around 3 to 4 weeks.» | 2026-10-18 | проверен |

### Practice claims

| Утверждение статьи | Источник в репозитории |
|---|---|
| студия делает депиляцию воском и сахарной пастой, женщинам и мужчинам | `src/data/prices.json` группы `womenDepilation`, `combos`, `menDepilation`, `menCombos` (подпись категории «Віск / Цукор»); текст категории `src/content/services/<lang>/depilation.md`, абзац 2 |
| у мужчин есть зоны, которые студия обрабатывает триммером или бритвой | прайс, группы `menTrimmer`, `menTrimmerCombos` («Тример / Бритва»); текст категории, абзац 1 |
| эпиляцию — лазерную, электро- или фотоэпиляцию — студия не делает | прайс: из 14 групп ни одна не содержит эпиляции (замер 2026-10-18, `grep -ci 'laser\|лазер\|епіляц\|эпиляц' src/data/prices.json` → 0); текст категории и «Про нас» называют только воск и пасту |
| паста — Epilax разной плотности | `studio-practice.md` §Sugaring, 1 |
| паста снимает волос по направлению роста, поэтому вросших волос меньше; некоторые клиенты переносят её легче, чем воск | `studio-practice.md` §Sugaring, 7, нейтральная форма — §From answer to page text |
| повторный визит на пасту — через 3–4 недели | `studio-practice.md` §Sugaring, 4 |

Срока повторного визита на воск Лада не называла, поэтому о воске статья говорит только общим утверждением со строкой §Sources — «зазвичай», без слов «у нас».

## permanent-how-long

Сроки для бровей в источниках — о мікроблейдинге; о пудровых бровях нашёлся только обзор Marwah 2021 (держатся дольше) и страница клиники, которая в текст не идёт. Поэтому статья называет технику у каждой цифры, а срок пудровых бровей берёт у Лады.

### Sources

| Утверждение | Источник | Цитата | Проверено | Статус |
|---|---|---|---|---|
| перманентный макияж — разновидность татуировки: игла вводит пигмент в кожу | [fda.gov — Tattoos, Temporary Tattoos & Permanent Makeup](https://www.fda.gov/cosmetics/cosmetic-products/tattoos-temporary-tattoos-permanent-makeup) | «Permanent makeup is a type of tattoo. A needle inserts colored ink into your skin to look like eyeliner, lip liner, eyebrows, or other makeup.» | 2026-10-21 | проверен |
| пигмент не смывается, но с годами светлеет, потому что клетки кожи обновляются; работу освежают | [my.clevelandclinic.org — Micropigmentation](https://my.clevelandclinic.org/health/treatments/11004-micropigmentation) | «Although the ink never washes off, it fades over time because skin cells are constantly replaced.»; «As the pigment fades over the years, you also may have to undergo additional treatments to maintain the look.» | 2026-10-21 | проверен |
| цвет перманента открыт солнцу, со временем часто бледнеет и требует подновления | [EADV — Tattoo and permanent make-up](https://eadv.org/wp-content/uploads/2026/05/EADV-Leaflet-TF-Tattoo-Permanent-Make-Up.pdf) | «PMU colors are exposed to sunlight and often fade with time. So, this will need touching up.» | 2026-10-21 | проверен |
| у мікроблейдинга выцветание зависит от качества пигмента, солнца, типа кожи, средств ухода и лекарств | [en.wikipedia.org/wiki/Microblading](https://en.wikipedia.org/wiki/Microblading) | «Like all tattoos, microblading can fade, depending on multiple factors, including the quality of pigment used, UV exposure, skin type, elements found in skincare products, and/or medications.» | 2026-10-21 | проверен |
| жирной и комбинированной коже коррекции нужны чаще (мікроблейдинг) | [healthline.com — How Long Does Microblading Last?](https://www.healthline.com/health/how-long-does-microblading-last) | «This means that oily or combination skin types may need touch-ups more frequently than normal or dry skin types.» | 2026-10-21 | проверен |
| шлифующие лазеры и IPL осветляют пигмент, даже если их делают на расстоянии от него | [PMC7982014 — Marwah 2021, Microblading and the Science Behind It](https://pmc.ncbi.nlm.nih.gov/articles/PMC7982014/) | «Resurfacing lasers and IPLs will also fade the pigment even if done at a distance from the pigment.» | 2026-10-21 | проверен |
| мікроблейдинг держится от шести месяцев до года (AAD) | [aad.org — Alopecia areata: treatment](https://www.aad.org/public/diseases/hair-loss/types/alopecia/treatment) | «Microblading lasts about 6 months to a year, so it’s not permanent like a tattoo.» | 2026-10-21 | проверен |
| мікроблейдинг — 12–18 месяцев; пудровые брови держатся дольше, потому что их делают аппаратом, а не вручную | PMC7982014, там же | «The results are semi-permanent and last only 12-18 months.»; «Ombre brows or micro-shading: When micropigmentation is used to create fine dots that give the appearance of powdered eyebrows and not hair strokes. This pigment lasts longer compared to microblading as it is motorized and not manual.» | 2026-10-21 | проверен |
| мікроблейдинг — 18–30 месяцев в зависимости от кожи, образа жизни и коррекций | healthline.com — How Long Does Microblading Last?, там же | «Generally, results can last from 18 to 30 months depending on your skin type, lifestyle, and how often you get touch-ups.» | 2026-10-21 | проверен |
| пигмент, введённый слишком глубоко, может уйти за контур, и линия расплывается | [fda.gov — Tattoos & Permanent Makeup: Fact Sheet](https://www.fda.gov/cosmetics/cosmetic-products/tattoos-permanent-makeup-fact-sheet) | «if the tattooist injects the pigments too deeply into the skin, the pigments may migrate beyond the original sites, resulting in a blurred appearance.» | 2026-10-21 | проверен |
| перманент губ держится около двух лет, у каждого по-своему; солнце и курение ускоряют выцветание | [health.clevelandclinic.org — Lip Blushing](https://health.clevelandclinic.org/lip-blushing) | «Some estimates say lip blushing can last about two years, but results can vary from person to person. Sun exposure and smoking can speed up how quickly your color fades.» | 2026-10-21 | проверен |
| перманент губ — полуперманентная процедура, её повторяют раз в несколько лет; частое отшелушивание губ ускоряет выцветание | [healthline.com — Lip Blushing](https://www.healthline.com/health/lip-blushing) | «Lip blushing is considered a semipermanent procedure. This means you’ll need to repeat the process every few years to maintain your results.»; «Frequent lip exfoliation, sun exposure, and smoking can all make the pigment fade quicker.» | 2026-10-21 | проверен |
| после полного заживления мікроблейдинга — солнцезащитный крем и широкие очки, чтобы пигмент не бледнел слишком быстро | [healthline.com — Microblading](https://www.healthline.com/health/microblading); healthline.com — How Long Does Microblading Last?, там же | «After your skin is fully healed, you’ll want to protect your microblading investment by taking care of your skin. Applying a sunscreen to the microbladed area may help prevent fading.»; «Ilyas advises people to use wide sunglasses and sunscreens to keep the pigment from fading too quickly.» | 2026-10-21 | проверен |
| средства с ретинолом и кислотами при мікроблейдинге убирают из ухода | healthline.com — Microblading, там же | «If you choose to microblade your eyebrows, you may want to stop using the following in your skin care routine:», в списке — «retinol», «acids» | 2026-10-21 | проверен |

### Practice claims

| Утверждение статьи | Источник в репозитории |
|---|---|
| брови студия делает только в пудровой технике | `studio-practice.md` §Brow permanent makeup, 1 |
| поверхностная работа держится 2–3 года, более глубокая, как татуаж, — дольше; на жирной коже мастер работает глубже, потому что пигмент уходит быстрее; глубину выбирают вместе с мастером | `studio-practice.md` §Brow permanent makeup, 5, перевод — §From answer to page text |
| губы — акварельная и помадная техника, держатся одинаково, разница в результате | текст категории `src/content/services/uk/permanent.md` §Губи; прайс, группа `permanentLips` |
| коррекция через 28–60 дней на бровях, губах и межресничке | прайс: `permanent-brows-touch-up`, `permanent-lips-touch-up`, `permanent-eyeliner-touch-up` («Корекція (28-60 днів)») |
| настоящий оттенок виден примерно через месяц, поэтому коррекцию раньше не назначают | текст категории §Перші дні після процедури |
| на коррекции бровей мастер смотрит заживление, выравнивает цвет и форму, заполняет пробелы, проверяет симметрию | `studio-practice.md` §Brow permanent makeup, 4 |
| позже работу можно обновлять, не делая заново; обновление в первые 6 месяцев — отдельная позиция прайса | текст категории §Корекція та оновлення; `permanentNote` в `src/i18n/ui.ts` |
| светлый или выгоревший старый перманент перекрывают; тёмный, синий или глубокий сначала удаляют лазером | `studio-practice.md` §Brow permanent makeup, 6 |
