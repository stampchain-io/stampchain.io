import { CollectionButton, PaginationButtons, SelectorButtons } from "$button";
import { SearchErrorDisplay, SearchInputField } from "$form";
import { Icon, PlaceholderImage } from "$icon";
import { closeModal, openModal } from "$islands/modal/states.ts";
import {
  container1,
  container2Hover,
  container2Icon,
  containerPill,
  loaderSpinSmGrey,
  ModalSearchBase,
  shadowGlowPurple,
} from "$layout";
import {
  fetchCollections,
  fetchCollectionStamps,
  fetchStampList,
  type StampPickerType,
} from "$lib/utils/api/stamps/fetchStamp.ts";
import { generateSearchErrorMessage } from "$lib/utils/data/search/searchInputClassifier.ts";
import {
  scheduleFocus,
  useAutoFocus,
  useDebouncedSearch,
} from "$lib/utils/ui/search/searchHooks.ts";
import { valueSm } from "$text";
import type { Collection } from "$types/api.d.ts";
import type { RefObject } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

const PICKER_LIMIT = 20;
const COLLECTIONS_PAGE_SIZE = 20;

const PICKER_TYPE_OPTIONS = [
  { value: "all", label: "ALL" },
  { value: "classic", label: "CLASSIC" },
  { value: "posh", label: "POSH" },
  { value: "src-721", label: "RECURSIVE" },
];

type PickerView = "stamps" | "collections" | "collectionStamps";

type PickerCell = {
  key: string;
  id: string;
  stamp?: number | null;
  src?: string;
};

// Collection.stamps isn't on the public Collection interface, but the
// base /api/v2/collections list endpoint returns stamp numbers.
type CollectionListItem = Collection & { stamps?: number[] };

type CollectionCell = {
  key: string;
  id: string;
  name: string;
  src?: string;
};

function closePicker() {
  const modalContainer = document.getElementById(
    "animation-modal-container",
  );
  if (modalContainer) {
    modalContainer.classList.add("out");
  }
  setTimeout(() => {
    closeModal();
  }, 600);
}

export function openSearchStampPicker(opts: {
  onPick: (id: string) => void;
}) {
  const inputRef = {
    current: null,
  } as RefObject<HTMLInputElement>;

  openModal(
    <ModalSearchBase
      title="Search Stamps"
      onClose={closePicker}
    >
      <SearchStampPickerContent
        onPick={opts.onPick}
        inputRef={inputRef}
        autoFocus
      />
    </ModalSearchBase>,
    "slideDownUp",
  );
  scheduleFocus();
}

function cellSrc(opts: {
  stamp?: number | null | undefined;
  preview?: string | undefined;
  stampUrl?: string | undefined;
}): string | undefined {
  if (opts.preview) return opts.preview;
  if (opts.stamp != null) {
    return `/api/v2/stamp/${opts.stamp}/preview?placeholderOnFail=true`;
  }
  return opts.stampUrl;
}

function collectionThumbSrc(c: CollectionListItem): string | undefined {
  const first = c.stamps?.[0];
  if (first != null) {
    return `/api/v2/stamp/${first}/preview?placeholderOnFail=true`;
  }
  return c.first_stamp_image || c.img || undefined;
}

function toPickerCell(s: {
  stamp?: number | null;
  tx_hash?: string;
  stamp_url?: string;
  preview?: string;
}): PickerCell {
  const src = cellSrc({
    stamp: s.stamp,
    stampUrl: s.stamp_url,
    preview: s.preview,
  });
  return {
    key: String(s.tx_hash ?? s.stamp),
    id: String(s.stamp ?? s.tx_hash),
    ...(s.stamp != null ? { stamp: s.stamp } : {}),
    ...(src ? { src } : {}),
  };
}

function StampSearchCell(
  { cell, onPick }: { cell: PickerCell; onPick: (id: string) => void },
) {
  const [imgError, setImgError] = useState(false);
  const src = cell.src;
  const showImg = !!src && !imgError;

  return (
    <button
      type="button"
      class={`relative aspect-square overflow-hidden w-full
        ${container2Hover} ${shadowGlowPurple}`}
      onClick={() => onPick(cell.id)}
    >
      {showImg
        ? (
          <img
            src={src}
            alt={cell.stamp != null ? `Stamp ${cell.stamp}` : "Stamp"}
            class="w-full h-full object-contain pixelart"
            onError={() => setImgError(true)}
          />
        )
        : (
          <PlaceholderImage
            variant="no-image"
            className="!rounded-none !p-[20%]"
          />
        )}
      {cell.stamp != null && (
        <div class="absolute bottom-0.5 right-0.5 z-20 pointer-events-none
          hidden mobileMd:block">
          <div
            class={`${containerPill} font-semibold text-xs
            text-color-neutral-200 !px-1.5 !py-0.5`}
          >
            <span class="font-light">#</span>
            {cell.stamp}
          </div>
        </div>
      )}
    </button>
  );
}

function CollectionSearchCell(
  { cell, onPick }: { cell: CollectionCell; onPick: () => void },
) {
  const [imgError, setImgError] = useState(false);
  const src = cell.src;
  const showImg = !!src && !imgError;

  return (
    <button
      type="button"
      class={`relative aspect-square overflow-hidden w-full
        ${container2Hover} ${shadowGlowPurple}`}
      onClick={onPick}
    >
      {showImg
        ? (
          <img
            src={src}
            alt={cell.name}
            class="w-full h-full object-contain pixelart"
            onError={() => setImgError(true)}
          />
        )
        : (
          <PlaceholderImage
            variant="no-image"
            className="!rounded-none !p-[20%]"
          />
        )}
      <div class="absolute inset-x-0 bottom-0 z-20 pointer-events-none
          bg-gradient-to-t from-color-neutral-900/90 via-color-neutral-900/70
          to-transparent px-1.5 pb-1 pt-3">
        <span class="block truncate text-center font-semibold text-[10px]
            text-color-neutral-200 uppercase">
          {cell.name}
        </span>
      </div>
    </button>
  );
}

function SearchStampPickerContent({
  onPick,
  inputRef,
  autoFocus = false,
}: {
  onPick: (id: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  autoFocus?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<StampPickerType>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [cells, setCells] = useState<PickerCell[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<PickerView>("stamps");
  const [allCollections, setAllCollections] = useState<
    CollectionListItem[] | null
  >(null);
  const [collectionRows, setCollectionRows] = useState<CollectionListItem[]>(
    [],
  );
  const [collectionsPageCount, setCollectionsPageCount] = useState(1);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [activeCollection, setActiveCollection] = useState<
    CollectionListItem | null
  >(null);
  const [collectionStampCells, setCollectionStampCells] = useState<
    PickerCell[]
  >([]);
  const [collectionStampsLoading, setCollectionStampsLoading] = useState(
    false,
  );
  const seq = useRef(0);
  const termRef = useRef(term);
  termRef.current = term;

  useAutoFocus(inputRef, autoFocus && view !== "collectionStamps");

  const filteredCollections = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    const list = allCollections ?? [];
    return [...list]
      .filter((c) => c.collection_name?.toLowerCase().includes(q))
      .sort((a, b) =>
        (a.collection_name ?? "").localeCompare(b.collection_name ?? "")
      );
  }, [allCollections, term]);

  useEffect(() => {
    if (view !== "collections") return;
    if (term.trim()) return;
    let cancelled = false;
    setCollectionsLoading(true);
    fetchCollections(COLLECTIONS_PAGE_SIZE, page, "ASC").then((result) => {
      if (cancelled) return;
      setCollectionRows(result.collections as CollectionListItem[]);
      setCollectionsPageCount(result.totalPages);
      setCollectionsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [view, page, term]);

  useEffect(() => {
    if (view !== "collections") return;
    if (!term.trim()) return;
    if (allCollections !== null) return;
    let cancelled = false;
    setCollectionsLoading(true);
    fetchCollections(1000, 1, "ASC").then((result) => {
      if (cancelled) return;
      setAllCollections(result.collections as CollectionListItem[]);
      setCollectionsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [view, term, allCollections]);

  useEffect(() => {
    if (view !== "collectionStamps" || !activeCollection) return;
    let cancelled = false;
    setCollectionStampsLoading(true);
    fetchCollectionStamps(
      activeCollection.collection_id,
      PICKER_LIMIT,
      page,
    ).then((stamps) => {
      if (cancelled) return;
      setCollectionStampCells(stamps.map((s) => toPickerCell(s)));
      setCollectionStampsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [view, activeCollection, page]);

  const handlePick = (id: string) => {
    onPick(id);
    closePicker();
  };

  const loadCatalog = async (
    nextPage: number,
    nextType: StampPickerType,
  ) => {
    const id = ++seq.current;
    setIsLoading(true);
    setError("");
    const result = await fetchStampList({
      limit: PICKER_LIMIT,
      page: nextPage,
      type: nextType,
    });
    if (id !== seq.current) return;
    setCells(result.stamps.map((s) => toPickerCell(s)));
    setTotalPages(result.totalPages);
    setIsLoading(false);
  };

  const runSearch = async () => {
    const q = termRef.current.trim();
    if (!q) return;
    const id = ++seq.current;
    setIsLoading(true);
    setError("");
    setTotalPages(0);
    try {
      const response = await fetch(
        `/api/v2/stamps/search?q=${encodeURIComponent(q)}`,
        { headers: { "X-API-Version": "2.3" } },
      );
      const data = await response.json();
      if (id !== seq.current) return;
      const rows = Array.isArray(data?.data) ? data.data : [];
      if (!response.ok || rows.length === 0) {
        setCells([]);
        setError(generateSearchErrorMessage(q, "stamp"));
        setIsLoading(false);
        return;
      }
      setCells(rows.map((
        r: {
          stamp?: number | null;
          tx_hash?: string;
          preview?: string;
        },
      ) => toPickerCell(r)));
      setIsLoading(false);
    } catch (err) {
      console.error("Stamp picker search error:", err);
      if (id !== seq.current) return;
      setCells([]);
      setError("AN ERROR OCCURRED\nPlease try again later");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view !== "stamps") return;
    if (term.trim()) {
      seq.current += 1;
      return;
    }
    loadCatalog(page, type);
  }, [type, page, term, view]);

  const stampSearchTerm = view === "stamps" ? term : "";
  useDebouncedSearch(stampSearchTerm, runSearch, 300);

  const isCollectionSearch = view === "collections" && !!term.trim();
  const collectionsTotalPages = isCollectionSearch
    ? Math.max(
      1,
      Math.ceil(filteredCollections.length / COLLECTIONS_PAGE_SIZE),
    )
    : collectionsPageCount;
  const pagedCollections = isCollectionSearch
    ? filteredCollections.slice(
      (page - 1) * COLLECTIONS_PAGE_SIZE,
      page * COLLECTIONS_PAGE_SIZE,
    )
    : collectionRows;

  const handleTypeChange = (value: string) => {
    setType(value as StampPickerType);
    setPage(1);
  };

  const enterCollectionsView = () => {
    setView("collections");
    setTerm("");
    setPage(1);
    setError("");
    setCollectionsLoading(true);
  };

  const exitCollectionsView = () => {
    setView("stamps");
    setTerm("");
    setPage(1);
    setError("");
  };

  const openCollection = (c: CollectionListItem) => {
    setActiveCollection(c);
    setView("collectionStamps");
    setPage(1);
  };

  const backToCollections = () => {
    setActiveCollection(null);
    setView("collections");
    setPage(1);
  };

  const handleTermChange = (value: string) => {
    setTerm(value);
    if (view === "collections") setPage(1);
  };

  const isCatalog = !term.trim();
  const gridLoading = view === "collections"
    ? collectionsLoading
    : view === "collectionStamps"
    ? collectionStampsLoading
    : isLoading;
  const totalPagesForView = view === "stamps"
    ? totalPages
    : view === "collections"
    ? collectionsTotalPages
    : Math.max(
      1,
      Math.ceil((activeCollection?.stamp_count ?? 0) / PICKER_LIMIT),
    );
  const showPagination = view === "stamps" ? isCatalog : true;
  const showEmptyCollections = view === "collections" &&
    !collectionsLoading &&
    pagedCollections.length === 0;

  return (
    <div class={container1}>
      {view !== "collectionStamps"
        ? (
          <SearchInputField
            value={term}
            onChange={handleTermChange}
            onSearch={view === "stamps" ? runSearch : () => {}}
            placeholder={view === "collections"
              ? "Search collections"
              : "STAMP #, CPID, ADDY OR TX HASH"}
            inputRef={inputRef}
            autoFocus={autoFocus}
            hasError={!!error}
            trailing={
              <div class={container2Icon}>
                <CollectionButton
                  view={view === "collections" ? "collections" : "stamps"}
                  onChange={(next) => {
                    if (next === "collections") enterCollectionsView();
                    else exitCollectionsView();
                  }}
                />
              </div>
            }
          />
        )
        : (
          <div class="flex items-center gap-1.5 px-3 pb-3 pt-3">
            <div class={container2Icon}>
              <Icon
                type="iconButton"
                name="caretLeft"
                weight="normal"
                size="md"
                color="neutral400"
                ariaLabel="Back to collections"
                onClick={(e) => {
                  e.preventDefault();
                  backToCollections();
                }}
              />
            </div>
            <h5 class={`${valueSm} truncate`}>
              {activeCollection?.collection_name}
            </h5>
          </div>
        )}

      {view === "stamps" && (
        <div class="w-full px-3 pb-3">
          <SelectorButtons
            options={PICKER_TYPE_OPTIONS}
            value={type}
            onChange={handleTypeChange}
            size="xs"
            color="neutral"
            className="w-full"
          />
        </div>
      )}
      {view === "collections" && <div class="w-full pb-3" />}

      {error && view === "stamps" ? <SearchErrorDisplay error={error} /> : (
        <>
          <div
            class={gridLoading
              ? "flex min-h-[360px] max-h-[360px] items-center justify-center px-3"
              : showEmptyCollections
              ? "flex min-h-[360px] max-h-[360px] items-center justify-center px-3"
              : "grid grid-cols-4 min-[420px]:grid-cols-5 gap-3 content-start px-3"}
          >
            {gridLoading
              ? <div class={loaderSpinSmGrey} />
              : showEmptyCollections
              ? (
                <p class={`${valueSm} text-center text-color-neutral-500`}>
                  NO COLLECTIONS FOUND
                </p>
              )
              : view === "collections"
              ? pagedCollections.map((c) => {
                const src = collectionThumbSrc(c);
                return (
                  <CollectionSearchCell
                    key={c.collection_id}
                    cell={{
                      key: c.collection_id,
                      id: c.collection_id,
                      name: c.collection_name,
                      ...(src ? { src } : {}),
                    }}
                    onPick={() => openCollection(c)}
                  />
                );
              })
              : (view === "collectionStamps" ? collectionStampCells : cells)
                .map((cell) => (
                  <StampSearchCell
                    key={cell.key}
                    cell={cell}
                    onPick={handlePick}
                  />
                ))}
          </div>
          {showPagination && (
            <>
              <div class="overflow-x-auto px-2 pb-3 mobileMd:hidden">
                <PaginationButtons
                  page={page}
                  totalPages={totalPagesForView}
                  onPageChange={setPage}
                  size="mobileSm"
                />
              </div>
              <div class="hidden overflow-x-auto px-2 pb-3 mobileMd:block">
                <PaginationButtons
                  page={page}
                  totalPages={totalPagesForView}
                  onPageChange={setPage}
                  size="mobileMd"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
