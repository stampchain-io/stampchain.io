/* ===== LAYOUT STYLES MODULE ===== */
// Read the doc.md file for more information on the UI design and layout styles

/* ===== BASE STYLES ===== */
// General styles
// Horisontal Rule is defined in /styles.css using border color

// Transition styles - @baba-refactor codebase to use these instead of hardcoded values
export const transitionColors = "transition-colors duration-200";
export const transitionTransform =
  "transition-transform duration-500 will-change-transform";
export const transitionAll =
  "transition-all duration-500 will-change-transform";

// Shadow styles - also used in button/styles.ts
export const shadow =
  "shadow-[0_4px_8px_rgba(13,11,13,0.2),inset_0_1px_0_rgba(13,11,13,0.1),inset_0_-1px_0_rgba(13,11,13,0.1),inset_0_0_1px_1px_rgba(13,11,13,0.1)]";
export const shadowL2 =
  "shadow-[0_2px_4px_rgba(13,11,13,0.1),inset_0_1px_0_rgba(13,11,13,0.08),inset_0_-1px_0_rgba(13,11,13,0.08),inset_0_0_2px_2px_rgba(13,11,13,0.08)]";
export const shadowGlowPurple =
  `group hover:shadow-[0px_0px_16px_color-mix(in_srgb,var(--color-primary-500)_75%,transparent)] ${transitionColors} cursor-pointer`;
export const shadowGlowGrey =
  `group hover:shadow-[0px_0px_16px_color-mix(in_srgb,var(--color-neutral-500)_75%,transparent)] ${transitionColors} cursor-pointer`;

/* ===== CONTAINER LAYER STYLES ===== */
// Overlay layer styles - used for drawer and modal containers, border defined locally
export const container0 =
  `bg-gradient-to-b from-color-neutral-950/95 via-color-neutral-900/90 to-neutral-1000/90 backdrop-blur-lg`;
// 1st layer styles
export const container1 =
  `bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-950/80 border border-color-neutral-800 rounded-3xl backdrop-blur-sm`;
// 2nd layer styles - register tool tld dropdown uses same hardcoded values
export const container2 =
  `bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-950/80 border border-color-neutral-700 rounded-2xl`;
export const container2Hover =
  `${container2} hover:border-color-hover ${transitionColors}`;
export const container3 = `border border-color-neutral-800 rounded-xl
  bg-gradient-to-b from-color-neutral-800/80 via-color-neutral-900/90 to-color-neutral-950 cursor-default select-none`;
export const containerPill = `flex items-center py-1 px-3 rounded-full
  bg-gradient-to-b from-color-neutral-700 via-color-neutral-800 to-color-neutral-900 cursor-default select-none`;

/* ===== BODY STYLES ===== */
// Main body styles
export const body = "flex flex-col w-full";
export const bodyTool = `
  ${body} mobileMd:max-w-[420px] mobileMd:mx-auto
`;
export const bodyArticle = `
  ${body} tablet:max-w-[922px] tablet:mx-auto p-5 ${container1}
`;

/* ===== CONTAINER STYLES ===== */
// Base styles
export const containerBackground = `${body} p-5 ${container1}`;
export const containerGap = "gap-5 mobileLg:gap-7.5";
export const containerDetailImage = `relative p-5 ${container1}`;
export const containerStickyBottom = `sticky bottom-0 mt-auto py-9 tablet:py-6`;

// Stamp Card styles
export const containerCard = `${container1} ${shadowGlowPurple}
  hover:border-color-purple-light`; // check if used

export const containerCardL2 = `${container2} ${shadowGlowPurple}
  hover:border-color-purple-light`;

// Table card container styles - check if used
export const containerCardTable = `rounded-3xl ${container1} ${shadowGlowPurple}
  hover:border-color-purple-light`;

// Global styles
export const containerColData = "flex flex-col -space-y-1"; // Data specific
// Form styles
export const containerColForm = "flex flex-col w-full gap-5";
export const containerRowForm = "flex w-full gap-5";

/* ===== ROW STYLES ===== */
// Form styles
export const rowForm = "flex w-full";
export const rowResponsiveForm =
  "flex flex-col min-[420px]:flex-row w-full gap-5 min-[420px]:[&>*]:flex-1";
export const rowContainerBackground =
  `flex items-center justify-center w-full h-[46px] ${container1}`; // update all tables to use this instead of custom code
/* ===== COL STYLES ===== */

/* ===== CELL STYLES ===== */
// Layer 1
// Stamp and SRC20 Table Row Cards - Stamp/tokencards
// export const cellLeftCard =
//   `p-3 pl-4 rounded-l-3xl border-y-[1px] border-l-[1px] border-r-0 border-color-border
//   group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;
// export const cellRightCard =
//   `p-3 pr-4 rounded-r-3xl border-y-[1px] border-r-[1px] border-l-0 border-color-border
//   group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;
// export const cellCenterCard = `p-3 border-y-[1px] border-x-0 border-color-border
//   group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;

// Layer 2
// Stamp and SRC20 Table Row Cards - Stamp/tokencards inside of layer 1
export const cellLeftL2Card =
  `py-0.5 px-1 rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0 border-color-neutral-700
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;
export const cellRightL2Card =
  `py-0.5 px-1 rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0 border-color-neutral-700
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;
export const cellCenterL2Card =
  `py-0.5 px-1 border-y-[1px] border-x-0 border-color-neutral-700
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} whitespace-nowrap`;
// Stamp and SRC20 Detail pages Table Rows
export const cellLeftL2Detail =
  `p-1.5 pl-3 rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0 border-color-neutral-700 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;
export const cellRightL2Detail =
  `p-1.5 pr-3 rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0 border-color-neutral-700 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;
export const cellCenterL2Detail =
  `p-1.5 border-y-[1px] border-x-0 border-color-neutral-700 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;

export const cellStickyLeft =
  `sticky left-0 bg-transparent backdrop-blur-2xl tablet:backdrop-blur-none z-10`;

/* ===== IMAGE STYLES ===== */
export const imagePreviewTool =
  `flex items-center justify-center min-w-[100px] h-[100px] ${container2}`;
export const imageUploadTool =
  `flex items-center justify-center min-w-[100px] h-[100px] ${container2} hover:bg-color-grey-dark/30 ${transitionColors} cursor-pointer`;

/* ===== LOADER STYLES ===== */
// Text loader styles are defined in /text/styles.ts
// Skeleton loader styles are defined in /layout/SkeletonLoader.tsx
// Base loader style
const loaderSpin = "animate-spin rounded-full border-b-[2px]";
export const loaderSkeleton =
  `bg-color-background border border-color-border animate-pulse`;
// Spinning loader styles
export const loaderSpinXsGrey = `${loaderSpin} w-3 h-3 border-color-grey`;
export const loaderSpinSmGrey = `${loaderSpin} w-5 h-5 border-color-grey`;
export const loaderSpinGrey = `${loaderSpin} w-7 h-7 border-color-grey`;
export const loaderSpinLgGrey = `${loaderSpin} w-9 h-9 border-color-grey`;
export const loaderSpinXsPurple = `${loaderSpin} w-3 h-3 border-color-purple`;
export const loaderSpinSmPurple = `${loaderSpin} w-5 h-5 border-color-purple`;
export const loaderSpinPurple = `${loaderSpin} w-7 h-7 border-color-purple`;
export const loaderSpinLgPurple = `${loaderSpin} w-9 h-9 border-color-purple`;

/* ===== TYPE DEFINITIONS ===== */
export type LayoutStyles = {
  // Base styles
  transitionColors: string;
  transitionTransform: string;
  transitionAll: string;

  shadowGlowPurple: string;
  shadowGlowGrey: string;
  shadow: string;
  shadowL2: string;

  container0: string;
  container1: string;
  container2: string;
  container2Hover: string;
  container3: string;
  containerPill: string;

  // Body styles
  body: string;
  bodyTool: string;
  bodyArticle: string;

  // Container styles
  containerBackground: string;
  containerGap: string;
  containerDetailImage: string;
  containerStickyBottom: string;
  containerCard: string;
  containerCardL2: string;
  containerCardTable: string;
  containerColData: string;
  containerColForm: string;
  containerRowForm: string;

  // Row styles
  rowForm: string;
  rowResponsiveForm: string;
  rowContainerBackground: string;

  // Cell styles
  // cellLeftCard: string;   // unused — replaced by cellLeftL2Card
  // cellRightCard: string;  // unused — replaced by cellRightL2Card
  // cellCenterCard: string; // unused — replaced by cellCenterL2Card
  cellLeftL2Card: string;
  cellRightL2Card: string;
  cellCenterL2Card: string;
  cellLeftL2Detail: string;
  cellRightL2Detail: string;
  cellCenterL2Detail: string;
  cellStickyLeft: string;

  // Image styles
  imagePreviewTool: string;
  imageUploadTool: string;

  // Loader styles
  loaderSpinXsGrey: string;
  loaderSpinSmGrey: string;
  loaderSpinGrey: string;
  loaderSpinLgGrey: string;
  loaderSpinXsPurple: string;
  loaderSpinSmPurple: string;
  loaderSpinPurple: string;
  loaderSpinLgPurple: string;
  loaderSkeleton: string;
};

/* ===== ALIGNMENT UTILITIES ===== */
// Used in WalletComponents.tsx
export const alignmentClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

// Type for alignment options
export type AlignmentType = keyof typeof alignmentClasses;
