/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0a0a0f",
          800: "#0f0f18",
          700: "#161625",
          600: "#1e1e32",
          500: "#2a2a42",
        },
        accent: {
          DEFAULT: "#06b6d4",
          light: "#22d3ee",
          dark: "#0891b2",
          glow: "rgba(6, 182, 212, 0.15)",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(6, 182, 212, 0.15), 0 0 60px rgba(6, 182, 212, 0.05)",
        "glow-sm": "0 0 10px rgba(6, 182, 212, 0.1)",
      },
    },
  },
  plugins: [],
};
