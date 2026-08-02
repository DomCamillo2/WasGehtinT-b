import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7f6",
          100: "#e4ebe8",
          200: "#c5d4ce",
          300: "#9bb5ab",
          400: "#6f9486",
          500: "#4f7669",
          600: "#3d5e54",
          700: "#334c45",
          800: "#2b3e39",
          900: "#182422",
        },
        secondary: {
          50: "#f7f3ee",
          100: "#ebe2d6",
          200: "#d6c3ad",
          300: "#be9f80",
          400: "#a97f5c",
          500: "#9a6a4a",
          600: "#84563e",
          700: "#6b4535",
          800: "#593a30",
          900: "#2e1f1a",
        },
        accent: {
          50: "#fbf4ec",
          100: "#f5e4d0",
          200: "#eac79f",
          300: "#dea46b",
          400: "#d48745",
          500: "#c96f2e",
          600: "#b05724",
          700: "#924320",
          800: "#773720",
          900: "#3f1c11",
        },
        surface: {
          50: "#f6f7f6",
          100: "#eceeed",
          200: "#d9dddb",
          300: "#c0c7c4",
        },
        neutral: {
          50: "#f6f7f6",
          100: "#e9ebea",
          200: "#d3d7d5",
          300: "#b4bbb8",
          400: "#8a9390",
          500: "#6b7471",
          600: "#545c59",
          700: "#454b49",
          800: "#3a3f3d",
          900: "#151918",
        },
        success: {
          50: "#ebfbf4",
          500: "#21b66f",
          700: "#138553",
        },
        warning: {
          50: "#fff8eb",
          500: "#f59e0b",
          700: "#b45309",
        },
        danger: {
          50: "#fff1f3",
          500: "#ef476f",
          700: "#b42347",
        },
      },
      backgroundImage: {
        "brand-fluid": "linear-gradient(135deg, #334c45 0%, #4f7669 45%, #c96f2e 100%)",
      },
      boxShadow: {
        glass: "0 2px 8px rgba(0, 0, 0, 0.08)",
        cta: "0 2px 8px rgba(201, 111, 46, 0.28)",
      },
      borderRadius: {
        "2xl-plus": "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
