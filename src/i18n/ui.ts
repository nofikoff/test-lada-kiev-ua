export const locales = ['uk', 'ru', 'en'] as const;

export type Locale = (typeof locales)[number];

/** Основная локаль: отдаётся на корне без префикса и служит версией по умолчанию. */
export const defaultLocale = 'uk' satisfies Locale;

/**
 * Расширяет строковые литералы `as const` до `string`, сохраняя набор ключей.
 * Ради этого типа словарь и написан на TypeScript, а не в JSON: `ru` и `en` обязаны совпадать
 * с `uk` по ключам, и недостающий ключ — ошибка компиляции, а не пустое место на странице.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

const uk = {
  nav: {
    // Название главной страницы в цепочке навигации — не подпись кнопки возврата: цепочка
    // называет страницу, а не действие (contracts/structured-data.md §Цепочка навигации).
    home: 'Головна',
    breadcrumb: 'Навігаційний ланцюжок',
    about: 'Про нас',
    services: 'Послуги та Ціни',
    certificates: 'Сертифікати',
    contacts: 'Контакти',
    menu: 'Меню',
    language: 'Мова',
    // Надзаголовок первого экрана. Нового факта не вводит: расписание живёт в `footer.schedule`,
    // здесь его сокращённая форма — строка в несколько слов над заголовком.
    hours: 'Щодня 10:00—21:00',
  },
  hero: {
    title: 'Lada N',
    subtitle: 'Майстерня масажу та краси',
    description:
      'Місце відновлення та краси в самому серці Києва. Зручно дістатися з будь-якої точки міста — ми знаходимося прямо на Майдані Незалежності.',
    cta: 'Зателефонувати',
  },
  about: {
    // Надзаголовка своего у секции нет: им стоит `title`, см. `About.astro`.
    title: 'Про нас',
    heading: 'Тиша в серці мегаполісу',
    text1:
      'Ми створили простір абсолютного релаксу там, де б\'ється пульс Києва — на Майдані Незалежності.',
    text2:
      'Lada N — це не просто масажний кабінет, це майстерня відновлення вашої енергії. Тут час сповільнюється.',
    text3:
      'Ми об\'єднали глибокі техніки масажу, естетику тіла та професійний догляд, щоб ви могли поставити міську суєту на паузу.',
    text4: 'Ваше тіло скаже вам «дякую».',
  },
  gallery: {
    eyebrow: 'Студія Лади Новикової',
    title: 'Процес і результат',
    region: 'Фотографії Лади Новикової',
    prev: 'Попереднє фото',
    next: 'Наступне фото',
  },
  services: {
    eyebrow: 'Чотири напрямки',
    title: 'Наші послуги',
    // `tool` — инструмент ремесла на карточке услуги (FR-020). Он заменяет собой круглую
    // подложку под иконкой: карточка называет, чем работают, а не рисует кружок.
    massage: { name: 'Масаж', description: 'Ручні та екзотичні техніки', tool: 'Руки' },
    depilation: { name: 'Депіляція', description: 'Віск / Цукор', tool: 'Віск · Цукор' },
    permanent: {
      name: 'Перманентний макіяж',
      description: 'Брови, губи, міжвійкова',
      tool: 'Пігмент',
    },
    beauty: { name: 'Make-up', description: 'Брови / Вії / Макіяж', tool: 'Пензель' },
  },
  priceList: {
    eyebrow: 'Прайс',
    title: 'Послуги та Ціни',
    discount: 'При купівлі абонемента на 10 сеансів — знижка 10%',
    tabsLabel: 'Розділи прайсу',
    currency: 'грн',
    // Подпись длительности собирается из числа и шаблона: сегодня строка «60 хв» хранится
    // отдельно от числа 60, и рассинхрон между ними ничем не запрещён.
    durationTemplate: '{n} хв',
    sessionOne: 'сеанс',
    sessionsTemplate: '{n} сеансів',
    tabs: {
      bodyMassage: 'Масаж тіла',
      exotic: 'Екзотичні',
      depilation: 'Депіляція',
      beauty: 'Б\'юті',
    },
    sections: {
      fullBodyMassage: 'Основні масажі тіла',
      localMassage: 'Локальні масажі',
      exotic: 'Екзотичні масажі',
      womenDepilation: 'Жіноча депіляція',
      combos: 'Комплекси (Вигідно!)',
      menDepilation: 'Чоловіча депіляція (Віск / Цукор / Бритва / Стрижка)',
      browsLashes: 'Брови та Вії',
      makeupHair: 'Макіяж та Зачіски',
      permanentBrows: 'Перманентний макіяж — Брови',
      permanentLips: 'Перманентний макіяж — Губи',
      permanentEyeliner: 'Перманентний макіяж — Стрілка/Міжвійка',
    },
    permanentNote: '* Оновлення до 6 місяців — 80% від вартості',
  },
  certificates: {
    eyebrow: 'Подарунок',
    title: 'Подарункові сертифікати',
    text: 'Подаруйте близьким турботу та відпочинок. В наявності подарункові сертифікати на будь-яку суму або послугу.',
    cta: 'Замовити сертифікат',
  },
  footer: {
    address: 'Київ, вул. Мала Житомирська 10',
    landmark: '(Майдан Незалежності)',
    schedule: 'Щодня 10:00 - 21:00',
    appointment: 'Обов\'язковий попередній запис',
    rights: 'Всі права захищено',
    // Подписи назначения над блоками контактов (FR-025): сегодня блок опознаётся только
    // по иконке, то есть не опознаётся вовсе там, где иконки не видно.
    labels: {
      address: 'Адреса',
      phone: 'Телефон',
      hours: 'Години',
      instagram: 'Instagram',
    },
  },
  meta: {
    siteName: 'Lada N',
    title: 'Lada N — майстерня масажу та краси на Майдані Незалежності',
    description:
      'Масаж, депіляція, перманентний макіяж і б\'юті-послуги в центрі Києва. Майстерня Lada N на вул. Мала Житомирська 10, щодня з 10:00 до 21:00.',
  },
  error: {
    title: 'Сторінку не знайдено — Lada N',
    heading: 'Сторінку не знайдено',
    text: 'Такої сторінки на сайті немає. Можливо, адреса змінилася або в ній помилка.',
    cta: 'На головну',
  },
} as const;

export type UiDictionary = Widen<typeof uk>;

const ru: UiDictionary = {
  nav: {
    home: 'Главная',
    breadcrumb: 'Навигационная цепочка',
    about: 'О нас',
    services: 'Услуги и Цены',
    certificates: 'Сертификаты',
    contacts: 'Контакты',
    menu: 'Меню',
    language: 'Язык',
    hours: 'Ежедневно 10:00—21:00',
  },
  hero: {
    title: 'Lada N',
    subtitle: 'Мастерская массажа и красоты',
    description:
      'Место восстановления и красоты в самом сердце Киева. Удобно добраться из любой точки города — мы находимся прямо на Майдане Незалежности.',
    cta: 'Позвонить',
  },
  about: {
    title: 'О нас',
    heading: 'Тишина в сердце мегаполиса',
    text1:
      'Мы создали пространство абсолютного релакса там, где бьется пульс Киева — на Майдане Незалежности.',
    text2:
      'Lada N — это не просто массажный кабинет, это мастерская восстановления вашей энергии. Здесь время замедляется.',
    text3:
      'Мы объединили глубокие техники массажа, эстетику тела и профессиональный уход, чтобы вы могли поставить городскую суету на паузу.',
    text4: 'Ваше тело скажет вам «спасибо».',
  },
  gallery: {
    eyebrow: 'Студия Лады Новиковой',
    title: 'Процесс и результат',
    region: 'Фотографии Лады Новиковой',
    prev: 'Предыдущее фото',
    next: 'Следующее фото',
  },
  services: {
    eyebrow: 'Четыре направления',
    title: 'Наши услуги',
    massage: { name: 'Массаж', description: 'Ручные и экзотические техники', tool: 'Руки' },
    depilation: { name: 'Депиляция', description: 'Воск / Сахар', tool: 'Воск · Сахар' },
    permanent: {
      name: 'Перманентный макияж',
      description: 'Брови, губы, межресничка',
      tool: 'Пигмент',
    },
    beauty: { name: 'Make-up', description: 'Брови / Ресницы / Макияж', tool: 'Кисть' },
  },
  priceList: {
    eyebrow: 'Прайс',
    title: 'Услуги и Цены',
    discount: 'При покупке абонемента на 10 сеансов — скидка 10%',
    tabsLabel: 'Разделы прайса',
    currency: 'грн',
    durationTemplate: '{n} мин',
    sessionOne: 'сеанс',
    sessionsTemplate: '{n} сеансов',
    tabs: {
      bodyMassage: 'Массаж тела',
      exotic: 'Экзотические',
      depilation: 'Депиляция',
      beauty: 'Бьюти',
    },
    sections: {
      fullBodyMassage: 'Основные массажи тела',
      localMassage: 'Локальные массажи',
      exotic: 'Экзотические массажи',
      womenDepilation: 'Женская депиляция',
      combos: 'Комплексы (Выгодно!)',
      menDepilation: 'Мужская депиляция (Воск / Сахар / Бритва / Стрижка)',
      browsLashes: 'Брови и Ресницы',
      makeupHair: 'Макияж и Прически',
      permanentBrows: 'Перманентный макияж — Брови',
      permanentLips: 'Перманентный макияж — Губы',
      permanentEyeliner: 'Перманентный макияж — Стрелка/Межресничка',
    },
    permanentNote: '* Обновление до 6 месяцев — 80% от стоимости',
  },
  certificates: {
    eyebrow: 'Подарок',
    title: 'Подарочные сертификаты',
    text: 'Подарите близким заботу и отдых. В наличии подарочные сертификаты на любую сумму или услугу.',
    cta: 'Заказать сертификат',
  },
  footer: {
    address: 'Киев, ул. Малая Житомирская 10',
    landmark: '(Майдан Незалежности)',
    schedule: 'Ежедневно 10:00 - 21:00',
    appointment: 'Обязательна предварительная запись',
    rights: 'Все права защищены',
    labels: {
      address: 'Адрес',
      phone: 'Телефон',
      hours: 'Часы',
      instagram: 'Instagram',
    },
  },
  meta: {
    siteName: 'Lada N',
    title: 'Lada N — мастерская массажа и красоты на Майдане Незалежности',
    description:
      'Массаж, депиляция, перманентный макияж и бьюти-услуги в центре Киева. Мастерская Lada N на ул. Малая Житомирская 10, ежедневно с 10:00 до 21:00.',
  },
  error: {
    title: 'Страница не найдена — Lada N',
    heading: 'Страница не найдена',
    text: 'Такой страницы на сайте нет. Возможно, адрес изменился или в нём опечатка.',
    cta: 'На главную',
  },
};

const en: UiDictionary = {
  nav: {
    home: 'Home',
    breadcrumb: 'Breadcrumb',
    about: 'About',
    services: 'Services & Prices',
    certificates: 'Gift Cards',
    contacts: 'Contacts',
    menu: 'Menu',
    language: 'Language',
    // Двенадцатичасовая форма, как и в `footer.schedule` этой локали: расхождение форматов
    // внутри одного языка читалось бы как разное расписание.
    hours: 'Daily 10 AM—9 PM',
  },
  hero: {
    title: 'Lada N',
    subtitle: 'Massage & Beauty Studio',
    description:
      'A place of restoration and beauty in the heart of Kyiv. Easy to reach from anywhere in the city — we are located right at Maidan Nezalezhnosti.',
    cta: 'Call Now',
  },
  about: {
    title: 'About Us',
    heading: 'Silence in the Heart of the Metropolis',
    text1:
      'We have created a space of absolute relaxation where the pulse of Kyiv beats — at Maidan Nezalezhnosti.',
    text2:
      'Lada N is not just a massage parlor, it\'s a workshop for restoring your energy. Here, time slows down.',
    text3:
      'We have combined deep massage techniques, body aesthetics, and professional care so you can put the city hustle on pause.',
    text4: 'Your body will thank you.',
  },
  gallery: {
    eyebrow: "Lada Novikova's studio",
    title: 'Process and results',
    region: 'Photos of Lada Novikova',
    prev: 'Previous photo',
    next: 'Next photo',
  },
  services: {
    eyebrow: 'Four Directions',
    title: 'Our Services',
    massage: { name: 'Massage', description: 'Manual and exotic techniques', tool: 'Hands' },
    depilation: { name: 'Hair Removal', description: 'Wax / Sugar', tool: 'Wax · Sugar' },
    permanent: { name: 'Permanent Makeup', description: 'Brows, lips, eyeliner', tool: 'Pigment' },
    beauty: { name: 'Make-up', description: 'Brows / Lashes / Makeup', tool: 'Brush' },
  },
  priceList: {
    eyebrow: 'Price List',
    title: 'Services & Prices',
    discount: 'Buy 10 sessions subscription — get 10% off',
    tabsLabel: 'Price list sections',
    currency: 'UAH',
    durationTemplate: '{n} min',
    sessionOne: 'session',
    sessionsTemplate: '{n} sessions',
    tabs: {
      bodyMassage: 'Body Massage',
      exotic: 'Exotic',
      depilation: 'Hair Removal',
      beauty: 'Beauty',
    },
    sections: {
      fullBodyMassage: 'Full Body Massage',
      localMassage: 'Local Massage',
      exotic: 'Exotic Massage',
      womenDepilation: 'Women\'s Hair Removal',
      combos: 'Combos (Save!)',
      menDepilation: 'Men\'s Hair Removal (Wax / Sugar / Razor / Trim)',
      browsLashes: 'Brows & Lashes',
      makeupHair: 'Makeup & Hair',
      permanentBrows: 'Permanent Makeup — Brows',
      permanentLips: 'Permanent Makeup — Lips',
      permanentEyeliner: 'Permanent Makeup — Eyeliner',
    },
    permanentNote: '* Refresh up to 6 months — 80% of original price',
  },
  certificates: {
    eyebrow: 'A Gift',
    title: 'Gift Certificates',
    text: 'Give your loved ones care and relaxation. Gift certificates available for any amount or service.',
    cta: 'Order Certificate',
  },
  footer: {
    address: 'Kyiv, 10 Mala Zhytomyrska St.',
    landmark: '(Maidan Nezalezhnosti)',
    schedule: 'Daily 10:00 AM - 9:00 PM',
    appointment: 'Appointment required',
    rights: 'All rights reserved',
    labels: {
      address: 'Address',
      phone: 'Phone',
      hours: 'Hours',
      instagram: 'Instagram',
    },
  },
  meta: {
    siteName: 'Lada N',
    title: 'Lada N — massage and beauty studio at Maidan Nezalezhnosti, Kyiv',
    description:
      'Massage, hair removal, permanent makeup and beauty services in central Kyiv. Lada N studio at 10 Mala Zhytomyrska St., open daily from 10:00 to 21:00.',
  },
  error: {
    title: 'Page not found — Lada N',
    heading: 'Page not found',
    text: 'There is no such page on this site. The address may have changed or contain a typo.',
    cta: 'Back to home',
  },
};

export const ui: Record<Locale, UiDictionary> = { uk, ru, en };

/** Подпись длительности: число живёт в данных прайса, слово — в словаре локали. */
export function formatDuration(locale: Locale, minutes: number): string {
  return ui[locale].priceList.durationTemplate.replace('{n}', String(minutes));
}

/** Подпись количества сеансов. Единственное число — отдельная форма, а не шаблон с единицей. */
export function formatSessions(locale: Locale, sessions: number): string {
  const dictionary = ui[locale].priceList;
  return sessions === 1
    ? dictionary.sessionOne
    : dictionary.sessionsTemplate.replace('{n}', String(sessions));
}
