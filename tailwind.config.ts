import type { Config } from "tailwindcss";

// ── Brand palettes ─────────────────────────────────────────────────────────
// The storefront was built with Tailwind palette classes (pink-500, sky-100,
// violet-600, …). Instead of rewriting every class, the colourful families are
// re-pointed at three brand scales so the whole site follows the emerald &
// gold theme. Red stays red for errors; green stays green for success.
const emeraldScale = {
  50: "#EEF7F3", 100: "#D6EDE4", 200: "#ADDAC9", 300: "#7CC0A8", 400: "#44A084",
  500: "#1D7E64", 600: "#0F5E4B", 700: "#0C4E3F", 800: "#0A3F33", 900: "#08332A", 950: "#041E18",
};
const goldScale = {
  50: "#FBF7EA", 100: "#F6EDCD", 200: "#EDDA9B", 300: "#E2C66A", 400: "#D6B346",
  500: "#C9A227", 600: "#A5831C", 700: "#7F6517", 800: "#5E4B13", 900: "#473A11", 950: "#292108",
};
const maroonScale = {
  50: "#FBF0F2", 100: "#F6DEE3", 200: "#EDBCC7", 300: "#DE8FA1", 400: "#C95C76",
  500: "#AE3656", 600: "#8E2240", 700: "#761B34", 800: "#5E172A", 900: "#4A1322", 950: "#2A0912",
};
const charcoalScale = {
  50: "#F7F6F2", 100: "#EFEDE6", 200: "#E2DFD6", 300: "#C9C6BB", 400: "#9D9B91",
  500: "#73746C", 600: "#575B54", 700: "#404642", 800: "#2C3432", 900: "#1F2A28", 950: "#121917",
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.875rem", // 14px on mobile
        sm: "1rem",
        md: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        pink: emeraldScale,
        fuchsia: emeraldScale,
        purple: emeraldScale,
        violet: emeraldScale,
        indigo: emeraldScale,
        teal: emeraldScale,
        emerald: emeraldScale,
        sky: {
          ...goldScale,
          DEFAULT: "hsl(var(--sky))",
          foreground: "hsl(var(--sky-foreground))",
          soft: "hsl(var(--sky-soft))",
        },
        blue: goldScale,
        cyan: goldScale,
        amber: goldScale,
        yellow: goldScale,
        orange: goldScale,
        rose: maroonScale,
        slate: charcoalScale,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        announcement: {
          DEFAULT: "hsl(var(--announcement))",
          foreground: "hsl(var(--announcement-foreground))",
        },
        pastel: {
          pink: "hsl(var(--pastel-pink))",
          blue: "hsl(var(--pastel-blue))",
          peach: "hsl(var(--pastel-peach))",
          yellow: "hsl(var(--pastel-yellow))",
          mint: "hsl(var(--pastel-mint))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "'Times New Roman'", "serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-sale": "var(--gradient-sale)",
        "gradient-hero-card": "var(--gradient-hero-card)",
        "gradient-sky": "var(--gradient-sky)",
        "gradient-pink-blue": "var(--gradient-pink-blue)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-18px) rotate(2deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        "magic-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        twinkle: "twinkle 2.5s ease-in-out infinite",
        "magic-glow": "magic-glow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
