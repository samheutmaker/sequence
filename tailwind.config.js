/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./src/index.html"],
  theme: {
    extend: {
      colors: {
        // Pro audio dark mode palette
        surface: {
          950: "#0d0d0d", // deepest background
          900: "#141414", // main background
          800: "#1c1c1c", // panel background
          700: "#262626", // elevated surface
          600: "#333333", // borders
          500: "#404040", // subtle elements
          400: "#525252", // muted text
        },
        accent: {
          DEFAULT: "#f97316", // vibrant orange
          bright: "#fb923c",
          dim: "#ea580c",
        },
        beat: {
          active: "#f97316", // orange playhead
          on: "#3b82f6", // blue - enabled steps
          off: "#1c1c1c", // dark - disabled
          downbeat: "#262626", // slightly lighter
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
