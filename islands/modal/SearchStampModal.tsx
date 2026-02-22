/* @baba - commentary + global styles */
import { Icon, PlaceholderImage } from "$icon";
import { SearchErrorDisplay } from "$islands/modal/SearchErrorDisplay.tsx";
import { SearchInputField } from "$islands/modal/SearchInputField.tsx";
import { closeModal, openModal, searchState } from "$islands/modal/states.ts";
import { ModalSearchBase, transitionColors } from "$layout";
import { generateSearchErrorMessage } from "$lib/utils/data/search/searchInputClassifier.ts";
import { isValidBitcoinAddress } from "$lib/utils/typeGuards.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { handleImageError } from "$lib/utils/ui/media/imageUtils.ts";
import {
  navigateSSRSafe,
  scheduleFocus,
  useAutoFocus,
  useDebouncedSearch,
} from "$lib/utils/ui/search/searchHooks.ts";

export function openStampSearch() {
  const inputRef = {
    current: null,
  } as preact.RefObject<HTMLInputElement>;

  const handleSearch = async () => {
    const currentTerm = searchState.value.term;

    if (!currentTerm?.trim()) {
      searchState.value = {
        ...searchState.value,
        error: "",
        results: [],
      };
      return;
    }

    searchState.value = { ...searchState.value, isLoading: true };
    try {
      const response = await fetch(
        `/api/v2/stamps/search?q=${encodeURIComponent(currentTerm.trim())}`,
        {
          headers: {
            "X-API-Version": "2.3",
          },
        },
      );
      const data = await response.json();

      if (
        !response.ok || !data.data || data.data.length === 0
      ) {
        // For valid addresses with no results, show a
        // link to the wallet page instead of an error
        if (isValidBitcoinAddress(currentTerm.trim())) {
          searchState.value = {
            ...searchState.value,
            isLoading: false,
            error: "",
            results: [
              {
                _addressLink: true,
                address: currentTerm.trim(),
              },
            ],
          };
          return;
        }
        searchState.value = {
          ...searchState.value,
          isLoading: false,
          error: generateSearchErrorMessage(
            currentTerm.trim(),
            "stamp",
          ),
          results: [],
        };
        return;
      }

      // For valid address searches, prepend a wallet link row
      const addressRow = isValidBitcoinAddress(currentTerm.trim())
        ? [{ _addressLink: true, address: currentTerm.trim() }]
        : [];

      searchState.value = {
        ...searchState.value,
        isLoading: false,
        error: "",
        results: [...addressRow, ...data.data],
      };
    } catch (err) {
      console.error("Stamp Search Error:", err);
      searchState.value = {
        ...searchState.value,
        isLoading: false,
        error: "AN ERROR OCCURRED\nPlease try again later",
        results: [],
      };
    }
  };

  // Open modal
  searchState.value = { term: "", error: "", isLoading: false, results: [] };
  const modalContent = (
    <ModalSearchBase
      title="Search Stamps"
      onClose={() => {
        searchState.value = {
          term: "",
          error: "",
          results: [],
        };
        closeModal();
      }}
    >
      <SearchContent
        searchTerm={searchState.value.term}
        setSearchTerm={(term) => {
          searchState.value = { ...searchState.value, term };
        }}
        error={searchState.value.error}
        results={searchState.value.results || []}
        inputRef={inputRef}
        onSearch={handleSearch}
        setError={(error) => {
          searchState.value = { ...searchState.value, error };
        }}
        autoFocus
      />
    </ModalSearchBase>
  );
  openModal(modalContent, "slideDownUp");
  scheduleFocus();
}

function SearchContent({
  setSearchTerm,
  inputRef,
  onSearch,
  autoFocus = false,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  error: string;
  // deno-lint-ignore no-explicit-any
  results: any[];
  inputRef: preact.RefObject<HTMLInputElement>;
  onSearch: () => void;
  setError: (error: string) => void;
  autoFocus?: boolean;
}) {
  // Shared hooks
  useAutoFocus(inputRef, autoFocus);
  useDebouncedSearch(searchState.value.term, onSearch, 300, () => {
    searchState.value = { ...searchState.value, error: "", results: [] };
  });

  const handleResultClick = (stamp: number | string) => {
    navigateSSRSafe(`/stamp/${stamp}`);
  };

  // deno-lint-ignore no-explicit-any
  const rawResults = (searchState.value.results || []) as any[];
  const error = searchState.value.error;

  return (
    <>
      <SearchInputField
        value={searchState.value.term}
        onChange={setSearchTerm}
        onSearch={onSearch}
        placeholder="STAMP #, CPID, ADDY OR TX HASH"
        inputRef={inputRef}
        autoFocus={autoFocus}
        hasResults={rawResults.length > 0}
        hasError={!!error}
        isLoading={searchState.value.isLoading}
      />

      {error
        ? <SearchErrorDisplay error={error} />
        : rawResults.length > 0
        ? (
          <ul class="max-h-[266px] bg-color-background/50 rounded-b-3xl z-modal overflow-y-auto scrollbar-background-overlay [&::-webkit-scrollbar]:!rounded-[2px] [&::-webkit-scrollbar]:!w-[4px]">
            {rawResults.map(
              (result) =>
                result._addressLink
                  ? (
                    <li
                      key="address-link"
                      onClick={() =>
                        navigateSSRSafe(
                          `/wallet/${result.address}`,
                        )}
                      class={`flex items-center gap-5 px-7.5 py-1.5 hover:bg-color-background/60 ${transitionColors} cursor-pointer`}
                    >
                      <div class="w-10 h-10 rounded bg-color-background/30 flex items-center justify-center">
                        <Icon
                          type="icon"
                          name="wallet"
                          weight="normal"
                          size="md"
                          color="greyLight"
                        />
                      </div>
                      <div class="flex flex-col flex-1 min-w-0">
                        <span class="text-sm font-medium text-stamp-grey-light">
                          VIEW WALLET
                        </span>
                        <span class="text-xs text-stamp-grey truncate">
                          {result.address?.startsWith("bc1p")
                            ? abbreviateAddress(result.address, 20)
                            : result.address}
                        </span>
                      </div>
                    </li>
                  )
                  : (
                    <li
                      key={result.stamp}
                      onClick={() => handleResultClick(result.stamp)}
                      class={`flex items-center gap-5 px-7.5 py-1.5 hover:bg-color-background/60 ${transitionColors} cursor-pointer`}
                    >
                      {result.preview &&
                          result.mimetype?.startsWith("image/")
                        ? (
                          <img
                            src={result.preview}
                            alt={`Stamp ${result.stamp}`}
                            class="w-10 h-10 rounded object-cover flex-shrink-0"
                            onError={handleImageError}
                          />
                        )
                        : result.mimetype === "text/plain"
                        ? (
                          <div class="w-10 h-10 rounded flex-shrink-0 bg-[#ff7700] flex items-center justify-center">
                            <span class="text-[9px] font-bold text-black tracking-widest leading-none">
                              TXT
                            </span>
                          </div>
                        )
                        : !result.mimetype ||
                            result.mimetype === "UNKNOWN" ||
                            result.mimetype === "application/octet-stream"
                        ? (
                          <div class="w-10 h-10 flex-shrink-0">
                            <PlaceholderImage
                              variant="error"
                              className="!rounded"
                            />
                          </div>
                        )
                        : (
                          <div class="w-10 h-10 rounded bg-stamp-grey/20 flex items-center justify-center flex-shrink-0">
                            <Icon
                              type="icon"
                              name="stamp"
                              weight="normal"
                              size="sm"
                              color="grey"
                            />
                          </div>
                        )}
                      <div class="flex flex-col flex-1">
                        <span class="text-sm font-medium text-color-grey-light">
                          #{result.stamp} - {result.cpid}
                        </span>
                        <span class="text-xs text-color-grey truncate">
                          {result.creator?.startsWith("bc1p")
                            ? abbreviateAddress(result.creator, 20)
                            : result.creator}
                        </span>
                      </div>
                    </li>
                  ),
            )}
          </ul>
        )
        : null}
    </>
  );
}
