# Contract: лента работ

Секция главной между «О нас» (`#about`) и обзором услуг (`ServicesOverview`, без `id`), три языковые версии. `#services` — это прайс, а не обзор. Здесь описан контракт, на который опираются тесты; оформление — в компоненте.

## Разметка

```html
<section id="gallery">                                <!-- Section, rhythm по месту в ритме главной -->
  <h2>…gallery.title…</h2>                             <!-- через SectionHeading, eyebrow = gallery.eyebrow -->
  <div role="region" aria-label="…gallery.region…" tabindex="0" id="gallery-strip" data-gallery>
    <ul>
      <li>                                             <!-- × 13, порядок = position -->
        <a href="/depilation/">                        <!-- только при category; href = pagePath(locale, category) -->
          <figure>
            <picture>…<img alt="…alt[locale]…" loading="lazy" decoding="async" …></picture>
            <figcaption>Депіляція</figcaption>         <!-- ui[locale].services[category].name, под фото -->
          </figure>
        </a>
      </li>
      <li><figure><picture>…</picture></figure></li>   <!-- без category: ни ссылки, ни подписи -->
    </ul>
  </div>
  <button type="button" aria-controls="gallery-strip" data-gallery-prev hidden>…gallery.prev…</button>
  <button type="button" aria-controls="gallery-strip" data-gallery-next hidden>…gallery.next…</button>
</section>
```

Изображения: AVIF и WebP; ширины 360/600/840/1080, но не больше исходника (research.md §R11); `sizes="(min-width: 62rem) 22rem, 78vw"`. Пропорция 4:5 объявлена до загрузки, поэтому сдвига макета нет.

## Поведение

| Условие | Ожидается |
|---|---|
| Свайп, тачпад, Shift+колесо | Горизонтальный сдвиг с остановкой на границе карточки; справа виден край следующей. |
| Фокус на `[data-gallery]`, стрелки ←/→ | Лента прокручивается. |
| Скрипты работают | С кнопок снят `hidden`. «Вперёд» / «назад» сдвигают ленту на одну карточку. На краю кнопка в его сторону получает `disabled`. |
| `prefers-reduced-motion: reduce` | Сдвиг кнопкой происходит мгновенно (`behavior: 'auto'`); анимаций и переходов на элементах секции нет. |
| Скрипты отключены | Кнопки скрыты (`hidden`), лента листается жестом и клавиатурой. |
| Автопрокрутка | Отсутствует в любом состоянии (FR-012, ADR-001). |

## Событие аналитики

Клик по `a` внутри `[data-gallery]`:

```js
gtag('event', 'gallery_click', {
  service: 'massage' | 'depilation' | 'beauty',  // category карточки
  locale:  'uk' | 'ru' | 'en',                   // язык страницы, из <html lang> через словарь локалей
});
```

- Ровно один вызов на одно событие `click`, в том числе с Ctrl/Cmd/Shift и по Enter. `auxclick` (средняя кнопка) не обрабатывается. Переход не отменяется и не откладывается.
- `window.gtag` отсутствует → вызова нет, ошибки нет, переход штатный.
- Внешний `googletagmanager.com` заблокирован → переход штатный (SC-011).
- В GA4 параметры видны в отчётах через пользовательские измерения «Gallery service» и «Gallery locale» (область действия Event); они заведены 2026-09-27 (research.md §R7).
