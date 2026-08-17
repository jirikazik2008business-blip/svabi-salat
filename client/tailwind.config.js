/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        primary: {
          DEFAULT: '#16A34A',
          dark: '#15803D'
        },
        tomato: '#E4572E',
        pepper: '#F4B400',
        salad: '#2E9E44',
        cauliflower: '#F5F5F5',
        roach: '#1F2937',
        danger: '#DC2626'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
}
