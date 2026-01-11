/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      ringColor: {
        focus: '#3b82f6',
      },
      ringWidth: {
        DEFAULT: '2px',
      },
      ringOffsetWidth: {
        DEFAULT: '2px',
      },
      ringOffsetColor: {
        DEFAULT: '#0d0d0d',
      },
      colors: {
        terminal: {
          bg: '#1a1b26',
          fg: '#a9b1d6',
          cursor: '#c0caf5',
        },
        surface: {
          primary: '#0d0d0d',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          input: '#1f1f1f',
          header: '#141414',
          hover: '#252525',
        },
        stroke: {
          primary: '#2a2a2a',
          secondary: '#333333',
        },
        content: {
          primary: '#ffffff',
          secondary: '#d1d5db',
          muted: '#9ca3af',
          subtle: '#6b7280',
          dimmed: '#4b5563',
        },
        status: {
          running: {
            DEFAULT: '#fb923c',
            bg: 'rgba(251, 146, 60, 0.2)',
          },
          success: {
            DEFAULT: '#4ade80',
            bg: 'rgba(74, 222, 128, 0.2)',
          },
          error: {
            DEFAULT: '#f87171',
            bg: 'rgba(248, 113, 113, 0.2)',
          },
          warning: {
            DEFAULT: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.2)',
          },
          info: {
            DEFAULT: '#60a5fa',
            bg: 'rgba(96, 165, 250, 0.2)',
          },
          pending: {
            DEFAULT: '#a78bfa',
            bg: 'rgba(167, 139, 250, 0.2)',
          },
        },
        mode: {
          orchestrate: '#9333ea',
          plan: '#16a34a',
          think: '#2563eb',
          bypass: '#ea580c',
        },
        model: {
          opus: '#9333ea',
          sonnet: '#2563eb',
          haiku: '#16a34a',
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'glow-purple': '0 0 20px rgba(147, 51, 234, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-out-right': 'slideOutRight 150ms ease-in',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'pulse-skeleton': 'pulseSkeleton 1.5s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSkeleton: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
