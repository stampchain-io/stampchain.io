import { buttonHover } from "$components/button/styles.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { Icon } from "$icon";
import { container2Icon } from "$layout";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import type { PaginationProps } from "$types/pagination.d.ts";
import { getWindowWidth } from "$utils/navigation/freshNavigationUtils.ts";
import { useEffect, useState } from "preact/hooks";

// Update pagination range constants
const MOBILESM_MAX_PAGE_RANGE = 0;
const MOBILEMD_MAX_PAGE_RANGE = 2;
const TABLET_MAX_PAGE_RANGE = 3;
const DESKTOP_MAX_PAGE_RANGE = 4;

// Each button gets its own container2Icon pill (wrapping div below).
// buttonHover is applied per-button in render — never on the current page.
// Digit buttons size by character count (1-2 / 3 / 4+).
const navBase = "flex items-center justify-center group";
const navArrow = `${navBase} w-7 h-7 tablet:w-6 tablet:h-6`;
const navDigit = `${navBase}
  font-light text-xs text-color-neutral-400 hover:text-color-hover leading-[16.5px]`;
const navDigitSize = (pageNum: number) => {
  const chars = String(pageNum).length;
  if (chars >= 4) return "w-11 h-7 tablet:w-10 tablet:h-6";
  if (chars === 3) return "w-10 h-7 tablet:w-9 tablet:h-6";
  return "w-7 h-7 tablet:w-6 tablet:h-6";
};

// SSR-safe screen size hook
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState("mobileSm");

  useEffect(() => {
    if (!IS_BROWSER) {
      return;
    }

    const handleResize = () => {
      const width = getWindowWidth();
      if (width < 568) {
        setScreenSize("mobileSm");
      } else if (width < 768) {
        setScreenSize("mobileMd");
      } else if (width < 1024) {
        setScreenSize("mobileLg");
      } else {
        setScreenSize("tablet");
      }
    };

    handleResize();
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, []);

  return screenSize;
};

export function PaginationButtons({
  page,
  totalPages,
  prefix = "",
  onPageChange,
  size: sizeOverride,
}: PaginationProps) {
  const detectedSize = useScreenSize();
  const screenSize = sizeOverride ?? detectedSize;
  const { setSearchParam } = useSSRSafeNavigation();

  // Update maxPageRange logic based on screen size
  const getMaxPageRange = (size: string) => {
    switch (size) {
      case "mobileSm":
        return MOBILESM_MAX_PAGE_RANGE;
      case "mobileMd":
        return MOBILEMD_MAX_PAGE_RANGE;
      case "mobileLg":
        return TABLET_MAX_PAGE_RANGE;
      case "tablet":
        return DESKTOP_MAX_PAGE_RANGE;
      default:
        return MOBILESM_MAX_PAGE_RANGE;
    }
  };

  const maxPageRange = getMaxPageRange(screenSize);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
      return;
    }

    // SSR-safe URL parameter update using the navigation hook
    const paramName = prefix ? `${prefix}_page` : "page";
    setSearchParam(paramName, newPage.toString());
  };

  const renderPageButton = (pageNum: number, iconName?: string) => {
    const isCurrentPage = pageNum === page;
    const baseClass = iconName
      ? navArrow
      : `${navDigit} ${navDigitSize(pageNum)}`;
    const buttonClass = isCurrentPage
      ? `${baseClass} font-medium !text-color-primary-400`
      : `${baseClass} ${buttonHover}`;
    // Current page: same pill shape + neutral border as container2Icon, but
    // no gradient fill so the background stays transparent.
    const wrapperClass = isCurrentPage
      ? "relative flex items-center justify-between border border-color-neutral-700 rounded-full p-0.5 gap-1.5 tablet:gap-1"
      : container2Icon;

    return (
      <div class={wrapperClass}>
        <button
          type="button"
          class={buttonClass}
          onClick={() => handlePageChange(pageNum)}
          disabled={isCurrentPage}
          aria-label={`Go to page ${pageNum}`}
        >
          {iconName
            ? (
              <Icon
                type="iconHover"
                name={iconName}
                weight="bold"
                size="xxs"
                color="neutral400"
              />
            )
            : <span>{pageNum}</span>}
        </button>
      </div>
    );
  };

  if (totalPages <= 1) return null;

  // Calculate the range of pages to show
  let startPage = Math.max(1, page - maxPageRange);
  let endPage = Math.min(totalPages, page + maxPageRange);

  // Adjust the range if we're near the start or end
  if (page <= maxPageRange) {
    endPage = Math.min(totalPages, maxPageRange * 2 + 1);
  }
  if (page > totalPages - maxPageRange) {
    startPage = Math.max(1, totalPages - maxPageRange * 2);
  }

  return (
    <nav
      aria-label="Page navigation"
      class="flex items-center justify-center mt-5"
    >
      <ul class="inline-flex items-center gap-3.5">
        {/* First and Previous */}
        {page > 1 && (
          <>
            {renderPageButton(1, "caretDoubleLeft")}
            {renderPageButton(page - 1, "caretLeft")}
          </>
        )}

        {/* Page numbers */}
        {Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage + i,
        )
          .map((pageNum) => renderPageButton(pageNum))}

        {/* Next and Last */}
        {page < totalPages && (
          <>
            {renderPageButton(page + 1, "caretRight")}
            {renderPageButton(totalPages, "caretDoubleRight")}
          </>
        )}
      </ul>
    </nav>
  );
}
