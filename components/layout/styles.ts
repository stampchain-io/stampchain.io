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
  `group hover:shadow-[0px_0px_16px_color-mix(in_srgb,var(--color-purple-light)_75%,transparent)] ${transitionColors} cursor-pointer`;
export const shadowGlowGrey =
  `group hover:shadow-[0px_0px_16px_color-mix(in_srgb,var(--color-grey-light)_75%,transparent)] ${transitionColors} cursor-pointer`;

// Glassmorphism styles
// Overlay layer styles - used for drawer and modal containers
export const glassmorphismOverlay =
  `bg-gradient-to-b from-color-background/95 via-color-background/70 to-black/90 backdrop-blur-lg`;
// 1st layer styles
export const glassmorphism = `border border-color-border/50 rounded-3xl
  bg-gradient-to-br from-[#191919]/40 via-color-background/50 to-black/60
  backdrop-blur-sm ${shadow}`;
// 2nd layer styles - register tool tld dropdown uses same hardcoded values
export const glassmorphismL2 = `border border-color-border/75 rounded-2xl
  bg-color-background/30 backdrop-blur-sm ${shadowL2}`;
export const glassmorphismL2Hover =
  `hover:bg-color-background/60 hover:border-color-border`;

/* ===== BODY STYLES ===== */
// Main body styles
export const body = "flex flex-col w-full";
export const bodyTool = `
  ${body} mobileMd:max-w-[420px] mobileMd:mx-auto
`;
export const bodyArticle = `
  ${body} tablet:max-w-[922px] tablet:mx-auto p-5 ${glassmorphism}
`;

/* ===== CONTAINER STYLES ===== */
// Base styles
export const containerBackground = `${body} p-5 ${glassmorphism}`;
export const containerGap = "gap-5 mobileLg:gap-7.5";
export const containerDetailImage = `relative p-5 ${glassmorphism}`;
export const containerStickyBottom = `sticky bottom-0 mt-auto py-9 tablet:py-6`;

// Stamp Card styles
export const containerCard = `${glassmorphism} ${shadowGlowPurple}
  hover:border-color-purple-light`; // check if used

export const containerCardL2 = `${glassmorphismL2} ${shadowGlowPurple}
  hover:border-color-purple-light`;

// Table card container styles - check if used
export const containerCardTable =
  `rounded-3xl ${glassmorphism} ${shadowGlowPurple}
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
  `flex items-center justify-center w-full h-[46px] ${glassmorphism}`; // update all tables to use this instead of custom code
/* ===== COL STYLES ===== */

/* ===== CELL STYLES ===== */
// Layer 1
// Stamp and SRC20 Table Row Cards - Stamp/tokencards
export const cellLeftCard =
  `p-3 pl-4 rounded-l-3xl border-y-[1px] border-l-[1px] border-r-0 border-color-border/50
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
export const cellRightCard =
  `p-3 pr-4 rounded-r-3xl border-y-[1px] border-r-[1px] border-l-0 border-color-border/50
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
export const cellCenterCard =
  `p-3 border-y-[1px] border-x-0 border-color-border/50
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
// Layer 2
// Stamp and SRC20 Table Row Cards - Stamp/tokencards inside of layer 1
export const cellLeftL2Card =
  `p-3 pl-4 rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0 border-color-border/75
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
export const cellRightL2Card =
  `p-3 pr-4 rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0 border-color-border/75
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
export const cellCenterL2Card =
  `p-3 border-y-[1px] border-x-0 border-color-border/75
  group-hover:bg-black/20 group-hover:border-color-purple-light ${transitionColors} whitespace-nowrap`;
// Stamp and SRC20 Detail pages Table Rows
export const cellLeftL2Detail =
  `p-1.5 pl-3 rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0 border-color-border/75 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;
export const cellRightL2Detail =
  `p-1.5 pr-3 rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0 border-color-border/75 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;
export const cellCenterL2Detail =
  `p-1.5 border-y-[1px] border-x-0 border-color-border/75 group-hover:bg-black/20 group-hover:border-color-border ${transitionColors} whitespace-nowrap`;

export const cellStickyLeft =
  `sticky left-0 bg-black/70 tablet:bg-transparent backdrop-blur-xl tablet:backdrop-blur-none z-10`;

/* ===== IMAGE STYLES ===== */
export const imagePreviewTool =
  `flex items-center justify-center min-w-[100px] h-[100px] ${glassmorphismL2}`;
export const imageUploadTool =
  `flex items-center justify-center min-w-[100px] h-[100px] ${glassmorphismL2} hover:bg-color-grey-dark/30 ${transitionColors} cursor-pointer`;

/* ===== LOADER STYLES ===== */
// Text loader styles are defined in /text/styles.ts
// Skeleton loader styles are defined in /layout/SkeletonLoader.tsx
// Base loader style
const loaderSpin = "animate-spin rounded-full border-b-[2px]";
export const loaderSkeleton =
  `bg-color-background/50 border border-color-border/50 animate-pulse`;
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
  hr: string;
  transitionColors: string;
  transitionTransform: string;
  transitionAll: string;

  shadowGlowPurple: string;
  shadowGlowGrey: string;
  shadow: string;
  shadowL2: string;

  glassmorphism: string;
  glassmorphismOverlay: string;
  glassmorphismL2: string;
  glassmorphismL2Hover: string;

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
  rowTable: string;
  rowCardBorderLeft: string;
  rowCardBorderRight: string;
  rowCardBorderCenter: string;

  // Cell styles
  cellLeftCard: string;
  cellRightCard: string;
  cellCenterCard: string;
  cellLeftL2Card: string;
  cellRightL2Card: string;
  cellCenterL2Card: string;
  cellLeftL2Detail: string;
  cellRightL2Detail: string;
  cellCenterL2Detail: string;
  cellStickyLeft: string;

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
  loaderSkeletonImage: string;
  loaderSkeletonMd: string;
  loaderSkeletonLg: string;
  loaderSkeletonFull: string;
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
