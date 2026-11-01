/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080B',
          900: '#0A0C11',
          850: '#0E1118',
          800: '#12161F',
          750: '#171C27',
          700: '#1C2230',
          600: '#28303F',
          500: '#3A4457',
        },
        line: {
          DEFAULT: '#222A38',
          soft: '#1A212D',
          strong: '#323C4E',
        },
        brand: {
          50: '#F1EFFF',
          100: '#E3DEFF',
          200: '#C9C0FF',
          300: '#AEA0FF',
          400: '#8E7CFF',
          500: '#6C5CFF',
          600: '#5644E8',
          700: '#4334BE',
        },
        mint: { 400: '#4FE3AC', 500: '#2FCE95', 600: '#1FA97A' },
        amberx: { 400: '#F8C25C', 500: '#F5B544', 600: '#D99321' },
        rosex: { 400: '#FF7A96', 500: '#FB5A7D', 600: '#E03B60' },
        skyx: { 400: '#6FD3F7', 500: '#3EC1EE', 600: '#1FA0CC' },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
        latin: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(108,92,255,0.35), 0 12px 40px -12px rgba(108,92,255,0.45)',
        lift: '0 24px 60px -30px rgba(0,0,0,0.95)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
        'brand-sheen':
          'radial-gradient(120% 120% at 0% 0%, rgba(108,92,255,0.28) 0%, rgba(108,92,255,0) 55%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(47,206,149,0.45)' },
          '70%': { boxShadow: '0 0 0 6px rgba(47,206,149,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47,206,149,0)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
        'spin-slow': 'spin-slow 1.1s linear infinite',
      },
    },
  },
  plugins: [],
};
