import { useState } from 'react';
import { useLanguage } from '../i18n';

type TabId = 'bodyMassage' | 'exotic' | 'depilation' | 'beauty';

interface PriceItem {
  name: string;
  description?: string;
  prices: { duration: string; price: number }[];
}


export function PriceList() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('bodyMassage');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'bodyMassage', label: t.priceList.tabs.bodyMassage },
    { id: 'exotic', label: t.priceList.tabs.exotic },
    { id: 'depilation', label: t.priceList.tabs.depilation },
    { id: 'beauty', label: t.priceList.tabs.beauty },
  ];

  const bodyMassageData: PriceItem[] = [
    {
      name: language === 'en' ? 'Harmony Massage (Relax)' : language === 'ua' ? 'Масаж Гармонія (Relax)' : 'Массаж Гармония (Relax)',
      description: language === 'en' ? 'Stress relief, emotional balance' : language === 'ua' ? 'Зняття втоми, емоційний баланс' : 'Снятие усталости, эмоциональный баланс',
      prices: [
        { duration: t.priceList.duration.min60, price: 1600 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: language === 'en' ? 'Classic Therapeutic' : language === 'ua' ? 'Класичний оздоровчий' : 'Классический оздоровительный',
      description: language === 'en' ? 'Improves circulation, relaxes muscles' : language === 'ua' ? 'Покращує кровообіг, розслаблює м\'язи' : 'Улучшает кровообращение, расслабляет мышцы',
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2500 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: language === 'en' ? 'Signature Massage (Exclusive)' : language === 'ua' ? 'Авторський масаж (Exclusive)' : 'Авторский массаж (Exclusive)',
      description: language === 'en' ? 'Unique techniques for your body, deep work' : language === 'ua' ? 'Унікальні методики під ваше тіло, глибоке опрацювання' : 'Уникальные методики под ваше тело, глубокая проработка',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 5000 },
      ],
    },
    {
      name: language === 'en' ? 'Sports Massage' : language === 'ua' ? 'Спортивний' : 'Спортивный',
      description: language === 'en' ? 'Intensive, removes lactic acid' : language === 'ua' ? 'Інтенсивний, виводить молочну кислоту' : 'Интенсивный, выводит молочную кислоту',
      prices: [
        { duration: t.priceList.duration.min60, price: 1900 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: language === 'en' ? 'Four Hands Massage' : language === 'ua' ? 'Масаж у 4 руки' : 'Массаж в 4 руки',
      description: language === 'en' ? 'Two therapists synchronously' : language === 'ua' ? 'Два майстри синхронно' : 'Два мастера синхронно',
      prices: [
        { duration: t.priceList.duration.min60, price: 3800 },
        { duration: t.priceList.duration.min90, price: 4900 },
        { duration: t.priceList.duration.min120, price: 5900 },
      ],
    },
  ];

  const localMassageData: PriceItem[] = [
    {
      name: language === 'en' ? 'Neck & Shoulders' : language === 'ua' ? 'Шийно-комірцева зона' : 'Шейно-воротниковая зона',
      prices: [
        { duration: t.priceList.duration.min45, price: 900 },
        { duration: t.priceList.duration.min60, price: 1200 },
      ],
    },
    {
      name: language === 'en' ? 'Back' : language === 'ua' ? 'Спина' : 'Спина',
      prices: [
        { duration: t.priceList.duration.min60, price: 1100 },
        { duration: t.priceList.duration.min90, price: 1500 },
      ],
    },
    {
      name: language === 'en' ? 'Face' : language === 'ua' ? 'Обличчя' : 'Лицо',
      prices: [{ duration: t.priceList.duration.min60, price: 850 }],
    },
    {
      name: language === 'en' ? 'Head' : language === 'ua' ? 'Голова' : 'Голова',
      prices: [
        { duration: t.priceList.duration.min30, price: 800 },
        { duration: t.priceList.duration.min45, price: 1200 },
      ],
    },
    {
      name: language === 'en' ? 'Feet (Padabhyanga)' : language === 'ua' ? 'Стопи (Падабхьянга)' : 'Стопы (Падабхьянга)',
      prices: [
        { duration: t.priceList.duration.min30, price: 900 },
        { duration: t.priceList.duration.min45, price: 1200 },
        { duration: t.priceList.duration.min60, price: 1400 },
      ],
    },
    {
      name: language === 'en' ? 'Hands' : language === 'ua' ? 'Руки' : 'Руки',
      prices: [
        { duration: t.priceList.duration.min30, price: 700 },
        { duration: t.priceList.duration.min45, price: 900 },
      ],
    },
  ];

  const exoticData: PriceItem[] = [
    {
      name: language === 'en' ? 'Gua Sha' : language === 'ua' ? 'Гуаша' : 'Гуаша',
      description: language === 'en' ? 'Chinese scraping technique' : language === 'ua' ? 'Китайська техніка скребками' : 'Китайская техника скребками',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3500 },
      ],
    },
    {
      name: language === 'en' ? 'Coconut Shells' : language === 'ua' ? 'Кокосовими чашами' : 'Кокосовыми чашами',
      description: language === 'en' ? 'Relaxation with warm shells' : language === 'ua' ? 'Релакс теплими чашами' : 'Релакс теплыми чашами',
      prices: [
        { duration: t.priceList.duration.min60, price: 2100 },
        { duration: t.priceList.duration.min90, price: 2500 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: language === 'en' ? 'Anti-cellulite (legs & belly)' : language === 'ua' ? 'Антицелюлітний (ноги і живіт)' : 'Антицеллюлитный (ноги и живот)',
      description: language === 'en' ? 'Manual + gua sha + bamboo' : language === 'ua' ? 'Ручна техніка + гуаша + бамбук' : 'Ручная техника + гуаша + бамбук',
      prices: [
        { duration: t.priceList.session, price: 950 },
        { duration: t.priceList.sessions5, price: 4500 },
        { duration: t.priceList.sessions10, price: 8500 },
      ],
    },
    {
      name: language === 'en' ? 'Cupping + Stone Therapy' : language === 'ua' ? 'Баночний + Стоун терапія' : 'Баночный + Стоун терапия',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3800 },
      ],
    },
    {
      name: language === 'en' ? 'Acupressure' : language === 'ua' ? 'Точковий масаж' : 'Точечный массаж',
      prices: [
        { duration: t.priceList.duration.min60, price: 2100 },
        { duration: t.priceList.duration.min90, price: 2400 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: language === 'en' ? 'Yumeiho Therapy' : language === 'ua' ? 'Юмейхо-терапія' : 'Юмейхо-терапия',
      description: language === 'en' ? 'Pelvis/spine correction' : language === 'ua' ? 'Правка тазу/хребта' : 'Правка таза/позвоночника',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 5000 },
      ],
    },
    {
      name: language === 'en' ? 'Tibetan Honey' : language === 'ua' ? 'Тибетський медовий' : 'Тибетский медовый',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2900 },
        { duration: t.priceList.duration.min120, price: 3900 },
      ],
    },
    {
      name: language === 'en' ? 'Chocolate' : language === 'ua' ? 'Шоколадний' : 'Шоколадный',
      prices: [
        { duration: t.priceList.duration.min60, price: 2800 },
        { duration: t.priceList.duration.min90, price: 3200 },
        { duration: t.priceList.duration.min120, price: 3900 },
      ],
    },
    {
      name: language === 'en' ? 'Ayurvedic Abhyanga' : language === 'ua' ? 'Аюрведичний Абх\'янга' : 'Аюрведический Абхьянга',
      description: language === 'en' ? 'Warm oils' : language === 'ua' ? 'Теплі олії' : 'Теплые масла',
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2300 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: language === 'en' ? 'Shirodhara' : language === 'ua' ? 'Широдхара' : 'Широдхара',
      description: language === 'en' ? 'Oil pouring' : language === 'ua' ? 'Проливання олії' : 'Проливание масла',
      prices: [
        { duration: t.priceList.duration.min60, price: 1900 },
        { duration: t.priceList.duration.min90, price: 2400 },
        { duration: t.priceList.duration.min120, price: 2900 },
      ],
    },
    {
      name: language === 'en' ? 'Lymphatic Drainage' : language === 'ua' ? 'Лімфодренажний' : 'Лимфодренажный',
      description: language === 'en' ? 'Bamboo whisk' : language === 'ua' ? 'Бамбуковий віник' : 'Бамбуковый веник',
      prices: [
        { duration: t.priceList.duration.min60, price: 1800 },
        { duration: t.priceList.duration.min90, price: 2200 },
        { duration: t.priceList.duration.min120, price: 2800 },
      ],
    },
    {
      name: language === 'en' ? 'Stone Therapy' : language === 'ua' ? 'Стоун терапія' : 'Стоун терапия',
      description: language === 'en' ? 'Hot stones' : language === 'ua' ? 'Гарячі камені' : 'Горячие камни',
      prices: [
        { duration: t.priceList.duration.min60, price: 2500 },
        { duration: t.priceList.duration.min90, price: 2800 },
        { duration: t.priceList.duration.min120, price: 3500 },
      ],
    },
  ];

  const depilationZones: { name: string; price: number }[] = [
    { name: language === 'en' ? 'Deep Bikini' : language === 'ua' ? 'Глибоке бікіні' : 'Глубокое бикини', price: 850 },
    { name: language === 'en' ? 'Classic Bikini' : language === 'ua' ? 'Класичне бікіні' : 'Классическое бикини', price: 750 },
    { name: language === 'en' ? 'Underarms' : language === 'ua' ? 'Пахви' : 'Подмышки', price: 400 },
    { name: language === 'en' ? 'Legs (to knee)' : language === 'ua' ? 'Ноги до коліна' : 'Ноги до колена', price: 650 },
    { name: language === 'en' ? 'Legs (full)' : language === 'ua' ? 'Ноги повністю' : 'Ноги полностью', price: 850 },
    { name: language === 'en' ? 'Arms (to elbow)' : language === 'ua' ? 'Руки до ліктя' : 'Руки до локтя', price: 450 },
    { name: language === 'en' ? 'Arms (full)' : language === 'ua' ? 'Руки повністю' : 'Руки полностью', price: 650 },
    { name: language === 'en' ? 'Buttocks' : language === 'ua' ? 'Сідниці' : 'Ягодицы', price: 550 },
    { name: language === 'en' ? 'Belly' : language === 'ua' ? 'Живіт' : 'Живот', price: 500 },
    { name: language === 'en' ? 'Back' : language === 'ua' ? 'Спина' : 'Спина', price: 650 },
    { name: language === 'en' ? 'Upper lip / Brows / Nose' : language === 'ua' ? 'Вусики / Брови / Ніс' : 'Усики / Брови / Нос', price: 200 },
  ];

  const depilationCombos: { name: string; price: number }[] = [
    { name: language === 'en' ? 'Deep Bikini + Underarms' : language === 'ua' ? 'Глибоке бікіні + Пахви' : 'Глубокое бикини + Подмышки', price: 1000 },
    { name: language === 'en' ? 'Classic Bikini + Underarms' : language === 'ua' ? 'Класичне бікіні + Пахви' : 'Классическое бикини + Подмышки', price: 900 },
    { name: language === 'en' ? 'Legs (to knee) + Deep Bikini + Underarms' : language === 'ua' ? 'Ноги до коліна + Глибоке бікіні + Пахви' : 'Ноги до колена + Глубокое бикини + Подмышки', price: 1500 },
    { name: language === 'en' ? 'Legs (full) + Deep Bikini + Underarms' : language === 'ua' ? 'Ноги повністю + Глибоке бікіні + Пахви' : 'Ноги полностью + Глубокое бикини + Подмышки', price: 1800 },
  ];

  const maleDepilationZones: { name: string; price: number }[] = [
    { name: language === 'en' ? 'Deep Bikini' : language === 'ua' ? 'Глибоке бікіні' : 'Глубокое бикини', price: 1100 },
    { name: language === 'en' ? 'Classic Bikini' : language === 'ua' ? 'Класичне бікіні' : 'Классическое бикини', price: 950 },
    { name: language === 'en' ? 'Underarms' : language === 'ua' ? 'Пахви' : 'Подмышки', price: 450 },
    { name: language === 'en' ? 'Full Back' : language === 'ua' ? 'Спина повністю' : 'Спина полностью', price: 850 },
    { name: language === 'en' ? 'Shoulder Blades' : language === 'ua' ? 'Лопатки' : 'Лопатки', price: 550 },
    { name: language === 'en' ? 'Shoulders' : language === 'ua' ? 'Плечі' : 'Плечи', price: 600 },
    { name: language === 'en' ? 'Lower Back' : language === 'ua' ? 'Поперек' : 'Поясница', price: 650 },
    { name: language === 'en' ? 'Full Belly' : language === 'ua' ? 'Живіт повністю' : 'Живот полностью', price: 750 },
    { name: language === 'en' ? 'Belly Strip' : language === 'ua' ? 'Смужка на животі' : 'Полоска на животе', price: 250 },
    { name: language === 'en' ? 'Intergluteal Strip' : language === 'ua' ? 'Міжсіднична смужка' : 'Межъягодичная полоска', price: 500 },
    { name: language === 'en' ? 'Full Buttocks' : language === 'ua' ? 'Сідниці повністю' : 'Ягодицы полностью', price: 750 },
    { name: language === 'en' ? 'Full Chest' : language === 'ua' ? 'Груди повністю' : 'Грудь полностью', price: 800 },
    { name: language === 'en' ? 'Arms to Elbow' : language === 'ua' ? 'Руки до ліктя' : 'Руки до локтя', price: 650 },
    { name: language === 'en' ? 'Full Arms' : language === 'ua' ? 'Руки повністю' : 'Руки полностью', price: 750 },
    { name: language === 'en' ? 'Legs to Knee' : language === 'ua' ? 'Ноги до коліна' : 'Ноги до колена', price: 800 },
    { name: language === 'en' ? 'Full Legs' : language === 'ua' ? 'Ноги повністю' : 'Ноги полностью', price: 1200 },
    { name: language === 'en' ? 'Ears / Nose / Brows / Cheeks / Areolas' : language === 'ua' ? 'Вуха / Ніс / Брови / Щоки / Ореоли' : 'Уши / Нос / Брови / Щёки / Ореолы', price: 200 },
    { name: language === 'en' ? 'Neck' : language === 'ua' ? 'Шия' : 'Шея', price: 250 },
  ];

  const beautyData = {
    browsLashes: [
      { name: language === 'en' ? 'Brow shaping' : language === 'ua' ? 'Корекція брів' : 'Коррекция бровей', price: 350 },
      { name: language === 'en' ? 'Brow tinting + shaping' : language === 'ua' ? 'Фарбування + корекція' : 'Окрашивание + коррекция', price: 650 },
      { name: language === 'en' ? 'Brow lamination InLei (+tint +shape)' : language === 'ua' ? 'Ламінування брів InLei (+фарбування +корекція)' : 'Ламинирование бровей InLei (+окрашивание +коррекция)', price: 750 },
      { name: language === 'en' ? 'Lash lamination InLei (+tint +botox)' : language === 'ua' ? 'Ламінування вій InLei (+фарбування +ботокс)' : 'Ламинирование ресниц InLei (+окрашивание +ботокс)', price: 650 },
    ],
    makeup: [
      { name: language === 'en' ? 'Any makeup' : language === 'ua' ? 'Будь-який макіяж' : 'Любой макияж', price: 1000 },
      { name: language === 'en' ? 'Hair styling' : language === 'ua' ? 'Зачіски, локони, укладки' : 'Стрижки, локоны, укладки', price: 1000 },
      { name: language === 'en' ? 'Mobile service' : language === 'ua' ? 'Виїзд майстра' : 'Выезд мастера', price: 1000 },
    ],
    permanentBrows: [
      { name: language === 'en' ? 'Powder brows' : language === 'ua' ? 'Пудрові бровки' : 'Пудровые брови', price: 2500 },
      { name: language === 'en' ? 'Old PMU cover-up / refresh / correction' : language === 'ua' ? 'Перекриття старого перманенту, оновлення, виправлення' : 'Перекрытие старого перманента, обновление, исправление', price: 2800 },
      { name: language === 'en' ? 'Touch-up (28-60 days) 50%' : language === 'ua' ? 'Корекція (28-60 днів) 50%' : 'Коррекция (28-60 дней) 50%', price: 0 },
    ],
    permanentLips: [
      { name: language === 'en' ? 'Aquarelle technique' : language === 'ua' ? 'Акварельна техніка губ' : 'Акварельная техника губ', price: 2500 },
      { name: language === 'en' ? 'Lipstick technique' : language === 'ua' ? 'Помадна техніка' : 'Помадная техника', price: 2500 },
      { name: language === 'en' ? 'Old PMU cover-up / refresh / correction' : language === 'ua' ? 'Перекриття старого перманенту, оновлення, виправлення' : 'Перекрытие старого перманента, обновление, исправление', price: 2800 },
      { name: language === 'en' ? 'Touch-up (28-60 days) 50%' : language === 'ua' ? 'Корекція (28-60 днів) 50%' : 'Коррекция (28-60 дней) 50%', price: 0 },
    ],
    permanentEyeliner: [
      { name: language === 'en' ? 'Eyeliner / Lash line' : language === 'ua' ? 'Міжвійковий простір' : 'Межресничное пространство', price: 1900 },
      { name: language === 'en' ? 'Old PMU cover-up / refresh / correction' : language === 'ua' ? 'Перекриття старого перманенту, оновлення, виправлення' : 'Перекрытие старого перманента, обновление, исправление', price: 2200 },
      { name: language === 'en' ? 'Touch-up (28-60 days) 50%' : language === 'ua' ? 'Корекція (28-60 днів) 50%' : 'Коррекция (28-60 дней) 50%', price: 0 },
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
                {language === 'en' ? 'Full Body Massage' : language === 'ua' ? 'Основні масажі тіла' : 'Основные массажи тела'}
              </h3>
              {bodyMassageData.map((item, i) => renderPriceRow(item, i))}

              <h3 className="text-xl font-serif text-lada-gold mb-6 mt-12">
                {language === 'en' ? 'Local Massage' : language === 'ua' ? 'Локальні масажі' : 'Локальные массажи'}
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
                {language === 'en' ? 'Women\'s Hair Removal' : language === 'ua' ? 'Жіноча депіляція' : 'Женская депиляция'}
              </h3>
              <div className="card mb-8">
                {depilationZones.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Combos (Save!)' : language === 'ua' ? 'Комплекси (Вигідно!)' : 'Комплексы (Выгодно!)'}
              </h3>
              <div className="card mb-8">
                {depilationCombos.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Men\'s Hair Removal (Wax / Sugar / Razor / Trim)' : language === 'ua' ? 'Чоловіча депіляція (Віск / Цукор / Бритва / Стрижка)' : 'Мужская депиляция (Воск / Сахар / Бритва / Стрижка)'}
              </h3>
              <div className="card">
                {maleDepilationZones.map((item, i) => renderPriceRow(item, i))}
              </div>
            </div>
          )}

          {activeTab === 'beauty' && (
            <div>
              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Brows & Lashes' : language === 'ua' ? 'Брови та Вії' : 'Брови и Ресницы'}
              </h3>
              <div className="card mb-8">
                {beautyData.browsLashes.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Makeup & Hair' : language === 'ua' ? 'Макіяж та Зачіски' : 'Макияж и Прически'}
              </h3>
              <div className="card mb-8">
                {beautyData.makeup.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Permanent Makeup — Brows' : language === 'ua' ? 'Перманентний макіяж — Брови' : 'Перманентный макияж — Брови'}
              </h3>
              <div className="card mb-8">
                {beautyData.permanentBrows.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Permanent Makeup — Lips' : language === 'ua' ? 'Перманентний макіяж — Губи' : 'Перманентный макияж — Губы'}
              </h3>
              <div className="card mb-8">
                {beautyData.permanentLips.map((item, i) => renderPriceRow(item, i))}
              </div>

              <h3 className="text-xl font-serif text-lada-gold mb-6">
                {language === 'en' ? 'Permanent Makeup — Eyeliner' : language === 'ua' ? 'Перманентний макіяж — Стрілка/Міжвійка' : 'Перманентный макияж — Стрелка/Межресничка'}
              </h3>
              <div className="card mb-4">
                {beautyData.permanentEyeliner.map((item, i) => renderPriceRow(item, i))}
              </div>

              <p className="text-white/50 text-sm text-center">
                {language === 'en' ? '* Refresh up to 6 months — 80% of original price' : language === 'ua' ? '* Оновлення до 6 місяців — 80% від вартості' : '* Обновление до 6 месяцев — 80% от стоимости'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
