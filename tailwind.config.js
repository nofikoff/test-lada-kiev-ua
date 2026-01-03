/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
