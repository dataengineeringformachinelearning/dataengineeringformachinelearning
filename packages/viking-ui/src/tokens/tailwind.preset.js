/**
 * Viking-UI Tailwind CSS preset
 * ---------------------------------------------------------------------------
 * Maps Tailwind utilities to canonical --viking-* CSS custom properties.
 * Use with Tailwind v3/v4: presets: [require('@dataengineeringformachinelearning/viking-ui/tokens/tailwind.preset')]
 *
 * Load viking-ui.css or design-tokens.css before Tailwind so variables resolve.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        viking: {
          bg: "var(--viking-bg)",
          surface: "var(--viking-surface)",
          "surface-alt": "var(--viking-surface-alt)",
          "surface-raised": "var(--viking-surface-raised)",
          text: "var(--viking-text)",
          "text-muted": "var(--viking-text-muted)",
          "text-subtle": "var(--viking-text-subtle)",
          "text-inverted": "var(--viking-text-inverted)",
          border: "var(--viking-border)",
          "border-strong": "var(--viking-border-strong)",
          "border-subtle": "var(--viking-border-subtle)",
          accent: "var(--viking-accent)",
          "accent-hover": "var(--viking-accent-hover)",
          "accent-content": "var(--viking-accent-content)",
          "accent-soft": "var(--viking-accent-soft)",
          "accent-strong": "var(--viking-accent-strong)",
          "accent-secondary": "var(--viking-accent-secondary)",
          "accent-secondary-hover": "var(--viking-accent-secondary-hover)",
          "accent-secondary-content": "var(--viking-accent-secondary-content)",
          "accent-secondary-soft": "var(--viking-accent-secondary-soft)",
          success: "var(--viking-success)",
          warning: "var(--viking-warning)",
          danger: "var(--viking-danger)",
          info: "var(--viking-info)",
          ring: "var(--viking-ring)",
          charcoal: {
            950: "var(--viking-charcoal-950)",
            900: "var(--viking-charcoal-900)",
            800: "var(--viking-charcoal-800)",
            700: "var(--viking-charcoal-700)",
            600: "var(--viking-charcoal-600)",
            500: "var(--viking-charcoal-500)",
          },
          metallic: {
            600: "var(--viking-metallic-600)",
            500: "var(--viking-metallic-500)",
            400: "var(--viking-metallic-400)",
            300: "var(--viking-metallic-300)",
            200: "var(--viking-metallic-200)",
            100: "var(--viking-metallic-100)",
          },
          electric: {
            900: "var(--viking-electric-900)",
            800: "var(--viking-electric-800)",
            700: "var(--viking-electric-700)",
            600: "var(--viking-electric-600)",
            500: "var(--viking-electric-500)",
            400: "var(--viking-electric-400)",
            300: "var(--viking-electric-300)",
            200: "var(--viking-electric-200)",
            100: "var(--viking-electric-100)",
          },
          teal: {
            700: "var(--viking-electric-700)",
            600: "var(--viking-electric-600)",
            500: "var(--viking-electric-500)",
            400: "var(--viking-electric-400)",
            300: "var(--viking-electric-300)",
          },
          crimson: {
            700: "var(--viking-crimson-700)",
            600: "var(--viking-crimson-600)",
            500: "var(--viking-crimson-500)",
            400: "var(--viking-crimson-400)",
          },
          series: {
            1: "var(--viking-series-1)",
            2: "var(--viking-series-2)",
            3: "var(--viking-series-3)",
            4: "var(--viking-series-4)",
            5: "var(--viking-series-5)",
            6: "var(--viking-series-6)",
            7: "var(--viking-series-7)",
            8: "var(--viking-series-8)",
            DEFAULT: "var(--viking-series-default)",
          },
        },
      },
      fontFamily: {
        sans: ["var(--viking-font-family)"],
        mono: ["var(--viking-font-family-mono)"],
      },
      fontSize: {
        "viking-2xs": [
          "var(--viking-font-size-2xs)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-xs": [
          "var(--viking-font-size-xs)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-sm": [
          "var(--viking-font-size-sm)",
          { lineHeight: "var(--viking-line-height-normal)" },
        ],
        viking: [
          "var(--viking-font-size)",
          { lineHeight: "var(--viking-line-height-relaxed)" },
        ],
        "viking-md": [
          "var(--viking-font-size-md)",
          { lineHeight: "var(--viking-line-height-relaxed)" },
        ],
        "viking-lg": [
          "var(--viking-font-size-lg)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-xl": [
          "var(--viking-font-size-xl)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-2xl": [
          "var(--viking-font-size-2xl)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-3xl": [
          "var(--viking-font-size-3xl)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
        "viking-4xl": [
          "var(--viking-font-size-4xl)",
          { lineHeight: "var(--viking-line-height-tight)" },
        ],
      },
      spacing: {
        "viking-0": "var(--viking-space-0)",
        "viking-px": "var(--viking-space-px)",
        "viking-half": "var(--viking-space-half)",
        "viking-1": "var(--viking-space-1)",
        "viking-1.5": "var(--viking-space-1-5)",
        "viking-2": "var(--viking-space-2)",
        "viking-3": "var(--viking-space-3)",
        "viking-4": "var(--viking-space-4)",
        "viking-5": "var(--viking-space-5)",
        "viking-6": "var(--viking-space-6)",
        "viking-7": "var(--viking-space-7)",
        "viking-8": "var(--viking-space-8)",
        "viking-9": "var(--viking-space-9)",
        "viking-10": "var(--viking-space-10)",
      },
      borderRadius: {
        "viking-xs": "var(--viking-radius-xs)",
        "viking-sm": "var(--viking-radius-sm)",
        viking: "var(--viking-radius)",
        "viking-md": "var(--viking-radius-md)",
        "viking-lg": "var(--viking-radius-lg)",
        "viking-xl": "var(--viking-radius-xl)",
        "viking-pill": "var(--viking-radius-pill)",
      },
      boxShadow: {
        "viking-xs": "var(--viking-shadow-xs)",
        "viking-sm": "var(--viking-shadow-sm)",
        "viking-md": "var(--viking-shadow-md)",
        "viking-lg": "var(--viking-shadow-lg)",
        "viking-inner": "var(--viking-shadow-inner)",
        "viking-hover": "var(--viking-shadow-hover)",
      },
      transitionTimingFunction: {
        viking: "var(--viking-ease-default)",
        "viking-in": "var(--viking-ease-in)",
        "viking-out": "var(--viking-ease-out)",
      },
      transitionDuration: {
        "viking-fast": "var(--viking-duration-fast)",
        viking: "var(--viking-duration)",
        "viking-slow": "var(--viking-duration-slow)",
      },
      maxWidth: {
        "viking-container": "var(--viking-container-max-width)",
      },
      height: {
        "viking-control": "var(--viking-control-height)",
        "viking-control-sm": "var(--viking-control-height-sm)",
        "viking-control-xs": "var(--viking-control-height-xs)",
        "viking-navbar": "var(--viking-navbar-height)",
      },
      width: {
        "viking-sidebar": "var(--viking-sidebar-width)",
        "viking-btn-min": "var(--viking-btn-min-width)",
      },
      zIndex: {
        "viking-overlay": "var(--viking-z-overlay)",
        "viking-toast": "var(--viking-z-toast)",
        "viking-tooltip": "var(--viking-z-tooltip)",
      },
      outlineWidth: {
        viking: "var(--viking-ring-width)",
      },
      outlineOffset: {
        viking: "var(--viking-ring-offset)",
      },
    },
  },
};
