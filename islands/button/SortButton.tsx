import { Icon } from "$components/icon/IconBase.tsx";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import { tooltipIcon } from "$notification";
import type { SortProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export function SortButton(
  { searchParams, initSort, sortParam = "sortBy" }: SortProps,
) {
  const { getSearchParam, isClient, getUrl } = useSSRSafeNavigation();

  // Initialize sort based on URL parameter or initSort prop
  const sort = (() => {
    // Use initSort prop if provided
    if (initSort) {
      return initSort;
    }
    // Use SSR-safe navigation for client-side URL parameters
    if (isClient) {
      const currentSort = getSearchParam(sortParam);
      return currentSort === "ASC" ? "ASC" : "DESC";
    }
    // Fallback to server-side searchParams during SSR
    return searchParams?.get(sortParam) === "ASC" ? "ASC" : "DESC";
  })();

  // Add tooltip state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const tooltipTimeoutRef = useRef<number | null>(null);

  // Helper function to determine the anchor based on sort parameter
  const getSectionAnchor = (sortParam: string): string => {
    switch (sortParam) {
      case "stampsSortBy":
        return "stamps";
      case "src20SortBy":
        return "src20";
      case "dispensersSortBy":
        return "dispensers";
      default:
        return "stamps";
    }
  };

  // Generate the sort URL for Fresh.js partial navigation
  const getSortUrl = (): string => {
    // Get current URL in an SSR-safe way
    const url = new URL(getUrl());
    const currentSort = isClient ? getSearchParam(sortParam) || "DESC" : "DESC";
    const newSort = currentSort === "ASC" ? "DESC" : "ASC";

    url.searchParams.set(sortParam, newSort);
    url.searchParams.set("anchor", getSectionAnchor(sortParam));

    return url.toString();
  };

  // Add tooltip handlers
  const handleMouseEnter = () => {
    if (allowTooltip) {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsTooltipVisible(true);
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setAllowTooltip(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div class="relative">
      <a
        href={getSortUrl()}
        f-partial={getSortUrl()}
        class="inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon
          type="iconButton"
          name={sort === "DESC" ? "sortDesc" : "sortAsc"}
          weight="bold"
          size="xxxs"
          color="grey"
          ariaLabel={`Sorted ${sort === "DESC" ? "descending" : "ascending"}`}
        />
      </a>
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        SORT
      </div>
    </div>
  );
}
