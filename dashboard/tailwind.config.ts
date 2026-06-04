import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090b',
          900: '#0c0d10',
          800: '#121317',
          700: '#1a1c22',
          600: '#23262e',
        },
        mist: {
          DEFAULT: '#ededf1',
          muted: '#8b909c',
          faint: '#5a5f6b',
        },
        accent: {
          DEFAULT: '#6366f1',
          soft: '#8b8cf6',
          glow: '#a5a3ff',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: { tightest: '-0.045em' },
      maxWidth: { content: '1100px' },
    },
  },
  plugins: [],
};

export default config;
