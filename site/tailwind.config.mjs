export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "void-black": "#0A0A0C",
        "ash-charcoal": "#1B1B20",
        "smoke-blue": "#3F4651",
        "ember-red": "#D8442C",
        "forge-orange": "#F26B1F",
        "coal-crimson": "#8E2618",
        "pale-wraith": "#E7E9ED",
        "frost-silver": "#C9CDD4",
        "silver-steel": "#8A8F98",
        "iron-gray": "#5A5F66",
      },
      fontFamily: {
        display: [
          "Cormorant Garamond",
          "Playfair Display",
          "EB Garamond",
          "serif",
        ],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: [
          "clamp(56px, 9vw, 96px)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        h1: ["clamp(40px, 5vw, 56px)", { lineHeight: "1.2" }],
        h2: ["28px", { lineHeight: "1.2" }],
        h3: ["20px", { lineHeight: "1.2" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.6" }],
        micro: ["12px", { lineHeight: "1.6", letterSpacing: "0.02em" }],
      },
      spacing: {
        section: "128px",
        block: "80px",
        element: "48px",
        snug: "24px",
        tight: "8px",
      },
      borderRadius: {
        card: "0px",
        button: "2px",
        pill: "0px",
      },
      boxShadow: {
        none: "none",
      },
      transitionTimingFunction: {
        mythic: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
};
