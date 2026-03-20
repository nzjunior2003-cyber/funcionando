/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cbmpa-red': '#C0392B',
        'cbmpa-blue-start': '#1A2980',
        'cbmpa-blue-end': '#26D0CE',
        'cbmpa-purple': '#8E44AD',
      }
    },
  },
  plugins: [],
}