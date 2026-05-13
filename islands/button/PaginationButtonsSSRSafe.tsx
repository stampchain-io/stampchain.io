/**
 * Example migration of Pagination component to use SSR-safe navigation
 * This shows how to migrate from direct globalThis.location usage
 */

import { Icon } from "$icon";
import { container2, container2Hover } from "$layout";
import { safeNavigate } from "$utils/navigation/freshNavigationUtils.ts";
import type { JSX } from "preact";

interface PaginationProps {
  page: number;
  totalPages: number;
  maxPageRange?: number;
  onPageChange?: (page: number) => void;
  prefix?: string;
  class?: string;
}

export const PaginationButtonsSSRSafe = ({
  page,
  totalPages,
  maxPageRange = 2,
  onPageChange,
  prefix,
}: PaginationProps): JSX.Element | null => {
  const navBase = `
  flex items-center justify-center
  ${container2} ${container2Hover}
  !rounded-full !backdrop-blur-md`;
  const navArrow = `${navBase} group
  w-10 h-10 tablet:w-9 tablet:h-9`;
  const navContent = `${navBase} group
  h-10 px-[16px] tablet:h-9 tablet:px-[14px]
  font-light text-sm text-color-grey-semidark hover:text-color-grey leading-[16.5px]`;

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
      return;
    }

    // Use Fresh partial navigation if available, fallback to URL parameter update
    const url = new URL(globalThis.location?.href || "http://localhost:8000");
    const paramName = prefix ? `${prefix}_page` : "page";
    url.searchParams.set(paramName, newPage.toString());

    // Try Fresh partial navigation first
    safeNavigate(url.toString());
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
        class={`inline-flex items-center -space-x-px gap-2.5`}
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
};
