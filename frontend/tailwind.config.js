/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#05070B",
          900: "#0B0E14",
          800: "#131720",
          700: "#1B2028",
          600: "#262C37",
        },
        ember: {
          400: "#FF7A52",
          500: "#FF4D2E",
          600: "#E23A1C",
        },
        arcane: {
          400: "#6FE9DC",
          500: "#3FD9C7",
          600: "#28B5A5",
        },
        scale: {
          400: "#D9B84A",
          500: "#C9A227",
          600: "#A9841C",
        },
        ink: {
          100: "#E8EAF0",
          300: "#B7BCC9",
          500: "#8B92A5",
          700: "#565D6D",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        ember: "0 0 24px 0 rgba(255, 77, 46, 0.35)",
        arcane: "0 0 24px 0 rgba(63, 217, 199, 0.25)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "ember-gradient": "linear-gradient(135deg, #FF4D2E 0%, #C9A227 100%)",
      },
      keyframes: {
        ember: {
          "0%, 100%": { opacity: 0.55, transform: "translateY(0px)" },
          "50%": { opacity: 1, transform: "translateY(-2px)" },
        },
        drift: {
          "0%": { transform: "translateY(0) translateX(0)", opacity: 0 },
          "10%": { opacity: 0.5 },
          "100%": { transform: "translateY(-120vh) translateX(20px)", opacity: 0 },
        },
      },
      animation: {
        ember: "ember 2.2s ease-in-out infinite",
        drift: "drift 14s linear infinite",
      },
    },
  },
  plugins: [],
};
