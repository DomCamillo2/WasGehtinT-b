import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f4ff",
          100: "#f1e8ff",
          200: "#e5d4ff",
          300: "#d2b0ff",
          400: "#bb82ff",
          500: "#9f4ff8",
          600: "#7f2ce2",
          700: "#661cb8",
          800: "#4c1d95",
          900: "#331468",
        },
        secondary: {
          50: "#eef0ff",
          100: "#dde1ff",
          200: "#c0c7ff",
          300: "#9ca6ff",
          400: "#7a82ff",
          500: "#575ce9",
          600: "#4044c2",
          700: "#312e81",
          800: "#272567",
          900: "#1b1a47",
        },
        accent: {
          50: "#fff3ff",
          100: "#ffe5ff",
          200: "#ffd0ff",
          300: "#ffb0fb",
          400: "#f796fb",
          500: "#e879f9",
          600: "#cf56e2",
          700: "#a83eb9",
          800: "#7f2f8d",
          900: "#5b2365",
        },
        surface: {
          50: "#fcfbff",
          100: "#f6f4ff",
          200: "#efeaff",
          300: "#e8e2ff",
        },
        neutral: {
          50: "#fcfcfd",
          100: "#f4f4f7",
          200: "#e9e9ef",
          300: "#d9dae4",
          400: "#b5b8c8",
          500: "#8c91a8",
          600: "#646a82",
          700: "#474c62",
          800: "#2f3345",
          900: "#171a27",
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
        "brand-fluid":
          "linear-gradient(135deg, #4c1d95 0%, #5d1fa8 20%, #7f2ce2 45%, #9f4ff8 62%, #e879f9 82%, #312e81 100%)",
      },
      boxShadow: {
        glass: "0 8px 28px rgba(21, 24, 39, 0.12)",
        cta: "0 10px 24px rgba(127, 44, 226, 0.34)",
      },
      borderRadius: {
        "2xl-plus": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
