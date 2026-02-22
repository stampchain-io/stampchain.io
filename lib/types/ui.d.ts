/**
 * UI Component Types Module
 *
 * Comprehensive type definitions for UI components in the BTC Stamps Explorer
 * Built for Fresh framework with Preact components
 *
 * Domain: User Interface Components
 * Framework: Fresh 1.7.3, Preact 10.22.0
 * Usage: Import UI component types and interfaces
 */

import type { IconVariants } from "$components/icon/styles.ts";
import type { Timeframe } from "$components/layout/types.ts";
import type {
  ButtonColor,
  ButtonSize,
  ButtonVariant,
  CircuitState,
} from "$constants";
import type { Signal } from "@preact/signals";
import type { ComponentChildren, ComponentProps, JSX, Ref } from "preact";

// Re-export button types for use by other modules
export type { ButtonColor, ButtonSize, ButtonVariant };

import type { StampFilterType, StampType } from "$constants";
import type { StampFilters } from "$islands/filter/FilterOptionsStamp.tsx";
import type { FeeEstimationResult as TransactionFeeEstimationResult } from "$lib/utils/bitcoin/minting/TransactionConstructionService.ts";
import type {
  AlignmentType,
  AncestorInfo,
  FeeDetails,
  MintDetails,
  TransferDetails,
} from "$types/base.d.ts";
import type {
  CompilerConfiguration,
  ErrorHandlingInfo,
  ErrorInfo,
  FileCompilationMetrics,
  ProgressiveFeeEstimationResult,
} from "$types/index.d.ts";
import type { MarketListingAggregated } from "$types/marketData.d.ts";
import type {
  CollectionWithOptionalMarketData,
  Deployment,
  FeeData,
  PSBTFees,
  SRC20MintStatus,
} from "$types/services.d.ts";
import type { SortDirection, SortKey, SortMetrics } from "$types/sorting.d.ts";
import type { ScriptType, SRC20_TYPES, SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type {
  SRC20Transaction,
  StampTransaction,
  StampTransferDetails,
} from "$types/stamping.ts";
import type {
  Wallet,
  WalletFilterOptions,
  WalletInfo,
  WalletOverviewInfo,
  WalletProviders,
  WalletSortKey,
  WalletStampWithValue,
} from "$types/wallet.d.ts";

/**
 * SignalLike type to handle Fresh framework signal compatibility
 * Supports both Signal and signal-like objects that may be undefined
 */
type SignalLike<T> = Signal<T> | { value: T; [key: string]: any } | T;

// Re-export imported types that are used by other modules
export type {
  AnimationProps,
  AsyncStateProps,
  EmptyStateProps,
  ErrorStateProps,
  LoadingStateProps,
  TransitionProps,
} from "$types/base.d.ts";
export type { ErrorInfo } from "$types/errors.d.ts";
export type {
  QuickNodeConfig,
  QuickNodeError,
  QuickNodeResponse,
  ServiceResponse,
} from "$types/services.d.ts";
export type { WalletOverviewInfo } from "$types/wallet.d.ts";
// ButtonProps is defined as BaseButtonProps in this file

/**
 * Option for select and dropdown components
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Responsive layout properties
 * Controls visibility and behavior across different screen sizes
 */
export interface ResponsiveProps {
  hideOn?:
    | ("mobile" | "tablet" | "desktop")
    | ("mobile" | "tablet" | "desktop")[]
    | undefined;
  showOn?:
    | ("mobile" | "tablet" | "desktop")
    | ("mobile" | "tablet" | "desktop")[]
    | undefined;
}

/**
 * Table configuration for tab-based tables
 */
export interface TabConfig {
  id: string;
  label: string;
  count?: number;
}

/**
 * Tab data storage
 */
export type TabData = Record<string, any>;

/**
 * Table type enumeration
 */
export type TableType = "stamps" | "src20" | "src101" | "vault";

/**
 * Props for generic table component
 * Supports customization, sorting, and pagination
 */
export interface TableProps<T = any> {
  striped?: boolean;
  rowKey?: string;
  data?: T[];
  columns?: TableColumn[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string;
  pagination?: {
    page: number;
    total: number;
    limit: number;
    onPageChange?: (page: number) => void;
  };
  customClasses?: {
    table?: string;
    header?: string;
    row?: string;
    cell?: string;
  };
  sortable?: boolean;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  // Additional props for DetailsTableBase
  type?: TableType;
  configs?: TabConfig[];
  cpid?: string;
  tick?: string;
  initialCounts?: Record<string, number>;
}
// Removed circular self-import block - these types should be defined locally
// import type {
//   ActivityBadgeProps,
//   AnchorElementProps,
//   AnimationProps,
//   ArticleProps,
//   AsyncStateProps,
//   AuthorProps,
//   BaseButtonProps,
//   BaseComponentProps,
//   BlockProps,
//   BTCValueDisplayProps,
//   BTCValueSummaryProps,
//   ButtonElementProps,
//   BuyStampModalProps,
//   CarouselHomeProps,
//   CarouselProps,
//   ChartWidgetProps,
//   CheckboxProps,
//   CloseIconProps,
//   CollectionGalleryProps,
//   CollectionOverviewPageProps,
//   CollectionsBannerProps,
//   ColorSwatchProps,
//   CompleteSortingInterfaceProps,
//   ConfirmDialogProps,
//   ConnectWalletModalProps,
//   ContainerProps,
//   ConvenienceProviderProps,
//   DetailSRC101ModalProps,
//   DonateStampModalProps,
//   EmptyStateProps,
//   EnhancedSortButtonProps,
//   ErrorDisplayProps,
//   ErrorStateProps,
//   ExplorerContentProps,
//   ExtendedComponentProps,
//   FairmintToolProps,
//   FaqAccordionProps,
//   FilterSRC20ModalProps,
//   FlexboxProps,
//   FormControlProps,
//   FreshSRC20GalleryProps,
//   FreshStampGalleryProps,
//   GearIconProps,
//   GridProps,
//   HoldersTableBaseProps,
//   HoldersTableProps,
//   IconButtonProps,
//   IconProps,
//   InputFieldProps,
//   InputProps,
//   KeyboardNavigationProps,
//   LoadingIconProps,
//   LoadingStateProps,
//   MaraModeIndicatorProps,
//   MaraModeWarningModalProps,
//   MaraServiceUnavailableModalProps,
//   MaraStatusLinkProps,
//   MaraSuccessMessageProps,
//   MarketDataStatusProps,
//   MetaTagsProps,
//   MintProgressProps,
//   ModalBaseProps,
//   ModalComponentProps,
//   ModalOverlayProps,
//   ModalSearchBaseProps,
//   NotificationBannerProps,
//   PaginationProps,
//   PieChartProps,
//   PolymorphicComponentProps,
//   PreviewCodeModalProps,
//   PreviewImageModalProps,
//   ProcessingButtonProps,
//   ProgressIndicatorProps,
//   ProgressiveEstimationIndicatorProps,
//   RadioProps,
//   RangeInputProps,
//   ReadAllButtonProps,
//   ReceiveAddyModalProps,
//   RecentSaleCardProps,
//   RecentSalesGalleryProps,
//   ResponsiveProps,
//   SalesActivityFeedProps,
//   ScreenReaderProps,
//   ScrollContainerProps,
//   SectionHeaderProps,
//   SelectFieldProps,
//   SelectorButtonsProps,
//   SelectProps,
//   SendBTCModalProps,
//   SettingProps,
//   SharedListProps,
//   SortingButtonsProps,
//   SortingComponentProps,
//   SortingDropdownProps,
//   SortingErrorBoundaryProps,
//   SortingErrorFallbackProps,
//   SortingErrorProps,
//   SortingLabelProps,
//   SortingProviderProps,
//   SortingProviderWithURLProps,
//   SortProps,
//   SpinnerProps,
//   SRC101RegisterToolProps,
//   SRC20CardMintingProps,
//   SRC20CardProps,
//   SRC20CardSmMintingProps,
//   SRC20CardSmProps,
//   SRC20DetailPageProps,
//   SRC20InputFieldProps,
//   SRC20MintedTableProps,
//   SRC20MintingTableProps,
//   SRC20MintsProps,
//   SRC20MintToolProps,
//   SRC20OverviewContentProps,
//   SRC20OverviewHeaderProps,
//   SRC20TransfersProps,
//   StampBTCValueProps,
//   StampDetailPageProps,
//   StampGalleryProps,
//   StampInfoProps,
//   StampListingsAllProps,
//   StampListingsOpenProps,
//   StampOverviewContentProps,
//   StampOverviewGalleryProps,
//   StampSalesProps,
//   StampTransfersProps,
//   StatBaseProps,
//   StatItemProps,
//   StatTitleProps,
//   StatusMessagesProps,
//   StyledSortingButtonsProps,
//   StyledSortingDropdownProps,
//   StyledSortingErrorProps,
//   StyledSortingLabelProps,
//   TableProps,
//   TextareaProps,
//   ToastComponentProps,
//   ToastProps,
//   ToastProviderProps,
//   ToggleSwitchButtonProps,
//   ToolFairmintPageProps,
//   ToolSrc20PageProps,
//   ToolsSrc101PageProps,
//   ToolStampPageProps,
//   TotalBTCValueProps,
//   TransactionBadgeProps,
//   TransactionHexDisplayProps,
//   TransactionProgressProps,
//   TransactionStatusProps,
//   TransitionProps,
//   WalletComponentProps,
//   WalletDashboardDetailsProps,
//   WalletDispenserDetailsProps,
//   WalletProfileDetailsProps,
//   WalletProviderProps,
//   WalletStampCardProps,
//   WalletStampValueProps,
// } from "$types/ui.d.ts"; // Commented out circular import

// =============================================================================
// CORE UI FRAMEWORK TYPES
// =============================================================================

/**
 * Base component props that all UI components should extend
 */
export interface BaseComponentProps {
  class?: string;
  className?: string;
  children?: ComponentChildren;
  testId?: string;
  "aria-label"?: string;
  id?: string;
}

/**
 * Extended base props with common HTML attributes
 */
export interface ExtendedComponentProps extends BaseComponentProps {
  style?: JSX.CSSProperties;
  onClick?:
    | MouseEventHandler<HTMLElement>
    | ((event: JSX.TargetedEvent<HTMLButtonElement>) => void);
  onKeyDown?: KeyboardEventHandler;
  role?: string;
  tabIndex?: number;
}

// =============================================================================
// LAYOUT COMPONENT PROPS
// =============================================================================

/**
 * Container component props for layout containers
 */
export interface ContainerProps extends BaseComponentProps {
  maxWidth?: string;
  padding?: string;
  margin?: string;
  centered?: boolean;
}

/**
 * Flexbox layout component props
 */
export interface FlexboxProps extends BaseComponentProps {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  justify?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  align?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  gap?: string;
}

/**
 * Grid layout component props
 */
export interface GridProps extends BaseComponentProps {
  cols?: number;
  columns?: number | string;
  rows?: number | string;
  gap?: string;
  columnGap?: string;
  rowGap?: string;
  templateColumns?: string;
  templateRows?: string;
}

// =============================================================================
// CHART & VISUALIZATION COMPONENT PROPS
// =============================================================================

/**
 * Chart data structure for Chart.js
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }>;
  length?: number;
}

/**
 * Highcharts data point - [timestamp, value] or number
 */
export type HighchartsDataPoint = [number, number] | number;

/**
 * Highcharts series data - array of data points
 */
export type HighchartsData = HighchartsDataPoint[];

/**
 * Chart widget component props
 */
export interface ChartWidgetProps extends BaseComponentProps {
  type?: "line" | "bar" | "pie" | "doughnut" | "radar" | "area";
  data?: HighchartsData;
  options?: any; // Highcharts options object
  width?: number | string;
  height?: number | string;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  fromPage?: string;
  tick?: string;
  initialData?: any; // Renamed from 'data' to clarify usage
}

// =============================================================================
// LOADING & PROGRESS COMPONENT PROPS
// =============================================================================

/**
 * Loading icon component props
 */
export interface LoadingIconProps extends BaseComponentProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
  speed?: "slow" | "normal" | "fast";
  label?: string;
  containerClassName?: string;
  wrapperClassName?: string;
}

/**
 * Progress indicator component props
 */
export interface ProgressIndicatorProps extends BaseComponentProps {
  value?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: "linear" | "circular";
  color?: string;
  size?: ButtonSize;
  indeterminate?: boolean;
  state?: ProgressState;
  message?: string;
  class?: string;
}

// =============================================================================
// INTERACTION COMPONENT PROPS
// =============================================================================

// Button types are imported from $constants (uiConstants.ts)

/**
 * Icon component props
 */
export interface IconProps extends BaseComponentProps {
  name?: string;
  size?: number | string;
  color?: string;
  variant?: "solid" | "outline" | "ghost";
  weight?: "light" | "regular" | "bold" | undefined;
  onClick?:
    | MouseEventHandler<HTMLElement>
    | ((event: JSX.TargetedEvent<HTMLButtonElement>) => void);
}

/**
 * Icon button component props with enhanced flexibility
 */
export interface IconButtonProps extends BaseComponentProps {
  isLoading?: boolean;
  icon: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  color?: ButtonColor;
  disabled?: boolean;
  isActive?: boolean;
  onClick?:
    | MouseEventHandler<HTMLElement>
    | ((event: JSX.TargetedEvent<HTMLButtonElement>) => void);
  "aria-label": string; // Required for accessibility
  href?: string;
}

/**
 * Base button props with comprehensive type definitions
 */
export interface BaseButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  disabled?: boolean;
  isActive?: boolean;
  href?: string;
  target?: string;
  type?: "button" | "submit" | "reset";
  onClick?:
    | MouseEventHandler<HTMLElement>
    | ((event: JSX.TargetedEvent<HTMLButtonElement>) => void);
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onFocus?: JSX.FocusEventHandler<HTMLElement>;
  onBlur?: JSX.FocusEventHandler<HTMLElement>;
  "data-type"?: string;
  "f-partial"?: string;
  role?: string;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

/**
 * Extended button props for more complex interactions
 */

/**
 * Processing button props for asynchronous actions
 */
export interface ProcessingButtonProps extends ExtendedButtonProps {
  isSubmitting?: boolean;
}

/**
 * Processing button props with enhanced type safety
 */

/**
 * Keyboard navigation props
 */
export interface KeyboardNavigationProps {
  onKeyDown?: KeyboardEventHandler;
  onKeyUp?: KeyboardEventHandler;
  tabIndex?: number;
  role?: string;
  "aria-label"?: string;
}

/**
 * Standardized Event Handler Types
 * Provides type-safe event handler interfaces for common DOM events
 */
export type GenericEventHandler<T extends EventTarget = EventTarget> = (
  event: Event & { currentTarget: T },
) => void;
export type InputEventHandler<
  T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =
    HTMLInputElement,
> = (event: Event & { currentTarget: T }) => void;
export type FormEventHandler = (
  event: Event & { currentTarget: HTMLFormElement },
) => void;
export type MouseEventHandler<T extends HTMLElement = HTMLElement> = (
  event: MouseEvent & { currentTarget: T },
) => void;
export type KeyboardEventHandler<T extends HTMLElement = HTMLElement> = (
  event: KeyboardEvent & { currentTarget: T },
) => void;
export type ChangeEventHandler<T extends HTMLElement = HTMLElement> = (
  event: Event & { currentTarget: T },
) => void;

/**
 * Utility type to convert TargetedEvent to standard Event
 * Helps bridge type mismatches in event handling
 */
export type NormalizedEvent<T extends EventTarget = EventTarget> = Event & {
  currentTarget: T;
  target: T;
} & Omit<Event, "currentTarget" | "target">;

/**
 * Utility type for handling undefined/optional values with default
 * Provides safe type conversion and default value assignment
 */
export type Optional<T, D = T> = T | undefined | null;

/**
 * Utility types for handling undefined assignment issues
 */
export type NumberOrUndefined = number | undefined;
export type StringOrUndefined = string | undefined;
export type SafeNumber = number | undefined | null;
export type SafeString = string | undefined | null;

/**
 * Helper type for converting undefined to null for better type compatibility
 */
export type UndefinedToNull<T> = T extends undefined ? null : T;

// =============================================================================
// ADVANCED PROP TYPES
// =============================================================================

/**
 * Generic prop type with safe defaults and type conversion
 */
export type SafeProp<T, D = T> = Optional<T, D>;

/**
 * Common prop type for input-like components
 */
export interface BaseInputProps<T = string> {
  type?: string;
  placeholder?: string;
  value: T;
  onChange: (value: T) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Standard input field props with optional features
 */
export interface StandardInputProps extends BaseInputProps {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  "aria-label"?: string;
}

/**
 * Sorting-related props pattern
 */
export interface SortingProps {
  initSort?: "ASC" | "DESC";
  onChangeSort?: (newSort: "ASC" | "DESC") => void;
  sortParam?: string;
}

// =============================================================================
// FORM COMPONENT PROPS
// =============================================================================

/**
 * Form control wrapper props
 */
export interface FormControlProps extends BaseComponentProps {
  name?: string;
  onChange?: (value: any) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Input component props
 */
export interface InputProps extends FormControlProps {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (event: JSX.TargetedEvent<HTMLInputElement, Event>) => void;
  onBlur?: (event: JSX.TargetedEvent<HTMLInputElement, FocusEvent>) => void;
  onFocus?: (event: JSX.TargetedEvent<HTMLInputElement, FocusEvent>) => void;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

/**
 * Input field component props (extends InputProps with additional features)
 */
export interface InputFieldProps extends InputProps {
  onInput?: (event: JSX.TargetedEvent<HTMLInputElement, Event>) => void;
  inputMode?:
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  min?: string | number;
  step?: string | number;
  textAlign?: "left" | "center" | "right";
  isUppercase?: boolean;
  class?: string;
  icon?: string;
  iconPosition?: "left" | "right";
  clearable?: boolean;
  onClear?: () => void;
  size?: ButtonSize;
}

/**
 * Select field component props
 */
export interface SelectFieldProps extends FormControlProps {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  multiple?: boolean;
  size?: ButtonSize;
  onClick?: (event: JSX.TargetedEvent<HTMLSelectElement, Event>) => void;
}

// =============================================================================
// MODAL COMPONENT PROPS
// =============================================================================

/**
 * Base modal component props
 */
export interface ModalBaseProps extends BaseComponentProps {
  onClose?: () => void;
  title: string;
  children: ComponentChildren;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

/**
 * Search modal base props
 */
export interface ModalSearchBaseProps extends ModalBaseProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  showSearchIcon?: boolean;
  autoFocus?: boolean;
  onSearchSubmit?: (value: string) => void;
}

/**
 * Connect wallet modal props
 */
export interface ConnectWalletModalProps {
  walletProviders?: Array<{
    id: string;
    name: string;
    icon?: string;
    installed?: boolean;
  }>;
  onConnect?: (providerId: string) => void;
  showTestnet?: boolean;
  preferredWallet?: string;
  connectors: JSX.Element[]; // Preact VNodes for component connectors
  handleClose?: () => void; // Optional alias for onClose
  onClose?: () => void;
}

/**
 * Mara Mode Warning Modal props
 */
export interface MaraModeWarningModalProps {
  _isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  outputValue?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Mara Service Unavailable Modal props
 */
export interface MaraServiceUnavailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onSwitchToStandard?: () => void;
  onRetry?: () => void;
}

// =============================================================================
// MARA-SPECIFIC COMPONENT PROPS
// =============================================================================

/**
 * Mara Status Link component props
 */
export interface MaraStatusLinkProps extends BaseComponentProps {
  href?: string;
  variant?: "primary" | "secondary" | "warning" | "error";
  target?: "_blank" | "_self";
  icon?: string;
  txid?: string;
  class?: string;
}

/**
 * Mara mode indicator component props
 */
export interface MaraModeIndicatorProps extends BaseComponentProps {
  isActive: boolean;
  mode?: "standard" | "turbo" | "eco";
  showLabel?: boolean;
  size?: ButtonSize;
  animate?: boolean;
  outputValue?: number;
  feeRate?: number;
  class?: string;
}

/**
 * Mara success message component props
 */
export interface MaraSuccessMessageProps extends BaseComponentProps {
  message?: string;
  transactionId?: string;
  showIcon?: boolean;
  onDismiss?: () => void;
  autoHideDuration?: number;
  txid?: string;
  outputValue?: number;
  feeRate?: number;
  poolInfo?: {
    name: string;
    hashrate?: string;
  };
  class?: string;
}

// =============================================================================
// STATUS & BADGE COMPONENT PROPS
// =============================================================================

/**
 * Activity Badge component props
 */
export interface ActivityBadgeProps extends BaseComponentProps {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
  children?: ComponentChildren;
  level?: "HOT" | "WARM" | "COOL" | "DORMANT" | "COLD";
  showLabel?: boolean;
}

/**
 * Transaction badge component props
 */
export interface TransactionBadgeProps extends BaseComponentProps {
  state: TransactionState;
  status?: "pending" | "confirmed" | "failed" | "processing";
  confirmations?: number;
  showIcon?: boolean;
  size?: ButtonSize;
  animated?: boolean;
  class?: string;
}

/**
 * Market data status component props
 */
export interface MarketDataStatusProps extends BaseComponentProps {
  status: "loading" | "success" | "error" | "stale";
  lastUpdated?: Date | string;
  showTimestamp?: boolean;
  message?: string;
  onRefresh?: () => void;
  showDetails?: boolean;
  overallStatus?:
    | "full"
    | "partial"
    | "unavailable"
    | "loading"
    | "success"
    | "error"
    | "stale";
  stampsMarketData?: MarketDataDetails;
  src20MarketData?: MarketDataDetails;
}

export interface MarketDataDetails {
  status: "loading" | "success" | "error" | "stale";
  data?: unknown;
  error?: string;
  lastUpdated?: Date | string;
}

// =============================================================================
// META & SEO COMPONENT PROPS
// =============================================================================

/**
 * Meta tags component props for SEO
 */
export interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterSite?: string;
  twitterCreator?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  image?: string;
  skipImage?: boolean;
  skipTitle?: boolean;
  skipDescription?: boolean;
  skipOgMeta?: boolean;
}

// =============================================================================
// BASIC COMPONENT PROP TYPES
// =============================================================================

/**
 * Basic HTML element prop types
 */
export interface AnchorElementProps extends BaseComponentProps {
  href?: string;
  target?: string;
  rel?: string;
}

// Removed duplicate BaseButtonProps interface - using the comprehensive one defined earlier

export interface ButtonElementProps extends BaseComponentProps {
  variant?: string;
  color?: string;
  buttonSize?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * Basic component prop interfaces
 */
export interface BTCValueDisplayProps {
  value: number | null;
  className?: string;
  precision?: number;
  size?: IconSize | number;
  fallback?: string;
  loading?: boolean;
  error?: string;
  showSymbol?: boolean;
  [key: string]: any; // Allow dynamic access
}

export interface BTCValueSummaryProps {
  values: number[];
  className?: string;
  showTotal?: boolean;
  stamps?: import("./wallet.d.ts").WalletStampWithValue[];
  [key: string]: any; // Allow dynamic access
}

export interface StatItemProps {
  label: string | ComponentChildren;
  value: string | ComponentChildren;
  align?: "left" | "center" | "right";
  class?: string;
  href?: string;
  target?: "_self" | "_blank";
}

export interface StatTitleProps {
  label: string | ComponentChildren;
  value: string | ComponentChildren;
  align?: "left" | "center" | "right";
  href?: string;
  target?: "_self" | "_blank";
}

export interface RadioProps {
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  name: string;
}

export interface StampSalesProps {
  // For StampSalesTable
  dispenses?: Array<{
    source: string;
    destination: string;
    dispense_quantity: number;
    satoshirate: number;
    tx_hash: string;
    block_time: number | null;
  }>;
  isLoading?: boolean;
  // For StampSalesGallery
  initialData?: Array<any>;
  title?: string;
  subTitle?: string;
  variant?: string;
  displayCounts?: {
    mobileSm: number;
    mobileMd: number;
    mobileLg: number;
    tablet: number;
    desktop: number;
  };
  gridClass?: string;
}

export interface ToolSrc20PageProps {
  selectedTab: string;
  trxType: "multisig" | "olga";
  tick?: string | null;
  mintStatus?: any;
  holders?: number;
  error?: string;
}

export interface ToolsSrc101PageProps {
  selectedTab: string;
  trxType: "multisig" | "olga";
  error?: string;
}

export interface ToolStampPageProps {
  selectedTab: string;
  trxType: "multisig" | "olga";
  error?: string;
}

export interface ToolFairmintPageProps {
  fairminters: Array<any>;
  error?: string;
}

export interface WalletProviderProps {
  key?: WalletProviders; // Added optional key prop
  providerKey: WalletProviders;
  onSuccess?: () => void;
}

export interface WalletDashboardDetailsProps {
  walletData: any; // Replace with proper WalletData type if available
  stampsTotal: number;
  src20Total: number;
  stampsCreated: number;
  setShowItem: (item: string) => void;
}

export interface WalletProfileDetailsProps {
  walletData: any; // Replace with proper WalletData type if available
  stampsTotal: number;
  src20Total: number;
  stampsCreated: number;
  setShowItem: (item: string) => void;
}

export interface WalletDispenserDetailsProps {
  walletData: WalletOverviewInfo;
  stampsTotal?: number;
  src20Total?: number;
  stampsCreated?: number;
  setShowItem?: (item: string) => void;
}

export interface TransactionProgressProps {
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "error";
  }>;
  class?: string;
}

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  class?: string;
}

export interface TextareaProps extends BaseComponentProps {
  label?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  cols?: number;
  maxLength?: number;
  required?: boolean;
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
}

export interface SRC20InputFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number" | "email";
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  maxLength?: number;
  isUppercase?: boolean;
  inputMode?:
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  pattern?: string;
}

export interface SRC20GalleryProps {
  tokens?: Array<any>;
  loading?: boolean;
  error?: string;
  onLoadMore?: () => void;
  viewType?: any;
  fromPage?: "src20" | "wallet" | "stamping/src20" | "home";
  initialData?: any;
  timeframe?: Timeframe;
  currentSort?: {
    filter: any;
    direction: "asc" | "desc";
  };
  enablePartialNavigation?: boolean;
  pagination?: {
    page: any;
    totalPages: any;
    onPageChange: (newPage: number) => void;
  };
  title?: string;
  initialPagination?: { page: number; limit: number; total?: number };
  initialSort?: Sort;
  address?: string;
  showLoadingSkeleton?: boolean;
  subTitle?: string;
  serverData?: any;
}

export interface SRC101RegisterToolProps {
  trxType?: "olga" | "multisig";
  onRegister?: (data: any) => void;
  loading?: boolean;
  error?: string;
}

export interface StatusMessagesProps {
  submissionMessage?: string | { message: string; txid?: string } | null;
  apiError?: string | null;
  fileUploadError?: string | null;
  walletError?: string | null;
  maraError?: string | null;
  transactionHex?: string;
  onCopyHex?: () => void;
  messages?: Array<{
    type: "info" | "warning" | "error" | "success";
    message: string;
  }>;
  onDismiss?: (index: number) => void;
}

export interface StampOverviewContentProps {
  stamp?: any;
  marketData?: any;
  loading?: boolean;
  error?: string;
  stamps?: StampRow[];
  isRecentSales?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange?: (newPage: number) => void;
    prefix?: string;
  };
  fromPage?: string;
}

export interface StampListingsAllProps {
  listings: Array<any>;
  loading?: boolean;
  isLoading?: boolean;
  error?: string;
  onSelect?: (listing: any) => void;
  dispensers?: import("./stamp.d.ts").Dispenser[];
}

export interface StampListingsOpenProps {
  openListings?: Array<any>;
  loading?: boolean;
  error?: string;
  onSelect?: (listing: any) => void;
  selectedDispenser?: any;
  dispensers?: import("./stamp.d.ts").Dispenser[];
  floorPrice?: number;
  onSelectDispenser?: (dispenser: any) => void;
}

export interface SRC20OverviewContentProps {
  mintingData?: any;
  timeframe?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  viewType?: string;
  btcPrice?: number;
  btcPriceSource?: string;
  token?: any;
  marketData?: any;
  loading?: boolean;
  error?: string;
}

export interface StyledSortingDropdownProps {
  options: Array<{ value: string; label: string; icon?: string }>;
  className?: string;
  placeholder?: string;
  testId?: string;
  showLoading?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  renderOption?: (
    option: { value: string; label: string; icon?: string },
  ) => string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
}

export interface StyledSortingErrorProps {
  className?: string;
  showRetry?: boolean;
}

export interface StyledSortingButtonsProps {
  options: Array<{ value: string; label: string; icon?: string }>;
  className?: string;
  testId?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  showIcons?: boolean;
  showLoading?: boolean;
  renderButton?: (
    option: { value: string; label: string; icon?: string },
    isActive: boolean,
  ) => preact.ComponentChildren;
}

export interface StyledSortingLabelProps {
  className?: string;
  showDirection?: boolean;
  showLoading?: boolean;
  label?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onClick?: () => void;
  active?: boolean;
  variant?: "default" | "compact" | "inline";
  testId?: string;
}

export interface SelectProps extends BaseComponentProps {
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  placeholder?: string;
  error?: string;
  label?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  multiple?: boolean;
  required?: boolean;
}

export interface SortProps {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  initSort?: "ASC" | "DESC";
  onChangeSort?: (newSortBy: "ASC" | "DESC") => void;
  sortParam?: string;
  searchParams?: URLSearchParams;
}

export interface SortingProviderProps {
  children: ComponentChildren;
  defaultSort?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  config?: any;
  initialState?: any;
  testId?: string;
}

export interface SortingProviderWithURLProps extends SortingProviderProps {
  urlParams?: boolean;
  paramPrefix?: string;
  testId?: string;
  config?: any;
  initialState?: any;
}

export interface SortingLabelProps {
  label?: string;
  sortBy?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  testId?: string;
  showDirection?: boolean;
  showLoading?: boolean;
  format?: string;
}

export interface SortingErrorProps {
  error?: string;
  onRetry?: () => void;
  className?: string;
  testId?: string;
  message?: string;
  showRetry?: boolean;
}

export interface SortingErrorFallbackProps {
  error?: Error | ExtendedError;
  resetError?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
  context?: any;
  retryCount?: number;
  maxRetries?: number;
}

export interface SettingProps {
  label?: string;
  value?: any;
  onChange?: (value: any) => void;
  type?: "boolean" | "string" | "number" | "select";
  options?: Array<{
    value: any;
    label: string;
  }>;
  initFilter?: any[];
  open?: boolean;
  handleOpen?: (open: boolean) => void;
  filterButtons?: string[];
  onFilterClick?: (filter: string) => void;
}

export interface SendBTCModalProps {
  fee: number;
  balance: number | null;
  handleChangeFee: (newFee: number) => void;
  onSend?: (to: string, amount: number) => void;
  address?: string;
  amount?: number;
  title?: string;
  children?: ComponentChildren;
  onClose?: () => void;
}

export interface ReceiveAddyModalProps {
  _isOpen?: boolean;
  onClose?: () => void;
  address?: string;
  title?: string;
}

export interface RecentSaleCardProps {
  sale: any;
  onClick?: () => void;
  className?: string;
  showFullDetails?: boolean;
  btc_price_usd?: number;
}

export interface RecentSalesGalleryProps {
  title?: string;
  subTitle?: string;
  sales: Array<any>;
  layout?: "grid" | "list";
  showFullDetails?: boolean;
  displayCounts?: {
    mobileSm?: number;
    mobileMd?: number;
    mobileLg?: number;
    tablet?: number;
    desktop?: number;
  };
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange?: (newPage: number) => void;
    prefix?: string;
  };
  isLoading?: boolean;
  btc_price_usd?: number;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  onRefresh?: () => void;
  gridClass?: string;
  maxItems?: number;
  loading?: boolean;
  error?: string;
  onLoadMore?: () => void;
}

export interface ResponsiveProps {
  mobile?: any;
  tablet?: any;
  desktop?: any;
  children?: ComponentChildren;
}

export interface SalesActivityFeedProps {
  title?: string;
  subTitle?: string;
  sales?: Array<any>;
  isLoading?: boolean;
  btcPriceUSD?: number;
  maxItems?: number;
  showTimestamps?: boolean;
  showStampPreviews?: boolean;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  onRefresh?: () => void;
  onItemClick?: (item: any) => void;
  compact?: boolean;
  activities?: Array<any>;
  loading?: boolean;
  error?: string;
}

export interface ScreenReaderProps {
  text: string;
  className?: string;
}

export interface ScrollContainerProps {
  children: ComponentChildren;
  direction?: "horizontal" | "vertical" | "both";
  className?: string;
  maxHeight?: string;
  class?: string;
  onScroll?: (event: JSX.TargetedEvent<HTMLElement, Event>) => void;
}

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ComponentChildren;
  className?: string;
  showMetrics?: boolean;
  config?: any;
  sortBy?: string;
  onSortChange?: (newSort: string) => void;
  enableAdvancedSorting?: boolean;
}

export interface SelectorButtonsProps {
  options: Array<{
    value: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
  }>;
  onSelect?: (value: string) => void;
  onChange?: (value: string) => void;
  className?: string;
  value?: string | undefined;
  defaultValue?: string;
  size: ButtonSize;
  color?: string;
  disabled?: boolean;
}

export interface StampBTCValueProps {
  stampId: number;
  className?: string;
  showBreakdown?: boolean;
  size?: IconSize | number;
  quantity?: number;
  unitPrice?: number;
}

export interface TotalBTCValueProps {
  items?: Array<{ value: number }>;
  className?: string;
  showStats?: boolean;
  size?: IconSize | number;
  stamps?: import("./wallet.d.ts").WalletStampWithValue[];
}

export interface TransactionHexDisplayProps {
  hex: string;
  className?: string;
  collapsed?: boolean;
  txid?: string;
  class?: string;
}

/**
 * Icon component props
 */
export interface CloseIconProps {
  onClick: (e?: MouseEvent) => void;
  size: IconVariants["size"];
  weight: IconVariants["weight"];
  color: "greyLight" | "purpleLight";
  className?: string;
  onMouseEnter?: (() => void) | undefined;
  onMouseLeave?: (() => void) | undefined;
  "aria-label"?: string;
}

export interface GearIconProps {
  className?: string;
  onClick?: () => void;
  size?: IconSize | number;
  color?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  weight?: IconWeight;
}

// =============================================================================
// THEME AND DESIGN SYSTEM TYPES
// =============================================================================

/**
 * Color palette definition for the design system
 */
export interface ColorPalette {
  // Primary colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

  // Bitcoin Stamps brand colors
  stamp: {
    purple: string;
    "purple-dark": string;
    "purple-light": string;
    "purple-highlight": string;
    grey: string;
    "grey-dark": string;
    "grey-light": string;
  };

  // Semantic colors
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // Neutral colors
  neutral: {
    white: string;
    black: string;
    transparent: string;
  };
}

/**
 * Typography scale definition
 */
export interface Typography {
  fontFamily: {
    sans: string[];
    mono: string[];
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  letterSpacing: {
    tight: string;
    normal: string;
    wide: string;
    wider: string;
  };
}

/**
 * Spacing scale definition
 */
export interface SpacingScale {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
  40: string;
  48: string;
  56: string;
  64: string;
}

/**
 * Responsive breakpoints
 */
export interface Breakpoints {
  mobileSm: string; // 360px+
  mobileMd: string; // 568px+
  mobileLg: string; // 768px+
  tablet: string; // 1024px+
  desktop: string; // 1440px+
}

/**
 * Animation and transition definitions
 */
export interface Transitions {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    "ease-in": string;
    "ease-out": string;
    "ease-in-out": string;
  };
}

/**
 * Complete theme definition
 */
export interface Theme {
  colors: ColorPalette;
  spacing: SpacingScale;
  typography: Typography;
  breakpoints: Breakpoints;
  transitions: Transitions;
}

// =============================================================================
// LAYOUT AND GRID TYPES
// =============================================================================

/**
 * Flexbox layout props
 */

/**
 * Grid layout props
 */

/**
 * Container props for layout components
 */

/**
 * Display count breakpoints for responsive components
 */
export interface DisplayCountBreakpoints {
  mobileSm: number; // 360px+
  mobileMd?: number; // 568px+
  mobileLg: number; // 768px+
  tablet: number; // 1024px+
  desktop: number; // 1440px+
}

// =============================================================================
// BUTTON COMPONENT TYPES
// =============================================================================

// Button types consolidated in uiConstants.ts and imported above

// =============================================================================
// NAVIGATION CONTEXT TYPES
// =============================================================================

/**
 * Union type for both STAMP_TYPES and SRC20_TYPES
 * Used in navigation context for type filtering
 */
export type NavigatorTypes = StampType | SRC20_TYPES;

/**
 * Navigator Context Type
 * Provides navigation state management for stamp and SRC20 type filtering
 * Migrated from: islands/layout/NavigatorProvider.tsx
 */
export interface NavigatorContextType {
  setTypeOption: (page: string, type: NavigatorTypes, reload?: boolean) => void;
  setSortOption: (sort: string) => void;
  setFilterOption: (filter: StampFilterType) => void;
  getSort: () => string;
  getFilter: () => StampFilterType[];
  getType: () => NavigatorTypes;
  setFilter: (filters: StampFilterType[]) => void;
  setSort: (sort: string) => void;
  setType: (type: NavigatorTypes) => void;
}

/**
 * Base button props interface
 */

/**
 * Button element props (button tag)
 */

/**
 * Anchor element props (link that looks like button)
 */

/**
 * Union type for button props
 */

/**
 * Icon button specific props
 */

/**
 * Processing button props for forms
 */

// =============================================================================
// FORM COMPONENT TYPES
// =============================================================================

/**
 * Base form control props
 */

/**
 * Input field props
 */

/**
 * Select field props
 */

/**
 * Textarea props
 */

// =============================================================================
// MODAL AND DIALOG TYPES
// =============================================================================

/**
 * Base modal props
 */

/**
 * Confirmation dialog props
 */

// =============================================================================
// NOTIFICATION AND TOAST TYPES
// =============================================================================

/**
 * Toast notification types
 */
export type ToastVariant = "info" | "success" | "warning" | "error";

/**
 * Toast notification props
 */

/**
 * Notification banner props
 */

// =============================================================================
// TABLE COMPONENT TYPES
// =============================================================================

/**
 * Table column definition
 */
export interface TableColumn<T = any> {
  /** Column key */
  key: keyof T | string;
  /** Column header */
  header: string;
  /** Column width */
  width?: string;
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Custom cell renderer */
  render?: (value: any, row: T, index: number) => ComponentChildren;
  /** Sortable column */
  sortable?: boolean;
  /** Sort key (if different from key) */
  sortKey?: string;
}

/**
 * Table props
 */

/**
 * Pagination props
 */

// =============================================================================
// ACCESSIBILITY TYPES
// =============================================================================

/**
 * ARIA attributes interface
 */
export interface AriaAttributes {
  /** ARIA role */
  "aria-role"?: JSX.AriaRole;
  /** ARIA label */
  "aria-label"?: string;
  /** ARIA labelledby */
  "aria-labelledby"?: string;
  /** ARIA describedby */
  "aria-describedby"?: string;
  /** ARIA expanded */
  "aria-expanded"?: boolean;
  /** ARIA hidden */
  "aria-hidden"?: boolean;
  /** ARIA selected */
  "aria-selected"?: boolean;
  /** ARIA disabled */
  "aria-disabled"?: boolean;
  /** ARIA checked */
  "aria-checked"?: boolean | "mixed";
  /** ARIA pressed */
  "aria-pressed"?: boolean | "mixed";
  /** ARIA current */
  "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time";
}

/**
 * Keyboard navigation props
 */

/**
 * Screen reader support props
 */

// =============================================================================
// RESPONSIVE DESIGN TYPES
// =============================================================================

/**
 * Responsive prop value type
 */
export type ResponsiveValue<T> = T | {
  mobileSm?: T;
  mobileMd?: T;
  mobileLg?: T;
  tablet?: T;
  desktop?: T;
};

/**
 * Responsive props interface
 */

// =============================================================================
// BITCOIN STAMPS UI SPECIFIC TYPES
// =============================================================================

/**
 * Stamp gallery component props (migrated from globals.d.ts)
 */

/**
 * Collection gallery component props (migrated from globals.d.ts)
 */

/**
 * SRC-20 card component size variants
 */
export type SRC20CardSize = "sm" | "md" | "lg";

/**
 * SRC-20 card component props
 */

/**
 * Wallet component props
 */

// =============================================================================
// FORWARDREF AND GENERIC COMPONENT SUPPORT
// =============================================================================

/**
 * Forward ref component type
 */
export type ForwardRefComponent<T, P = Record<PropertyKey, never>> = (
  props: P & {
    ref?: preact.RefObject<T> | ((instance: T | null) => void) | null;
  },
) => JSX.Element | null;

/**
 * Polymorphic component base props
 */
export interface PolymorphicProps<
  T extends keyof JSX.IntrinsicElements = "div",
> {
  /** Element type to render as */
  as?: T;
}

/**
 * Polymorphic component with intrinsic element props
 */
export type PolymorphicComponent<
  T extends keyof JSX.IntrinsicElements = "div",
> =
  & PolymorphicProps<T>
  & Omit<ComponentProps<T>, keyof PolymorphicProps<T>>;

/**
 * Generic component props with children
 */
export interface ComponentWithChildren extends ExtendedComponentProps {
  children: ComponentChildren;
}

// =============================================================================
// COMMON UI PATTERN TYPES
// =============================================================================

/**
 * Loading state props
 */

/**
 * Error state props
 */

/**
 * Empty state props
 */

/**
 * Combined async state props
 */

// =============================================================================
// ICON COMPONENT TYPES
// =============================================================================

/**
 * Icon size variants
 */
export type IconSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "custom"
  | "xxs"
  | "xs"
  | "xxsR"
  | "xsR"
  | "smR"
  | "mdR"
  | "lgR"
  | "xxxs"
  | "xxl"
  | "xlR"
  | "xxlR";

/**
 * Icon weight variants
 */
export type IconWeight = "extraLight" | "light" | "normal" | "bold" | "custom";

/**
 * Modal animation types
 */
export type ModalAnimation = "slideUpDown" | "slideDownUp" | "zoomInOut";

/**
 * Icon component props
 */

// =============================================================================
// ANIMATION AND TRANSITION TYPES
// =============================================================================

/**
 * Animation timing functions
 */
export type AnimationTimingFunction =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`;

/**
 * Animation props
 */

/**
 * Transition props
 */

// =============================================================================
// COMPONENT PROPS INTERFACES
// =============================================================================

// CARD COMPONENT PROPS
// =====================

/**
 * SRC-20 Card component props
 */

/**
 * SRC-20 Card Minting component props
 */

/**
 * SRC-20 Small Card component props
 */

/**
 * SRC-20 Small Card Minting component props
 */

/**
 * Recent Sale Card component props
 */

/**
 * Wallet Stamp Card component props
 */

// GALLERY COMPONENT PROPS
// ========================

/**
 * Carousel Home component props
 */
export interface CarouselHomeProps extends BaseComponentProps {
  slides?: Array<{
    image: string;
    title?: string;
    description?: string;
    link?: string;
  }>;
  autoplay?: boolean;
  interval?: number;
  showIndicators?: boolean;
  carouselStamps?: StampRow[];
}

/**
 * Collections Banner component props
 */
export interface CollectionsBannerProps extends BaseComponentProps {
  collections?: Array<{
    name: string;
    image: string;
    description?: string;
    link?: string;
  }>;
  title?: string;
  subtitle?: string;
  collection?: {
    collection_id: string;
    collection_name: string;
    collection_description: string;
    creators: string[];
    stamp_count: number;
    total_editions: number;
    stamps: number[];
    img: string;
    first_stamp_image?: string | null;
    marketData?: any;
  };
  isDarkMode?: boolean;
}

/**
 * Article component props
 */
export interface ArticleProps extends BaseComponentProps {
  title: string;
  content?: string;
  author?: string;
  publishDate?: string;
  tags?: string[];
  readTime?: number;
  subtitle?: string;
  headerImage?: string;
  importantNotes?: string[];
  children?: JSX.Element[];
}

/**
 * Author component props
 */
export interface AuthorProps extends BaseComponentProps {
  name: string;
  avatar?: string;
  bio?: string;
  links?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  twitter?: string;
  website?: string;
}

/**
 * Holders Table component props
 */
export interface HoldersTableProps extends BaseComponentProps {
  data?: Array<{
    address: string;
    balance: number;
    percentage: number;
  }>;
  loading?: boolean;
  error?: string;
  title?: string;
  holders?: import("./wallet.d.ts").HolderRow[];
}

/**
 * Explorer Content component props
 */
export interface ExplorerContentProps extends BaseComponentProps {
  data?: any; // Adjust based on your specific explorer data structure - optional for backwards compatibility
  loading?: boolean;
  error?: string;
  stamps?: import("./stamp.d.ts").StampRow[];
  isRecentSales?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange?: (newPage: number) => void;
    prefix?: string;
  };
  fromPage?: string;
}

/**
 * Block component props
 */
export interface BlockProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "outlined" | "elevated";
  padding?: string;
  margin?: string;
  block?: any;
  selected?: { value: any };
}

/**
 * FAQ Accordion component props
 */
export interface FaqAccordionProps extends BaseComponentProps {
  faqs?: Array<{
    question: string;
    answer: string;
    open?: boolean;
  }>;
  expandIcon?: string;
  collapseIcon?: string;
  item?: any;
}

/**
 * Carousel component props
 */

/**
 * Collections Banner component props
 */

/**
 * Carousel component props
 */

/**
 * Fresh SRC-20 Gallery component props
 */

/**
 * Fresh Stamp Gallery component props
 */

/**
 * Recent Sales Gallery component props
 */

/**
 * SRC-20 Gallery component props
 */

/**
 * Stamp Overview Gallery component props
 */

// TABLE COMPONENT PROPS
// =====================

/**
 * SRC-20 Minting Table component props
 */

/**
 * SRC-20 Minted Table component props
 */

/**
 * SRC-20 Mints component props
 */

/**
 * SRC-20 Transfers component props
 */

/**
 * Stamp Sales component props
 */

/**
 * Stamp Transfers component props
 */

/**
 * Stamp Listings Open component props
 */

/**
 * Stamp Listings All component props
 */

/**
 * Holders Table component props
 */

/**
 * Holders Table Base component props
 */

/**
 * Pie Chart component props
 */

// CONTENT COMPONENT PROPS
// ========================

/**
 * Explorer Content component props
 */

/**
 * Stamp Overview Content component props
 */

/**
 * SRC-20 Overview Content component props
 */

/**
 * Wallet Dashboard Details component props
 */

/**
 * Wallet Dispenser Details component props
 */

/**
 * Wallet Profile Details component props
 */

/**
 * Section Header component props
 */

/**
 * Stamp Info component props
 */

/**
 * Block component props
 */

/**
 * FAQ Accordion component props
 */

// FORM COMPONENT PROPS
// ====================

/**
 * Input Field component props (extends base InputProps)
 */

/**
 * SRC-20 Input Field component props
 */

/**
 * Select Field component props (extends base SelectProps)
 */

// MODAL COMPONENT PROPS
// =====================

/**
 * Generic modal Props interface (used by multiple modals)
 */

/**
 * Buy Stamp Modal component props
 */
export interface BuyStampModalProps {
  stamp?: StampRow | undefined;
  onBuy?: (stampId: number) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  fee?: number;
  handleChangeFee?: (fee: number) => void;
  dispenser?: any;
}
/**
 * Donate Stamp Modal component props
 */
export interface DonateStampModalProps {
  stamp?: StampRow | undefined;
  onDonate?: (stampId: number, amount: number) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  fee?: number;
  handleChangeFee?: (fee: number) => void;
  dispenser?: any;
}
/**
 * Filter SRC-20 Modal component props
 */
export interface FilterSRC20ModalProps extends ModalBaseProps {
  currentFilters?: {
    minHolders?: number;
    maxHolders?: number;
    status?: string;
    type?: string;
  };
  onApplyFilters?: (filters: any) => void;
  loading?: boolean;
  error?: string;
  filterOptions?: any;
}
/**
 * Receive Address Modal component props
 */
/**
 * Send BTC Modal component props
 */
/**
 * Detail SRC-101 Modal component props
 */
export interface DetailSRC101ModalProps {
  detail?: any; // TODO(#type-migration): Replace with concrete SRC-101 detail type
  onAction?: (actionType: string) => void;
  loading?: boolean;
  error?: string;
  img?: string;
  name?: string;
  owner?: string;
}
/**
 * Connect Wallet Modal component props
 */

/**
 * Preview Code Modal component props
 */
export interface PreviewCodeModalProps {
  code?: string;
  src?: string;
  language?: string;
  onCopy?: () => void;
}

/**
 * Preview Image Modal component props
 */
export interface PreviewImageModalProps {
  src: string | File;
  contentType?: "image" | "html" | "text" | "audio";
}

/**
 * Image Modal component props
 */

// LAYOUT COMPONENT PROPS
// =======================

/**
 * Chart Widget component props
 */

/**
 * Modal Overlay component props
 */
export interface ModalOverlayProps extends BaseComponentProps {
  _isOpen?: boolean;
  onClose?: () => void;
  children: ComponentChildren;
  animation?: ModalAnimation;
  _preventScroll?: boolean;
  handleClose?: () => void;
}

/**
 * Wallet Provider component props
 */

/**
 * Meta Tags component props
 */

/**
 * Scroll Container component props
 */

/**
 * Modal Search Base component props
 */

// DISPLAY COMPONENT PROPS
// ========================

/**
 * BTC Value Display component props
 */

/**
 * Stamp BTC Value component props
 */

/**
 * Wallet Stamp Value component props
 */

/**
 * Total BTC Value component props
 */

/**
 * BTC Value Summary component props
 */

/**
 * Market Data Status component props
 */

// INDICATOR COMPONENT PROPS
// ==========================

/**
 * Mara Mode Indicator component props
 */

/**
 * Transaction Status component props
 */

/**
 * Transaction Badge component props
 */

/**
 * Mara Success Message component props
 */

/**
 * Progress Indicator component props
 */

/**
 * Transaction Progress component props
 */

/**
 * Spinner component props
 */

/**
 * Progressive Estimation Indicator component props
 */

// BUTTON COMPONENT PROPS
// =======================

/**
 * Selector Buttons component props
 */

/**
 * Sort Button component props
 */

/**
 * Read All Button component props
 */
export interface ReadAllButtonProps {
  href?: string;
}

/**
 * Toggle Switch Button component props
 */
export interface ToggleSwitchButtonProps {
  isActive: boolean;
  onToggle: () => void;
  toggleButtonId?: string;
  className?: string;

  // Custom symbols for the toggle states
  activeSymbol?: string;
  inactiveSymbol?: string;

  // Event handlers for external tooltip control
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;

  // Optional click handler
  onClick?: (e: MouseEvent) => void;

  // Optional ref forwarding
  buttonRef?: preact.RefObject<HTMLButtonElement>;
}

// ICON COMPONENT PROPS
// ====================

/**
 * Loading Icon component props
 */

/**
 * Gear Icon component props
 */

/**
 * Close Icon component props
 */

// TOOL COMPONENT PROPS
// ====================

/**
 * SRC-20 Mint Tool component props
 */

/**
 * Mint Progress component props
 */

/**
 * SRC-101 Register Tool component props
 */

/**
 * Fairmint Tool component props
 */

/**
 * Status Messages component props
 */

// BADGE COMPONENT PROPS
// =====================

/**
 * Activity Badge component props
 */

// HEADER COMPONENT PROPS
// =======================

/**
 * SRC-20 Overview Header component props
 */

// FEED COMPONENT PROPS
// ====================

/**
 * Sales Activity Feed component props
 */

// FILTER COMPONENT PROPS
// =======================

/**
 * Range Input component props
 */

/**
 * Checkbox component props
 */
export interface CheckboxProps extends BaseComponentProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  name?: string;
  hasDropdown?: boolean;
  dropdownContent?: ComponentChildren;
}

/**
 * Radio component props
 */

// SORTING COMPONENT PROPS
// ========================

/**
 * Sorting Provider component props
 */

/**
 * Enhanced Sort Button component props
 */

/**
 * Sorting Component props
 */

/**
 * Sorting Dropdown component props
 */

/**
 * Sorting Buttons component props
 */

/**
 * Sorting Label component props
 */

/**
 * Sorting Error component props
 */

/**
 * Sorting Provider with URL component props
 */

/**
 * Convenience Provider component props
 */

/**
 * Styled Sorting Dropdown component props
 */

/**
 * Styled Sorting Buttons component props
 */

/**
 * Styled Sorting Label component props
 */

/**
 * Styled Sorting Error component props
 */

/**
 * Complete Sorting Interface component props
 */

/**
 * Sorting Error Boundary component props
 */

/**
 * Sorting Error Fallback component props
 */

// TOAST COMPONENT PROPS
// ======================

/**
 * Toast Provider component props
 */

/**
 * Toast Component props
 */

// ERROR COMPONENT PROPS
// =====================

/**
 * Error Display component props
 */
export interface ErrorDisplayProps extends BaseComponentProps {
  error: string | Error | ExtendedError | ErrorHandlingInfo | undefined;
  onRetry?: () => void;
  details?: string;
  actionLabel?: string;
  onDismiss?: () => void;
  compact?: boolean;
  showDetails?: boolean;
}

// OTHER COMPONENT PROPS
// =====================

/**
 * Setting component props
 */

/**
 * Transaction Hex Display component props
 */

/**
 * Mara Status Link component props
 */

/**
 * Stat Base component props
 */

/**
 * Author component props
 */

/**
 * Article component props
 */

/**
 * Shared List component props
 */

/**
 * Mara Service Unavailable Modal component props
 */

/**
 * Mara Mode Warning Modal component props
 */

/**
 * Stat Title component props
 */

/**
 * Stat Item component props
 */

// PAGE COMPONENT PROPS
// ====================

/**
 * SRC-20 Detail Page component props
 */

/**
 * Tool Stamp Page component props
 */

/**
 * Stamp Detail Page component props
 */
export interface StampDetailPageProps {
  data: {
    stamp?: StampRow & { name?: string };
    total: number;
    sends: any;
    dispensers: any;
    dispenses: any;
    holders: any[];
    vaults: any;
    last_block: number;
    stamps_recent: any;
    lowestPriceDispenser: any;
    htmlTitle?: string;
    error?: string;
    initialCounts?: {
      dispensers: number;
      sales: number;
      transfers: number;
    };
  };
  url?: string;
}

/**
 * Tool Fairmint Page component props
 */

/**
 * Collection Overview Page component props
 */

/**
 * Tools SRC-101 Page component props
 */

/**
 * Color Swatch component props
 */

/**
 * Tool SRC-20 Page component props
 */

// =============================================================================

/**
 * FairmintFormState - Migrated from useFairmintForm.ts
 */
export interface FairmintFormState {
  asset: string;
  quantity: string;
  fee: number;
  BTCPrice: number;
  jsonSize: number;
  utxoAncestors?: AncestorInfo[];
  psbtFeeDetails?: {
    minerFee: number;
    estMinerFee?: number; // backward compatibility
    totalDustValue: number;
    totalFee: number;
    hasExactFees: boolean;
    feeRate: number;
  };
  isLoading?: boolean;
}

/**
 * SRC101FormState - Migrated from userSRC101Form.ts
 */
export interface SRC101FormState {
  toAddress: string;
  token: string;
  amt: string;
  fee: number;
  feeError: string;
  BTCPrice: number;
  jsonSize: number;
  apiError: string;
  toAddressError: string;
  tokenError: string;
  amtError: string;
  max: string;
  maxError: string;
  lim: string;
  limError: string;
  dec: string;
  x: string;
  tg: string;
  web: string;
  email: string;
  file: File | null;
  psbtFees?: PSBTFees & {
    totalDustValue?: number;
    minerFee?: number;
    est_tx_size?: number; // Add dynamically used property
    [key: string]: any; // Allow dynamic properties
  };
  maxAmount?: string;
  root: string;
  utxoAncestors?: Array<any>; // Add missing utxoAncestors property
  isLoading?: boolean;
}

/**
 * SRC20FormState - Migrated from useSRC20Form.ts
 */
export interface SRC20FormState {
  toAddress: string;
  token: string;
  amt: string;
  fee: number;
  feeError: string;
  BTCPrice: number;
  jsonSize: number;
  apiError: string;
  toAddressError: string;
  tokenError: string;
  amtError: string;
  max: string;
  maxError: string;
  lim: string;
  limError: string;
  dec: string;
  x: string;
  xError: string;
  tg: string;
  web: string;
  email: string;
  img: string;
  description: string;
  file: File | null;
  psbtFees?: PSBTFees & {
    totalDustValue?: number;
    minerFee?: number;
    [key: string]: any; // Allow dynamic properties
  };
  maxAmount?: string;
}

/**
 * TransactionFormState - Migrated from useTransactionForm.ts
 */
export interface TransactionFormState {
  fee: number;
  feeError: string;
  BTCPrice: number;
  recipientAddress?: string;
  addressError?: string;
  amount?: string;
  amountError?: string;
  assetId?: string;
  estimatedTxFees: FeeDetails | null;
  apiError: string | null;
}

/**
 * UseTransactionFormProps - Migrated from useTransactionForm.ts
 */
export interface UseTransactionFormProps {
  type: "send" | "transfer" | "buy";
  initialFee?: number;
  initialAssetId?: string;
  initialAmount?: string;
}

/**
 * ExtendedButtonProps - Migrated from ButtonBase.tsx
 */
export type ExtendedButtonProps = BaseButtonProps & {
  "f-partial"?: string | SignalLike<string | undefined>;
  isActive?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  ref?:
    | preact.RefObject<HTMLElement>
    | ((instance: HTMLElement | null) => void)
    | null;
};

/**
 * ExtendedIconButtonProps - Migrated from ButtonBase.tsx
 */
export type ExtendedIconButtonProps = ExtendedButtonProps & {
  isLoading?: boolean;
  ariaLabel?: string;
};

/**
 * ExtendedProcessingButtonProps - Migrated from ButtonBase.tsx
 */
export type ExtendedProcessingButtonProps = ExtendedButtonProps & {
  isSubmitting: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
};

/**
 * ViewAllButtonProps - Migrated from ViewAllButton.tsx
 */
export type ViewAllButtonProps = {
  href: string;
  target?: "_top" | "_blank" | "_self" | "_parent";
};

/**
 * ProgressState - Migrated from ProgressIndicator.tsx
 */
export type ProgressState = "idle" | "loading" | "success" | "error";

/**
 * TransactionState - Migrated from TransactionStatus.tsx
 */
export type TransactionState = "submitted" | "pending" | "confirmed" | "failed";

/**
 * TransactionStatusProps - Props for TransactionStatus component
 */
export interface TransactionStatusProps {
  state: TransactionState;
  txid?: string;
  confirmations?: number;
  targetConfirmations?: number;
  estimatedTime?: number;
  errorMessage?: string;
  class?: string;
  onViewTransaction?: () => void;
  onRetry?: () => void;
}

/**
 * SRC20CardBaseProps - Migrated from SRC20CardBase.tsx
 */
export interface SRC20CardBaseProps {
  // For individual card usage (SRC20CardBase component)
  src20?: SRC20Row | null | undefined;
  // For bulk card usage (SRC20Card, SRC20CardSm components)
  data?: SRC20Row[] | null;
  // fromPage is reserved for future use
  fromPage?: "src20" | "wallet" | "stamping/src20" | "home";
  // timeframe is reserved for future use
  timeframe?: Timeframe;
  onImageClick?: (imgSrc: string) => void;
  children?: preact.ComponentChildren;
  totalColumns?: number;
  // Current sort state for table headers
  currentSort?: {
    filter: string;
    direction: "asc" | "desc";
  };
}

/**
 * EnhancedWalletContentProps - Migrated from WalletProfileContent.tsx
 */
export interface EnhancedWalletContentProps extends WalletContentProps {
  /** Enable advanced sorting features (default: false for backward compatibility) */
  enableAdvancedSorting?: boolean;
  /** Show performance metrics for sorting operations */
  showSortingMetrics?: boolean;
  /** Additional sorting configuration */
  sortingConfig?: {
    enableUrlSync?: boolean;
    enablePersistence?: boolean;
    enableMetrics?: boolean;
  };
}

/**
 * SRC20DetailHeaderProps - Migrated from SRC20DetailHeader.tsx
 */
export interface SRC20DetailHeaderProps {
  deployment: Deployment & {
    email?: string;
    web?: string;
    tg?: string;
    x?: string;
    stamp_url?: string;
    deploy_img?: string;
  };
  _mintStatus: SRC20MintStatus;
  _totalMints: number;
  _totalTransfers: number;
  marketInfo?: MarketListingAggregated;
  _align?: AlignmentType;
}

/**
 * StampOverviewHeaderProps - Migrated from StampOverviewHeader.tsx
 */
export type StampOverviewHeaderProps = {
  currentFilters?: StampFilters;
};

/**
 * GlobalModalState - Migrated from states.ts
 */
export interface GlobalModalState {
  isOpen: boolean;
  content: ComponentChildren | null;
  animation: ModalAnimation;
}

/**
 * SearchState - Migrated from states.ts
 *
 * `results` is intentionally generic so it can hold SRC-20 token
 * rows ({ tick: string; ... }) as well as stamp rows
 * ({ stamp: number; cpid: string; ... }).
 */
export interface SearchState {
  term: string;
  error: string;
  isLoading?: boolean;
  // deno-lint-ignore no-explicit-any
  results?: Array<Record<string, any>>;
}

/**
 * ExtendedBaseFeeCalculatorProps - Migrated from FeeCalculatorBase.tsx
 */
export interface ExtendedBaseFeeCalculatorProps extends BaseFeeCalculatorProps {
  isModal?: boolean;
  disabled?: boolean;
  cancelText?: string;
  confirmText?: string;
  type?: string;
  fileType?: string | undefined;
  fileSize?: number | undefined;
  issuance?: number | undefined;
  bitname?: string | undefined;
  amount?: number;
  receive?: number;
  fromPage?: string;
  price?: number;
  edition?: number;
  ticker?: string;
  limit?: number;
  supply?: number;
  src20TransferDetails?: {
    address: string;
    token: string;
    amount: number;
  };
  stampTransferDetails?: {
    address: string;
    stamp: string;
    editions: number;
  };
  dec?: number;
  onTosChange?: (agreed: boolean) => void;
  feeDetails?: FeeDetails;
  mintDetails?: MintDetails;
  maraMode?: boolean;
  maraFeeRate?: number | null;
  isLoadingMaraFee?: boolean;
  progressIndicator?: preact.ComponentChildren;
}

/**
 * SortingErrorBoundaryState - Migrated from SortingErrorBoundary.tsx
 */
export interface SortingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * SRC20BalanceTableProps - Migrated from UploadImageTable.tsx
 */
export type SRC20BalanceTableProps = {
  data: SRC20Row[];
};

/**
 * AnimationState - Migrated from useAnimationControls.ts
 */
export interface AnimationState {
  pageVisible: boolean;
  reducedMotion: boolean;
}

/**
 * FeeEstimatorState - Migrated from useTransactionConstructionService.ts
 */
export interface FeeEstimatorState {
  phase1: TransactionFeeEstimationResult | null;
  phase2: TransactionFeeEstimationResult | null;
  phase3: TransactionFeeEstimationResult | null;
  currentPhase: "instant" | "smart" | "exact"; // Updated: "cached" -> "smart"
  isEstimating: boolean;
  isPreFetching: boolean;
  error: string | null;
  lastUpdate: number;
}

/**
 * BaseFeeCalculatorProps - Migrated from base.d.ts
 */
export interface BaseFeeCalculatorProps {
  fee: number;
  handleChangeFee: (fee: number) => void;
  BTCPrice: number;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  buttonName: string;
  className?: string;
  showCoinToggle?: boolean;
  tosAgreed?: boolean;
  onTosChange?: (agreed: boolean) => void;
  feeDetails?: FeeDetails;
  transferDetails?: TransferDetails;
  stampTransferDetails?: StampTransferDetails;
  mintDetails?: MintDetails;
}

/**
 * SimpleFeeCalculatorProps - Migrated from base.d.ts
 */
export interface SimpleFeeCalculatorProps extends BaseFeeCalculatorProps {
  type: "send" | "transfer" | "buy" | "src20";
  _type?: string;
  amount?: number;
  recipientAddress?: string;
  userAddress?: string;
  inputType?: ScriptType;
  outputTypes?: ScriptType[];
  utxoAncestors?: AncestorInfo[];
  bitname?: string;
  receive?: number;
  fromPage?: string;
  price?: number;
  edition?: number;
  ticker?: string;
  limit?: number;
  supply?: number;
  dec?: number; // Added missing decimals property for SRC20 deploy
  transferDetails?: TransferDetails;
  mintDetails?: MintDetails;
  serviceFeeSats?: number;
}

/**
 * AdvancedFeeCalculatorProps - Migrated from base.d.ts
 */
export interface AdvancedFeeCalculatorProps extends BaseFeeCalculatorProps {
  type: string;
  fileType?: string | undefined;
  fileSize?: number | undefined;
  issuance?: number;
  serviceFee?: number | null;
  userAddress?: string | undefined;
  outputTypes?: ScriptType[];
  utxoAncestors?: AncestorInfo[];
  feeDetails?: FeeDetails;
  effectiveFeeRate?: number;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  inputType?: string;
  bitname?: string;
  fromPage?: string;
}

/**
 * PaginationState - Comprehensive pagination state interface
 * Consolidated from stamp.d.ts and pagination.d.ts to support all consumers
 */
export interface PaginationState {
  // Basic pagination properties (for FreshStampGallery compatibility)
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;

  // Comprehensive pagination properties (for test and advanced usage)
  currentPage: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;

  // Optional enhanced properties
  offset?: number;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

/**
 * InfiniteScrollState - Migrated from pagination.d.ts
 */
export interface InfiniteScrollState<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  cursor?: string;
  error?: string;
}

/**
 * SortState - Migrated from sorting.d.ts
 */
export interface SortState<T extends SortKey = SortKey> {
  /** Currently selected sort key */
  readonly sortBy: T;
  /** Sort direction (derived from sortBy but explicit for state management) */
  readonly direction: SortDirection;
  /** Whether sorting is currently in progress */
  readonly isLoading?: boolean;
  /** Any error that occurred during sorting */
  readonly error?: string | null;
  /** Timestamp of last sort operation */
  readonly lastSorted?: Date | undefined;
}

/**
 * Base sorting component props
 */
export interface SortingComponentProps<T = any> {
  children?: ComponentChildren;
  className?: string;
  testId?: string;
  "aria-label"?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * EnhancedSortState - Migrated from sorting.d.ts
 */
export interface EnhancedSortState<T extends SortKey = SortKey>
  extends SortState<T> {
  /** Whether URL sync is enabled */
  readonly urlSyncEnabled: boolean;
  /** Whether localStorage persistence is enabled */
  readonly persistenceEnabled: boolean;
  /** Performance metrics */
  readonly metrics: SortMetrics | undefined;
  /** History of recent sorts */
  readonly sortHistory: ReadonlyArray<T>;
  /** Cache state */
  readonly cache: {
    readonly hits: number;
    readonly misses: number;
    readonly size: number;
  };
}

/**
 * StampingProps - Migrated from stamping.ts
 */
export interface StampingProps {
  transactions: StampTransaction[];
}

/**
 * SRC20MintingProps - Migrated from stamping.ts
 */
export interface SRC20MintingProps {
  // For stamping transaction tracking
  transactions?: SRC20Transaction[];
  // For minting card components (SRC20CardMinting, SRC20CardSmMinting)
  data?: SRC20Row[];
  fromPage?: "src20" | "wallet" | "stamping/src20" | "home";
  // For table components
  isLoading?: boolean;
  timeframe?: Timeframe;
  onImageClick?: (imgSrc: string) => void;
  // Current sort state for table headers
  currentSort?: {
    filter: string;
    direction: "asc" | "desc";
  };
  mints?: any[];
}

/**
 * SRC20MintingTableProps - Props for SRC20MintingTable component
 */
export interface SRC20MintingTableProps {
  data?: SRC20Row[];
  fromPage?: "src20" | "wallet" | "stamping/src20" | "home";
  timeframe?: Timeframe;
  onImageClick?: (imgSrc: string) => void;
}

/**
 * SRC20MintedTableProps - Props for SRC20MintedTable component
 */
export interface SRC20MintedTableProps {
  data?: SRC20Row[];
  fromPage?: "src20" | "wallet" | "stamping/src20" | "home";
  timeframe?: Timeframe;
  onImageClick?: (imgSrc: string) => void;
}

/**
 * ToastProviderProps - Props for ToastProvider component
 */
export interface ToastProviderProps {
  children: ComponentChildren;
}

/**
 * ToastComponentProps - Props for ToastComponent
 */
export interface ToastComponentProps {
  id: string;
  message: string;
  body?: ComponentChildren;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  autoDismiss: boolean;
  duration: number;
  isAnimatingOut?: boolean;
}

/**
 * WalletStampCardProps - Props for WalletStampCard component
 */
export interface WalletStampCardProps {
  stamp: any;
  variant?: "default" | string;
  fromPage?: string;
}

/**
 * StampInfoProps - Props for StampInfo component
 */
export interface StampInfoProps {
  stamp: any;
  lowestPriceDispenser?: any;
}

/**
 * RangeInputProps - Props for RangeInput component
 */
export interface RangeInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
}

/**
 * SRC20OverviewHeaderProps - Props for SRC20OverviewHeader component
 */
export interface SRC20OverviewHeaderProps {
  onViewTypeChange?: (viewType: string) => void;
  viewType?: string;
  onTimeframeChange?: (timeframe: string) => void;
  onFilterChange?: (filter: any) => void;
  currentSort?: any;
}

/**
 * TransferProps - Migrated from stamping.ts
 */
export interface TransferProps {
  transactions: StampTransaction[];
  sends?: any[];
  isLoading?: boolean;
}

/**
 * DeployProps - Migrated from stamping.ts
 */
export interface DeployProps {
  transactions: StampTransaction[];
}

// Example utility type usage (PickByValue and OmitByValue are available from utils.d.ts)
// export type NumberProps<T> = PickByValue<T, number>;
// export type NonNumberProps<T> = OmitByValue<T, number>;

/**
 * WalletConnectionState - Migrated from wallet.d.ts
 */
export interface WalletConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  wallet?: WalletInfo;
  supportedWallets: WalletProviders[];
}

/**
 * WalletSearchState - Migrated from wallet.d.ts
 */
export interface WalletSearchState {
  query: string;
  filters: WalletFilterOptions;
  sortBy: WalletSortKey;
  isLoading: boolean;
  error?: string;
  results: WalletStampWithValue[];
  totalResults: number;
}

/**
 * WalletNavigationState - Migrated from wallet.d.ts
 */
export interface WalletNavigationState {
  currentTab: "stamps" | "activity" | "dispensers" | "stats";
  stampView: "grid" | "list" | "table";
  showFilters: boolean;
  showSearch: boolean;
  selectedStamps: number[];
  bulkActions: {
    isEnabled: boolean;
    availableActions: string[];
    isProcessing: boolean;
  };
  breadcrumbs: {
    label: string;
    href: string;
  }[];
}

/**
 * WalletPageProps - Migrated from wallet.d.ts
 */
export interface WalletPageProps {
  walletData: WalletOverviewInfo;
  stampsTotal: number;
  src20Total: number;
  stampsCreated: number;
  data: {
    stamps: any;
    src20: any;
    dispensers: any;
  };
  stampsSortBy?: "ASC" | "DESC";
  src20SortBy?: "ASC" | "DESC";
}

/**
 * WalletContentProps - Migrated from wallet.d.ts
 */
export interface WalletContentProps {
  stamps: any;
  src20: any;
  dispensers: any;
  address: string;
  anchor?: string;
  stampsSortBy?: "ASC" | "DESC";
  src20SortBy?: "ASC" | "DESC";
  dispensersSortBy?: "ASC" | "DESC";
}

/**
 * WalletAuthState - Migrated from wallet.d.ts
 */
export interface WalletAuthState {
  isLocked: boolean;
  lastUnlocked?: Date;
  sessionTimeout?: number; // Session timeout in milliseconds
  requiresPin: boolean;
  requiresBiometric: boolean;
  maxFailedAttempts: number;
  failedAttempts: number;
}

/**
 * CollectionLandingPageProps - Migrated from index.tsx
 */
export type CollectionLandingPageProps = {
  data: {
    collections: CollectionWithOptionalMarketData[];
    total: number;
    _page: number;
    _pages: number;
    _page_size: number;
    _filterBy: string[];
    sortBy: "ASC" | "DESC";
    stamps_src721: StampRow[];
    stamps_posh: StampRow[];
  };
};

/**
 * State - Migrated from sharedContentHandler.ts
 */
export interface State {
  baseUrl: string;
}

/**
 * CircuitBreakerState - Migrated from circuitBreaker.ts
 */
export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  lastStateChange: Date;
  requestCount: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  recentFailures: number[];
  permanentDisableReason?: string;
}

/**
 * ListDisplayProps - Migrated from ListBase.tsx
 */
export interface ListDisplayProps {
  title: string;
  image: string;
  description: string | string[];
}

/**
 * StampGalleryProps - Re-export from stamp.d.ts for compatibility
 */
export type { StampGalleryProps } from "$types/stamp.d.ts";

/**
 * ConvenienceProviderProps - Convenience Provider component props
 */
export interface ConvenienceProviderProps extends BaseComponentProps {
  children: ComponentChildren;
  initialValue?: any;
  onChange?: (value: any) => void;
  defaultValue?: any;
  defaultSort?: string;
}

/**
 * CompleteSortingInterfaceProps - Complete Sorting Interface component props
 */
export interface CompleteSortingInterfaceProps extends BaseComponentProps {
  config?: any;
  showLabel?: boolean;
  showError?: boolean;
  sortBy: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  options: Array<{ key: string; label: string }>;
  variant?: "default" | "compact" | "inline" | "dropdown" | "buttons";
  size?: ButtonSize;
  showLoading?: boolean;
}

/**
 * PieChartProps - Pie Chart component props
 */
export interface PieChartProps extends BaseComponentProps {
  holders?: import("./wallet.d.ts").HolderRow[]; // Added to support the holders prop
  data?: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
    }>;
  };
  width?: number | string;
  height?: number | string;
  title?: string;
}

/**
 * ImageModalProps - Image Modal component props
 */
export interface ImageModalProps {
  imgSrc?: string;
  src?: string;
  alt?: string;
  caption?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * FairmintToolProps - Fairmint Tool component props
 */
export interface FairmintToolProps extends BaseComponentProps {
  fairminters?: any[];
  asset?: string;
  quantity?: number;
  onSubmit?: (data: any) => void;
  loading?: boolean;
  error?: string;
}

/**
 * MintProgressProps - Mint Progress component props
 */
export interface MintProgressProps extends BaseComponentProps {
  progress?: number;
  progressWidth?: string;
  maxSupply?: number;
  limit?: number;
  current: number;
  total: number;
  label?: string;
  variant?: "linear" | "circular";
  color?: string;
  minters?: any[] | string | number;
}

/**
 * StampSendsGalleryProps - Migrated from StampSends.tsx
 */
export interface StampSendsGalleryProps {
  serverData?: StampTransaction[];
}

/**
 * StampSortingAdapterProps - Migrated from StampSortingAdapter.tsx
 */
export interface StampSortingAdapterProps {
  stamps: StampRow[];
  onSortChange?: (sortedStamps: StampRow[]) => void;
  enableAdvancedSorting?: boolean;
  sortingConfig?: {
    cacheSize?: number;
    enableMetrics?: boolean;
    performanceThreshold?: number;
  };
}

/**
 * WalletSortingAdapterProps - Migrated from WalletSortingAdapter.tsx
 */
export interface WalletSortingAdapterProps {
  stamps: WalletStampWithValue[];
  address: string;
  onSortChange?: (sortedStamps: WalletStampWithValue[]) => void;
  enableAdvancedSorting?: boolean;
  sortingConfig?: {
    cacheSize?: number;
    enableMetrics?: boolean;
    performanceThreshold?: number;
  };
}

/**
 * EnhancedSortButtonProps - Migrated from EnhancedSortButton.tsx
 */
export interface EnhancedSortButtonProps {
  enableAdvancedSorting?: boolean;
  showMetrics?: boolean;
  className?: string;
}

/**
 * CollectionDetailsPageProps - Migrated from [id].tsx
 */
export type CollectionDetailsPageProps = {
  data: {
    id: string;
    collection: any;
    stamps: StampRow[];
    total: number;
    page: number;
    pages: number;
    page_size: number;
    selectedTab: "all" | "classic" | "posh";
    sortBy: string;
    filterBy: string[];
  };
};

/**
 * ProjectState - Migrated from performanceTracker.ts
 */
export interface ProjectState {
  /** Total number of TypeScript files */
  totalFiles: number;
  /** Total lines of code */
  totalLOC: number;
  /** Domain migration progress percentage */
  migrationProgress: number;
  /** Git commit hash */
  commitHash: string;
  /** Dependency versions */
  dependencies: Record<string, string>;
}

/**
 * LoadingState - Migrated from errorHandlingUtils.ts
 */
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string | undefined;
  progress?: number | undefined;
  startTime?: Date | undefined;
  timeout?: number | undefined;
}

/**
 * ProgressiveFeeEstimationProps - Migrated from fee-estimation-utils.ts
 */
export interface ProgressiveFeeEstimationProps {
  isEstimating?: boolean;
  isPreFetching?: boolean;
  currentPhase?: "instant" | "cached" | "exact";
  phase1Result?: ProgressiveFeeEstimationResult | null;
  phase2Result?: ProgressiveFeeEstimationResult | null;
  phase3Result?: ProgressiveFeeEstimationResult | null;
  feeEstimationError?: Error | null;
  clearError?: () => void;
}

/**
 * FeeState - Migrated from feeSignal.ts
 */
export interface FeeState {
  data: FeeData | null;
  loading: boolean;
  lastUpdated: number | null;
  error: string | null;
  retryCount: number;
  lastKnownGoodData: FeeData | null; // Keep last successful data
}

// =============================================================================
// EXTENDED ERROR TYPES
// =============================================================================

/**
 * Extended error type with additional properties
 */
export interface ExtendedError extends Error {
  severity?: "low" | "medium" | "high" | "critical";
  retryable?: boolean;
  details?: string;
  type?: string;
  timestamp?: Date | string;
  recoverable?: boolean;
  action?: string;
}

// EXPORTS
// =============================================================================

// Re-export commonly used Preact types for convenience
export type { ComponentChildren, ComponentProps, JSX } from "preact";

// Augment EventTarget to include value property
declare global {
  interface EventTarget {
    value?: string | number;
    target?: { value?: string | number };
  }

  interface String {
    target?: { value?: string | number };
  }
}

/**
 * AlertState - Migrated from scripts/alert-system.ts
 */
interface AlertState {
  lastSent: Record<string, string>;
  alertCounts: Record<string, number>;
  hourlyCount: number;
  lastHourReset: string;
}

/**
 * AlertContext - Migrated from scripts/alert-system.ts
 */
export interface AlertContext {
  environment: string;
  sessionId?: string;
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
}

/**
 * SimpleFeeState - Migrated from tests/integration/feeInfiniteLoopPrevention.test.ts
 */
export interface SimpleFeeState {
  data: {
    recommendedFee: number;
    btcPrice: number;
  } | null;
  loading: boolean;
}

/**
 * VersionContext - Migrated from server/middleware/apiVersionMiddleware.ts
 */
export interface VersionContext {
  version: string;
  isDeprecated: boolean;
  endOfLife?: string;
  enhancedFields: string[];
}

/**
 * Context - Migrated from server/middleware/apiVersionMiddleware.ts
 */
export type Context = any;
type Next = any;

// CircuitState is now imported from $constants
export { CircuitState } from "$constants";

/**
 * WalletContext - Migrated from client/wallet/wallet.ts
 */
export interface WalletContext {
  readonly wallet: Wallet;
  readonly isConnected: boolean;
  updateWallet: (wallet: Wallet) => void;
  getBasicStampInfo: (address: string) => Promise<any>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<any>;
  signPSBT: (
    wallet: Wallet,
    psbt: string,
    inputsToSign: any[],
    enableRBF?: boolean,
    sighashTypes?: number[],
    autoBroadcast?: boolean,
  ) => Promise<any>;
  broadcastRawTX: (rawTx: string) => Promise<any>;
  broadcastPSBT: (psbtHex: string) => Promise<any>;
  showConnectModal: () => void;
}

// Duplicate ListProps removed - using the one at line 2387

/**
 * SharedListProps - Props for shared list components
 */
export interface SharedListProps {
  children: preact.ComponentChildren;
  hasImportantNotes?: boolean;
}

/**
 * CompilationContext - Migrated from lib/utils/monitoring/compilation/metricsCollector.ts
 */
export interface CompilationContext {
  sessionId: string;
  startTime: number;
  files: string[];
  config: CompilerConfiguration;
  memorySnapshots: number[];
  fileMetrics: Map<string, Partial<FileCompilationMetrics>>;
}

/**
 * AlertContext - Migrated from scripts/alert-system.ts
 */
export interface AlertContext {
  environment: string;
  sessionId?: string;
  totalAlerts: number;
  criticalAlerts: number;
}

// =============================================================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// =============================================================================

/**
 * Backward compatibility aliases for commonly expected type names
 */
export type SRC20CardProps = SRC20CardBaseProps;
export type SRC20CardMintingProps = SRC20MintingProps;
export type SRC20CardSmProps = SRC20CardBaseProps;
export interface SRC20CardSmMintingProps extends SRC20MintingProps {
  // Ensure explicit onImageClick type handling
  onImageClick?: (imgSrc: string) => void;
}
export type SRC20MintsProps = SRC20MintingProps;
export type SRC20TransfersProps = TransferProps;
export type StampTransfersProps = TransferProps;

/**
 * Additional missing prop interfaces as aliases
 */
export interface WalletStampValueProps {
  stampId: number;
  walletAddress: string;
  className?: string;
  showSource?: boolean;
  size?: IconSize | number;
  stamp?: any;
  showBreakdown?: boolean;
}

export interface ProgressiveEstimationIndicatorProps {
  isConnected: boolean;
  isSubmitting: boolean;
  isPreFetching: boolean;
  currentPhase: "instant" | "smart" | "exact";
  phase1?: any;
  phase2?: any;
  phase3?: any;
  feeEstimationError?: string | null;
  clearError?: () => void;
  isEstimating?: boolean;
  progress?: number;
  className?: string;
}

export interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
  transform?: (value: T[keyof T]) => string | number;
}

export interface ListProps<T> {
  items: T[];
  columns: ColumnDefinition<T>[];
  keyExtractor?: (item: T) => string | number;
  onItemClick?: (item: T) => void;
  sortBy?: keyof T;
  sortOrder?: "asc" | "desc";
}

export interface MockResponse<T> {
  data: T;
  status: number;
  headers?: Record<string, string>;
  error?: string;
}

/**
 * Color Swatch component props
 */
export interface ColorSwatchProps extends BaseComponentProps {
  color: string;
  size?: ButtonSize;
  variant?: "solid" | "outline";
  onClick?: () => void;
  selected?: boolean;
  name?: string;
  bgClass?: string;
}

/**
 * Namespace import type for flexible module imports
 */
export type NamespaceImport<T> = { [K in keyof T]: T[K] };

/**
 * XcpBalance type for tracking cryptocurrency balance
 */
export interface XcpBalance {
  asset: string;
  balance: number;
  available_balance: number;
  locked_balance?: number;
  total_received?: number;
  total_sent?: number;
}

/**
 * How-to step props interface for ListBase component
 * This replaces the incorrect usage of generic ListProps<T>
 */
export interface HowToStepProps {
  title: string;
  image: string;
  description: string | string[];
}

/**
 * Extended how-to step props with number for numbered steps
 */
export interface NumberedHowToStepProps extends HowToStepProps {
  number: number;
}

/**
 * JSX Extension for f-partial attribute support
 * Extends HTML elements to support Fresh framework's f-partial attribute
 */
declare module "preact" {
  namespace JSX {
    interface HTMLAttributes<RefType, T = RefType> {
      "f-partial"?: string | SignalLike<string | undefined>;
    }
  }
}

/** Pagination sort direction */
export type PaginationSort = "asc" | "desc";

/** Unified sorting type for various components */
export type Sort = "ASC" | "DESC" | { key: string; direction: PaginationSort };

/**
 * Skeleton Loader Component Props
 */
export interface SkeletonLoaderProps {
  className?: string;
}
