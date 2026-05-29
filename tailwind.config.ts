import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        turf: "#18593b",
        lime: "#c7f000",
        gold: "#f6c945",
        ink: "#08100d",
        line: "rgba(255,255,255,0.12)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(199,240,0,0.24), 0 20px 80px rgba(0,0,0,0.28)"
      }
    }
  },
  plugins: []
};

export default config;
