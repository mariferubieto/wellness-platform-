import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          DEFAULT: '#F9F5EF',
          light: '#FDFAF6',
          lino: '#E8DDD0',
        },
        sage: {
          DEFAULT: '#7A9A78',
          light: '#8DAA8B',
          muted: '#EAF0E7',
        },
        sand: {
          DEFAULT: '#C4A882',
          light: '#E5D5C0',
        },
        tierra: {
          DEFAULT: '#2C2418',
          mid: '#5A4A38',
          light: '#9A8A75',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        wellness: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
