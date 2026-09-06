#!/usr/bin/env node
/**
 * Разовый перенос прайса из `src/components/PriceList.tsx` в `src/data/prices.json` (Step 2.2).
 *
 * Названия и описания берутся из действующего словаря механически по тем же ключам, по которым
 * их берёт компонент: 73 позиции × 3 локали — это 219 строк, и ручной перенос ошибётся в одной
 * из них незаметно. Руками задана только структура — идентификатор, группа и цена, — потому что
 * структуры в старом коде нет: она размазана по семи массивам внутри компонента.
 *
 * Скрипт одноразовый и уходит вместе с `translations.ts` в Step 7.3. До тех пор он —
 * проверяемая запись того, откуда взялась каждая строка прайса.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'src/i18n/translations.ts');
const COMPONENT = resolve(ROOT, 'src/components/PriceList.tsx');
const TARGET = resolve(ROOT, 'src/data/prices.json');

const LOCALES = ['uk', 'ru', 'en'];
const SOURCE_LOCALE = { uk: 'ua', ru: 'ru', en: 'en' };

function loadTranslations() {
  const source = readFileSync(SOURCE, 'utf8');
  const open = source.indexOf('{', source.indexOf('export const translations = '));
  const end = source.indexOf('} as const;', open);
  return new Function(`return (${source.slice(open, end + 1)});`)();
}

const translations = loadTranslations();

/** Значение по пути вида `beauty.browShaping` внутри `priceList` конкретной локали. */
function lookup(locale, path) {
  const value = path
    .split('.')
    .reduce((node, key) => (node === undefined ? undefined : node[key]), translations[SOURCE_LOCALE[locale]].priceList);
  if (typeof value !== 'string') throw new Error(`нет строки по пути priceList.${path} в локали ${locale}`);
  return value;
}

function translate(path, transform = (text) => text) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, transform(lookup(locale, path))]));
}

const minutes = (...pairs) => ({
  kind: 'variants',
  unit: 'minutes',
  variants: pairs.map(([count, amount]) => ({ count, amount })),
});
const sessions = (...pairs) => ({
  kind: 'variants',
  unit: 'sessions',
  variants: pairs.map(([count, amount]) => ({ count, amount })),
});
const fixed = (amount) => ({ kind: 'fixed', amount });

/**
 * Долевая цена. Действующий код хранит для неё сумму 0 и подменяет её строкой «50%»
 * при отображении (`PriceList.tsx:325`); подпись при этом вписана и в название позиции.
 * В новой модели доля — это доля, а название теряет хвост «50%», который её дублировал.
 */
const share = (percent) => ({
  kind: 'share',
  percent,
  note: Object.fromEntries(LOCALES.map((locale) => [locale, `${percent}%`])),
});

const stripSharePercent = (text) => text.replace(/\s*50%$/, '');

/**
 * Позиции в порядке отображения. `key` — путь в словаре, `id` строится от группы:
 * перекрытие старого перманента и коррекция повторяются между тремя группами перманента
 * с разными ценами, и идентификатор от названия схлопнул бы их в одну позицию.
 */
const ITEMS = [
  // --- fullBodyMassage -------------------------------------------------------------------
  { id: 'full-body-massage-harmony', group: 'fullBodyMassage', key: 'bodyMassage.harmony.name', desc: 'bodyMassage.harmony.desc', price: minutes([60, 1600], [90, 2300], [120, 2800]) },
  { id: 'full-body-massage-classic', group: 'fullBodyMassage', key: 'bodyMassage.classic.name', desc: 'bodyMassage.classic.desc', price: minutes([60, 1800], [90, 2500], [120, 2900]) },
  { id: 'full-body-massage-signature', group: 'fullBodyMassage', key: 'bodyMassage.signature.name', desc: 'bodyMassage.signature.desc', price: minutes([60, 2500], [90, 2900], [120, 5000]) },
  { id: 'full-body-massage-sports', group: 'fullBodyMassage', key: 'bodyMassage.sports.name', desc: 'bodyMassage.sports.desc', price: minutes([60, 1900], [90, 2300], [120, 2800]) },
  { id: 'full-body-massage-four-hands', group: 'fullBodyMassage', key: 'bodyMassage.fourHands.name', desc: 'bodyMassage.fourHands.desc', price: minutes([60, 3800], [90, 4900], [120, 5900]) },

  // --- localMassage ----------------------------------------------------------------------
  { id: 'local-massage-neck', group: 'localMassage', key: 'localMassage.neck', price: minutes([45, 900], [60, 1200]) },
  { id: 'local-massage-back', group: 'localMassage', key: 'localMassage.back', price: minutes([60, 1100], [90, 1500]) },
  { id: 'local-massage-face', group: 'localMassage', key: 'localMassage.face', price: minutes([60, 850]) },
  { id: 'local-massage-head', group: 'localMassage', key: 'localMassage.head', price: minutes([30, 800], [45, 1200]) },
  { id: 'local-massage-feet', group: 'localMassage', key: 'localMassage.feet', price: minutes([30, 900], [45, 1200], [60, 1400]) },
  { id: 'local-massage-hands', group: 'localMassage', key: 'localMassage.hands', price: minutes([30, 700], [45, 900]) },

  // --- exotic ----------------------------------------------------------------------------
  { id: 'exotic-guasha', group: 'exotic', key: 'exotic.guasha.name', desc: 'exotic.guasha.desc', price: minutes([60, 2500], [90, 2900], [120, 3500]) },
  { id: 'exotic-coconut', group: 'exotic', key: 'exotic.coconut.name', desc: 'exotic.coconut.desc', price: minutes([60, 2100], [90, 2500], [120, 2900]) },
  { id: 'exotic-anti-cellulite', group: 'exotic', key: 'exotic.antiCellulite.name', desc: 'exotic.antiCellulite.desc', price: sessions([1, 950], [5, 4500], [10, 8500]) },
  { id: 'exotic-cupping', group: 'exotic', key: 'exotic.cupping.name', price: minutes([60, 2500], [90, 2900], [120, 3800]) },
  { id: 'exotic-acupressure', group: 'exotic', key: 'exotic.acupressure.name', price: minutes([60, 2100], [90, 2400], [120, 2800]) },
  { id: 'exotic-yumeiho', group: 'exotic', key: 'exotic.yumeiho.name', desc: 'exotic.yumeiho.desc', price: minutes([60, 2500], [90, 2900], [120, 5000]) },
  { id: 'exotic-honey', group: 'exotic', key: 'exotic.honey.name', price: minutes([60, 2500], [90, 2900], [120, 3900]) },
  { id: 'exotic-chocolate', group: 'exotic', key: 'exotic.chocolate.name', price: minutes([60, 2800], [90, 3200], [120, 3900]) },
  { id: 'exotic-abhyanga', group: 'exotic', key: 'exotic.abhyanga.name', desc: 'exotic.abhyanga.desc', price: minutes([60, 1800], [90, 2300], [120, 2800]) },
  { id: 'exotic-shirodhara', group: 'exotic', key: 'exotic.shirodhara.name', desc: 'exotic.shirodhara.desc', price: minutes([60, 1900], [90, 2400], [120, 2900]) },
  { id: 'exotic-lymphatic', group: 'exotic', key: 'exotic.lymphatic.name', desc: 'exotic.lymphatic.desc', price: minutes([60, 1800], [90, 2200], [120, 2800]) },
  { id: 'exotic-stone', group: 'exotic', key: 'exotic.stone.name', desc: 'exotic.stone.desc', price: minutes([60, 2500], [90, 2800], [120, 3500]) },

  // --- womenDepilation -------------------------------------------------------------------
  { id: 'women-depilation-deep-bikini', group: 'womenDepilation', key: 'depilation.deepBikini', price: fixed(850) },
  { id: 'women-depilation-classic-bikini', group: 'womenDepilation', key: 'depilation.classicBikini', price: fixed(750) },
  { id: 'women-depilation-underarms', group: 'womenDepilation', key: 'depilation.underarms', price: fixed(400) },
  { id: 'women-depilation-legs-to-knee', group: 'womenDepilation', key: 'depilation.legsToKnee', price: fixed(650) },
  { id: 'women-depilation-legs-full', group: 'womenDepilation', key: 'depilation.legsFull', price: fixed(850) },
  { id: 'women-depilation-arms-to-elbow', group: 'womenDepilation', key: 'depilation.armsToElbow', price: fixed(450) },
  { id: 'women-depilation-arms-full', group: 'womenDepilation', key: 'depilation.armsFull', price: fixed(650) },
  { id: 'women-depilation-buttocks', group: 'womenDepilation', key: 'depilation.buttocks', price: fixed(550) },
  { id: 'women-depilation-belly', group: 'womenDepilation', key: 'depilation.belly', price: fixed(500) },
  { id: 'women-depilation-back', group: 'womenDepilation', key: 'depilation.back', price: fixed(650) },
  { id: 'women-depilation-upper-lip', group: 'womenDepilation', key: 'depilation.upperLip', price: fixed(200) },

  // --- combos ----------------------------------------------------------------------------
  { id: 'combos-deep-bikini-underarms', group: 'combos', key: 'depilationCombos.deepBikiniUnderarms', price: fixed(1000) },
  { id: 'combos-classic-bikini-underarms', group: 'combos', key: 'depilationCombos.classicBikiniUnderarms', price: fixed(900) },
  { id: 'combos-legs-knee-deep-underarms', group: 'combos', key: 'depilationCombos.legsKneeDeepUnderarms', price: fixed(1500) },
  { id: 'combos-legs-full-deep-underarms', group: 'combos', key: 'depilationCombos.legsFullDeepUnderarms', price: fixed(1800) },

  // --- menDepilation ---------------------------------------------------------------------
  { id: 'men-depilation-deep-bikini', group: 'menDepilation', key: 'maleDepilation.deepBikini', price: fixed(1100) },
  { id: 'men-depilation-classic-bikini', group: 'menDepilation', key: 'maleDepilation.classicBikini', price: fixed(950) },
  { id: 'men-depilation-underarms', group: 'menDepilation', key: 'maleDepilation.underarms', price: fixed(450) },
  { id: 'men-depilation-full-back', group: 'menDepilation', key: 'maleDepilation.fullBack', price: fixed(850) },
  { id: 'men-depilation-shoulder-blades', group: 'menDepilation', key: 'maleDepilation.shoulderBlades', price: fixed(550) },
  { id: 'men-depilation-shoulders', group: 'menDepilation', key: 'maleDepilation.shoulders', price: fixed(600) },
  { id: 'men-depilation-lower-back', group: 'menDepilation', key: 'maleDepilation.lowerBack', price: fixed(650) },
  { id: 'men-depilation-full-belly', group: 'menDepilation', key: 'maleDepilation.fullBelly', price: fixed(750) },
  { id: 'men-depilation-belly-strip', group: 'menDepilation', key: 'maleDepilation.bellyStrip', price: fixed(250) },
  { id: 'men-depilation-intergluteal-strip', group: 'menDepilation', key: 'maleDepilation.interglutealStrip', price: fixed(500) },
  { id: 'men-depilation-full-buttocks', group: 'menDepilation', key: 'maleDepilation.fullButtocks', price: fixed(750) },
  { id: 'men-depilation-full-chest', group: 'menDepilation', key: 'maleDepilation.fullChest', price: fixed(800) },
  { id: 'men-depilation-arms-to-elbow', group: 'menDepilation', key: 'maleDepilation.armsToElbow', price: fixed(650) },
  { id: 'men-depilation-arms-full', group: 'menDepilation', key: 'maleDepilation.armsFull', price: fixed(750) },
  { id: 'men-depilation-legs-to-knee', group: 'menDepilation', key: 'maleDepilation.legsToKnee', price: fixed(800) },
  { id: 'men-depilation-legs-full', group: 'menDepilation', key: 'maleDepilation.legsFull', price: fixed(1200) },
  { id: 'men-depilation-face-zones', group: 'menDepilation', key: 'maleDepilation.faceZones', price: fixed(200) },
  { id: 'men-depilation-neck', group: 'menDepilation', key: 'maleDepilation.neck', price: fixed(250) },

  // --- browsLashes -----------------------------------------------------------------------
  { id: 'brows-lashes-brow-shaping', group: 'browsLashes', key: 'beauty.browShaping', price: fixed(350) },
  { id: 'brows-lashes-brow-tinting', group: 'browsLashes', key: 'beauty.browTinting', price: fixed(650) },
  { id: 'brows-lashes-brow-lamination', group: 'browsLashes', key: 'beauty.browLamination', price: fixed(750) },
  { id: 'brows-lashes-lash-lamination', group: 'browsLashes', key: 'beauty.lashLamination', price: fixed(650) },

  // --- makeupHair ------------------------------------------------------------------------
  { id: 'makeup-hair-any-makeup', group: 'makeupHair', key: 'beauty.anyMakeup', price: fixed(1000) },
  { id: 'makeup-hair-hair-styling', group: 'makeupHair', key: 'beauty.hairStyling', price: fixed(1000) },
  { id: 'makeup-hair-mobile-service', group: 'makeupHair', key: 'beauty.mobileService', price: fixed(1000) },

  // --- permanentBrows --------------------------------------------------------------------
  { id: 'permanent-brows-powder', group: 'permanentBrows', key: 'beauty.powderBrows', price: fixed(2500) },
  { id: 'permanent-brows-coverup', group: 'permanentBrows', key: 'beauty.oldPmuCoverup', price: fixed(2800) },
  { id: 'permanent-brows-touch-up', group: 'permanentBrows', key: 'beauty.touchUp50', name: stripSharePercent, price: share(50) },

  // --- permanentLips ---------------------------------------------------------------------
  { id: 'permanent-lips-aquarelle', group: 'permanentLips', key: 'beauty.aquarelleLips', price: fixed(2500) },
  { id: 'permanent-lips-lipstick', group: 'permanentLips', key: 'beauty.lipstickTechnique', price: fixed(2500) },
  { id: 'permanent-lips-coverup', group: 'permanentLips', key: 'beauty.oldPmuCoverup', price: fixed(2800) },
  { id: 'permanent-lips-touch-up', group: 'permanentLips', key: 'beauty.touchUp50', name: stripSharePercent, price: share(50) },

  // --- permanentEyeliner -----------------------------------------------------------------
  { id: 'permanent-eyeliner-lash-line', group: 'permanentEyeliner', key: 'beauty.eyeliner', price: fixed(1900) },
  { id: 'permanent-eyeliner-coverup', group: 'permanentEyeliner', key: 'beauty.oldPmuCoverup', price: fixed(2200) },
  { id: 'permanent-eyeliner-touch-up', group: 'permanentEyeliner', key: 'beauty.touchUp50', name: stripSharePercent, price: share(50) },
];

/** Число позиций в старом компоненте — сверяется прямо по нему, а не по памяти автора. */
const LEGACY_COUNT = (readFileSync(COMPONENT, 'utf8').match(/name: t\.priceList\./g) || []).length;

const prices = ITEMS.map((item) => {
  const entry = { id: item.id, group: item.group, name: translate(item.key, item.name) };
  if (item.desc) {
    const description = translate(item.desc);
    // Четыре экзотических массажа несут пустое описание во всех локалях; пустая строка —
    // не перевод, поэтому поле опускается целиком, а не заполняется пустотой.
    if (LOCALES.every((locale) => description[locale].trim())) entry.description = description;
  }
  entry.price = item.price;
  return entry;
});

const failures = [];
if (prices.length !== LEGACY_COUNT) failures.push(`позиций ${prices.length}, в PriceList.tsx ${LEGACY_COUNT}`);

const ids = new Set(prices.map((p) => p.id));
if (ids.size !== prices.length) failures.push('идентификаторы не уникальны');

for (const price of prices) {
  for (const locale of LOCALES) {
    if (!price.name[locale]?.trim()) failures.push(`${price.id}: пустое название в ${locale}`);
  }
  const value = price.price;
  if (value.kind === 'fixed' && !(Number.isInteger(value.amount) && value.amount > 0)) {
    failures.push(`${price.id}: сумма не целое положительное`);
  }
  if (value.kind === 'variants') {
    if (value.variants.length === 0) failures.push(`${price.id}: пустой набор вариантов`);
    const counts = new Set(value.variants.map((v) => v.count));
    if (counts.size !== value.variants.length) failures.push(`${price.id}: повторяющийся count`);
    for (const variant of value.variants) {
      if (!(Number.isInteger(variant.count) && variant.count > 0)) failures.push(`${price.id}: count не целое положительное`);
      if (!(Number.isInteger(variant.amount) && variant.amount > 0)) failures.push(`${price.id}: сумма варианта не целое положительное`);
    }
  }
  if (value.kind === 'share' && !(Number.isInteger(value.percent) && value.percent >= 1 && value.percent <= 99)) {
    failures.push(`${price.id}: доля вне диапазона 1–99`);
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exit(1);
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, `${JSON.stringify(prices, null, 2)}\n`, 'utf8');

const byGroup = prices.reduce((acc, p) => ({ ...acc, [p.group]: (acc[p.group] ?? 0) + 1 }), {});
process.stdout.write(`${prices.length} позиций (в PriceList.tsx ${LEGACY_COUNT})\n`);
for (const [group, count] of Object.entries(byGroup)) process.stdout.write(`  ${group}: ${count}\n`);
