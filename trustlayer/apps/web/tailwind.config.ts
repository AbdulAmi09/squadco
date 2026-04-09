import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101719",
        teal: "#0b6e69",
        mint: "#d9f5ee",
        sand: "#f4efe5",
        coral: "#ff8057"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(16, 23, 25, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
