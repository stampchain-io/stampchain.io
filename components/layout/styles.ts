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
  `bg-gradient-to-b from-color-neutral-950/90 via-color-neutral-900/90 to-color-neutral-1000 backdrop-blur-lg`;
// 1st layer styles
export const container1 =
  `bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-950/80 border border-color-neutral-800 rounded-3xl backdrop-blur-sm`;
// 2nd layer styles - register tool tld dropdown uses same hardcoded values
export const container2 =
  `bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80 border border-color-neutral-700 rounded-2xl`;
export const container2Hover =
  `${container2} hover:border-color-hover ${transitionColors}`;
export const container2Icon =
  `relative flex items-center justify-between ${container2} rounded-full p-0.5 gap-1.5 tablet:gap-1`;
// Pill styles
export const containerPill = `flex items-center
 px-2.5 py-1 rounded-full
  bg-gradient-to-b from-color-neutral-700/80 via-color-neutral-800/90 to-color-neutral-800 select-none`; // do not add cursor-pointer here
export const containerPillCount = `flex items-center
 px-2.5 py-1 rounded-full border border-color-neutral-800
 bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80
 font-normal text-xs text-color-primary-400 cursor-default`;
// Card container styles - used for all cards
export const containerCard = `group relative z-0 flex flex-col
 w-full h-full p-1 ${container2Hover}
${shadowGlowPurple} ${transitionColors}`;
// 3rd layer styles - mainly used in cards
export const container3 =
  `bg-gradient-to-b from-color-neutral-800/80 via-color-neutral-900/90 to-color-neutral-900
 border border-color-neutral-800 rounded-xl cursor-default select-none`;

/* ===== BODY STYLES ===== */
// Main body styles
export const body = "flex flex-col w-full";
export const bodyTool = `
  ${body} mobileMd:max-w-[420px] mobileMd:mx-auto
`;
export const bodyArticle = `
  ${body} ${container1} tablet:max-w-[922px] tablet:mx-auto p-5
`;

/* ===== CONTAINER STYLES ===== */
// Base styles
export const containerBackground = `${body} ${container1} p-5`;
export const containerGap =
  "gap-section-mobile mobileLg:gap-section-tablet tablet:gap-section-desktop";
export const containerDetailImage = `relative ${container2} p-0.5`;
export const containerStickyBottom =
  `sticky bottom-0 mt-auto pb-7.5 tablet:pb-5`;

// Table card container styles - check if used
export const containerCardTable = `rounded-3xl ${container1} ${shadowGlowPurple}
  hover:border-color-purple-light`;

// Global styles
export const containerColData = "flex flex-col -space-y-1"; // Data specific
// Form styles
export const containerColForm = "flex flex-col w-full gap-5";
export const containerRowForm = "flex w-full gap-5";

/* ===== CARD GRID STYLES ===== */
// Card-size tiers (Sm/Md/Lg), decoupled from the cardSquare/cardVertical
// view-mode language — Sm packs the most columns (smallest cards), Lg the
// fewest (largest cards). Shared by WalletContent, ExplorerContent,
// MarketplaceContent — keeps column counts/gap consistent across pages.
export const gridCardSm =
  "grid grid-cols-3 mobileMd:grid-cols-4 mobileLg:grid-cols-5 tablet:grid-cols-6 desktop:grid-cols-8 gap-5 w-full auto-rows-fr";
export const gridCardMd =
  "grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-5 desktop:grid-cols-6 gap-5 w-full auto-rows-fr";
// Not in use yet — reserved for a future, even larger card tier.
export const gridCardLg =
  "grid grid-cols-1 mobileMd:grid-cols-2 mobileLg:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-5 gap-5 w-full auto-rows-fr";

// Md-tier variants sized for the wallet page's split-panel layout — the
// stamps panel is desktop:w-2/3 (more columns), the tokens panel is
// desktop:w-1/3 (fewer columns).
export const gridCardMdSplitSm =
  "grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-3 desktop:grid-cols-5 gap-5 w-full auto-rows-fr";
export const gridCardMdSplitMd =
  "grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-3 desktop:grid-cols-4 gap-5 w-full auto-rows-fr";
export const gridCardMdSplitLg =
  "grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-3 desktop:grid-cols-3 gap-5 w-full auto-rows-fr";

export function gridCard(
  viewMode: "cardVertical" | "cardSquare" | "cardRow" | "cardHorizontal",
  // Explorer page opts into the Md tier for cardSquare too (larger cards,
  // matching cardVertical's column counts) — other galleries (marketplace,
  // stamp overview, wallet) keep the denser Sm tier for cardSquare.
  gridCardSmVariant = false,
): string {
  // cardRow renders a table (never calls this) and cardHorizontal has no
  // dedicated layout yet — falls back to the Md grid until built.
  return viewMode === "cardSquare" && !gridCardSmVariant
    ? gridCardSm
    : gridCardMd;
}

// Wallet-specific grid picker: the split "all" section renders stamps and
// tokens side by side in narrower panels, so each panel gets a
// size-appropriate Md-split variant. The tokens panel (desktop:w-1/3)
// always uses the sparsest split tier. The stamps panel (desktop:w-2/3)
// packs in an extra column only for cardSquare (small, uniform cells
// tolerate the denser grid) — cardVertical keeps the medium split tier.
// Dedicated full-width stamps/tokens pages use the standard
// viewMode-based grid like every other page.
export function gridCardWallet(
  viewMode: "cardVertical" | "cardSquare" | "cardRow" | "cardHorizontal",
  section: "all" | "stamps" | "tokens",
  panel: "stamps" | "tokens",
): string {
  if (section === "all") {
    if (panel === "tokens") return gridCardMdSplitLg;
    return viewMode === "cardSquare" ? gridCardMdSplitSm : gridCardMdSplitMd;
  }
  return viewMode === "cardSquare" ? gridCardSm : gridCardMd;
}

/* ===== ROW STYLES ===== */
// Form styles
export const rowForm = "flex w-full";
export const rowResponsiveForm =
  "flex flex-col min-[420px]:flex-row w-full gap-5 min-[420px]:[&>*]:flex-1";
// Row container styles - used for all gallery (no content) containers
export const rowContainerBackground =
  `flex items-center justify-center w-full h-[42px] ${container2} px-2`; // update all tables to use this instead of custom code

/* ===== COL STYLES ===== */
export const colContainerBackground =
  `flex flex-col items-center w-full ${container2} p-2`;

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
// Marketplace and Explorer pagesStamp and SRC20 Table Row Cards - Stamp/tokencards inside of layer 1
const cell =
  "bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80 border-color-neutral-700 whitespace-nowrap";
export const cellLeftL2Card =
  `p-0.5 ${cell} rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} text-left`;
export const cellRightL2Card =
  `p-0.5 ${cell} rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} text-right`;
export const cellCenterL2Card = `p-0.5 ${cell} border-y-[1px] border-x-0
  group-hover:bg-black/20 group-hover:border-color-hover ${transitionColors} text-center`;
// Stamp and SRC20 Detail pages Table Rows
export const cellLeftL2Detail =
  `p-1.5 pl-3 ${cell} rounded-l-2xl border-y-[1px] border-l-[1px] border-r-0 group-hover:bg-black/20 ${transitionColors} whitespace-nowrap text-left`;
export const cellRightL2Detail =
  `p-1.5 pr-3 ${cell} rounded-r-2xl border-y-[1px] border-r-[1px] border-l-0 group-hover:bg-black/20 ${transitionColors} whitespace-nowrap text-right`;
export const cellCenterL2Detail =
  `p-1.5 ${cell} border-y-[1px] border-x-0 group-hover:bg-black/20 ${transitionColors} whitespace-nowrap text-center`;
/* refactor to base style and rename */
export const cellStickyLeft = `sticky left-0 ${cell} z-10`;
export const cellStickyLeft2 = `sticky left-10 ${cell} z-10`;

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
  container2Icon: string;
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
  containerCardTable: string;
  containerColData: string;
  containerColForm: string;
  containerRowForm: string;

  // Row styles
  rowForm: string;
  rowResponsiveForm: string;
  rowContainerBackground: string;

  // Col styles
  colContainerBackground: string;

  // Grid styles
  gridCardSm: string;
  gridCardMd: string;
  gridCardLg: string;
  gridCardMdSplitSm: string;
  gridCardMdSplitMd: string;
  gridCardMdSplitLg: string;

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
  cellStickyLeft2: string;

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
// Used in StatStyles.tsx
export const alignmentClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

// Type for alignment options
export type AlignmentType = keyof typeof alignmentClasses;
