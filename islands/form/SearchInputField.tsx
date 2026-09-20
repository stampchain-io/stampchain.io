/**
 * Shared search input field for search modals.
 *
 * Renders the text input with a search icon, rounded corners
 * that adapt based on whether results or errors are showing.
 * Used by both SearchStampModal and SearchSRC20Modal.
 */
import { Icon } from "$icon";
import { container2Icon, loaderSpinXsGrey } from "$layout";
import type { RefObject } from "preact";

interface SearchInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement>;
  autoFocus?: boolean;
  hasError: boolean;
  isLoading?: boolean | undefined;
  iconName?: string;
  iconAriaLabel?: string;
  iconActive?: boolean;
  onIconClick?: () => void;
}

export function SearchInputField({
  value,
  onChange,
  onSearch,
  placeholder,
  inputRef,
  autoFocus = false,
  hasError,
  isLoading = false,
  iconName = "search",
  iconAriaLabel = "Search",
  iconActive = false,
  onIconClick,
}: SearchInputFieldProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        data-search-input
        type="text"
        placeholder={placeholder}
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        class={`relative z-modal h-12 w-full pl-7.5 pr-[68px] bg-transparent font-medium text-sm tablet:text-xs text-color-neutral-200 placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase outline-none focus-visible:outline-none`}
      />
      {isLoading
        ? (
          <div class="absolute z-modal right-6 top-[11px]">
            <div class={`${loaderSpinXsGrey} mt-[7px] mr-[3px]`} />
          </div>
        )
        : onIconClick
        ? (
          <div class="absolute z-modal right-3 top-[7px]">
            <div class={container2Icon}>
              <Icon
                type="iconButton"
                name={iconName}
                weight="normal"
                size="xsR"
                color={iconActive ? "primary400" : "neutral400"}
                ariaLabel={iconAriaLabel}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onIconClick();
                }}
              />
            </div>
          </div>
        )
        : (
          <div
            class="absolute z-modal right-6 top-[11px] cursor-pointer"
            onClick={onSearch}
          >
            <Icon
              type="icon"
              name={iconName}
              weight="bold"
              size="xs"
              color="custom"
              ariaLabel={iconAriaLabel}
              className={`w-5 h-5 ${
                hasError
                  ? "stroke-color-neutral-400"
                  : "stroke-color-neutral-600"
              }`}
            />
          </div>
        )}
    </>
  );
}
