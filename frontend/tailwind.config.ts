import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dracula: {
          page: "#24122f",
          bg: "#282a36",
          card: "#44475a",
          text: "#f8f8f2",
          subtext: "#bd93f9",
          accent: "#50fa7b",
          accent2: "#ff79c6",
          hero: "#24122f",
          hero2: "#2A0B4A"
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
