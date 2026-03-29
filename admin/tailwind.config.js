/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          base: "#0f1117",
          surface: "#1a1d27",
          border: "rgba(255,255,255,0.08)",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        danger: {
          DEFAULT: "#ef4444",
          hover: "#dc2626",
        },
        success: {
          DEFAULT: "#22c55e",
          hover: "#16a34a",
        },
        warning: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
        },
      },
      textColor: {
        "admin-primary": "rgba(255,255,255,0.9)",
        "admin-secondary": "rgba(255,255,255,0.5)",
        "admin-muted": "rgba(255,255,255,0.3)",
      },
      backgroundColor: {
        "admin-base": "#0f1117",
        "admin-surface": "#1a1d27",
      },
      borderColor: {
        "admin-border": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
