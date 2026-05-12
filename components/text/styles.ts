/* ===== TEXT STYLES MODULE ===== */
/* =================================================================== */

/* ===== BASE STYLES ===== */
const logoFont = "font-black italic text-3xl tracking-wide inline-block w-fit";
const titleFont = "font-black text-3xl tracking-tight inline-block w-fit ";
const subtitleFont = "font-bold text-2xl mb-2";
const textFont = "font-normal text-color-neutral-200";
const labelFont = "font-extrabold text-color-neutral-600 tracking-wide";
const valueFont = "font-medium text-color-neutral-200";
const select = "select-none whitespace-nowrap";
const transitionColors = "transition-colors duration-200";
const neutralGradient =
  "from-color-neutral-200 via-color-neutral-400 to-color-neutral-600 bg-clip-text text-transparent";
const neutralGradientHover =
  "hover:from-color-primary-400 hover:via-color-primary-400 hover:to-color-primary-400";
const primaryGradient =
  "from-color-primary-300 via-color-primary-500 to-color-primary-700 bg-clip-text text-transparent";
const primaryGradientHover =
  "hover:from-color-primary-400 hover:via-color-primary-400 hover:to-color-primary-400";

/* =================================================================== */

/* =================================================================== */

/* ===== LOGO STYLES ===== */
export const logoPurpleLD = // used in footer
  `${logoFont} bg-gradient-to-r ${primaryGradient} ${select}`;
export const logoPurpleLDLink =
  `${logoFont} bg-gradient-to-r ${primaryGradient} ${primaryGradientHover} ${transitionColors} cursor-pointer ${select}`;

export const logoPurpleDL =
  `${logoFont} bg-gradient-to-l ${primaryGradient} ${select}`;
export const logoPurpleDLLink =
  `${logoFont} bg-gradient-to-l ${primaryGradient} ${primaryGradientHover} ${transitionColors} cursor-pointer ${select}`;

/* =================================================================== */

/* ===== NAVIGATION STYLES ===== */
// Header Navigation - Desktop
export const navLinkDesktop =
  `mt-0.5 font-normal tablet:font-extralight text-base tablet:text-sm
  bg-gradient-to-b from-color-neutral-200 via-color-neutral-300 to-color-neutral-400 bg-clip-text text-transparent group-hover:from-color-primary-300 group-hover:via-color-primary-400 group-hover:to-color-primary-400 tracking-[0.01rem] ${transitionColors} cursor-pointer ${select}`;
export const navLinkActiveDesktop =
  `${navLinkDesktop} !text-color-hover !cursor-default`;
export const navSublinkDesktop =
  `font-light text-sm text-color-neutral-400 hover:text-color-hover tracking-tight ${transitionColors} cursor-pointer ${select}`; // used in WalletButton and ToolsButton for submenu links
export const navSublinkActiveDesktop =
  `${navSublinkDesktop} !text-color-hover !cursor-default`;

// Drawer Navigation - Mobile/tablet
export const navLinkMobile =
  `font-extralight text-2xl tablet:text-lg bg-gradient-to-r ${neutralGradient} ${neutralGradientHover} tracking-wider inline-block w-fit cursor-pointer ${select}`;
export const navLinkActiveMobile =
  `${navLinkMobile} text-color-grey-light [background:none_!important] [-webkit-text-fill-color:var(--color-grey-semilight)_!important] [text-fill-color:var(--color-grey-semilight)_!important] hover:[-webkit-text-fill-color:var(--color-grey)!important] hover:[text-fill-color:var(--color-grey)!important]`;
export const navSublinkMobile =
  `font-semibold text-base tablet:text-sm text-color-neutral-400 hover:text-color-primary-500
  tracking-wide ${transitionColors} cursor-pointer ${select}`;
export const navSublinkActiveMobile =
  `${navSublinkMobile} !text-color-primary-400 !cursor-default ${select}`;

// Footer - transparent text - used with the navLinkFooterOverlay class
export const navLinkFooter =
  `font-normal text-sm tablet:text-[13px] hover:text-color-hover tracking-tight ${transitionColors} cursor-pointer ${select}`;
export const navLinkFooterOverlay =
  `bg-gradient-to-r from-color-primary-500 to-color-primary-600 tablet:bg-gradient-to-l
  text-transparent bg-clip-text`;

/* =================================================================== */
/* ===== TITLE STYLES ===== */
export const titleGreyLD =
  `${titleFont} bg-gradient-to-r ${neutralGradient} cursor-default ${select}`;
export const titleGreyDL =
  `${titleFont} bg-gradient-to-l ${neutralGradient} cursor-default ${select}`;
export const titlePurpleLD =
  `${titleFont} bg-gradient-to-r ${primaryGradient} cursor-default ${select}`;
export const titlePurpleDL =
  `${titleFont} bg-gradient-to-l ${primaryGradient} cursor-default ${select}`;

/* ===== SUBTITLE STYLES ===== */
export const subtitleGrey =
  `${subtitleFont} text-color-neutral-100 cursor-default ${select}`;
export const subtitlePurple =
  `${subtitleFont} text-color-primary-400 cursor-default ${select}`;

/* ===== HEADING STYLES ===== */
export const headingGrey2 =
  `font-black text-3xl mobileLg:text-4xl text-color-grey-light tracking-wide ${select}`; // was used in about donate section - rename
export const headingGreyLD =
  `font-bold text-xl bg-gradient-to-r ${neutralGradient} tracking-wide inline-block w-fit relative ${select}`;
export const headingGreyLDLink =
  `font-bold text-lg bg-gradient-to-r ${neutralGradient} ${neutralGradientHover} tracking-wide inline-block w-fit relative ${transitionColors} cursor-pointer ${select}`; // used in media page / keep reading in howto pages / accordion titles (custom code)
export const headingGreyDLLink =
  `font-bold text-lg bg-gradient-to-l ${neutralGradient} ${neutralGradientHover} tracking-wide inline-block w-fit relative -mt-1 ${transitionColors} cursor-pointer ${select}`; // used in collection and stamp detail pages
export const headingGrey =
  `font-bold text-2xl text-color-neutral-300 cursor-default ${select}`; // used in howto overview and detail pages / donate CTA
export const headingPurpleLD =
  `font-black text-sm mobileMd:text-lg bg-gradient-to-r ${primaryGradient} tracking-wide inline-block w-fit text-center mt-3 mobileMd:mt-4 mobileLg:mt-5 mb-1 mobileMd:mb-0 ${select}`; // used specifically in team banner gallery

/* =================================================================== */
/* ===== BODY TEXT STYLES ===== */
export const textXxs = `${textFont} text-[10px]`;
export const textXs = `${textFont} text-xs`;
export const textSm = `${textFont} text-sm`;
export const textSmLink =
  `${textFont} text-sm hover:text-color-purple-light ${transitionColors} cursor-pointer ${select}`;
export const text = `${textFont} text-base`;
export const textLg = `${textFont} text-lg`;
export const textXl = `${textFont} text-xl`;
export const text2xl = `${textFont} text-2xl`;
export const textLinkUnderline =
  `font-medium text-base text-color-primary-400 animated-underline ${transitionColors}`;

/* ===== LINK STYLES ===== */
// Use the specific link styles created or just add "animated-underline" to the class name to apply an animated underline effect

/* =================================================================== */
/* ===== LABEL STYLES ===== */
export const labelXxs = `${labelFont} text-[10px] ${select}`;
export const labelXs = `${labelFont} text-xs ${select}`;
export const labelSm = `${labelFont} text-sm ${select}`;
export const label = `${labelFont} text-base ${select}`; // old dataLabel name
export const labelLg = `${labelFont} text-lg ${select}`;
export const labelXl = `${labelFont} text-xl ${select}`;
export const labelXsR = `${labelFont} text-xs tablet:text-[10px] ${select}`; // used for the filter file type labels
export const labelXsPosition =
  `flex justify-end mt-1 tablet:mt-0 -mb-5 tablet:-mb-4`; // used for the filter file type label positioning
export const labelLightSm = `font-light text-sm text-color-grey ${select}`;

export const labelSmPurple =
  `font-light text-sm text-color-purple-light tracking-wide mb-0.5 ${select}`;

export const labelLogicResponsive = ( // used for the filter labels
  checked: boolean,
  canHoverSelected: boolean,
): string => `
  inline-block ml-3 tablet:ml-[9px] pt-[1px] tablet:pt-0
  font-semibold text-sm tablet:text-xs
  transition-colors duration-200
  select-pointer select-none
  ${
  checked
    ? canHoverSelected
      ? "text-color-grey-light group-hover:text-color-grey"
      : "text-color-grey-light"
    : canHoverSelected
    ? "text-color-grey group-hover:text-color-grey-light"
    : "text-color-grey"
}
`;

/* =================================================================== */
/* ===== VALUE STYLES ===== */
// Grey variants
export const valueXs = `${valueFont} text-xs ${select}`;
export const valueSm = `${valueFont} text-sm ${select}`;
export const valueSmLink =
  `${valueFont} text-sm hover:text-color-grey ${transitionColors} cursor-pointer w-full ${select}`;
export const value = `${valueFont} text-base ${select}`;
export const valueLg = `${valueFont} text-lg ${select}`;
export const valueXl =
  `font-black text-xl text-color-grey-light -mt-1  ${select}`;
export const value2xl =
  `font-black text-2xl text-color-grey-light -mt-1 ${select}`;
export const value3xl =
  `font-black text-3xl text-color-grey-light -mt-1 ${select}`;
// Transparent variants
export const value2xlTransparent = `font-black text-2xl -mt-1 ${select}`;
export const value3xlTransparent = `font-black text-3xl -mt-1 ${select}`; // used in DetailsTableBase.tsx
// Purple variants
export const valueSmPurple =
  `font-medium text-xs text-color-purple text-center wcursor-default ${select}`; // used in team banner gallery
export const value2xlPurpleGlow =
  `font-black text-2xl text-black text-stroke-glow-small cursor-default ${select}`; // used in about header
export const value5xlPurpleGlow =
  `font-black text-5xl text-black text-stroke-glow-small cursor-default ${select}`; // used in about header
export const value7xlPurpleGlow =
  `font-black text-7xl text-black text-stroke-glow-large cursor-default ${select}`; // used in about header
// Dark variants
export const valueDarkXs =
  `font-medium text-xs text-color-grey-semidark tracking-tighter ${select}`; // used for addy styling in mobile/table header
export const valueDarkSm =
  `font-medium text-sm text-color-grey-semidark tracking-tighter ${select}`; // used for addy styling in desktop header
export const valueDark =
  `font-semibold text-base text-color-grey-semidark ${select}`; // used in tables
// Color variants
export const valuePositive = `text-color-green-semilight`;
export const valueNegative = `text-color-red-semilight`;
export const valueNeutral = `text-color-grey-semidark`;

/* ===== NOTIFICATION AND TOOLTIP STYLES ===== */
// One text style for tooltips - defined in /notifications/styles.ts
// Status, Success, Error and Info notification styles are defined in /notifications/styles.ts

/* ===== CODE STYLES ===== */
// Add "font-courier-prime" to the class name to use the Courier font and make text monospace

/* =================================================================== */
/* ===== SPECIAL TEXT STYLES ===== */
export const eybrowNeutral =
  `font-bold text-[0.625rem] text-color-neutral-500 tracking-wider cursor-default ${select}`; // descriptive text above icons, links, etc.
export const eybrowPrimary =
  `font-bold text-[0.625rem] text-color-primary-400 tracking-wider cursor-default ${select}`;
export const eybrowSecondary =
  `font-bold text-[0.625rem] text-color-secondary-400 tracking-wider cursor-default ${select}`;
export const tagline =
  `font-regular text-xs bg-gradient-to-r ${primaryGradient} ${select}`; // used in footer
export const copyright =
  `font-normal text-xs mobileMd:text-sm tablet:text-xs text-color-grey-dark cursor-default ${select}`; // used in the footer for copyright and counterparty version text
export const toggleSymbol =
  `font-bold text-[10px] text-black cursor-default ${select}`; // used in ToggleSwitchButton.tsx for $/BTC symbols

// Captions - used for stamp/token cards

/* =================================================================== */
/* ===== CARD TEXT STYLES ===== */
// Standard card styles
export const cardHashSymbol =
  `font-light text-color-purple-light text-lg mobileLg:text-xl ${select}`;
export const cardStampNumber =
  `font-extrabold text-color-purple-light truncate max-w-full text-lg mobileLg:text-xl ${select}`;
export const cardCreator =
  `font-semibold text-color-grey-light break-words text-center pt-1 text-xs mobileMd:text-sm ${select}`;
export const cardPrice =
  `font-normal text-color-grey-light text-nowrap text-xs mobileLg:text-sm ${select}`;
export const cardMimeType =
  `font-normal text-color-grey text-nowrap text-xs mobileLg:text-sm ${select}`;
export const cardSupply =
  `font-medium text-color-grey text-right text-xs mobileLg:text-base ${select}`;

// Minimal card variant styles
export const cardHashSymbolMinimal =
  `font-light text-color-grey-light group-hover:text-color-purple-light text-xs mobileSm:text-base mobileLg:text-xl tablet:text-xl desktop:text-xl ${transitionColors} ${select}`;
export const cardStampNumberMinimal =
  `font-black bg-gradient-to-r ${neutralGradient} group-hover:[-webkit-text-fill-color:var(--color-purple-light)] truncate text-sm mobileSm:text-base mobileLg:text-xl tablet:text-xl desktop:text-xl ${transitionColors} ${select}`;
export const cardPriceMinimal =
  `font-normal text-color-grey truncate text-nowrap text-[10px] mobileMd:text-xs mobileLg:text-sm ${select}`;

// Grey gradient card variant styles
export const cardHashSymbolGrey =
  `font-light text-color-grey group-hover:text-color-purple-light text-lg min-[420px]:text-xl ${transitionColors} ${select}`;
export const cardStampNumberGrey =
  `font-black bg-gradient-to-r ${neutralGradient} group-hover:[-webkit-text-fill-color:var(--color-purple-light)] truncate max-w-full text-lg min-[420px]:text-xl ${transitionColors} ${select}`;

/* =================================================================== */
/* ===== CARD CONFIGURATION - check if used ===== */
export const ABBREVIATION_LENGTHS = {
  desktop: 5,
  tablet: 5,
  mobileLg: 4,
  mobileMd: 5,
  mobileSm: 5,
} as const;

/* ===== UNCATEGORIZED STYLES ===== */
// Add any new styles you cannot categorize here

/* =================================================================== */

/* ===== TYPE DEFINITIONS ===== */
export type TextStyles = {
  // Logo styles
  logoPurpleDL: string;
  logoPurpleDLLink: string;
  logoPurpleLD: string;
  logoPurpleLDLink: string;
  // Navigation styles
  navLinkDesktop: string;
  navLinkActiveDesktop: string;
  navSublinkDesktop: string;
  navSublinkActiveDesktop: string;
  navLinkMobile: string;
  navLinkActiveMobile: string;
  navSublinkMobile: string;
  navSublinkActiveMobile: string;
  navLinkFooter: string;
  navLinkFooterOverlay: string;
  // Title styles
  titleGreyLD: string;
  titleGreyDL: string;
  titlePurpleLD: string;
  titlePurpleDL: string;
  // Subtitle styles
  subtitleGrey: string;
  subtitlePurple: string;
  // Heading styles
  headingGrey2: string;
  headingGreyLD: string;
  headingGreyLDLink: string;
  headingGreyDLLink: string;
  headingGrey: string;
  headingPurpleLD: string;
  // Body text styles
  textXxs: string;
  textXs: string;
  textSm: string;
  textSmLink: string;
  text: string;
  textLg: string;
  textXl: string;
  text2xl: string;
  textLinkUnderline: string;
  // Label styles
  labelXxs: string;
  labelXs: string;
  labelSm: string;
  label: string;
  labelLg: string;
  labelXl: string;
  labelXsR: string;
  labelXsPosition: string;
  labelLightSm: string;
  labelSmPurple: string;
  labelLogicResponsive: (
    checked: boolean,
    canHoverSelected: boolean,
  ) => string;
  // Value styles
  valueXs: string;
  valueSm: string;
  valueSmLink: string;
  value: string;
  valueLg: string;
  valueXl: string;
  value2xl: string;
  value3xl: string;
  value2xlTransparent: string;
  value3xlTransparent: string;
  valueSmPurple: string;
  value2xlPurpleGlow: string;
  value5xlPurpleGlow: string;
  value7xlPurpleGlow: string;
  valueDarkSm: string;
  valueDarkXs: string;
  valueDark: string;
  valueGain: string;
  valueLoss: string;
  // Special text styles
  eybrowNeutral: string;
  eybrowPrimary: string;
  tagline: string;
  copyright: string;
  toggleSymbol: string;
  // Card text styles
  cardHashSymbol: string;
  cardStampNumber: string;
  cardCreator: string;
  cardPrice: string;
  cardMimeType: string;
  cardSupply: string;
  cardHashSymbolMinimal: string;
  cardStampNumberMinimal: string;
  cardPriceMinimal: string;
  cardHashSymbolGrey: string;
  cardStampNumberGrey: string;
};
