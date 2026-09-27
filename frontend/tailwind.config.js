/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#121215',
        card: '#18181b',
        border: 'rgba(255, 255, 255, 0.08)',
        subtle: 'rgba(255, 255, 255, 0.04)',
        accent: {
          DEFAULT: '#3b82f6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
};
