/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Interior (dashboard) colours ────────────────────────────────
        'd-bg':      '#07090A',          // deepest bg
        'd-surface': '#0C0F0D',          // card / sidebar bg
        'd-raised':  '#111812',          // elevated surface
        'd-border':  'rgba(197,255,71,0.07)',
        'd-border2': 'rgba(255,255,255,0.06)',

        // ── Landing colours ──────────────────────────────────────────────
        'land-bg':   '#080C0A',

        // ── Shared accent ─────────────────────────────────────────────────
        accent: {
          DEFAULT: '#C5FF47',
          hover:   '#b3f030',
          dim:     'rgba(197,255,71,0.12)',
          glow:    'rgba(197,255,71,0.25)',
        },
        lime: {
          DEFAULT: '#C5FF47',
          hover:   '#b3f030',
          dim:     'rgba(197,255,71,0.12)',
          muted:   'rgba(197,255,71,0.5)',
        },

        // ── Legacy dashboard colours (kept for auth pages) ───────────────
        'partners-base':    '#07090A',
        'partners-surface': '#0C0F0D',
        'partners-border':  'rgba(197,255,71,0.07)',

        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      textColor: {
        primary:   'rgba(255,255,255,0.92)',
        secondary: 'rgba(255,255,255,0.45)',
        muted:     'rgba(255,255,255,0.25)',
      },
      boxShadow: {
        'lime-sm':  '0 0 18px rgba(197,255,71,0.14)',
        'lime-md':  '0 0 40px rgba(197,255,71,0.20)',
        'lime-lg':  '0 0 80px rgba(197,255,71,0.18)',
      },
    },
  },
  plugins: [],
};
