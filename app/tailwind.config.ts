import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        grid: {
          50: '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e8ff',
          300: '#89daff',
          400: '#51c3ff',
          500: '#29a4ff',
          600: '#1185fc',
          700: '#0a6de8',
          800: '#0f57bb',
          900: '#134b93',
          950: '#0f2f5a',
        },
      },
    },
  },
  plugins: [],
};
export default config;
