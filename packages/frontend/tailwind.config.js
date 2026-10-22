/** @type {import('tailwindcss').Config} */
const token = name => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Design-system tokens (see src/index.css). Prefer these in new code.
        ink: token("ink"),
        body: token("body"),
        muted: token("muted"),
        faint: token("faint"),
        line: token("line"),
        "line-strong": token("line-strong"),
        canvas: token("canvas"),
        surface: token("surface"),
        sunken: token("sunken"),
        accent: token("accent"),
        "accent-soft": token("accent-soft"),
        success: token("success"),
        "success-soft": token("success-soft"),
        danger: token("danger"),
        "danger-soft": token("danger-soft"),
        warn: token("warn"),
        "warn-soft": token("warn-soft"),
        info: token("info"),
        "info-soft": token("info-soft"),
        // Legacy FortiOS console colours, still used inside lab workspaces.
        forti: {
          red: "#DA291C",
          dark: "#1A1A1A",
          sidebar: "#212934",
          panel: "#F5F6F8",
        },
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "18px"],
        sm: ["13px", "20px"],
        base: ["14px", "22px"],
        lg: ["16px", "24px"],
        xl: ["18px", "26px"],
        "2xl": ["22px", "30px"],
        "3xl": ["28px", "36px"],
        "4xl": ["36px", "44px"],
      },
      borderRadius: { DEFAULT: "6px", md: "8px", lg: "10px", xl: "14px" },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 1px rgb(15 23 42 / 0.03)",
        raised: "0 4px 16px rgb(15 23 42 / 0.08), 0 1px 3px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
