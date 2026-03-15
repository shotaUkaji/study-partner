/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0e14',
          secondary: '#10121a',
          elevated: '#1e2030',
        },
        accent: {
          gold: '#c9a84c',
          'gold-light': '#d4b34e',
        },
        text: {
          primary: '#e8e0d0',
          secondary: '#b0b8d0',
          muted: '#5a6080',
          faint: '#3a3d50',
        },
      },
      fontFamily: {
        mono: ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
