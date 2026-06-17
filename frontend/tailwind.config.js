/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Background layers ──────────────────────────────
        surface:    "var(--surface)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "surface-4": "var(--surface-4)",
        // ── Accent blues ──────────────────────────────────
        blue: {
          DEFAULT: "rgb(var(--accent-blue) / <alpha-value>)",
          bright:  "rgb(var(--accent-sky) / <alpha-value>)",
          dim:     "#786936",
          glow:    "rgba(120,105,54,0.35)",
        },
        // ── Status colors ─────────────────────────────────
        amber:  { DEFAULT: "#F59E0B", glow: "rgba(245,158,11,0.35)" },
        emerald:{ DEFAULT: "#10B981", glow: "rgba(16,185,129,0.35)" },
        rose:   { DEFAULT: "#F43F5E", glow: "rgba(244,63,94,0.35)"  },
        violet: { DEFAULT: "#8B5CF6", glow: "rgba(139,92,246,0.35)" },
        // ── Text ──────────────────────────────────────────
        primary: "var(--text-primary)",
        muted:   "var(--text-muted)",
        faint:   "var(--text-faint)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-blue":   "0 0 20px rgba(120,105,54,0.4), 0 0 40px rgba(120,105,54,0.15)",
        "glow-amber":  "0 0 20px rgba(245,158,11,0.4),  0 0 40px rgba(245,158,11,0.15)",
        "glow-emerald":"0 0 20px rgba(16,185,129,0.4),  0 0 40px rgba(16,185,129,0.15)",
        "card":        "0 4px 24px rgba(0,0,0,0.5)",
        "card-hover":  "0 8px 40px rgba(0,0,0,0.7)",
        "glass":       "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(120,105,54,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(120,105,54,0.03) 1px, transparent 1px)",
        "hero-gradient":"radial-gradient(ellipse at 20% 50%, rgba(120,105,54,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(145,130,75,0.06) 0%, transparent 60%)",
      },
      backgroundSize: {
        "grid-pattern": "48px 48px",
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)"  },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)"     },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)"  },
          "100%": { opacity: "1", transform: "scale(1)"     },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(120,105,54,0.3)" },
          "50%":      { boxShadow: "0 0 30px rgba(120,105,54,0.6)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.35s ease-out forwards",
        "slide-in":   "slide-in 0.35s ease-out forwards",
        "scale-in":   "scale-in 0.25s ease-out forwards",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
      borderRadius: {
        "xl":  "12px",
        "2xl": "16px",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
