/**
 * @fileoverview SortingComponent - Base sorting component with compound pattern
 * @description Provides flexible sorting UI components that can be composed together
 * using the compound component pattern for maximum reusability and customization
 */

import { Icon } from "$icon";
import { useSorting } from "$islands/sorting/SortingProvider.tsx";
import { transitionAll } from "$layout";
import type { SortKey } from "$lib/types/sorting.d.ts";
import { SORT_LABELS } from "$lib/utils/data/sorting/sortingConstants.ts";
import type {
  SortingComponentProps,
  SortingErrorProps,
  SortingLabelProps,
  StyledSortingButtonsProps,
  StyledSortingDropdownProps,
} from "$types/ui.d.ts";

// ===== BASE SORTING COMPONENT =====

/**
 * Props for the main SortingComponent
 */

/**
 * Main SortingComponent - Container for sorting UI elements
 */
export function SortingComponent({
  children,
  className = "",
  testId,
  "aria-label": ariaLabel = "Sort options",
}: SortingComponentProps) {
  return (
    <div
      className={`sorting-component ${className}`}
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

// ===== COMPOUND COMPONENTS =====

/**
 * Props for SortingDropdown
 */

/**
 * SortingDropdown - Dropdown selector for sort options
 */
SortingComponent.Dropdown = function SortingDropdown({
  options,
  className = "",
  placeholder = "Sort by...",
  testId,
  showLoading = false,
  renderOption,
}: StyledSortingDropdownProps) {
  const { sortState, setSortBy, isLoading } = useSorting();

  const handleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setSortBy(target.value as SortKey);
  };

  const isLoadingState = isLoading || showLoading;

  return (
    <div className={`sorting-dropdown ${className}`} data-testid={testId}>
      <select
        value={sortState.sortBy}
        onChange={handleChange}
        disabled={isLoadingState}
        className={`
          sorting-dropdown__select
          ${isLoadingState ? "sorting-dropdown__select--loading" : ""}
        `}
        aria-label="Sort options"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {renderOption ? renderOption(option) : option.label}
          </option>
        ))}
      </select>

      {isLoadingState && (
        <div className="sorting-dropdown__loading">
          <Icon
            type="icon"
            name="loading"
            weight="normal"
            color="neutral500"
            size="sm"
            className="sorting-dropdown__loading-icon"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Props for SortingButtons
 */

/**
 * SortingButtons - Button group for sort options
 */
SortingComponent.Buttons = function SortingButtons({
  options,
  className = "",
  testId,
  variant = "secondary",
  size = "md",
  showIcons = true,
  showLoading = false,
  renderButton,
}: StyledSortingButtonsProps) {
  const { sortState, setSortBy, isLoading } = useSorting();

  const handleClick = (value: SortKey) => {
    setSortBy(value);
  };

  const isLoadingState = isLoading || showLoading;

  return (
    <div
      className={`sorting-buttons ${className}`}
      data-testid={testId}
      role="group"
      aria-label="Sort options"
    >
      {options.map((option: any) => {
        const isActive = sortState.sortBy === option.value;

        if (renderButton) {
          return (
            <div
              key={option.value}
              onClick={() => handleClick(option.value)}
            >
              {renderButton(option, isActive)}
            </div>
          );
        }

        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            disabled={isLoadingState}
            className={`
              sorting-buttons__button
              sorting-buttons__button--${variant}
              sorting-buttons__button--${size}
              ${isActive ? "sorting-buttons__button--active" : ""}
              ${isLoadingState ? "sorting-buttons__button--loading" : ""}
            `}
            aria-pressed={isActive}
            type="button"
          >
            {showIcons && option.icon && (
              <Icon
                type="icon"
                name={option.icon}
                weight="normal"
                color="neutral500"
                size="sm"
                className="sorting-buttons__button-icon"
              />
            )}
            <span className="sorting-buttons__button-label">
              {option.label}
            </span>
            {isActive && (
              <Icon
                type="icon"
                name="check"
                weight="normal"
                color="neutral500"
                size="sm"
                className="sorting-buttons__button-check"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Props for SortingLabel
 */

/**
 * SortingLabel - Display current sort selection
 */
SortingComponent.Label = function SortingLabel({
  className = "",
  testId,
  showDirection = true,
  showLoading = false,
  format,
}: SortingLabelProps) {
  const { sortState, isLoading } = useSorting();

  const isLoadingState = isLoading || showLoading;

  const getLabel = () => {
    if (format) {
      return `${sortState.sortBy}-${sortState.direction}`;
    }

    const baseLabel =
      SORT_LABELS[sortState.sortBy as keyof typeof SORT_LABELS] ||
      sortState.sortBy;

    if (showDirection) {
      return (
        <span class="flex items-center gap-1">
          {baseLabel}
          <Icon
            type="icon"
            name="caretUp"
            weight="normal"
            size="md"
            color="custom"
            className={`stroke-color-grey-light ${transitionAll} ${
              sortState.direction === "desc" ? "scale-y-[-1]" : ""
            }`}
          />
        </span>
      );
    }

    return baseLabel;
  };

  return (
    <div
      className={`sorting-label ${className}`}
      data-testid={testId}
    >
      <span className="sorting-label__text">
        {isLoadingState ? "Sorting..." : getLabel()}
      </span>
      {isLoadingState && (
        <Icon
          type="icon"
          name="loading"
          weight="normal"
          color="neutral500"
          size="sm"
          className="sorting-label__loading-icon"
        />
      )}
    </div>
  );
};

/**
 * Props for SortingError
 */

/**
 * SortingError - Display sorting errors
 */
SortingComponent.Error = function SortingError({
  className = "",
  testId,
  message,
  showRetry = true,
  onRetry,
}: SortingErrorProps) {
  const { error, clearError, resetSort } = useSorting();

  if (!error) return null;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      clearError();
      resetSort();
    }
  };

  return (
    <div
      className={`sorting-error ${className}`}
      data-testid={testId}
      role="alert"
      aria-live="polite"
    >
      <div className="sorting-error__content">
        <Icon
          type="icon"
          name="warning"
          weight="normal"
          color="neutral500"
          size="sm"
          className="sorting-error__icon"
        />
        <span className="sorting-error__message">
          {message || error}
        </span>
      </div>
      {showRetry && (
        <button
          onClick={handleRetry}
          className="sorting-error__retry-button"
          type="button"
        >
          <Icon
            type="icon"
            name="refresh"
            weight="normal"
            color="neutral500"
            size="sm"
            className="sorting-error__retry-icon"
          />
          Retry
        </button>
      )}
    </div>
  );
};
