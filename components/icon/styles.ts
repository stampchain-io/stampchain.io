/* ===== ICON STYLES MODULE ===== */
/* @baba - check icon button hover states */
import type { AriaRole } from "preact";

/* ===== TYPE DEFINITIONS ===== */
export interface IconVariants {
  type: "icon" | "iconHover" | "iconButton";
  name: string;
  weight: "extraLight" | "light" | "normal" | "bold" | "custom";
  size:
    | "xxxs"
    | "xxs"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "xxl"
    | "xxsR"
    | "xsR"
    | "smR"
    | "mdR"
    | "lgR"
    | "xlR"
    | "xxlR"
    | "custom";
  color:
    | "neutral400"
    | "neutral500"
    | "neutral600"
    | "primary400"
    | "primary500"
    | "primary600"
    | "custom";
  className?: string | undefined;
  role?: AriaRole;
  ariaLabel?: string;
  isOpen?: boolean;
  onClick?:
    | ((
      e: MouseEvent & {
        currentTarget:
          | HTMLButtonElement
          | HTMLAnchorElement
          | HTMLImageElement
          | SVGElement;
      },
    ) => void)
    | undefined;
  onMouseEnter?:
    | ((
      e: MouseEvent & {
        currentTarget:
          | HTMLButtonElement
          | HTMLAnchorElement
          | HTMLImageElement
          | SVGElement;
      },
    ) => void)
    | undefined;
  onMouseLeave?:
    | ((
      e: MouseEvent & {
        currentTarget:
          | HTMLButtonElement
          | HTMLAnchorElement
          | HTMLImageElement
          | SVGElement;
      },
    ) => void)
    | undefined;
  href?: string | undefined;
  target?: string | undefined;
  rel?: string | undefined;
  text?: string | undefined;
  "f-partial"?: string | undefined;
  // Optional two-tone accent support (applies to the last path when provided)
  colorAccent?: string | undefined;
  colorAccentHover?: string | undefined;
}

export interface BadgeVariants {
  text: string;
  className?: string;
}

/* ===== GLOBAL SVG ATTRIBUTES ===== */
export const globalSvgAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  "stroke-linecap": "round" as const,
  "stroke-linejoin": "round" as const,
} as const;

/* ===== ICON STYLE DEFINITIONS ===== */
export const iconStyles = {
  /* ===== BASE STYLES ===== */
  base: "inline-block transition-colors duration-200",

  /* ===== ICON VARIANTS & COLOR STYLES ===== */
  // Note: Two-tone colors are built into the icon styles below
  // Custom color allows for special icons with advanced coloring:
  // - Gear icon in collapsible menu (mobile menu drawer) has conditional color based on menu state
  // - Close icon in mobile menu drawer has custom gradient fill options (neutral/primary)
  //   - the gradient defs have to be included in the file, since creating a global gradient file for them requires moving them up in the DOM tree (I abandoned this approach)

  icon: {
    // fill-stroke fills must be complete class literals (Tailwind JIT).
    neutral400:
      "stroke-color-neutral-400 fill-none [&_path[class*='fill-stroke']]:fill-color-neutral-400",
    neutral500:
      "stroke-color-neutral-500 fill-none [&_path[class*='fill-stroke']]:fill-color-neutral-500",
    neutral600:
      "stroke-color-neutral-600 fill-none [&_path[class*='fill-stroke']]:fill-color-neutral-600",

    primary400:
      "stroke-color-primary-400 fill-none [&_path[class*='fill-stroke']]:fill-color-primary-400",
    primary500:
      "stroke-color-primary-500 fill-none [&_path[class*='fill-stroke']]:fill-color-primary-500",
    primary600:
      "stroke-color-primary-600 fill-none [&_path[class*='fill-stroke']]:fill-color-primary-600",

    custom: "fill-none",
  },

  iconButton: {
    neutral400:
      "stroke-color-neutral-400 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-neutral-400 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",
    neutral500:
      "stroke-color-neutral-500 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-neutral-500 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",
    neutral600:
      "stroke-color-neutral-600 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-neutral-600 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",

    primary400:
      "stroke-color-primary-400 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-primary-400 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",
    primary500:
      "stroke-color-primary-500 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-primary-500 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",
    primary600:
      "stroke-color-primary-600 hover:stroke-color-hover group-hover:stroke-color-hover fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-primary-600 hover:[&_path[class*='fill-stroke']]:fill-color-hover group-hover:[&_path[class*='fill-stroke']]:fill-color-hover",

    custom: "fill-none cursor-pointer",
  },

  /* ===== WEIGHT VARIANTS ===== */
  weight: {
    extraLight: "[stroke-width:0.75]", // used for loading icon and tool image icons
    light: "[stroke-width:1.0]",
    normal: "[stroke-width:1.25] tablet:[stroke-width:1.0]",
    bold: "[stroke-width:1.25]",
    custom: "",
  },

  /* ===== SIZE VARIANTS ===== */
  size: {
    xxxs: "w-3 h-3",
    xxs: "w-4 h-4",
    xs: "w-5 h-5",
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-8 h-8",
    xl: "w-9 h-9",
    xxl: "w-10 h-10",

    xxsR: "w-4 h-4 tablet:w-3 tablet:h-3",
    xsR: "w-5 h-5 tablet:w-4 tablet:h-4",
    smR: "w-6 h-6 tablet:w-5 tablet:h-5",
    mdR: "w-7 h-7 tablet:w-6 tablet:h-6",
    lgR: "w-8 h-8 tablet:w-7 tablet:h-7",
    xlR: "w-9 h-9 tablet:w-8 tablet:h-8",
    xxlR: "w-10 h-10 tablet:w-9 tablet:h-9",
    custom: "",
  },
} as const;

/* ===== INTERACTIVE ELEMENT STYLES ===== */
/* ===== ICON BUTTON HOVER PILL =====
 * Applied automatically to type="iconButton" Icons (see IconBase.tsx) on the
 * wrapping <a>, not the svg. Icons that want the same interactive coloring
 * without the pill (e.g. tightly-spaced carets) should use type="iconHover"
 * instead. */
export const iconButtonPill = `p-1.5 bg-transparent rounded-full
  hover:bg-gradient-to-b hover:from-color-neutral-700/80 hover:via-color-neutral-800/90 hover:to-color-neutral-800`;

/* ===== SLIDER HANDLE ===== */
export const handleIcon = `
  absolute w-full h-4 tablet:h-3 rounded-full appearance-none bg-transparent pointer-events-none
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
  [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:tablet:size-3
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-color-grey
  [&::-webkit-slider-thumb]:hover:bg-color-grey-light [&::-webkit-slider-thumb]:cursor-grab
  [&::-webkit-slider-thumb]:active:cursor-grabbing
  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
  [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:tablet:size-3
  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-color-grey
  [&::-moz-range-thumb]:hover:bg-color-grey-light [&::-moz-range-thumb]:cursor-grab
  [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:border-0
`;

/* ===== PLACEHOLDER IMAGE ICON STYLES ===== */
export type PlaceholderVariant = "no-image" | "audio" | "library" | "error";

type Palette = { bg: string; stroke: string; fill: string };

export const placeholderColor: Record<
  "neutral" | "red" | "green" | "orange",
  Palette
> = {
  neutral: {
    bg:
      "bg-gradient-to-br from-color-neutral-500 via-color-neutral-700 to-color-neutral-900",
    stroke: "stroke-color-neutral-500",
    fill: "fill-color-neutral-500",
  },
  red: {
    bg:
      "bg-gradient-to-br from-color-red-600 via-color-red-800 to-color-neutral-900",
    stroke: "stroke-color-red-600",
    fill: "fill-color-red-600",
  },
  green: {
    bg:
      "bg-gradient-to-br from-color-green-600 via-color-green-800 to-color-neutral-900",
    stroke: "stroke-color-green-600",
    fill: "fill-color-green-600",
  },
  orange: {
    bg:
      "bg-gradient-to-br from-color-orange-600 via-color-orange-800 to-color-neutral-900",
    stroke: "stroke-color-orange-600",
    fill: "fill-color-orange-600",
  },
};

export const variantColor: Record<
  PlaceholderVariant,
  keyof typeof placeholderColor
> = {
  "no-image": "neutral",
  "audio": "orange",
  "library": "green",
  "error": "red",
};

export function placeholderPalette(variant: PlaceholderVariant): Palette {
  const key = variantColor[variant];
  if (!key) throw new Error(`Unknown placeholder variant: ${variant}`);
  return placeholderColor[key];
}
