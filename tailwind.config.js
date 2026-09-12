/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          blue: '#0A3161',
          'blue-light': '#164B8F',
          'blue-dark': '#061F3D',
          red: '#CE1126',
          'red-dark': '#A50D1E',
        },
      },
    },
  },
  plugins: [],
};
