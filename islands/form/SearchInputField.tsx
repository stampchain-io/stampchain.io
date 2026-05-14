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
        class={`relative z-modal h-12 w-full pl-7.5 pr-[68px] bg-transparent font-medium text-sm tablet:text-xs text-color-neutral-200 placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase outline-none focus-visible:outline-none`}
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
                hasError
                  ? "stroke-color-neutral-400"
                  : "stroke-color-neutral-600"
              }`}
            />
          )}
      </div>
    </>
  );
}
