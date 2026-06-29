export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'navy': '#0B1B3A',
        'purple-premium': '#6D5EF7',
        'indigo-premium': '#4F46E5',
        'mint': '#2EE59D',
        'light-blue': '#60A5FA',
        'warning': '#F59E0B',
        'surface-dark': '#0A0F1E',
        'surface-light': '#F5F7FB',
        'surface-base': '#080C18',
        'surface-elevated': '#0D1526',
        'brand-blue': '#3B82F6',
        'brand-green': '#22C55E',
      },
      fontFamily: {
        'sora': ['Sora', 'sans-serif'],
        'dm': ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        'xl': ['clamp(1.125rem, 1rem + 0.5vw, 1.25rem)', { lineHeight: '1.75rem' }],
        '2xl': ['clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem)', { lineHeight: '2rem' }],
        '3xl': ['clamp(1.5rem, 1.3rem + 1vw, 1.875rem)', { lineHeight: '2.25rem' }],
        '4xl': ['clamp(1.75rem, 1.4rem + 1.8vw, 2.25rem)', { lineHeight: '2.5rem' }],
        '5xl': ['clamp(2rem, 1.5rem + 2.5vw, 3rem)', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
}
