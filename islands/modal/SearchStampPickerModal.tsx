import { PaginationButtons, SelectorButtons } from "$button";
import { SearchErrorDisplay, SearchInputField } from "$form";
import { PlaceholderImage } from "$icon";
import { closeModal, openModal } from "$islands/modal/states.ts";
import {
  container1,
  container2Hover,
  containerPill,
  loaderSpinSmGrey,
  ModalSearchBase,
  shadowGlowPurple,
} from "$layout";
import {
  fetchStampList,
  type StampPickerType,
} from "$lib/utils/api/stamps/fetchStamp.ts";
import { generateSearchErrorMessage } from "$lib/utils/data/search/searchInputClassifier.ts";
import {
  scheduleFocus,
  useAutoFocus,
  useDebouncedSearch,
} from "$lib/utils/ui/search/searchHooks.ts";
import type { RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const PICKER_LIMIT = 20;

const PICKER_TYPE_OPTIONS = [
  { value: "all", label: "ALL" },
  { value: "classic", label: "CLASSIC" },
  { value: "posh", label: "POSH" },
  { value: "src-721", label: "RECURSIVE" },
];

type PickerCell = {
  key: string;
  id: string;
  stamp?: number | null;
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
  const seq = useRef(0);
  const termRef = useRef(term);
  termRef.current = term;

  useAutoFocus(inputRef, autoFocus);

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
    setCells(result.stamps.map((s) => {
      const src = cellSrc({
        stamp: s.stamp,
        stampUrl: s.stamp_url,
      });
      return {
        key: s.tx_hash,
        id: String(s.stamp ?? s.tx_hash),
        stamp: s.stamp,
        ...(src ? { src } : {}),
      };
    }));
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
      ) => {
        const src = cellSrc({
          stamp: r.stamp,
          preview: r.preview,
        });
        return {
          key: String(r.stamp ?? r.tx_hash),
          id: String(r.stamp ?? r.tx_hash),
          ...(r.stamp != null ? { stamp: r.stamp } : {}),
          ...(src ? { src } : {}),
        };
      }));
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
    if (term.trim()) {
      seq.current += 1;
      return;
    }
    loadCatalog(page, type);
  }, [type, page, term]);

  useDebouncedSearch(term, runSearch, 300);

  const handleTypeChange = (value: string) => {
    setType(value as StampPickerType);
    setPage(1);
  };

  const isCatalog = !term.trim();

  return (
    <div class={container1}>
      <SearchInputField
        value={term}
        onChange={setTerm}
        onSearch={runSearch}
        placeholder="STAMP #, CPID, ADDY OR TX HASH"
        inputRef={inputRef}
        autoFocus={autoFocus}
        hasError={!!error}
        isLoading={isLoading}
      />

      <div class="w-full px-3 pb-3">
        <SelectorButtons
          options={PICKER_TYPE_OPTIONS}
          value={type}
          onChange={handleTypeChange}
          size="xxsR"
          color="neutral"
          className="w-full"
        />
      </div>

      {error ? <SearchErrorDisplay error={error} /> : (
        <>
          <div
            class={isLoading
              ? "flex min-h-[360px] max-h-[360px] items-center justify-center px-3"
              : "grid grid-cols-4 min-[420px]:grid-cols-5 gap-3 content-start px-3"}
          >
            {isLoading
              ? <div class={loaderSpinSmGrey} />
              : cells.map((cell) => (
                <StampSearchCell
                  key={cell.key}
                  cell={cell}
                  onPick={handlePick}
                />
              ))}
          </div>
          {isCatalog && (
            <>
              <div class="overflow-x-auto px-2 pb-3 mobileMd:hidden">
                <PaginationButtons
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  size="mobileSm"
                />
              </div>
              <div class="hidden overflow-x-auto px-2 pb-3 mobileMd:block">
                <PaginationButtons
                  page={page}
                  totalPages={totalPages}
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
