import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // 포인트 컬러 — 따뜻한 코랄/토마토 톤(식욕·요리 연상). 강조에만 절제해 사용.
        brand: {
          50: "#FFF5F1",
          100: "#FFE6DC",
          200: "#FFC9B4",
          300: "#FFA684",
          400: "#FF8159",
          500: "#FB5E33",
          600: "#EA4620",
          700: "#C13718",
          800: "#9A2E16",
          900: "#7C2916",
        },
      },
    },
  },
  plugins: [],
};

export default config;
