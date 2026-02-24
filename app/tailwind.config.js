/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f5ed',
          100: '#b3e0c8',
          200: '#80cba3',
          300: '#4db67e',
          400: '#26a663',
          500: '#00853F',
          600: '#007839',
          700: '#006a32',
          800: '#005c2c',
          900: '#004a23',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
