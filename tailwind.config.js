/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // Required for the in-app theme setting to override the device on web.
  // NativeWind's web runtime throws on a manual set while this is "media".
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary accent — Indigo 600
        accent: {
          DEFAULT: "#4F46E5",
          light: "#6366F1",
          dark: "#4338CA",
          subtle: "#EEF2FF",
        },
        primary: {
          DEFAULT: "#4F46E5",
          foreground: "#FFFFFF",
        },
        // Shadcn style neutral palette
        background: {
          light: "#FFFFFF",
          dark: "#09090B",
        },
        card: {
          light: "#FFFFFF",
          dark: "#18181B",
        },
        muted: {
          light: "#F4F4F5",
          dark: "#27272A",
          foreground: {
            light: "#71717A",
            dark: "#A1A1AA",
          },
        },
        border: {
          light: "#E4E4E7",
          dark: "#27272A",
        },
        // Surface hierarchy
        surface: {
          base: "#09090B",
          elevated: "#18181B",
          overlay: "#27272A",
          border: "#27272A",
          "border-subtle": "#18181B",
        },
        // Text
        text: {
          primary: "#09090B",
          secondary: "#71717A",
          tertiary: "#A1A1AA",
          disabled: "#D4D4D8",
          inverse: "#FFFFFF",
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
          verb: "#4F46E5",
          noun: "#2563EB",
          adjective: "#059669",
          adverb: "#D97706",
          particle: "#DB2777",
          expression: "#4B5563",
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
