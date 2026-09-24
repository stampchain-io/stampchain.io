/* ===== TEXT STYLES MODULE ===== */
/* ======================================================================== */
import { transitionColors } from "$components/layout/styles.ts";

/* ===== BASE STYLES ===== */
const logoFont = "font-black italic tracking-wide";
const titleFont =
  "font-black text-3xl uppercase tracking-tight -mt-2.5 inline-block w-fit cursor-default";
const subtitleFont = "font-light text-xl uppercase mb-2 cursor-default";
const textFont = "font-normal text-color-neutral-200";
const labelFont = "font-light text-color-neutral-500 tracking-wide";
const valueFont = "font-medium text-color-neutral-200";
const select = "select-none whitespace-nowrap";
export const truncate = "truncate max-w-[97%]";

/* ======================================================================== */

/* ======================================================================== */

/* ===== LOGO STYLES ===== */
export const logoHeader = // used in header wordmark (tablet+)
  `${logoFont} text-xl text-color-neutral-400 ${transitionColors} ${select}`;
export const logoFooter = // used in footer
  `${logoFont} text-3xl text-color-primary-400 ${select}`;

/* ======================================================================== */

/* ===== NAVIGATION STYLES ===== */
// Header Navigation - Desktop
export const navLinkDesktop = `mt-0.5 font-normal text-xs uppercase
  text-color-neutral-400 group-hover:text-color-hover tracking-[0.01rem] ${transitionColors} cursor-pointer ${select}`;
export const navLinkActiveDesktop =
  `${navLinkDesktop} !text-color-hover !cursor-default`;
export const navSublinkDesktop =
  `font-normal text-xs uppercase text-color-neutral-400 hover:text-color-hover tracking-tight ${transitionColors} cursor-pointer ${select}`; // used in WalletButton and ToolsButton for submenu links
export const navSublinkActiveDesktop =
  `${navSublinkDesktop} !text-color-hover !cursor-default`;

// Drawer Navigation - Mobile/tablet
export const navLinkMobile = `font-light text-lg uppercase
  text-color-neutral-200 hover:text-color-hover
  tracking-wider cursor-pointer ${select}`;
export const navLinkActiveMobile =
  `${navLinkMobile} text-color-hover !cursor-default`;
export const navSublinkMobile = `font-semibold text-xs uppercase
  text-color-neutral-400 hover:text-color-hover
  tracking-wide ${transitionColors} cursor-pointer ${select}`;
export const navSublinkActiveMobile =
  `${navSublinkMobile} !text-color-hover !cursor-default`;

// Footer - transparent text - used with the navLinkFooterOverlay class
export const navLinkFooter =
  `font-normal text-[0.8125rem] tablet:text-xs uppercase hover:text-color-hover tracking-tight ${transitionColors} cursor-pointer ${select}`;
export const navLinkFooterOverlay =
  `bg-gradient-to-b tablet:bg-gradient-to-r from-color-neutral-400 via-color-neutral-400 to-color-neutral-500 text-transparent bg-clip-text`;

/* ======================================================================== */

/* ===== TITLE STYLES ===== */
export const titleNeutral = `${titleFont} text-color-neutral-400 ${select}`;
export const titlePrimary = `${titleFont} text-color-primary-400 ${select}`;
export const titleSecondary = `${titleFont} text-color-secondary-400 ${select}`;

/* ======================================================================== */

/* ===== SUBTITLE STYLES ===== */
export const subtitleNeutral =
  `${subtitleFont} text-color-neutral-300 ${select}`;
export const subtitlePrimary =
  `${subtitleFont} text-color-primary-300 ${select}`;
export const subtitleSecondary =
  `${subtitleFont} text-color-secondary-300 ${select}`;

/* ======================================================================== */

/* ===== HEADING STYLES ===== */
export const headingGrey2 =
  `font-black text-3xl mobileLg:text-4xl text-color-grey-light tracking-wide ${select}`; // was used in about donate section - rename
export const headingGreyLD =
  `font-bold text-xl bg-gradient-to-r color-neutral-gradient tracking-wide inline-block w-fit relative ${select}`;
export const headingGreyLDLink =
  `font-bold text-lg bg-gradient-to-r color-neutral-gradient color-gradient-hover tracking-wide inline-block w-fit relative cursor-pointer ${select}`; // used in media page / keep reading in howto pages / accordion titles (custom code)
export const headingGreyDLLink =
  `font-bold text-lg bg-gradient-to-l color-neutral-gradient color-gradient-hover tracking-wide inline-block w-fit relative -mt-1 cursor-pointer ${select}`; // used in collection and stamp detail pages
export const headingGrey =
  `font-bold text-2xl text-color-neutral-300 cursor-default ${select}`; // used in howto overview and detail pages / donate CTA
export const headingPurpleLD =
  `font-black text-sm mobileMd:text-lg bg-gradient-to-r color-primary-gradient tracking-wide inline-block w-fit text-center mt-3 mobileMd:mt-4 mobileLg:mt-5 mb-1 mobileMd:mb-0 ${select}`; // used specifically in team banner gallery

/* ======================================================================== */

/* ===== BODY TEXT STYLES ===== */
export const textXxs = `${textFont} text-[0.625rem]`;
export const textXs = `${textFont} text-xs`;
export const textSm = `${textFont} text-sm`;
export const textSmLink =
  `${textFont} text-sm hover:text-color-hover ${transitionColors} cursor-pointer ${select}`;
export const text = `${textFont} text-base`;
export const textLg = `${textFont} text-lg`;
export const textXl = `${textFont} text-xl`;
export const text2xl = `${textFont} text-2xl`;
export const textLinkUnderline =
  `font-bold text-base text-color-neutral-200 link-neutral-200-bold ${transitionColors}`;

/* ===== LINK STYLES ===== */
// Use the specific link styles created or just add "link-neutral-200-bold" to the class name to apply an animated underline effect

/* ======================================================================== */

/* ===== LABEL STYLES ===== */
export const labelXxs = `${labelFont} text-[0.625rem] ${select}`;
export const labelXs = `${labelFont} text-xs ${select}`;
export const labelSm = `${labelFont} text-sm ${select}`;
export const label = `${labelFont} text-base ${select}`;
export const labelLg = `${labelFont} text-lg ${select}`;
export const labelXl = `${labelFont} text-xl ${select}`;
export const labelXsR = `${labelFont} text-xs tablet:text-[0.625rem] ${select}`; // used for the filter file type labels
export const labelLightSm = `font-light text-sm text-color-grey ${select}`;
export const labelSmPurple =
  `font-light text-sm text-color-purple-light tracking-wide mb-0.5 ${select}`;

export const labelLogicResponsive = ( // used for the filter labels
  checked: boolean,
  canHoverSelected: boolean,
): string => `
  inline-block ml-2 pt-[1px]
  font-medium text-xs
  ${transitionColors} ${select} cursor-pointer
  ${
  checked
    ? canHoverSelected
      ? "text-color-primary-400 group-hover:text-color-hover"
      : "text-color-primary-400"
    : canHoverSelected
    ? "text-color-neutral-400 group-hover:text-color-hover"
    : "text-color-neutral-400"
}
`;

/* ======================================================================== */

/* ===== VALUE STYLES ===== */
// Neutral variants
export const valueXs = `${valueFont} text-xs ${select}`;
export const valueSm = `${valueFont} text-sm ${select}`;
export const valueSmLink =
  `${valueFont} text-sm hover:text-color-hover ${transitionColors} cursor-pointer w-full ${select}`;
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
export const valueDarkSm =
  `font-normal text-sm text-color-neutral-500 ${select}`; // used for tables and addy styling in wallet button
export const valueDark =
  `font-semibold text-base text-color-neutral-500 ${select}`; // used in stamp details CPID and stamp number
export const valueDarkLg =
  `font-semibold text-lg text-color-neutral-500 ${select}`; // used in stamp details html title
// Color variants
export const valuePositive = `text-color-green-400`;
export const valueNegative = `text-color-red-400`;
export const valueNeutral = `text-color-neutral-400`;

/* ===== NOTIFICATION AND TOOLTIP STYLES ===== */
// One text style for tooltips - defined in /notifications/styles.ts
// Status, Success, Error and Info notification styles are defined in /notifications/styles.ts

/* ===== CODE STYLES ===== */
// Add "font-courier-prime" to the class name to use the Courier font and make text monospace

/* ======================================================================== */

/* ===== SPECIAL TEXT STYLES ===== */
export const eyebrowNeutral =
  `font-bold text-[0.625rem] text-color-neutral-700 tracking-wider cursor-default ${select}`; // descriptive text above icons, links, etc.
export const eyebrowPrimary =
  `font-bold text-[0.625rem] text-color-primary-300 tracking-wider cursor-default ${select}`;
export const eyebrowSecondary =
  `font-bold text-[0.625rem] text-color-secondary-300 tracking-wider cursor-default ${select}`;
export const eyebrowPositionFilter = `flex justify-end -mb-4`; // used for the filter file type label positioning
export const tagline = `font-regular text-xs text-color-neutral-400 ${select}`; // used in footer
export const copyright =
  `font-normal text-xs text-color-neutral-600 cursor-default ${select}`; // used in the footer for copyright and counterparty version text
export const toggleSymbol =
  `font-bold text-[10px] text-black cursor-default ${select}`; // used in ToggleSwitchButton.tsx for $/BTC symbols

/* ======================================================================== */

/* ===== CARD TEXT STYLES ===== */
// Standard card styles
export const cardStampNumber = `font-extrabold text-base min-[420px]:text-lg
   text-color-neutral-200 group-hover:text-color-hover
   tracking-wide ${truncate} ${select}`;
export const cardRowStampNumber = `font-extrabold text-sm
   text-color-neutral-200 group-hover:text-color-hover tracking-wide ${truncate} ${select}`;
export const cardCreator =
  `font-medium text-sm text-color-neutral-200 text-center ${truncate} ${select}`;
export const cardSupply =
  `font-semibold text-xs text-color-primary-400 ${select}`;
export const cardFileType =
  `font-medium text-xs text-color-neutral-200 text-nowrap ${select}`;
export const cardFileSize =
  `font-normal text-xs text-color-neutral-400 text-nowrap ${select}`;
export const cardPrice =
  `font-medium text-xs text-color-secondary-400 text-nowrap ${select}`;
export const cardEyebrowNeutral =
  `font-bold text-[0.625rem] text-color-neutral-600 tracking-wider ${select}`;
// Compact card variant styles
export const cardStampNumberCompact =
  `font-extrabold text-sm min-[420px]:text-base
  text-color-neutral-200 group-hover:text-color-hover
  tracking-wide truncate ${select} max-w-full`;
export const cardPriceCompact = `font-medium text-[0.625rem] mobileLg:text-xs
   text-color-secondary-400 text-nowrap ${select}`;

/* ===== UNCATEGORIZED STYLES ===== */
// Add any new styles you cannot categorize here

/* ======================================================================== */

/* ===== TYPE DEFINITIONS ===== */
export type TextStyles = {
  truncate: string;
  // Logo styles
  logoHeader: string;
  logoFooter: string;
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
  titleNeutral: string;
  titlePrimary: string;
  titleSecondary: string;
  // Subtitle styles
  subtitleNeutral: string;
  subtitlePrimary: string;
  subtitleSecondary: string;
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
  valueDark: string;
  valuePositive: string;
  valueNegative: string;
  valueNeutral: string;
  // Special text styles
  eyebrowNeutral: string;
  eyebrowPrimary: string;
  eyebrowSecondary: string;
  eyebrowPositionFilter: string;
  tagline: string;
  copyright: string;
  toggleSymbol: string;
  // Card text styles
  cardStampNumber: string;
  cardRowStampNumber: string;
  cardCreator: string;
  cardSupply: string;
  cardFileType: string;
  cardFileSize: string;
  cardPrice: string;
  cardEyebrowNeutral: string;
  cardStampNumberCompact: string;
  cardPriceCompact: string;
};
