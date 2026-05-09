/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ok:   '#16a34a',
        warn: '#f59e0b',
        crit: '#dc2626',
      },
    },
  },
  plugins: [],
};
