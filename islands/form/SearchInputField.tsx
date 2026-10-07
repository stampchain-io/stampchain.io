/**
 * Shared search input field for search modals.
 *
 * Renders the text input with a search icon, rounded corners
 * that adapt based on whether results or errors are showing.
 * Used by both SearchStampModal and SearchSRC20Modal.
 */
import { Icon } from "$icon";
import { loaderSpinXsGrey } from "$layout";
import type { ComponentChildren, RefObject } from "preact";

interface SearchInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement>;
  autoFocus?: boolean;
  hasError: boolean;
  isLoading?: boolean | undefined;
  trailing?: ComponentChildren;
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
  trailing,
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
        class={`relative z-modal h-10 w-full pl-5 pr-[50px] bg-transparent font-medium text-xs text-color-neutral-200 placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase outline-none focus-visible:outline-none`}
      />
      {trailing
        ? (
          <div class="absolute z-modal top-0.5 right-0.5">
            {trailing}
          </div>
        )
        : isLoading
        ? (
          <div class="absolute z-modal top-3.5 right-4.5">
            <div class={`${loaderSpinXsGrey}`} />
          </div>
        )
        : (
          <div
            class="absolute z-modal top-1.5 right-3.5 cursor-pointer"
            onClick={onSearch}
          >
            <Icon
              type="icon"
              name="search"
              weight="bold"
              size="xl"
              color="custom"
              ariaLabel="Search"
              className={`${
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
