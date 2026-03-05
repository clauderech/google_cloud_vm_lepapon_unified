/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      screens: {
        'landscape': { 'raw': '(orientation: landscape) and (max-height: 896px)' },
        'mobile-landscape': { 'raw': '(orientation: landscape) and (max-width: 896px)' },
      },
    },
  },
  plugins: [],
}
