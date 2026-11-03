/*@baba-styles is not config properly*/
import { SearchErrorDisplay, SearchInputField } from "$form";
import {
  closeModal,
  globalModal,
  openModal,
  searchState,
} from "$islands/modal/states.ts";
import { WalletSearchResultRow } from "$components/ui/WalletSearchResultRow.tsx";
import { container1, ModalSearchBase, transitionColors } from "$layout";
import {
  navigationSearchError,
  searchNavigation,
} from "$lib/utils/ui/search/navigationSearch.ts";
import {
  constructStampUrl,
  toCleanSrc20ImageUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import {
  navigateSSRSafe,
  scheduleFocus,
  useAutoFocus,
  useDebouncedSearch,
} from "$lib/utils/ui/search/searchHooks.ts";

export function openSRC20Search() {
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
      const results = await searchNavigation(currentTerm, "src20");
      if (!isCurrentSearch()) return;
      searchState.value = {
        ...searchState.value,
        isLoading: false,
        error: results.length
          ? ""
          : navigationSearchError(currentTerm, "src20"),
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
      title="Search SRC-20 & Users"
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

  const handleResultClick = (tick: string) => {
    navigateSSRSafe(`/src20/${tick}`);
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
        placeholder="USER, TOKEN, ADDRESS OR TX HASH"
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
                      key={result.tick}
                      onClick={() => handleResultClick(result.tick)}
                      class={`flex items-center gap-5 px-7.5 py-1.5 hover:bg-color-background/60 ${transitionColors} cursor-pointer`}
                    >
                      <img
                        src={result.tx_hash
                          ? toCleanSrc20ImageUrl(
                            constructStampUrl(result.tx_hash),
                          )
                          : "/img/placeholder/broken.png"}
                        alt={result.tick}
                        class="w-10 h-10 rounded object-contain pixelart"
                      />
                      <div class="flex flex-col flex-1">
                        <span class="text-sm font-medium text-color-grey-light uppercase">
                          {result.tick}
                        </span>
                        <span class="text-xs text-color-grey uppercase">
                          {result.progress ? `${result.progress}% Minted` : ""}
                          {result.holders ? ` · ${result.holders} Holders` : ""}
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
