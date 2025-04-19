// tailwind.config.js
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Montserrat', 'sans-serif'],  // default font
          formula1: ['Formula1', 'sans-serif'], // custom font
        },
      },
    },
    plugins: [],
  };