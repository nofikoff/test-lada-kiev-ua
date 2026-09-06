/** @type {import('tailwindcss').Config} */
export default {
  // .tsx и index.html остаются до Step 7.3: пока старое дерево живо, его классы нужны в сборке,
  // иначе сверка отображения пойдёт против страницы без стилей.
  content: ['./index.html', './src/**/*.{astro,js,ts,jsx,tsx,md}'],
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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
