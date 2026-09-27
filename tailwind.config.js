/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,ts,md}'],
  theme: {
    extend: {
      // Значения живут в `src/index.css` каналами; здесь только форматная строка. Она обязана
      // нести `<alpha-value>`: без него модификаторы прозрачности (`border-brass/20`,
      // `bg-raised/40`) сгенерировали бы правило, которое не меняет цвет
      // (docs/specs/design-tokens.md правило 2). Префикс `lada-` удалён целиком — он ничего
      // не различал.
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        brass: 'rgb(var(--brass) / <alpha-value>)',
        'brass-lt': 'rgb(var(--brass-lt) / <alpha-value>)',
        silk: 'rgb(var(--silk) / <alpha-value>)',
        'silk-dim': 'rgb(var(--silk-dim) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      // Значение переменной объявляет компонент <Font> в разметке страницы: там же лежат
      // и запасные семейства с подогнанными метриками, поэтому список здесь ими не дублируется.
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-cormorant)'],
      },
    },
  },
  plugins: [],
};
