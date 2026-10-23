import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12303A",
        teal: {
          50: "#F1F8F8",
          100: "#DDEEEE",
          200: "#BADBDC",
          300: "#8CC2C4",
          500: "#2A8F98",
          600: "#1E7781",
          700: "#175F68",
          800: "#134B53",
          900: "#0F3B42"
        },
        stub: { DEFAULT: "#E7A93A", deep: "#B9791A", soft: "#FBEFD3" },
        alert: { DEFAULT: "#B4372E", soft: "#FBE9E7" }
      },
      fontFamily: { sans: ["var(--font-ui)", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};

export default config;
