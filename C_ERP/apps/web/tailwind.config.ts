import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f8fafc",
        line: "#d7dee8",
        brand: "#2563eb",
        accent: "#059669",
        warn: "#b45309"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
