/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily:{
        lexend: ['"Lexend Deca"', 'sans-serif'],
        lemonada: ['"Lemonada"', 'sans-serif'],
        lekton: ['"Lekton"', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  variants: {
    extend: {
      textColor: ['hover', 'focus'],
    },
  },
  plugins: [],
}
