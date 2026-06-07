/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        panel: "#141417",
        "panel-2": "#1a1a1f",
        border: "#26262b",
        // Algorithm state colors
        state: {
          default: "#64748b", // slate
          compare: "#f59e0b", // amber
          swap: "#ef4444", // red
          sorted: "#10b981", // emerald
          pivot: "#8b5cf6", // violet
          current: "#f59e0b", // amber
          visited: "#64748b", // slate
          frontier: "#0ea5e9", // sky
          path: "#10b981", // emerald
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
