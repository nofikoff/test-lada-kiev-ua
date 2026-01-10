import { useState } from 'react';
import { useLanguage } from '../i18n';

type TabId = 'bodyMassage' | 'exotic' | 'depilation' | 'beauty';

interface PriceItem {
  name: string;
  description?: string;
  prices: { duration: string; price: number }[];
}


export function PriceList() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('bodyMassage');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'bodyMassage', label: t.priceList.tabs.bodyMassage },
    { id: 'exotic', label: t.priceList.tabs.exotic },
    { id: 'depilation', label: t.priceList.tabs.depilation },
    { id: 'beauty', label: t.priceList.tabs.beauty },
  ];

  const bodyMassageData: PriceItem[] = [
    {
      name: t.priceList.bodyMassage.harmony.name,
      description: t.priceList.bodyMassage.harmony.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1600 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: t.priceList.bodyMassage.classic.name,
      description: t.priceList.bodyMassage.classic.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2500 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: t.priceList.bodyMassage.signature.name,
      description: t.priceList.bodyMassage.signature.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 5000 },
      ],
    },
    {
      name: t.priceList.bodyMassage.sports.name,
      description: t.priceList.bodyMassage.sports.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1900 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: t.priceList.bodyMassage.fourHands.name,
      description: t.priceList.bodyMassage.fourHands.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 3800 },
        { duration: t.priceList.duration.min90, price: 4900 },
        { duration: t.priceList.duration.min120, price: 5900 },
      ],
    },
  ];

  const localMassageData: PriceItem[] = [
    {
      name: t.priceList.localMassage.neck,
      prices: [
        { duration: t.priceList.duration.min45, price: 900 },
        { duration: t.priceList.duration.min60, price: 1200 },
      ],
    },
    {
      name: t.priceList.localMassage.back,
      prices: [
        { duration: t.priceList.duration.min60, price: 1100 },
        { duration: t.priceList.duration.min90, price: 1500 },
      ],
    },
    {
      name: t.priceList.localMassage.face,
      prices: [{ duration: t.priceList.duration.min60, price: 850 }],
    },
    {
      name: t.priceList.localMassage.head,
      prices: [
        { duration: t.priceList.duration.min30, price: 800 },
        { duration: t.priceList.duration.min45, price: 1200 },
      ],
    },
    {
      name: t.priceList.localMassage.feet,
      prices: [
        { duration: t.priceList.duration.min30, price: 900 },
        { duration: t.priceList.duration.min45, price: 1200 },
        { duration: t.priceList.duration.min60, price: 1400 },
      ],
    },
    {
      name: t.priceList.localMassage.hands,
      prices: [
        { duration: t.priceList.duration.min30, price: 700 },
        { duration: t.priceList.duration.min45, price: 900 },
      ],
    },
  ];

  const exoticData: PriceItem[] = [
    {
      name: t.priceList.exotic.guasha.name,
      description: t.priceList.exotic.guasha.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3500 },
      ],
    },
    {
      name: t.priceList.exotic.coconut.name,
      description: t.priceList.exotic.coconut.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 2100 },
        { duration: t.priceList.duration.min90, price: 2500 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: t.priceList.exotic.antiCellulite.name,
      description: t.priceList.exotic.antiCellulite.desc,
      prices: [
        { duration: t.priceList.session, price: 950 },
        { duration: t.priceList.sessions5, price: 4500 },
        { duration: t.priceList.sessions10, price: 8500 },
      ],
    },
    {
      name: t.priceList.exotic.cupping.name,
      description: t.priceList.exotic.cupping.desc || undefined,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3800 },
      ],
    },
    {
      name: t.priceList.exotic.acupressure.name,
      description: t.priceList.exotic.acupressure.desc || undefined,
      prices: [
        { duration: t.priceList.duration.min60, price: 2100 },
        { duration: t.priceList.duration.min90, price: 2400 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: t.priceList.exotic.yumeiho.name,
      description: t.priceList.exotic.yumeiho.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 5000 },
      ],
    },
    {
      name: t.priceList.exotic.honey.name,
      description: t.priceList.exotic.honey.desc || undefined,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3900 },
      ],
    },
    {
      name: t.priceList.exotic.chocolate.name,
      description: t.priceList.exotic.chocolate.desc || undefined,
      prices: [
        { duration: t.priceList.duration.min60, price: 2800 },
        { duration: t.priceList.duration.min90, price: 3200 },
        { duration: t.priceList.duration.min120, price: 3900 },
      ],
    },
    {
      name: t.priceList.exotic.abhyanga.name,
      description: t.priceList.exotic.abhyanga.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: t.priceList.exotic.shirodhara.name,
      description: t.priceList.exotic.shirodhara.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1900 },
        { duration: t.priceList.duration.min90, price: 2400 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: t.priceList.exotic.lymphatic.name,
      description: t.priceList.exotic.lymphatic.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2200 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: t.priceList.exotic.stone.name,
      description: t.priceList.exotic.stone.desc,
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2800 },
        { duration: t.priceList.duration.min120, price: 3500 },
      ],
    },
  ];

  const depilationZones: { name: string; price: number }[] = [
    { name: t.priceList.depilation.deepBikini, price: 850 },
    { name: t.priceList.depilation.classicBikini, price: 750 },
    { name: t.priceList.depilation.underarms, price: 400 },
    { name: t.priceList.depilation.legsToKnee, price: 650 },
    { name: t.priceList.depilation.legsFull, price: 850 },
    { name: t.priceList.depilation.armsToElbow, price: 450 },
    { name: t.priceList.depilation.armsFull, price: 650 },
    { name: t.priceList.depilation.buttocks, price: 550 },
    { name: t.priceList.depilation.belly, price: 500 },
    { name: t.priceList.depilation.back, price: 650 },
    { name: t.priceList.depilation.upperLip, price: 200 },
  ];

  const depilationCombos: { name: string; price: number }[] = [
    { name: t.priceList.depilationCombos.deepBikiniUnderarms, price: 1000 },
    { name: t.priceList.depilationCombos.classicBikiniUnderarms, price: 900 },
    { name: t.priceList.depilationCombos.legsKneeDeepUnderarms, price: 1500 },
    { name: t.priceList.depilationCombos.legsFullDeepUnderarms, price: 1800 },
  ];

  const maleDepilationZones: { name: string; price: number }[] = [
    { name: t.priceList.maleDepilation.deepBikini, price: 1100 },
    { name: t.priceList.maleDepilation.classicBikini, price: 950 },
    { name: t.priceList.maleDepilation.underarms, price: 450 },
    { name: t.priceList.maleDepilation.fullBack, price: 850 },
    { name: t.priceList.maleDepilation.shoulderBlades, price: 550 },
    { name: t.priceList.maleDepilation.shoulders, price: 600 },
    { name: t.priceList.maleDepilation.lowerBack, price: 650 },
    { name: t.priceList.maleDepilation.fullBelly, price: 750 },
    { name: t.priceList.maleDepilation.bellyStrip, price: 250 },
    { name: t.priceList.maleDepilation.interglutealStrip, price: 500 },
    { name: t.priceList.maleDepilation.fullButtocks, price: 750 },
    { name: t.priceList.maleDepilation.fullChest, price: 800 },
    { name: t.priceList.maleDepilation.armsToElbow, price: 650 },
    { name: t.priceList.maleDepilation.armsFull, price: 750 },
    { name: t.priceList.maleDepilation.legsToKnee, price: 800 },
    { name: t.priceList.maleDepilation.legsFull, price: 1200 },
    { name: t.priceList.maleDepilation.faceZones, price: 200 },
    { name: t.priceList.maleDepilation.neck, price: 250 },
  ];

  const beautyData = {
    browsLashes: [
      { name: t.priceList.beauty.browShaping, price: 350 },
      { name: t.priceList.beauty.browTinting, price: 650 },
      { name: t.priceList.beauty.browLamination, price: 750 },
      { name: t.priceList.beauty.lashLamination, price: 650 },
    ],
    makeup: [
      { name: t.priceList.beauty.anyMakeup, price: 1000 },
      { name: t.priceList.beauty.hairStyling, price: 1000 },
      { name: t.priceList.beauty.mobileService, price: 1000 },
    ],
    permanentBrows: [
      { name: t.priceList.beauty.powderBrows, price: 2500 },
      { name: t.priceList.beauty.oldPmuCoverup, price: 2800 },
      { name: t.priceList.beauty.touchUp50, price: 0 },
    ],
    permanentLips: [
      { name: t.priceList.beauty.aquarelleLips, price: 2500 },
      { name: t.priceList.beauty.lipstickTechnique, price: 2500 },
      { name: t.priceList.beauty.oldPmuCoverup, price: 2800 },
      { name: t.priceList.beauty.touchUp50, price: 0 },
    ],
    permanentEyeliner: [
      { name: t.priceList.beauty.eyeliner, price: 1900 },
      { name: t.priceList.beauty.oldPmuCoverup, price: 2200 },
      { name: t.priceList.beauty.touchUp50, price: 0 },
    ],
  };

  const renderPriceRow = (item: PriceItem | { name: string; price: number }, index: number) => {
    if ('prices' in item) {
      return (
        <div key={index} className="card mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-white font-medium">{item.name}</h4>
              {item.description && (
                <p className="text-white/50 text-sm mt-1">{item.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {item.prices.map((p, i) => (
                <div key={i} className="bg-lada-darker px-4 py-2 rounded-lg text-center min-w-[100px]">
                  <div className="text-lada-gold font-semibold">{p.price} {t.priceList.currency}</div>
                  <div className="text-white/50 text-xs">{p.duration}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={index} className="flex items-center justify-between py-3 border-b border-lada-gray last:border-0">
        <span className="text-white/80">{item.name}</span>
        <span className="text-lada-gold font-semibold">
          {item.price === 0 ? '50%' : `${item.price} ${t.priceList.currency}`}
        </span>
      </div>
    );
  };

  return (
    <section id="services" className="py-20 md:py-32 bg-lada-darker">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="section-title">{t.priceList.title}</h2>

        <p className="text-center text-lada-gold mb-8">{t.priceList.discount}</p>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-lada-gold text-lada-dark'
                  : 'bg-lada-gray text-white/70 hover:bg-lada-gray-light hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[500px]">
          {activeTab === 'bodyMassage' && (
            <div>
              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.fullBodyMassage}
              </h3>
              {bodyMassageData.map((item, i) => renderPriceRow(item, i))}

              <h3 className="text-xl font-serif text-lada-gold mb-6 mt-12">
                {t.priceList.sections.localMassage}
              </h3>
              {localMassageData.map((item, i) => renderPriceRow(item, i))}
            </div>
          )}

          {activeTab === 'exotic' && (
            <div>
              {exoticData.map((item, i) => renderPriceRow(item, i))}
            </div>
          )}

          {activeTab === 'depilation' && (
            <div>
              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.womenDepilation}
              </h3>
              <div className="card mb-8">
                {depilationZones.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.combos}
              </h3>
              <div className="card mb-8">
                {depilationCombos.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.menDepilation}
              </h3>
              <div className="card">
                {maleDepilationZones.map((item, i) => renderPriceRow(item, i))}
              </div>
            </div>
          )}

          {activeTab === 'beauty' && (
            <div>
              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.browsLashes}
              </h3>
              <div className="card mb-8">
                {beautyData.browsLashes.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.makeupHair}
              </h3>
              <div className="card mb-8">
                {beautyData.makeup.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.permanentBrows}
              </h3>
              <div className="card mb-8">
                {beautyData.permanentBrows.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.permanentLips}
              </h3>
              <div className="card mb-8">
                {beautyData.permanentLips.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {t.priceList.sections.permanentEyeliner}
              </h3>
              <div className="card mb-4">
                {beautyData.permanentEyeliner.map((item, i) => renderPriceRow(item, i))}
              </div>

              <p className="text-white/50 text-sm text-center">
                {t.priceList.sections.permanentNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
