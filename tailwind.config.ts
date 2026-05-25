import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        panelMuted: "var(--color-panel-muted)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        textMuted: "var(--color-text-muted)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
      },
      boxShadow: {
        soft: "0 16px 48px rgba(0, 0, 0, 0.22)",
      },
      keyframes: {
        alertFlash: {
          "0%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0)" },
          "15%": { boxShadow: "0 0 0 3px rgba(251, 191, 36, 0.4)" },
          "50%": { boxShadow: "0 0 0 3px rgba(251, 191, 36, 0.25)" },
          "100%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0)" },
        },
      },
      animation: {
        alertFlash: "alertFlash 2.5s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
