import { IS_BROWSER } from "$fresh/runtime.ts";
import { Icon } from "$icon";
import { tooltipIcon } from "$notification";
import type { SortProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export function SortButton(
  { searchParams, initSort, sortParam = "sortBy" }: SortProps,
) {
  // Determine the current sort direction. `initSort` (the server-derived
  // value passed down as a prop) is preferred over reading the URL on the
  // client: Fresh's `f-partial` navigation updates the address bar via
  // `history.pushState` but never fires `popstate`, so any state cached
  // from those listeners (as this component previously relied on via
  // `useSSRSafeNavigation`) goes stale after the very first click and the
  // button stops responding. Reading `location.search` fresh on every
  // render (rather than through a cached hook) avoids that trap for callers
  // that don't pass `initSort` yet.
  const sort = (() => {
    if (initSort) return initSort;
    if (IS_BROWSER && globalThis.location) {
      const currentSort = new URLSearchParams(globalThis.location.search)
        .get(sortParam);
      return currentSort === "ASC" ? "ASC" : "DESC";
    }
    return searchParams?.get(sortParam) === "ASC" ? "ASC" : "DESC";
  })();

  // Add tooltip state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const tooltipTimeoutRef = useRef<number | null>(null);

  // Generate the sort URL for Fresh.js partial navigation
  const getSortUrl = (): string => {
    const newSort = sort === "ASC" ? "DESC" : "ASC";

    if (IS_BROWSER && globalThis.location) {
      const url = new URL(globalThis.location.href);
      url.searchParams.set(sortParam, newSort);
      return url.toString();
    }

    // SSR fallback - pathname isn't known here; carry over whatever
    // `searchParams` was provided and let hydration correct the href.
    const url = new URL("/", "http://localhost");
    searchParams?.forEach((value, key) => url.searchParams.set(key, value));
    url.searchParams.set(sortParam, newSort);
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
    <div
      class="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon
        type="iconButton"
        name={sort === "DESC" ? "sortDesc" : "sortAsc"}
        weight="bold"
        size="custom"
        color="neutral400"
        className="w-[17px] h-[17px] tablet:w-[14px] tablet:h-[14px] stroke-width:1.5"
        href={getSortUrl()}
        f-partial={getSortUrl()}
        ariaLabel={`Sorted ${sort === "DESC" ? "descending" : "ascending"}`}
      />
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
