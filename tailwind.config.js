/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f131c',
        surface: '#0f131c',
        'surface-container-lowest': '#0a0e16',
        'surface-container-low': '#181c24',
        'surface-container': '#1c2028',
        'surface-container-high': '#262a33',
        'surface-container-highest': '#31353e',
        'surface-variant': '#31353e',
        primary: '#a5e7ff',
        'primary-container': '#00d2ff',
        'on-primary-fixed': '#001f28',
        secondary: '#70ffba',
        'secondary-container': '#00e599',
        tertiary: '#edd4ff',
        'tertiary-container': '#dab1ff',
        'on-surface': '#dfe2ee',
        'on-surface-variant': '#bbc9cf',
        outline: '#859399',
        'outline-variant': '#3c494e',
        flame: '#f97316',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
