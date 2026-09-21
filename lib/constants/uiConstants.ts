/**
 * UI Constants for BTC Stamps Explorer
 * Runtime constants for UI components, themes, and behaviors
 */

/**
 * Button variant types - standardized across the application
 */
export type ButtonVariant =
  | "outline"
  | "flat";

/**
 * Button color types - standardized theme colors
 */
export type ButtonColor =
  | "neutral"
  | "primary"
  | "secondary"
  | "test"
  | "custom";

/**
 * Button size types
 */
export type ButtonSize =
  | "xxs"
  | "xs"
  | "sm"
  | "md"
  | "mdSelector"
  | "lg"
  | "custom";

/**
 * Modal size constants
 */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/**
 * Loading state constants for async operations
 */
export type AsyncLoadingState = "idle" | "loading" | "success" | "error";

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

/**
 * Z-index layering system
 */
export const Z_INDEX = {
  DROPDOWN: 1000,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  TOOLTIP: 1060,
  TOAST: 1070,
  OVERLAY: 1080,
} as const;
