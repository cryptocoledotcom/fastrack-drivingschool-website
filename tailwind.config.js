/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        'secondary-hover': 'var(--secondary-color-hover)',
        danger: 'var(--danger-color)',
        'danger-hover': 'var(--danger-color-hover)',
        'dark-gray': 'var(--dark-gray)',
        'light-gray-1': 'var(--light-gray-1)',
        'light-gray-2': 'var(--light-gray-2)',
        white: 'var(--white)',
      }
    },
  },
  plugins: [],
}