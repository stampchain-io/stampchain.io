/* @baba - commentary + global styles */
import { stampNumberText, stampPrefix } from "$lib/utils/chain/clientChain.ts";
import { SearchErrorDisplay, SearchInputField } from "$form";
import { PlaceholderImage } from "$icon";
import {
  closeModal,
  globalModal,
  openModal,
  searchState,
} from "$islands/modal/states.ts";
import { WalletSearchResultRow } from "$components/ui/WalletSearchResultRow.tsx";
import { container1, ModalSearchBase, transitionColors } from "$layout";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  navigationSearchError,
  searchNavigation,
} from "$lib/utils/ui/search/navigationSearch.ts";
import {
  navigateSSRSafe,
  scheduleFocus,
  useAutoFocus,
  useDebouncedSearch,
} from "$lib/utils/ui/search/searchHooks.ts";
import { useState } from "preact/hooks";

export function openStampSearch() {
  const inputRef = {
    current: null,
  } as preact.RefObject<HTMLInputElement>;

  let searchId = 0;
  const handleSearch = async () => {
    const currentTerm = searchState.value.term;
    const requestId = ++searchId;
    const isCurrentSearch = () =>
      requestId === searchId &&
      searchState.value.term === currentTerm &&
      globalModal.value.content === modalContent;

    if (!currentTerm?.trim()) {
      searchState.value = {
        ...searchState.value,
        isLoading: false,
        error: "",
        results: [],
      };
      return;
    }

    searchState.value = { ...searchState.value, isLoading: true, error: "" };
    try {
      const results = await searchNavigation(currentTerm, "stamp");
      if (!isCurrentSearch()) return;
      searchState.value = {
        ...searchState.value,
        isLoading: false,
        error: results.length
          ? ""
          : navigationSearchError(currentTerm, "stamp"),
        results,
      };
    } catch (err) {
      if (!isCurrentSearch()) return;
      console.error("Navigation Search Error:", err);
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
      title="Search Stamps & Users"
      onClose={() => {
        searchId++;
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
          searchId++;
          searchState.value = {
            term,
            error: "",
            results: [],
            isLoading: false,
          };
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

function StampResultImage(
  { src, alt }: { src?: string; alt: string },
) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div class="w-10 h-10 flex-shrink-0">
        <PlaceholderImage variant="no-image" className="!rounded" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      class="w-10 h-10 flex-shrink-0 rounded object-contain pixelart"
      onError={() => setError(true)}
    />
  );
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
    searchState.value = {
      ...searchState.value,
      isLoading: false,
      error: "",
      results: [],
    };
  });

  const handleResultClick = (stamp: number | string) => {
    navigateSSRSafe(`/stamp/${stamp}`);
  };

  // deno-lint-ignore no-explicit-any
  const rawResults = (searchState.value.results || []) as any[];
  const error = searchState.value.error;

  return (
    <div class={container1}>
      <SearchInputField
        value={searchState.value.term}
        onChange={setSearchTerm}
        onSearch={onSearch}
        placeholder="USER, STAMP #, CPID, ADDRESS OR TX HASH"
        inputRef={inputRef}
        autoFocus={autoFocus}
        hasError={!!error}
        isLoading={searchState.value.isLoading}
      />

      {error
        ? <SearchErrorDisplay error={error} />
        : rawResults.length > 0
        ? (
          <ul class="max-h-[266px] rounded-b-3xl z-modal overflow-y-auto scrollbar-background-overlay [&::-webkit-scrollbar]:!rounded-[2px] [&::-webkit-scrollbar]:!w-[4px]">
            {rawResults.map(
              (result) =>
                result._addressLink
                  ? (
                    <WalletSearchResultRow
                      key={`wallet-${result.address}`}
                      result={result}
                    />
                  )
                  : (
                    <li
                      key={result.stamp}
                      onClick={() => handleResultClick(result.stamp)}
                      class={`flex items-center gap-5 px-7.5 py-1.5 hover:bg-color-background/60 ${transitionColors} cursor-pointer`}
                    >
                      <StampResultImage
                        src={result.preview}
                        alt={`Stamp ${result.stamp}`}
                      />
                      <div class="flex flex-col flex-1">
                        <span class="text-sm font-medium text-color-neutral-400">
                          {stampPrefix(result.stamp)}
                          {stampNumberText(result.stamp)} - {result.cpid}
                        </span>
                        <span class="text-xs text-color-neutral-500 truncate">
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
    </div>
  );
}
