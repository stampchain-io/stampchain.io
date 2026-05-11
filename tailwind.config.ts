import { type Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  content: [
    "{routes,islands,components,lib}/**/*.{ts,tsx}",
    "./static/**/*.{html,js}",
  ],

  theme: {
    extend: {
      screens: {
        "mobileSm": "360px", // Custom
        // "mobile-568": " // UNUSED - USE mobileSm
        "mobileMd": "568px", // Custom
        "mobileLg": "768px", // Custom
        "tablet": "1024px", // Same as Tailwind's 'lg' (1024px)
        "desktop": "1440px", // Same as Tailwind's 'xl' (1440px)
      },
      fontFamily: {
        sans: ['"Montserrat"', "sans-serif"],
        montserrat: ['"Montserrat"', "sans-serif"],
        "courier-prime": ['"Courier Prime"', "sans-serif"],
      },
      colors: { // color hue defs are calculated using HSL values - decreasing lightness by 8% for each step (grey hues are estimations)
        color: { // colors are also defined as CSS variables further down in the file - PieChart and ChartWidget use hardcoded color values
          purple: {
            dark: "#43005c",
            semidark: "#610085",
            DEFAULT: "#7f00ad",
            semilight: "#9d00d6",
            light: "#BB00FF",
          },
          grey: {
            dark: "#585552",
            semidark: "#817e78",
            DEFAULT: "#a8a39d",
            semilight: "#d1cbc3",
            light: "#f9f2e9",
          },
          red: {
            dark: "#5c0000",
            semidark: "#850000",
            DEFAULT: "#ad0000",
            semilight: "#d60000",
            light: "#ff0000",
          },
          green: {
            dark: "#005c00",
            semidark: "#008500",
            DEFAULT: "#00ad00",
            semilight: "#00d600",
            light: "#00ff00",
          },
          orange: {
            dark: "#5c2b00",
            semidark: "#853e00",
            DEFAULT: "#ad5100",
            semilight: "#d66400",
            light: "#ff7700",
          },
          background: {
            DEFAULT: "#0d0a0d",
          },
          border: {
            DEFAULT: "#332f32",
          },
        },
      },
      backgroundImage: {
        "conic-pattern": "var(--conic-pattern)",
      },
      animation: {
        "fade-in": "fadeIn",
        "fade-out": "fadeOut",
        "slide-up": "slideUp",
        "slide-down": "slideDown",
        "slide-left": "slideLeft",
        "slide-right": "slideRight",
        "rotate": "rotate 4s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideLeft: {
          "0%": { transform: "translateX(30px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideRight: {
          "0%": { transform: "translateX(0)", opacity: "0" },
          "100%": { transform: "translateX(30px)", opacity: "1" },
        },
        rotate: {
          "0%": { "--angle": "0deg" },
          "100%": { "--angle": "360deg" },
        },
      },
      spacing: {
        // CUSTOM SPACING
        "3.5": "14px",
        "7.5": "30px",
        "9.5": "38px",

        // PAGE GUTTERS (horizontal padding from screen edges to header, footer and body containers)
        "gutter-mobile": "20px", // updated breakpoint naming convention
        "gutter-tablet": "20px", // updated breakpoint naming convention
        "gutter-desktop": "40px", // updated breakpoint naming convention

        // LAYOUT GAP (vertical spacing between the body, and the header and footer)
        // Defined in the header and footer files - /islands/layout/

        // SECTION GAPS (vertical spacing between sections in the body)
        // Defined in /components/layout/styles.ts

        // GRID GAPS (spacing between grid/flex items)
        // Defined in /components/layout/styles.ts

        // PARAGRAPH GAP (vertical spacing between paragraphs)
        // Defined in the static.css file

        // CONTENT PADDING
        // STACK SPACING
        "margin-mobile": "18px", // not updated - needs attention
        "margin-tablet": "36px", // not updated - needs attention
        "margin-desktop": "72px", // not updated - needs attention
        "padding-mobile": "12px", // not updated - needs attention
        "padding-tablet": "24px", // not updated - needs attention
        "padding-desktop": "48px", // not updated - needs attention
        // CALCULATIONS
        "calc-12": "calc(100% - 12px)",
        "calc-24": "calc(100% - 24px)",
        "calc-36": "calc(100% - 36px)",
        // STAMP CARD AND MISC OTHER DIMENSIONS
        "stamp-card": "6px",
        "stamp-card-lg": "max(6px,min(12px,calc(6px+((100vw-360px)*0.029))))",
        "search-icon": "12px",
        "stroke-width": "2px",
      },
      boxShadow: {
        "stamp": "0px 0px 18px #aa00ff",
        "stamp-hover": "0px 0px 24px #aa00ff",
      },
      aspectRatio: {
        "stamp": "1",
      },
      zIndex: {
        "notification": "60",
        "modal": "50",
        "tooltip": "40",
        "dropdown": "30",
        "header": "20",
      },
      maxWidth: {
        "desktop": "1920px",
        "none": "none",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }: any) {
      addUtilities({
        ".optimize-text": {
          "will-change": "transform",
          "transform": "translateZ(0)",
          "backface-visibility": "hidden",
        },
        ".text-stroke-glow-large": {
          "text-shadow": `
            /* Glow effect */
            -0.05em -0.05em 0.25em #80C,    /* top-left */
            0.05em -0.05em 0.25em #80C,     /* top-right */
            0.05em 0.05em 0.25em #80C,      /* bottom-right */
            -0.05em 0.05em 0.25em #80C,     /* bottom-left */
            -0.05em 0 0.25em #80C,         /* left */
            0.05em 0 0.25em #80C,          /* right */
            0 -0.05em 0.25em #80C,         /* top */
            0 0.05em 0.25em #80C,          /* bottom */

            /* Stroke effect */
            -3px -3px 0 #A0F,
            3px -3px 0 #A0F,
            -3px 3px 0 #A0F,
            3px 3px 0 #A0F,
            -3px 0 0 #A0F,
            3px 0 0 #A0F,
            0 -3px 0 #A0F,
            0 3px 0 #A0F
          `,
        },
        ".text-stroke-glow-small": {
          "text-shadow": `
            /* Glow effect */
            -0.02em -0.02em 0.3em #80C,  /* top-left */
            0.02em -0.02em 0.3em #80C,   /* top-right */
            0.02em 0.02em 0.3em #80C,    /* bottom-right */
            -0.02em 0.02em 0.3em #80C,   /* bottom-left */
            -0.02em 0 0.3em #80C,         /* left */
            0.02em 0 0.3em #80C,          /* right */
            0 -0.02em 0.3em #80C,         /* top */
            0 0.02em 0.3em #80C,          /* bottom */

            /* Stroke effect */
            -2px -2px 0 #A0F,
            2px -2px 0 #A0F,
            -2px 2px 0 #A0F,
            2px 2px 0 #A0F,
            -2px 0 0 #A0F,
            2px 0 0 #A0F,
            0 -2px 0 #A0F,
            0 2px 0 #A0F
          `,
        },
        ".bg-clip-text": { // @baba - prune and refactor
          "-webkit-background-clip": "text",
          "background-clip": "text",
        },
        ".text-fill-transparent": { // prune and refactor
          "-webkit-text-fill-color": "transparent",
          "text-fill-color": "transparent",
        },
        ".scrollbar-hide": {
          /* Hide scrollbar for IE, Edge and Firefox */
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          /* Hide scrollbar for Chrome, Safari and Opera */
          "&::-webkit-scrollbar": {
            "display": "none",
          },
        },
        ":root": {
          // Purple color palette as CSS variables
          "--color-purple-dark": "#43005c",
          "--color-purple-semidark": "#610085",
          "--color-purple": "#7f00ad",
          "--color-purple-semilight": "#9d00d6",
          "--color-purple-light": "#BB00FF",
          // Grey color palette as CSS variables
          "--color-grey-dark": "#585552",
          "--color-grey-semidark": "#817e78",
          "--color-grey": "#a8a39d",
          "--color-grey-semilight": "#d1cbc3",
          "--color-grey-light": "#f9f2e9",
          // Red color palette as CSS variables
          "--color-red-dark": "#5c0000",
          "--color-red-semidark": "#850000",
          "--color-red": "#ad0000",
          "--color-red-semilight": "#d60000",
          "--color-red-light": "#ff0000",
          // Green color palette as CSS variables
          "--color-green-dark": "#005c00",
          "--color-green-semidark": "#008500",
          "--color-green": "#00ad00",
          "--color-green-semilight": "#00d600",
          "--color-green-light": "#00ff00",
          // Orange color palette as CSS variables
          "--color-orange-dark": "#5c2b00",
          "--color-orange-semidark": "#853e00",
          "--color-orange": "#ad5100",
          "--color-orange-semilight": "#d66400",
          "--color-orange-light": "#ff7700",
          // Background and border color palette as CSS variables
          "--color-background": "#0d0a0d",
          "--color-border": "#332f32",
          // Conic gradient variables
          "--conic-pattern":
            "repeating-conic-gradient(rgba(128, 128, 128, 0.2) 0% 25%, rgba(128, 128, 128, 0.1) 25% 50%)",
        },
        "*::-webkit-scrollbar-corner": {
          "background-color": "transparent !important",
        },
        ".gradient-text": {
          "@apply bg-clip-text text-fill-transparent": {},
        },
        "html *:focus-visible": {
          "outline": "2px solid #CCCCCCBF !important",
          "outline-offset": "-2px !important",
          "outline-style": "solid !important",
        },
        // Gradient Classes - Purple variants
        ".color-purple-gradientDL": {
          "background":
            "linear-gradient(to right, var(--color-purple-dark), var(--color-purple-semidark), var(--color-purple), var(--color-purple-semilight), var(--color-purple-light))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".color-purple-gradientDL-hover": {
          "background":
            "linear-gradient(to right, var(--color-purple-dark), var(--color-purple-semidark), var(--color-purple), var(--color-purple-semilight), var(--color-purple-light))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
          "transition":
            "background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out, text-fill-color 0.2s ease-in-out",
          "&:hover": {
            "background": "none",
            "-webkit-text-fill-color": "var(--color-purple-light)",
            "text-fill-color": "var(--color-purple-light)",
          },
        },
        ".color-purple-gradientLD": {
          "background":
            "linear-gradient(to right, var(--color-purple-light), var(--color-purple-semilight), var(--color-purple), var(--color-purple-semidark), var(--color-purple-dark))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
        },
        ".color-purple-gradientLD-hover": {
          "background":
            "linear-gradient(to right, var(--color-purple-light), var(--color-purple-semilight), var(--color-purple), var(--color-purple-semidark), var(--color-purple-dark))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
          "transition":
            "background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out, text-fill-color 0.2s ease-in-out",
          "&:hover": {
            "background": "none",
            "-webkit-text-fill-color": "var(--color-purple-light)",
            "text-fill-color": "var(--color-purple-light)",
          },
        },

        // Gradient Classes - Grey variants
        ".color-grey-gradientLD": {
          "background":
            "linear-gradient(to right, var(--color-grey-light), var(--color-grey-semilight), var(--color-grey), var(--color-grey-semidark), var(--color-grey-dark))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
        },
        ".color-grey-gradientLD-hover": {
          "background":
            "linear-gradient(to right, var(--color-grey-light), var(--color-grey-semilight), var(--color-grey), var(--color-grey-semidark), var(--color-grey-dark))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
          "transition":
            "background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out, text-fill-color 0.2s ease-in-out",
          "&:hover": {
            "background": "none",
            "-webkit-text-fill-color": "var(--color-grey-light)",
            "text-fill-color": "var(--color-grey-light)",
          },
        },
        ".color-grey-gradientDL": {
          "background":
            "linear-gradient(to right, var(--color-grey-dark), var(--color-grey-semidark), var(--color-grey), var(--color-grey-semilight), var(--color-grey-light))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".color-grey-gradientDL-hover": {
          "background":
            "linear-gradient(to right, var(--color-grey-dark), var(--color-grey-semidark), var(--color-grey), var(--color-grey-semilight), var(--color-grey-light))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
          "transition":
            "background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out, text-fill-color 0.2s ease-in-out",
          "&:hover": {
            "background": "none",
            "-webkit-text-fill-color": "var(--color-grey-light)",
            "text-fill-color": "var(--color-grey-light)",
          },
        },
        // Fix for iOS/Safari backdrop-blur issue
        // Overrides Tailwind's default backdrop-blur utilities that use CSS variables
        // which webkit browsers fail to parse correctly
        // See: https://github.com/tailwindlabs/tailwindcss/issues/13844
        ".backdrop-blur-none": {
          "-webkit-backdrop-filter": "blur(0)",
          "backdrop-filter": "blur(0)",
        },
        ".backdrop-blur-xs": {
          "-webkit-backdrop-filter": "blur(4px)",
          "backdrop-filter": "blur(4px)",
        },
        ".backdrop-blur-sm": {
          "-webkit-backdrop-filter": "blur(8px)",
          "backdrop-filter": "blur(8px)",
        },
        ".backdrop-blur": {
          "-webkit-backdrop-filter": "blur(12px)",
          "backdrop-filter": "blur(12px)",
        },
        ".backdrop-blur-md": {
          "-webkit-backdrop-filter": "blur(12px)",
          "backdrop-filter": "blur(12px)",
        },
        ".backdrop-blur-lg": {
          "-webkit-backdrop-filter": "blur(16px)",
          "backdrop-filter": "blur(16px)",
        },
        ".backdrop-blur-xl": {
          "-webkit-backdrop-filter": "blur(24px)",
          "backdrop-filter": "blur(24px)",
        },
        ".backdrop-blur-2xl": {
          "-webkit-backdrop-filter": "blur(40px)",
          "backdrop-filter": "blur(40px)",
        },
        ".backdrop-blur-3xl": {
          "-webkit-backdrop-filter": "blur(64px)",
          "backdrop-filter": "blur(64px)",
        },
      });
    }),
  ],
} satisfies Config;
