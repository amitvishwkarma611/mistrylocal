/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "!./node_modules/**",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Outfit', 'sans-serif'],
      },
      colors: {
        amber: {
          50: '#FFFBF5',
          100: '#FEF3E2',
          200: '#FDE6C7',
          300: '#FCD4A4',
          400: '#FABD7A',
          500: '#F79A4D',
          600: '#E67E22',
          700: '#C05621',
          800: '#9C4221',
          900: '#7B341E',
        },
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}