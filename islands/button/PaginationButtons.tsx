import { IS_BROWSER } from "$fresh/runtime.ts";
import { Icon } from "$icon";
import { container2, container2Hover } from "$layout";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import type { PaginationProps } from "$types/pagination.d.ts";
import { getWindowWidth } from "$utils/navigation/freshNavigationUtils.ts";
import { useEffect, useState } from "preact/hooks";

// Update pagination range constants
const MOBILESM_MAX_PAGE_RANGE = 0;
const MOBILEMD_MAX_PAGE_RANGE = 2;
const TABLET_MAX_PAGE_RANGE = 3;
const DESKTOP_MAX_PAGE_RANGE = 4;

const navBase = `
  flex items-center justify-center
${container2} ${container2Hover}
!rounded-full !backdrop-blur-md`;
const navArrow = `${navBase} group
  w-10 h-10 tablet:w-9 tablet:h-9`;
const navContent = `${navBase} group
  h-10 px-[16px] tablet:h-9 tablet:px-[14px]
  font-light text-sm text-color-grey-semidark hover:text-color-grey leading-[16.5px]`;

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
}: PaginationProps) {
  const screenSize = useScreenSize();
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
    // Use navArrow class for caret buttons, otherwise use navContent
    const baseClass = iconName ? navArrow : navContent;
    const buttonClass = isCurrentPage
      ? `${baseClass} !bg-color-border/15 !border-color-border
       !text-color-grey hover:!text-color-grey font-medium
       hover:!bg-color-border/15 hover:!border-color-border`
      : `${baseClass}`;

    return (
      <button
        type="button"
        class={buttonClass}
        onClick={() => handlePageChange(pageNum)}
        disabled={isCurrentPage}
      >
        {iconName
          ? (
            <Icon
              type="icon"
              name={iconName}
              weight="bold"
              size="xxs"
              color="custom"
              className="stroke-color-grey-semidark group-hover:stroke-color-grey"
            />
          )
          : <span>{pageNum}</span>}
      </button>
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
      class="flex items-center justify-center"
    >
      <ul
        class={`inline-flex items-center -space-x-px gap-3.5`}
      >
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
