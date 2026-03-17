/* ===== ICON STYLES MODULE ===== */
/* @baba - check icon button hover states */
import { JSX } from "preact";

/* ===== TYPE DEFINITIONS ===== */
export interface IconVariants {
  type: "icon" | "iconButton";
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
    | "greyDark"
    | "grey"
    | "greyLight"
    | "purpleDark"
    | "purple"
    | "purpleLight"
    | "custom";
  className?: string | undefined;
  role?: JSX.AriaRole;
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
  // - Close icon in mobile menu drawer has custom gradient fill options (grey/purple)
  //   - the gradient defs have to be included in the file, since creating a global gradient file for them requires moving them up in the DOM tree (I abandoned this approach)

  icon: {
    greyDark:
      "stroke-color-grey-semidark fill-none [&_path[class*='fill-stroke']]:fill-color-grey-semidark",
    grey:
      "stroke-color-grey fill-none [&_path[class*='fill-stroke']]:fill-color-grey",
    greyLight:
      "stroke-color-grey-semilight fill-none [&_path[class*='fill-stroke']]:fill-color-grey-semilight",

    purpleDark:
      "stroke-color-purple-semidark fill-none [&_path[class*='fill-stroke']]:fill-color-purple-semidark",
    purple:
      "stroke-color-purple fill-none [&_path[class*='fill-stroke']]:fill-color-purple",
    purpleLight:
      "stroke-color-purple-semilight fill-none [&_path[class*='fill-stroke']]:fill-color-purple-semilight",

    custom: "fill-none",
  },

  iconButton: {
    greyDark:
      "stroke-color-grey-semidark hover:stroke-color-grey-light group-hover:stroke-color-grey-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-grey-semidark [&:hover_path[class*='fill-stroke']]:fill-color-grey-light [&:group-hover_path[class*='fill-stroke']]:fill-color-grey-light",
    grey:
      "stroke-color-grey hover:stroke-color-grey-light group-hover:stroke-color-grey-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-grey [&:hover_path[class*='fill-stroke']]:fill-color-grey-light [&:group-hover_path[class*='fill-stroke']]:fill-color-grey-light",
    greyLight:
      "stroke-color-grey-semilight hover:stroke-color-grey-light group-hover:stroke-color-grey-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-grey-semilight [&:hover_path[class*='fill-stroke']]:fill-color-grey-light [&:group-hover_path[class*='fill-stroke']]:fill-color-grey-light",

    purpleDark:
      "stroke-color-purple-semidark hover:stroke-color-purple-light group-hover:stroke-color-purple-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-purple-semidark [&:hover_path[class*='fill-stroke']]:fill-color-purple-light [&:group-hover_path[class*='fill-stroke']]:fill-color-purple-light",
    purple:
      "stroke-color-purple hover:stroke-color-purple-light group-hover:stroke-color-purple-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-purple [&:hover_path[class*='fill-stroke']]:fill-color-purple-light [&:group-hover_path[class*='fill-stroke']]:fill-color-purple-light",
    purpleLight:
      "stroke-color-purple-semilight hover:stroke-color-purple-light group-hover:stroke-color-purple-light fill-none hover:fill-none group-hover:fill-none cursor-pointer [&_path[class*='fill-stroke']]:fill-color-purple-semilight [&:hover_path[class*='fill-stroke']]:fill-color-purple-light [&:group-hover_path[class*='fill-stroke']]:fill-color-purple-light",

    custom: "fill-none cursor-pointer",
  },

  /* ===== WEIGHT VARIANTS ===== */
  weight: {
    extraLight: "[stroke-width:0.75]", // used for loading icon and tool image icons
    light: "[stroke-width:1.0]",
    normal: "[stroke-width:1.25] tablet:[stroke-width:1.0]",
    bold: "[stroke-width:1.5] tablet:[stroke-width:1.25]",
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
  "grey" | "red" | "green" | "orange",
  Palette
> = {
  grey: {
    bg:
      "bg-gradient-to-br from-color-grey-semidark/75 via-color-grey-dark/75 to-black",
    stroke: "stroke-color-grey-semidark",
    fill: "fill-color-grey-semidark",
  },
  red: {
    bg:
      "bg-gradient-to-br from-color-red-semidark/75 via-color-red-dark/75 to-black",
    stroke: "stroke-color-red-semidark",
    fill: "fill-color-red-semidark",
  },
  green: {
    bg:
      "bg-gradient-to-br from-color-green-semidark/75 via-color-green-dark/75 to-black",
    stroke: "stroke-color-green-semidark",
    fill: "fill-color-green-semidark",
  },
  orange: {
    bg:
      "bg-gradient-to-br from-color-orange-semidark/75 via-color-orange-dark/75 to-black",
    stroke: "stroke-color-orange-semidark",
    fill: "fill-color-orange-semidark",
  },
};

export const variantColor: Record<
  PlaceholderVariant,
  keyof typeof placeholderColor
> = {
  "no-image": "grey",
  "audio": "orange",
  "library": "green",
  "error": "red",
};

export function placeholderPalette(variant: PlaceholderVariant): Palette {
  const key = variantColor[variant];
  if (!key) throw new Error(`Unknown placeholder variant: ${variant}`);
  return placeholderColor[key];
}
