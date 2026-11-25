import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          '"Book Antiqua"',
          "Palatino",
          "Georgia",
          "Cambria",
          "serif",
        ],
        sans: [
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      colors: {
        forest: {
          950: "#071710",
          900: "#0d261b",
          800: "#143929",
          700: "#1d523b",
          600: "#276e4f",
          500: "#348e67",
          400: "#52b086",
          300: "#7ecba8",
          100: "#daf3e7",
        },
      },
    },
  },
  plugins: [],
};
export default config;
