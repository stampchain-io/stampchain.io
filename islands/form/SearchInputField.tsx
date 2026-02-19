/**
 * Shared search input field for search modals.
 *
 * Renders the text input with a search icon, rounded corners
 * that adapt based on whether results or errors are showing.
 * Used by both SearchStampModal and SearchSRC20Modal.
 */
import { Icon } from "$icon";
import { loaderSpinXsGrey } from "$layout";
import type { RefObject } from "preact";

interface SearchInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement>;
  autoFocus?: boolean;
  hasResults: boolean;
  hasError: boolean;
  isLoading?: boolean | undefined;
}

export function SearchInputField({
  value,
  onChange,
  onSearch,
  placeholder,
  inputRef,
  autoFocus = false,
  hasResults,
  hasError,
  isLoading = false,
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
        class={`relative z-modal h-12 w-full bg-color-background/50 pl-7.5 pr-[68px] font-medium text-sm text-color-grey-light placeholder:bg-color-background/50 placeholder:font-light placeholder:!text-color-grey no-outline ${
          hasError || hasResults ? "rounded-t-3xl" : "rounded-3xl"
        }`}
      />
      <div
        class="absolute z-[3] right-6 top-[11px] cursor-pointer"
        onClick={onSearch}
      >
        {isLoading
          ? <div class={`${loaderSpinXsGrey} mt-[7px] mr-[3px]`} />
          : (
            <Icon
              type="icon"
              name="search"
              weight="bold"
              size="xs"
              color="custom"
              className={`w-5 h-5 ${
                hasError ? "stroke-color-grey-light" : "stroke-color-grey"
              }`}
            />
          )}
      </div>
    </>
  );
}
