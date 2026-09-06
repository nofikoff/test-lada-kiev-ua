/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,ts,md}'],
  theme: {
    extend: {
      colors: {
        'lada-dark': '#0a0a0a',
        'lada-darker': '#050505',
        'lada-gold': '#c9a961',
        'lada-gold-light': '#d4b978',
        'lada-red': '#c94a4a',
        'lada-gray': '#1a1a1a',
        'lada-gray-light': '#2a2a2a',
      },
      // Значение переменной объявляет компонент <Font> в разметке страницы: там же лежат
      // и запасные семейства с подогнанными метриками, поэтому список здесь ими не дублируется.
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-playfair)'],
      },
    },
  },
  plugins: [],
};
