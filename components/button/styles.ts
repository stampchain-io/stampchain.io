/* ===== BUTTON STYLES MODULE ===== */
import { container2Hover, shadowL2, transitionColors } from "$layout";
import { JSX } from "preact";

/* ===== TYPE DEFINITIONS ===== */

// Basic button props interface - exclude conflicting HTML attributes
export interface ButtonProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "loading" | "size"> {
  variant?: keyof ButtonVariants["variant"];
  color?: keyof ButtonVariants["color"];
  size?: keyof ButtonVariants["size"];
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  "data-type"?: string;
  "f-partial"?: string;
}

export interface ButtonVariants {
  base: string;
  variant: Record<
    | "text"
    | "outline"
    | "flat"
    | "flatOutline"
    | "outlineFlat"
    | "custom",
    string
  >;
  color: Record<
    | "grey"
    | "purple"
    | "test"
    | "custom",
    string
  >;
  size: Record<
    // when adding new sizes, update the ToggleButton.tsx file too
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
    | "custom",
    string
  >;
  textSize: Record<
    "xs" | "sm" | "md" | "lg" | "xl",
    string
  >;
  state: {
    disabled: string;
    loading: string;
    active: string;
  };
}

/* ===== BUTTON VARIANT BASE STYLES DEFINITIONS ===== */
/* ToggleButton.tsx uses custom hover states for the selected state */
const baseOutline = `
  bg-color-background bg-opacity-10 hover:bg-opacity-50
  border border-[var(--color-button-semidark)] rounded-full
  text-[var(--color-button-semidark)]
  backdrop-blur-sm opacity-90 hover:opacity-100`;
const baseFlat = `
  bg-[linear-gradient(to_bottom_right,var(--color-button-light),var(--color-button-semilight),var(--color-button),var(--color-button-semidark),var(--color-button-dark))]
  border border-[var(--color-button-dark)] rounded-full
  text-color-background
  backdrop-blur-sm opacity-90 hover:opacity-100
  `;

export const buttonStyles: ButtonVariants = {
  /* ===== BASE STYLES ===== */
  base: `
    inline-flex items-center justify-center
    font-semibold tracking-wide
    ${transitionColors} cursor-pointer
  `,

  /* ===== VARIANT STYLES  ===== */
  /* If the outline/flat variants are changed then the SelectorButtons.tsx and ToggleButton.tsx files must be update too */
  variant: {
    text: `
      !items-start !justify-start !h-auto !p-0 bg-transparent
      text-[var(--color-button-dark)] hover:text-[var(--color-button)]
    `,
    outline: `
      ${baseOutline} ${shadowL2}
    `,
    flat: `
      ${baseFlat} ${shadowL2}
    `,
    flatOutline: `
      ${baseFlat} ${shadowL2}
      !items-center !justify-center
      hover:!bg-[linear-gradient(to_bottom_right,var(--color-background),var(--color-background),var(--color-background),var(--color-background),var(--color-background))]
      hover:!border-[var(--color-button-semidark)]
      hover:!text-[var(--color-button-semidark)] hover:!opacity-90
    `,
    outlineFlat: `
      ${baseOutline} ${shadowL2}
      !items-center !justify-center
      hover:!bg-[linear-gradient(to_bottom_right,var(--color-button-light),var(--color-button-semilight),var(--color-button),var(--color-button-semidark),var(--color-button-dark))]
      hover:!border-[var(--color-button-dark)]
      hover:!text-color-background hover:!opacity-90
    `,
    custom: `${shadowL2}`,
  },

  /* ===== COLOR STYLES ===== */
  /* Must use CSS variables, since Tailwind CSS definitions are utility classes and won't work */
  color: {
    grey: `
      [--color-button-dark:var(--color-grey-dark)]
      [--color-button-semidark:var(--color-grey-semidark)]
      [--color-button:var(--color-grey)]
      [--color-button-semilight:var(--color-grey-semilight)]
      [--color-button-light:var(--color-grey-light)]
    `,
    purple: `
      [--color-button-dark:var(--color-purple-dark)]
      [--color-button-semidark:var(--color-purple-semidark)]
      [--color-button:var(--color-purple)]
      [--color-button-semilight:var(--color-purple-semilight)]
      [--color-button-light:var(--color-purple-light)]
    `,
    test: `
      [--color-button-dark:var(--color-red-dark)]
      [--color-button-semidark:var(--color-red-semidark)]
      [--color-button:var(--color-green)]
      [--color-button-semilight:var(--color-orange-semilight)]
      [--color-button-light:var(--color-orange-light)]
    `,
    custom: "",
  },

  /* ===== SIZE STYLES ===== */
  size: {
    xxs: "h-[26px] px-[14px] text-[10px]",
    xs: "h-[30px] px-[14px] text-xs",
    sm: "h-[34px] px-4 text-xs",
    md: "h-[38px] px-4 text-sm",
    lg: "h-[42px] px-4 text-sm",
    xl: "h-[46px] px-5 text-base",
    xxl: "h-[50px] px-6 text-lg",
    xxsR: "h-[26px] tablet:h-[22px] px-[14px] text-[10px]",
    xsR: "h-[30px] tablet:h-[26px] px-[14px] text-xs tablet:text-[10px]",
    smR: "h-[34px] tablet:h-[30px] px-4 text-xs",
    mdR: "h-[38px] tablet:h-[34px] px-4 text-sm tablet:text-xs",
    lgR: "h-[42px] tablet:h-[38px] px-4 text-sm",
    custom: "/* Custom size - allows external sizing via className */",
  },

  /* ===== TEXT SIZE STYLES - ONLY USED FOR TEXT BUTTONS ===== */
  textSize: {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  },

  /* ===== STATE STYLES ===== */
  state: {
    disabled: `
      !opacity-60
      !cursor-not-allowed
      relative
      [&:after]:content-['SOON™']
      [&:after]:absolute [&:after]:inset-0
      [&:after]:flex [&:after]:items-center [&:after]:justify-center
      [&:after]:opacity-0 [&:after]:group-hover:opacity-100
      [&:after]:transition-opacity [&:after]:ease-in-out [&:after]:duration-200
      [&:after]:pointer-events-none [&:after]:z-10
      [&:after]:text-white [&:after]:text-xs [&:after]:font-bold
    `,
    loading: `
      !opacity-60
      cursor-wait
    `,
    active: `
      scale-95
      transform
      transition-transform
    `,
  },
};

/* ===== ADDITIONAL STYLES ===== */
/* ===== TOGGLE SWITCH BUTTON STYLES ===== */
export const toggleButton = `flex items-center relative w-10 h-5 !rounded-full
  ${container2Hover} group focus:outline-none focus-visible:outline-none transition duration-50`;
export const toggleKnobBackground =
  "flex justify-center items-center relative w-5 h-5 bg-transparent rounded-full cursor-pointer transition ease-in-out transform duration-400";
export const toggleKnob =
  "w-[14px] h-[14px] rounded-full cursor-pointer group-hover:from-color-primary-400 group-hover:to-color-primary-400";
/* ===== SLIDER BUTTON STYLES ===== */
export const sliderBar =
  `relative w-full h-5 tablet:h-4 !rounded-full ${container2Hover} group cursor-pointer`;
export const trackFill = `
  absolute top-0.5 bottom-0.5 h-[14px] tablet:h-[10px] rounded-full transition-colors duration-200 pointer-events-none
  `;
export const sliderKnob = `
  absolute top-0.5 bottom-0.5 w-full h-[14px] tablet:h-[10px] rounded-full appearance-none bg-transparent pointer-events-none focus:outline-none focus-visible:outline-none
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
  [&::-webkit-slider-thumb]:size-[14px] [&::-webkit-slider-thumb]:tablet:size-[10px]
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-color-neutral-400
  group-hover:[&::-webkit-slider-thumb]:bg-color-primary-400 [&::-webkit-slider-thumb]:cursor-grab
  [&::-webkit-slider-thumb]:active:cursor-grabbing
  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
  [&::-moz-range-thumb]:size-[14px][&::-moz-range-thumb]:tablet:size-[10px]
  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-color-neutral-400
  group-hover:[&::-moz-range-thumb]:bg-color-primary-400 [&::-moz-range-thumb]:cursor-grab
  [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:border-0
  `;

/* ===== STYLE COMPOSITION FUNCTION ===== */
export const button = (
  variant: keyof typeof buttonStyles.variant,
  color: keyof typeof buttonStyles.color,
  size: keyof typeof buttonStyles.size,
  state?: {
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    active?: boolean | undefined;
  },
) => {
  const stateClasses = [];
  if (state?.disabled) stateClasses.push(buttonStyles.state.disabled);
  if (state?.loading) stateClasses.push(buttonStyles.state.loading);
  if (state?.active) stateClasses.push(buttonStyles.state.active);

  return `
    ${buttonStyles.base}
    ${buttonStyles.variant[variant]}
    ${buttonStyles.color[color]}
    ${buttonStyles.size[size]}
    ${stateClasses.join(" ")}
  `;
};
