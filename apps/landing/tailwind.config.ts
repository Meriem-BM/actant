import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0c0c10',
        'canvas-secondary': '#111116',
        'canvas-card': '#131318',
        'canvas-card-hover': '#17171e',
        'border-subtle': '#1e1e28',
        'border-hover': '#2c2c3a',
        'purple-brand': '#7c3aed',
        'purple-light': '#a855f7',
        'purple-dim': '#2d1b69',
        'cyan-brand': '#06b6d4',
        'emerald-brand': '#10b981',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'marquee': 'marquee 35s linear infinite',
        'float-0': 'float 6s ease-in-out infinite',
        'float-1': 'float 7s ease-in-out 0.5s infinite',
        'float-2': 'float 8s ease-in-out 1s infinite',
        'float-3': 'float 6.5s ease-in-out 1.5s infinite',
        'float-4': 'float 7.5s ease-in-out 0.8s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'draw-line': 'drawLine 1.5s ease-out forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.5)',
          },
          '50%': {
            opacity: '0.6',
            boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        drawLine: {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'dot-grid': 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '28px 28px',
      },
      boxShadow: {
        'glow-purple': '0 0 40px rgba(124, 58, 237, 0.3)',
        'glow-purple-sm': '0 0 20px rgba(124, 58, 237, 0.25)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        'card': '0 1px 0 rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
    },
  },
  plugins: [],
}

export default config
