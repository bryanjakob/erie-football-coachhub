import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        orange: "#F15A22",
        ink: "#000000",
        charcoal: "#1A1A1A",
        graphite: "#2B2B2B",
        line: "rgba(255,255,255,0.14)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(241,90,34,0.28), 0 18px 64px rgba(0,0,0,0.42)"
      }
    }
  },
  plugins: []
};

export default config;
