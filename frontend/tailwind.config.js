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
        // ── Background layers (navy depth) ────────────────────
        surface:      "var(--surface)",
        "surface-1":  "var(--surface-1)",
        "surface-2":  "var(--surface-2)",
        "surface-3":  "var(--surface-3)",
        "surface-4":  "var(--surface-4)",
        "surface-5":  "var(--surface-5)",
        // ── Gold accent ───────────────────────────────────────
        gold: {
          DEFAULT:  "rgb(var(--accent-gold) / <alpha-value>)",
          bright:   "rgb(var(--accent-gold-bright) / <alpha-value>)",
          dim:      "#A07828",
          glow:     "rgba(245, 176, 55, 0.40)",
          muted:    "rgba(245, 176, 55, 0.12)",
        },
        // ── Keep "blue" alias → gold for backward compat ─────
        blue: {
          DEFAULT: "rgb(var(--accent-gold) / <alpha-value>)",
          bright:  "rgb(var(--accent-gold-bright) / <alpha-value>)",
          dim:     "#A07828",
          glow:    "rgba(245, 176, 55, 0.40)",
        },
        // ── Status colors ─────────────────────────────────────
        amber:   { DEFAULT: "#F59E0B", glow: "rgba(245,158,11,0.35)" },
        emerald: { DEFAULT: "#10B981", glow: "rgba(16,185,129,0.35)"  },
        rose:    { DEFAULT: "#F43F5E", glow: "rgba(244,63,94,0.35)"   },
        violet:  { DEFAULT: "#8B5CF6", glow: "rgba(139,92,246,0.35)"  },
        sky:     { DEFAULT: "#38BDF8", glow: "rgba(56,189,248,0.35)"  },
        // ── Text ──────────────────────────────────────────────
        primary: "var(--text-primary)",
        muted:   "var(--text-muted)",
        faint:   "var(--text-faint)",
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-gold":   "0 0 24px rgba(245,176,55,0.45), 0 0 60px rgba(245,176,55,0.15)",
        "glow-gold-sm":"0 0 12px rgba(245,176,55,0.35)",
        "glow-blue":   "0 0 24px rgba(245,176,55,0.45), 0 0 60px rgba(245,176,55,0.15)",
        "glow-amber":  "0 0 20px rgba(245,158,11,0.40),  0 0 40px rgba(245,158,11,0.15)",
        "glow-emerald":"0 0 20px rgba(16,185,129,0.40),  0 0 40px rgba(16,185,129,0.15)",
        "glow-rose":   "0 0 20px rgba(244,63,94,0.40),   0 0 40px rgba(244,63,94,0.15)",
        "card":        "0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover":  "0 8px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass":       "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 16px rgba(0,0,0,0.3)",
        "sidebar":     "4px 0 32px rgba(0,0,0,0.4)",
        "neon-gold":   "0 0 8px rgba(245,176,55,0.6), 0 0 20px rgba(245,176,55,0.3), inset 0 0 8px rgba(245,176,55,0.1)",
      },
      backgroundImage: {
        "grid-pattern":  "linear-gradient(rgba(245,176,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,176,55,0.03) 1px, transparent 1px)",
        "gold-gradient": "linear-gradient(135deg, #F5B037 0%, #D4831A 50%, #F5C842 100%)",
        "hero-gradient": "radial-gradient(ellipse at 20% 50%, rgba(245,176,55,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(200,140,40,0.05) 0%, transparent 60%)",
        "navy-gradient": "linear-gradient(180deg, var(--surface-1) 0%, var(--surface) 100%)",
        "sidebar-gradient": "linear-gradient(180deg, rgba(245,176,55,0.08) 0%, transparent 40%)",
        "aurora":        "linear-gradient(125deg, rgba(245,176,55,0.06) 0%, rgba(56,189,248,0.04) 30%, rgba(139,92,246,0.03) 60%, rgba(245,176,55,0.05) 100%)",
      },
      backgroundSize: {
        "grid-pattern": "48px 48px",
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)"   },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)"     },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)"   },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)"    },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 16px rgba(245,176,55,0.3), 0 0 32px rgba(245,176,55,0.1)" },
          "50%":      { boxShadow: "0 0 32px rgba(245,176,55,0.6), 0 0 64px rgba(245,176,55,0.2)" },
        },
        "aurora": {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(245,176,55,0.3)" },
          "50%":      { borderColor: "rgba(245,176,55,0.8)" },
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.4s ease-out forwards",
        "slide-in":   "slide-in 0.4s ease-out forwards",
        "slide-up":   "slide-up 0.5s ease-out forwards",
        "scale-in":   "scale-in 0.25s ease-out forwards",
        "float":      "float 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "aurora":     "aurora 8s ease infinite",
        "shimmer":    "shimmer 2s linear infinite",
        "border-glow":"border-glow 2s ease-in-out infinite",
        "spin-slow":  "spin-slow 12s linear infinite",
      },
      borderRadius: {
        "xl":  "12px",
        "2xl": "18px",
        "3xl": "24px",
      },
      backdropBlur: {
        glass: "20px",
        heavy: "40px",
      },
    },
  },
  plugins: [],
};
