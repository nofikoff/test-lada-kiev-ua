# Лента работ на главной

Реализация — `src/components/Gallery.astro`. Данные — `src/data/gallery.json`: схема в `src/content.config.ts`, связи между записями в `src/data/gallery.ts`. Проверки — `tests/gallery.spec.ts`, `tests/no-script.spec.ts`. Почему лента на CSS и без автопрокрутки — [ADR-001](../adr/adr-001-gallery-css-scroll-strip-no-autoplay.md), почему без `content-visibility` — [ADR-003](../adr/adr-003-gallery-no-content-visibility.md). Принято в пакете 003, 2026-09-27.

## Состав

Лента показывает работу, а не позирование: личный бренд несёт один портрет первого экрана, в ленте — процедуры, инструменты и студия (решение автора, 2026-09-27). Секция стоит между «О нас» и обзором услуг.

Номера 01–29 — порядок имён файлов в выгрузке автора из Instagram (`~/Downloads/_lada.kiev.ua`, у всех имён префикс `lada_n_kyiv_`). Автор говорит о фото этими номерами.

| № | `id` | Позиция | Услуга |
|---|---|---|---|
| 20 | `lada-novikova-portrait` | портрет | — |
| 09 | `lada-novikova-brows-client` | 1 | beauty |
| 13 | `lada-novikova-sugaring` | 2 | depilation |
| 25 | `massage-room` | 3 | massage |
| 28 | `lada-novikova-brow-tint` | 4 | beauty |
| 16 | `anti-cellulite-before-after` | 5 | massage |
| 12 | `sugaring-close-up` | 6 | depilation |
| 01 | `lada-novikova-makeup-client` | 7 | beauty |
| 18 | `massage-tools` | 8 | massage |
| 19 | `depilation-wax-beads` | 9 | depilation |
| 08 | `disposable-tools` | 10 | — |
| 10 | `lada-novikova-certificate` | 11 | — |
| 11 | `makeup-station` | 12 | — |
| 26 | `studio-terrace` | 13 | — |

- **Фото 24 на сайт не попадает никогда**: на нём табличка со старым доменом и вторым телефоном.
- Клиентки на фото 01, 09, 16 и 28 дали согласие на публикацию — со слов автора, 2026-09-27; документов согласия в проекте нет. Права на все фото принадлежат Ладе Новиковой, подпись фотографа не нужна (автор, 2026-09-26).
- Надписи на фото 16 («До», «После») русские на всех трёх языковых версиях. Кадр вписывается целиком (`fit: contain`), потому что смысл несут края.
- Терраса на фото 26 — нынешняя студия на Малій Житомирській.

## Разметка

```html
<section id="gallery">
  <div role="region" aria-label="…gallery.region…" tabindex="0" id="gallery-strip" data-gallery>
    <ul>
      <li><a href="/ru/depilation/" data-service="depilation"><figure><picture>…</picture><figcaption>Депиляция</figcaption></figure></a></li>
      <li><figure><picture>…</picture></figure></li>   <!-- без category: ни ссылки, ни подписи -->
    </ul>
  </div>
  <button type="button" aria-controls="gallery-strip" data-gallery-prev hidden>…</button>
  <button type="button" aria-controls="gallery-strip" data-gallery-next hidden>…</button>
</section>
```

- `tabindex="0"` у контейнера обязателен: карточки без ссылок иначе недостижимы с клавиатуры, и Lighthouse ставит ошибку `scrollable-region-focusable`.
- Подпись услуги стоит под фото, на сплошной поверхности карточки. `tests/contrast.spec.ts` собирает подложку из `background-color` предков и фоновой картинки не видит, поэтому подпись поверх фото прошла бы проверку, ничего не доказав. Порог 4.5:1 — в покое, при наведении и при фокусе.

## Поведение

| Условие | Ожидается |
|---|---|
| Свайп, тачпад, Shift+колесо | Горизонтальный сдвиг с остановкой на границе карточки; справа виден край следующей |
| Фокус на ленте, стрелки ←/→ | Лента прокручивается |
| Скрипты работают | С кнопок снят `hidden`; кнопка сдвигает ленту на одну карточку; на краю кнопка в его сторону получает `disabled` |
| `prefers-reduced-motion: reduce` | Сдвиг кнопкой мгновенный (`behavior: 'auto'`) |
| Скрипты отключены | Кнопки скрыты, все 13 фото достижимы жестом и клавиатурой |
| Автопрокрутка | Нет ни в каком состоянии |

## Загрузка

- Фото ленты — `loading="lazy"`, ширины 360/600/840/1080, но не больше исходника, `sizes="(min-width: 62rem) 22rem, 78vw"`. При плотности 1.75 на 412 px карточке нужно 562 px.
- На 360×740 до прокрутки браузер берёт не больше двух фото ленты и ни одного раньше портрета. Лента начинается в 1152 px ниже края экрана, то есть внутри штатного порога отложенной загрузки Chromium, и ноль запросов без скриптового загрузчика недостижим. Замер 2026-09-27; повтор — тест «на 360×740…» в `tests/gallery.spec.ts`.

## Событие GA4

Клик по ссылке внутри `[data-gallery]`:

```js
gtag('event', 'gallery_click', {
  service: 'massage' | 'depilation' | 'beauty',  // category карточки
  locale:  'uk' | 'ru' | 'en',                   // <html lang>
});
```

- Ровно один вызов на `click`, в том числе с Ctrl/Cmd/Shift и по Enter. `auxclick` (средняя кнопка) не считается. Персональных данных в параметрах нет.
- Переход не отменяется и не ждёт счётчика. Нет `window.gtag` или заблокирован `googletagmanager.com` — вызова нет, переход штатный.
- В GA4: поток «Lada.kiev.ua», stream id 13236443340, `G-WZT8TJLSDP`. Параметры видны через пользовательские измерения «Gallery service» ← `service` и «Gallery locale» ← `locale`, область действия Event, заведены 2026-09-27 через интерфейс GA4 (property 518274648). Analytics MCP на этой машине к property доступа не имеет.
