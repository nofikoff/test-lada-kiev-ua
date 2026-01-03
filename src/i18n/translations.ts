export type Language = 'ru' | 'ua' | 'en';

export const translations = {
  ru: {
    nav: {
      about: 'О нас',
      services: 'Услуги и Цены',
      certificates: 'Сертификаты',
      contacts: 'Контакты',
    },
    hero: {
      title: 'Lada N',
      subtitle: 'Мастерская массажа и красоты',
      description: 'Место восстановления и красоты в самом сердце Киева. Удобно добраться из любой точки города — мы находимся прямо на Майдане Незалежности.',
      cta: 'Позвонить',
    },
    about: {
      title: 'О нас',
      heading: 'Тишина в сердце мегаполиса',
      text1: 'Мы создали пространство абсолютного релакса там, где бьется пульс Киева — на Майдане Незалежности.',
      text2: 'Lada N — это не просто массажный кабинет, это мастерская восстановления вашей энергии. Здесь время замедляется.',
      text3: 'Мы объединили глубокие техники массажа, эстетику тела и профессиональный уход, чтобы вы могли поставить городскую суету на паузу.',
      text4: 'Ваше тело скажет вам «спасибо».',
    },
    services: {
      title: 'Наши услуги',
      massage: {
        name: 'Массаж',
        description: 'Ручные и экзотические техники',
      },
      depilation: {
        name: 'Депиляция',
        description: 'Воск / Сахар',
      },
      permanent: {
        name: 'Перманентный макияж',
        description: 'Брови, губы, межресничка',
      },
      makeup: {
        name: 'Make-up',
        description: 'Брови / Ресницы / Макияж',
      },
    },
    priceList: {
      title: 'Услуги и Цены',
      discount: 'При покупке абонемента на 10 сеансов — скидка 10%',
      tabs: {
        bodyMassage: 'Массаж тела',
        exotic: 'Экзотические',
        depilation: 'Депиляция',
        beauty: 'Бьюти',
      },
      duration: {
        min30: '30 мин',
        min45: '45 мин',
        min60: '60 мин',
        min90: '90 мин',
        min120: '120 мин',
      },
      currency: 'грн',
      session: 'сеанс',
      sessions5: '5 сеансов',
      sessions10: '10 сеансов',
    },
    certificates: {
      title: 'Подарочные сертификаты',
      text: 'Подарите близким заботу и отдых. В наличии подарочные сертификаты на любую сумму или услугу.',
      cta: 'Заказать сертификат',
    },
    footer: {
      address: 'Киев, ул. Малая Житомирская 10',
      landmark: '(Майдан Незалежности)',
      schedule: 'Ежедневно 10:00 - 21:00',
      rights: 'Все права защищены',
    },
  },
  ua: {
    nav: {
      about: 'Про нас',
      services: 'Послуги та Ціни',
      certificates: 'Сертифікати',
      contacts: 'Контакти',
    },
    hero: {
      title: 'Lada N',
      subtitle: 'Майстерня масажу та краси',
      description: 'Місце відновлення та краси в самому серці Києва. Зручно дістатися з будь-якої точки міста — ми знаходимося прямо на Майдані Незалежності.',
      cta: 'Зателефонувати',
    },
    about: {
      title: 'Про нас',
      heading: 'Тиша в серці мегаполісу',
      text1: 'Ми створили простір абсолютного релаксу там, де б\'ється пульс Києва — на Майдані Незалежності.',
      text2: 'Lada N — це не просто масажний кабінет, це майстерня відновлення вашої енергії. Тут час сповільнюється.',
      text3: 'Ми об\'єднали глибокі техніки масажу, естетику тіла та професійний догляд, щоб ви могли поставити міську суєту на паузу.',
      text4: 'Ваше тіло скаже вам «дякую».',
    },
    services: {
      title: 'Наші послуги',
      massage: {
        name: 'Масаж',
        description: 'Ручні та екзотичні техніки',
      },
      depilation: {
        name: 'Депіляція',
        description: 'Віск / Цукор',
      },
      permanent: {
        name: 'Перманентний макіяж',
        description: 'Брови, губи, міжвійкова',
      },
      makeup: {
        name: 'Make-up',
        description: 'Брови / Вії / Макіяж',
      },
    },
    priceList: {
      title: 'Послуги та Ціни',
      discount: 'При купівлі абонемента на 10 сеансів — знижка 10%',
      tabs: {
        bodyMassage: 'Масаж тіла',
        exotic: 'Екзотичні',
        depilation: 'Депіляція',
        beauty: 'Б\'юті',
      },
      duration: {
        min30: '30 хв',
        min45: '45 хв',
        min60: '60 хв',
        min90: '90 хв',
        min120: '120 хв',
      },
      currency: 'грн',
      session: 'сеанс',
      sessions5: '5 сеансів',
      sessions10: '10 сеансів',
    },
    certificates: {
      title: 'Подарункові сертифікати',
      text: 'Подаруйте близьким турботу та відпочинок. В наявності подарункові сертифікати на будь-яку суму або послугу.',
      cta: 'Замовити сертифікат',
    },
    footer: {
      address: 'Київ, вул. Мала Житомирська 10',
      landmark: '(Майдан Незалежності)',
      schedule: 'Щодня 10:00 - 21:00',
      rights: 'Всі права захищено',
    },
  },
  en: {
    nav: {
      about: 'About',
      services: 'Services & Prices',
      certificates: 'Gift Cards',
      contacts: 'Contacts',
    },
    hero: {
      title: 'Lada N',
      subtitle: 'Massage & Beauty Studio',
      description: 'A place of restoration and beauty in the heart of Kyiv. Easy to reach from anywhere in the city — we are located right at Maidan Nezalezhnosti.',
      cta: 'Call Now',
    },
    about: {
      title: 'About Us',
      heading: 'Silence in the Heart of the Metropolis',
      text1: 'We have created a space of absolute relaxation where the pulse of Kyiv beats — at Maidan Nezalezhnosti.',
      text2: 'Lada N is not just a massage parlor, it\'s a workshop for restoring your energy. Here, time slows down.',
      text3: 'We have combined deep massage techniques, body aesthetics, and professional care so you can put the city hustle on pause.',
      text4: 'Your body will thank you.',
    },
    services: {
      title: 'Our Services',
      massage: {
        name: 'Massage',
        description: 'Manual and exotic techniques',
      },
      depilation: {
        name: 'Hair Removal',
        description: 'Wax / Sugar',
      },
      permanent: {
        name: 'Permanent Makeup',
        description: 'Brows, lips, eyeliner',
      },
      makeup: {
        name: 'Make-up',
        description: 'Brows / Lashes / Makeup',
      },
    },
    priceList: {
      title: 'Services & Prices',
      discount: 'Buy 10 sessions subscription — get 10% off',
      tabs: {
        bodyMassage: 'Body Massage',
        exotic: 'Exotic',
        depilation: 'Hair Removal',
        beauty: 'Beauty',
      },
      duration: {
        min30: '30 min',
        min45: '45 min',
        min60: '60 min',
        min90: '90 min',
        min120: '120 min',
      },
      currency: 'UAH',
      session: 'session',
      sessions5: '5 sessions',
      sessions10: '10 sessions',
    },
    certificates: {
      title: 'Gift Certificates',
      text: 'Give your loved ones care and relaxation. Gift certificates available for any amount or service.',
      cta: 'Order Certificate',
    },
    footer: {
      address: 'Kyiv, 10 Mala Zhytomyrska St.',
      landmark: '(Maidan Nezalezhnosti)',
      schedule: 'Daily 10:00 AM - 9:00 PM',
      rights: 'All rights reserved',
    },
  },
} as const;

export type Translations = (typeof translations)[Language];
