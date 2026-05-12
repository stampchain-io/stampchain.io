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
          neutral: {
            0: "#FFFFFF",
            50: "#FAFAFA",
            100: "#F5F5F5",
            200: "#E5E5E5",
            300: "#D4D4D4",
            400: "#A3A3A3",
            500: "#737373",
            600: "#525252",
            700: "#404040",
            800: "#262626",
            900: "#171717",
            950: "#0A0A0A",
            1000: "#000000",
          },
          primary: { // Fuchsia
            50: "#FDF4FF",
            100: "#FAE8FF",
            200: "#F5D0FE",
            300: "#F0ABFC",
            400: "#E879F9",
            500: "#D946EF",
            600: "#C026D3",
            700: "#A21CAF",
            800: "#86198F",
            900: "#701A75",
            950: "#4A044E",
          },
          secondary: { // Orange
            50: "#FFF7ED",
            100: "#FFEDD5",
            200: "#FED7AA",
            300: "#FDBA74",
            400: "#FB923C",
            500: "#F97316",
            600: "#EA580C",
            700: "#C2410C",
            800: "#9A3412",
            900: "#7C2D12",
            950: "#431407",
          },
          hover: {
            DEFAULT: "#E879F9", /* primary-400 */
          },
          purple: {
            dark: "#A21CAF", /* "#43005c", 700 */
            semidark: "#C026D3", /* "#610085", 600 */
            DEFAULT: "#D946EF", /* "#7f00ad", 500 */
            semilight: "#E879F9;", /* "#9d00d6", 400 */
            light: "#F0ABFC", /* "#BB00FF", 300*/
          },
          grey: {
            dark: "#404040", /* "#585552", */
            semidark: "#525252", /* "#817e78", */
            DEFAULT: "#737373", /* "#a8a39d", */
            semilight: "#A3A3A3", /* "#d1cbc3", */
            light: "#D4D4D4", /* "#f9f2e9", */
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
            DEFAULT: "#0A0A0A", /* neutral-950 */
            /* container-1 gradientbackground defined below */
            /* container-2 gradient background in layout/styles.ts */
          },
          border: {
            DEFAULT: "#404040", /* neutral-700 */
            /* container-1 border defined below */
            /* container-2 border hover uses "color-hover" */
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

          // Neutral color palette as CSS variables
          "--color-neutral-0": "#FFFFFF",
          "--color-neutral-50": "#FAFAFA",
          "--color-neutral-100": "#F5F5F5",
          "--color-neutral-200": "#E5E5E5",
          "--color-neutral-300": "#D4D4D4",
          "--color-neutral-400": "#A3A3A3",
          "--color-neutral-500": "#737373",
          "--color-neutral-600": "#525252",
          "--color-neutral-700": "#404040",
          "--color-neutral-800": "#262626",
          "--color-neutral-900": "#171717",
          "--color-neutral-950": "#0A0A0A",
          "--color-neutral-1000": "#000000",
          // Primary (fuchsia) color palette as CSS variables
          "--color-primary-50": "#FDF4FF",
          "--color-primary-100": "#FAE8FF",
          "--color-primary-200": "#F5D0FE",
          "--color-primary-300": "#F0ABFC",
          "--color-primary-400": "#E879F9",
          "--color-primary-500": "#D946EF",
          "--color-primary-600": "#C026D3",
          "--color-primary-700": "#A21CAF",
          "--color-primary-800": "#86198F",
          "--color-primary-900": "#701A75",
          "--color-primary-950": "#4A044E",
          // Secondary (orange) color palette as CSS variables
          "--color-secondary-50": "#FFF7ED",
          "--color-secondary-100": "#FFEDD5",
          "--color-secondary-200": "#FED7AA",
          "--color-secondary-300": "#FDBA74",
          "--color-secondary-400": "#FB923C",
          "--color-secondary-500": "#F97316",
          "--color-secondary-600": "#EA580C",
          "--color-secondary-700": "#C2410C",
          "--color-secondary-800": "#9A3412",
          "--color-secondary-900": "#7C2D12",
          "--color-secondary-950": "#431407",

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
            "linear-gradient(to right, var(--color-neutral-200), var(--color-neutral-300), var(--color-neutral-400), var(--color-neutral-500), var(--color-neutral-600))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
        },
        ".color-grey-gradientLD-hover": {
          "background":
            "linear-gradient(to right, var(--color-neutral-200), var(--color-neutral-300), var(--color-neutral-400), var(--color-neutral-500), var(--color-neutral-600))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
          "text-fill-color": "transparent",
          "transition":
            "background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out, text-fill-color 0.2s ease-in-out",
          "&:hover": {
            "background": "none",
            "-webkit-text-fill-color": "var(--color-primary-500)",
            "text-fill-color": "var(--color-primary-500)",
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
        // Container layer 1 - gradient border via ::before mask-composite technique.
        // isolation: isolate keeps the ::before z-index: -1 scoped to this element,
        // preventing it from slipping behind ancestor backgrounds.
        // Portal containers need to apply "!fixed" positioning
        ".bg-border-container-1": {
          "position": "relative",
          "isolation": "isolate",
          "background": [
            "linear-gradient(to bottom,",
            "color-mix(in srgb, var(--color-neutral-800) 40%, transparent),",
            "color-mix(in srgb, var(--color-neutral-900) 60%, transparent),",
            "color-mix(in srgb, var(--color-neutral-950) 80%, transparent)",
            ")",
          ].join(" "),
          "&::before": {
            "content": '""',
            "position": "absolute",
            "z-index": "-1",
            "inset": "0",
            "border-radius": "inherit",
            "padding": "1px",
            "background":
              "linear-gradient(to bottom, var(--color-neutral-800), var(--color-neutral-900))",
            "-webkit-mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "-webkit-mask-composite": "xor",
            "mask-composite": "exclude",
            "pointer-events": "none",
          },
        },

        ".bg-border-container-2,.bg-border-container-2-hover": {
          "position": "relative",
          "isolation": "isolate",
          "background": [
            "linear-gradient(to bottom,",
            "color-mix(in srgb, var(--color-neutral-900) 40%, transparent),",
            "color-mix(in srgb, var(--color-neutral-900) 60%, transparent),",
            "color-mix(in srgb, var(--color-neutral-950) 80%, transparent)",
            ")",
          ].join(" "),
          "&::before": {
            "content": '""',
            "position": "absolute",
            "z-index": "-1",
            "inset": "0",
            "border-radius": "inherit",
            "padding": "1px",
            "background":
              "linear-gradient(to bottom, var(--color-neutral-700), var(--color-neutral-800))",
            "-webkit-mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "-webkit-mask-composite": "xor",
            "mask-composite": "exclude",
            "pointer-events": "none",
          },
        },

        ".bg-border-container-2-hover:hover": {
          "&::before": {
            "content": '""',
            "position": "absolute",
            "z-index": "-1",
            "inset": "0",
            "border-radius": "inherit",
            "padding": "1px",
            "background":
              "linear-gradient(to bottom, var(--color-primary-300), var(--color-primary-400))",
            "-webkit-mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "-webkit-mask-composite": "xor",
            "mask-composite": "exclude",
            "pointer-events": "none",
          },
        },

        ".bg-border-container-2-hover:focus-within": {
          "&::before": {
            "content": '""',
            "position": "absolute",
            "z-index": "-1",
            "inset": "0",
            "border-radius": "inherit",
            "padding": "1px",
            "background":
              "linear-gradient(to bottom, var(--color-primary-400), var(--color-primary-400))",
            "-webkit-mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "-webkit-mask-composite": "xor",
            "mask-composite": "exclude",
            "pointer-events": "none",
          },
        },
        ".bg-border-container-2-secondary": {
          "position": "relative",
          "isolation": "isolate",
          "background": [
            "linear-gradient(to bottom,",
            "color-mix(in srgb, var(--color-neutral-900) 40%, transparent),",
            "color-mix(in srgb, var(--color-neutral-900) 60%, transparent),",
            "color-mix(in srgb, var(--color-neutral-950) 80%, transparent)",
            ")",
          ].join(" "),
          "&::before": {
            "content": '""',
            "position": "absolute",
            "z-index": "-1",
            "inset": "0",
            "border-radius": "inherit",
            "padding": "1px",
            "background":
              "linear-gradient(to bottom, var(--color-neutral-700), var(--color-neutral-800), var(--color-secondary-400))",
            "-webkit-mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "mask":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "-webkit-mask-composite": "xor",
            "mask-composite": "exclude",
            "pointer-events": "none",
          },
        },
      });
    }),
  ],
} satisfies Config;
