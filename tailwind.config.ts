import type { Config } from "tailwindcss";

export default {
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
      },
      boxShadow: {
        soft: "0 16px 48px rgba(0, 0, 0, 0.22)",
      },
    },
  },
  plugins: [],
} satisfies Config;
