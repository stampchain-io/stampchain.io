/**
 * @fileoverview SortingStyles - Styled sorting components matching stampchain.io design system
 * @description Provides pre-styled sorting components that align with the existing design patterns,
 * using the established color palette, typography, and spacing conventions
 */

import { buttonStyles } from "$button";
import { SortingComponent } from "$islands/sorting/SortingComponent.tsx";
import { SortingProvider } from "$islands/sorting/SortingProvider.tsx";
import type { ButtonSize } from "$lib/constants/uiConstants.ts";
import { cardPriceMinimal } from "$text";
import type {
  CompleteSortingInterfaceProps,
  StyledSortingButtonsProps,
  StyledSortingDropdownProps,
  StyledSortingErrorProps,
  StyledSortingLabelProps,
} from "$types/ui.d.ts";

// ===== STYLED SORTING COMPONENTS =====

/**
 * Maps ButtonSize to the acceptable _size values for sorting components
 */
function mapButtonSizeToSortingSize(size: ButtonSize): "sm" | "md" | "lg" {
  switch (size) {
    case "xxs":
    case "xs":
      return "sm";
    case "sm":
      return "sm";
    case "md":
      return "md";
    case "lg":
    case "xl":
      return "lg";
    default:
      return "md";
  }
}

/**
 * Props for StyledSortingDropdown
 */

/**
 * StyledSortingDropdown - Dropdown with stampchain.io styling
 */
function StyledSortingDropdown({
  options,
  className = "",
  placeholder = "Sort by...",
  size = "md",
  showLoading = false,
}: StyledSortingDropdownProps) {
  const sizeClasses = {
    xxs: "h-[28px] px-2 text-xs",
    xs: "h-[30px] px-2 text-xs",
    sm: "h-[34px] px-3 text-xs",
    md: "h-[38px] px-4 text-sm",
    lg: "h-[42px] px-4 text-sm",
    xl: "h-[46px] px-5 text-base",
    "2xl": "h-[50px] px-6 text-lg",
    custom: "px-4 py-2 text-sm",
  } as const;

  return (
    <div className="styled-sorting-dropdown">
      <SortingComponent.Dropdown
        options={options}
        placeholder={placeholder}
        showLoading={showLoading}
        className={`
          sorting-dropdown--styled
          ${sizeClasses[size]}
          rounded-2xl
          bg-color-grey focus:bg-color-grey-light
          border-2 border-transparent
          hover:border-color-purple-light
          focus-within:border-color-purple-light
          font-medium text-color-grey-dark
          placeholder:font-light placeholder:text-color-grey-dark
          outline-none focus:outline-none
          transition-colors duration-200
          ${className}
        `}
      />
    </div>
  );
}

/**
 * Props for StyledSortingButtons
 */

/**
 * StyledSortingButtons - Button group with stampchain.io styling
 */
function StyledSortingButtons({
  options,
  className = "",
  variant = "secondary",
  size = "md",
  showIcons = true,
  showLoading = false,
}: StyledSortingButtonsProps) {
  const getVariantClasses = (variant: string, isActive: boolean) => {
    const baseClasses = `
      ${buttonStyles.base}
      ${buttonStyles.size[size]}
      font-medium
      transition-all duration-300
      border-2
    `;

    switch (variant) {
      case "primary":
        return `${baseClasses} ${
          isActive
            ? "bg-color-purple-light border-color-purple-light text-white"
            : "bg-color-purple-semilight border-color-purple-semilight text-white hover:bg-color-purple-light hover:border-color-purple-light"
        }`;
      case "secondary":
        return `${baseClasses} ${
          isActive
            ? "bg-color-grey-light border-color-purple-light text-color-grey-dark"
            : "bg-color-grey border-color-grey text-color-grey-dark hover:bg-color-grey-light hover:border-color-purple-light"
        }`;
      case "ghost":
        return `${baseClasses} ${
          isActive
            ? "bg-transparent border-color-purple-light text-color-purple-light"
            : "bg-transparent border-transparent text-color-grey-light hover:border-color-purple-light hover:text-color-purple-light"
        }`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="styled-sorting-buttons">
      <SortingComponent.Buttons
        options={options}
        showIcons={showIcons}
        showLoading={showLoading}
        className={`
          sorting-buttons--styled
          flex flex-wrap gap-2
          ${className}
        `}
        renderButton={(option: any, isActive: boolean) => (
          <button
            type="button"
            disabled={showLoading}
            className={`
              ${getVariantClasses(variant, isActive)}
              ${showLoading ? "opacity-50 cursor-not-allowed" : ""}
              rounded-2xl
              flex items-center gap-2
              whitespace-nowrap
            `}
            aria-pressed={isActive}
          >
            {showIcons && option.icon && (
              <span className="sorting-button__icon">
                {/* Icon would be rendered here based on option.icon */}
                <span className="w-4 h-4 opacity-70">⚡</span>
              </span>
            )}
            <span className="sorting-button__label">
              {option.label}
            </span>
            {isActive && (
              <span className="sorting-button__check text-xs">
                ✓
              </span>
            )}
          </button>
        )}
      />
    </div>
  );
}

/**
 * Props for StyledSortingLabel
 */

/**
 * StyledSortingLabel - Label with stampchain.io styling
 */
function StyledSortingLabel({
  className = "",
  variant = "default",
  showDirection = true,
  showLoading = false,
}: StyledSortingLabelProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "compact":
        return `
          ${cardPriceMinimal}
          text-color-grey-light
        `;
      case "inline":
        return `
          font-medium text-color-grey-dark
          text-sm mobileLg:text-base
        `;
      default:
        return `
          font-normal text-color-grey-light
          text-xs mobileLg:text-sm
        `;
    }
  };

  return (
    <div className="styled-sorting-label">
      <SortingComponent.Label
        showDirection={showDirection}
        showLoading={showLoading}
        className={`
          sorting-label--styled
          ${getVariantClasses()}
          transition-colors duration-300
          ${className}
        `}
      />
    </div>
  );
}

/**
 * Props for StyledSortingError
 */

/**
 * StyledSortingError - Error display with stampchain.io styling
 */
function StyledSortingError({
  className = "",
  showRetry = true,
}: StyledSortingErrorProps) {
  return (
    <div className="styled-sorting-error">
      <SortingComponent.Error
        showRetry={showRetry}
        className={`
          sorting-error--styled
          bg-red-900/20 border border-red-500/30
          rounded-2xl p-4
          text-red-400
          flex items-center gap-3
          ${className}
        `}
      />
    </div>
  );
}

// ===== COMPLETE SORTING INTERFACE =====

/**
 * Props for CompleteSortingInterface
 */

/**
 * CompleteSortingInterface - Complete sorting UI with provider
 */
function CompleteSortingInterface({
  config,
  options,
  variant = "dropdown",
  size = "md",
  className = "",
  showLabel = true,
  showError = true,
}: CompleteSortingInterfaceProps) {
  // Transform options from { key, label } to { value, label } format
  const transformedOptions = options.map(({ key, label }) => ({
    value: key,
    label,
  }));

  return (
    <SortingProvider config={config}>
      <SortingComponent
        className={`
          complete-sorting-interface
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          {/* Sort Controls */}
          <div className="flex-1">
            {variant === "dropdown" && (
              <StyledSortingDropdown
                options={transformedOptions}
                size={mapButtonSizeToSortingSize(size)}
              />
            )}
            {variant === "buttons" && (
              <StyledSortingButtons
                options={transformedOptions}
                size={mapButtonSizeToSortingSize(size)}
              />
            )}
          </div>

          {/* Current Sort Label */}
          {showLabel && (
            <div className="hidden tablet:block">
              <StyledSortingLabel variant="compact" />
            </div>
          )}
        </div>

        {/* Error Display */}
        {showError && (
          <div className="mt-2">
            <StyledSortingError />
          </div>
        )}
      </SortingComponent>
    </SortingProvider>
  );
}

// ===== EXPORTS =====

export {
  CompleteSortingInterface,
  StyledSortingButtons,
  StyledSortingDropdown,
  StyledSortingError,
  StyledSortingLabel,
};
