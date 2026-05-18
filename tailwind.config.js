/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary accent — violet
        accent: {
          DEFAULT: "#6D28D9",
          light: "#8B5CF6",
          dark: "#5B21B6",
          subtle: "#EDE9FE",
        },
        // Surface hierarchy (dark-first)
        surface: {
          base: "#0F0F14",
          elevated: "#1A1A24",
          overlay: "#23232F",
          border: "#2E2E3A",
          "border-subtle": "#1E1E28",
        },
        // Text
        text: {
          primary: "#F4F4F8",
          secondary: "#A0A0B8",
          tertiary: "#6B6B80",
          disabled: "#3A3A4A",
          inverse: "#0F0F14",
        },
        // JLPT level colors
        jlpt: {
          n5: "#22C55E",
          n4: "#3B82F6",
          n3: "#F59E0B",
          n2: "#F97316",
          n1: "#EF4444",
        },
        // SRS rating colors
        srs: {
          again: "#EF4444",
          hard: "#F97316",
          good: "#22C55E",
          easy: "#3B82F6",
        },
        // Word type tags
        tag: {
          verb: "#7C3AED",
          noun: "#1D4ED8",
          adjective: "#047857",
          adverb: "#B45309",
          particle: "#9D174D",
          expression: "#374151",
        },
        // Feedback / status
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      fontSize: {
        // iOS-inspired type scale
        caption2: ["11px", { lineHeight: "13px", letterSpacing: "0.06px" }],
        caption1: ["12px", { lineHeight: "16px", letterSpacing: "0.0px" }],
        footnote: ["13px", { lineHeight: "18px", letterSpacing: "-0.08px" }],
        subheadline: ["15px", { lineHeight: "20px", letterSpacing: "-0.24px" }],
        callout: ["16px", { lineHeight: "21px", letterSpacing: "-0.32px" }],
        body: ["17px", { lineHeight: "22px", letterSpacing: "-0.41px" }],
        headline: ["17px", { lineHeight: "22px", letterSpacing: "-0.41px" }],
        title3: ["20px", { lineHeight: "25px", letterSpacing: "-0.45px" }],
        title2: ["22px", { lineHeight: "28px", letterSpacing: "-0.26px" }],
        title1: ["28px", { lineHeight: "34px", letterSpacing: "-0.36px" }],
        largeTitle: ["34px", { lineHeight: "41px", letterSpacing: "-0.4px" }],
        // Japanese reading sizes
        "kanji-xl": ["48px", { lineHeight: "56px" }],
        "kanji-lg": ["32px", { lineHeight: "40px" }],
        "kanji-md": ["24px", { lineHeight: "32px" }],
        "furigana": ["10px", { lineHeight: "12px" }],
      },
      spacing: {
        // 4-point grid
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        // Named spacing tokens
        "screen-x": "16px",
        "screen-y": "20px",
        "card-pad": "16px",
        "section-gap": "24px",
      },
      fontFamily: {
        // System fonts — RN uses system stack by default
        sans: ["System", "ui-sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.4)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.6)",
        glow: "0 0 20px rgba(109,40,217,0.4)",
      },
    },
  },
  plugins: [],
};
