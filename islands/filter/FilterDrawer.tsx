import { FilterContentStamps } from "$islands/filter/FilterContentStamps.tsx";
import {
  defaultFilters as stampDefaultFilters,
  filtersToQueryParams as stampFiltersToQueryParams,
  queryParamsToFilters as stampQueryParamsToFilters,
  StampFilters,
} from "$islands/filter/FilterOptionsStamps.tsx";
import { useEffect, useRef, useState } from "preact/hooks";
// Import SRC20 filter options
import {
  defaultFilters as src20DefaultFilters,
  filtersToQueryParams as src20FiltersToQueryParams,
  queryParamsToFilters as src20QueryParamsToFilters,
  SRC20Filters,
} from "$islands/filter/FilterOptionsSRC20.tsx";
// Import Explorer filter options and content
import { FilterContentExplorer } from "$islands/filter/FilterContentExplorer.tsx";
import {
  defaultFilters as explorerDefaultFilters,
  ExplorerFilters,
  filtersToQueryParams as explorerFiltersToQueryParams,
  queryParamsToFilters as explorerQueryParamsToFilters,
} from "$islands/filter/FilterOptionsExplorer.tsx";
// Import SRC20 filter content
import { Button } from "$button";
import { CloseIcon, Icon } from "$icon";
import type { FilterType } from "$islands/button/FilterButton.tsx";
import { FilterContentSRC20 } from "$islands/filter/FilterContentSRC20.tsx";
import {
  container0,
  containerStickyBottom,
  transitionTransform,
} from "$layout";
import { tooltipIcon } from "$notification";
import {
  getSearchParams,
  isBrowser,
  safeNavigate,
} from "$utils/navigation/freshNavigationUtils.ts";

// Tooltip component
const Tooltip = ({ visible, text }: { visible: boolean; text: string }) => (
  <div class={`${tooltipIcon} ${visible ? "opacity-100" : "opacity-0"}`}>
    {text}
  </div>
);

// Define a type for all possible filter types
type AllFilters = StampFilters | SRC20Filters | ExplorerFilters;

const FilterDrawer = (
  { open, setOpen, type = "stamp" }: {
    open: boolean;
    setOpen: (status: boolean) => void;
    type?: FilterType;
  },
) => {
  // Parse the current URL parameters to initialize filters
  const getInitialFilters = (): AllFilters => {
    // SSR-safe browser environment check
    if (!isBrowser()) {
      // SSR: return default filters
      return getEmptyFilters();
    }
    const searchParams = getSearchParams();
    const searchString = searchParams.toString();

    let filters;
    switch (type) {
      case "src20": {
        filters = src20QueryParamsToFilters(searchString);
        break;
      }
      case "explorer": {
        filters = explorerQueryParamsToFilters(searchString);
        break;
      }
      default: {
        filters = stampQueryParamsToFilters(searchString);
        break;
      }
    }
    return filters;
  };

  // Get empty filters for the CLEAR button
  const getEmptyFilters = (): AllFilters => {
    switch (type) {
      case "src20":
        return { ...src20DefaultFilters };
      case "explorer":
        return { ...explorerDefaultFilters };
      default:
        return { ...stampDefaultFilters };
    }
  };

  const emptyFilters = getEmptyFilters();
  const [currentFilters, setCurrentFilters] = useState<AllFilters>(
    getInitialFilters(),
  );

  // Store the initial filters from URL to restore on CLEAR
  const initialFiltersRef = useRef<AllFilters | null>(null);

  // Capture initial filters ONCE when drawer opens
  useEffect(() => {
    if (open && !initialFiltersRef.current) {
      // Capture the filters from URL at the moment drawer opens
      initialFiltersRef.current = getInitialFilters();
    }
    // Reset when drawer closes
    if (!open) {
      initialFiltersRef.current = null;
    }
  }, [open]);

  // Update filters when type changes
  useEffect(() => {
    const newFilters = getInitialFilters();
    setCurrentFilters(newFilters);
  }, [type]);

  // Add a ref to track if we're clearing filters
  const isClearingRef = useRef(false);

  // Handle browser resize
  useEffect(() => {
    let resizeTimer: number | null = null;

    const handleResize = () => {
      // Disable transitions during resize
      if (drawerRef.current) {
        drawerRef.current.style.transition = "none";
      }

      // Re-enable transitions after resize is complete
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }

      resizeTimer = setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.style.transition = "";
        }
      }, 100) as unknown as number;
    };

    globalThis.addEventListener("resize", handleResize);
    return () => {
      globalThis.removeEventListener("resize", handleResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
  }, []);

  // Handle open and close events
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Combined handler for keyboard shortcuts and click outside
    const handleCloseEvents = (e: KeyboardEvent | MouseEvent) => {
      // Handle keyboard shortcuts
      if (e.type === "keydown") {
        const keyEvent = e as KeyboardEvent;

        // Close on Escape key
        if (keyEvent.key === "Escape" && open) {
          e.preventDefault();
          handleCloseDrawer();
        }

        // Toggle on Cmd/Ctrl+F
        if ((keyEvent.metaKey || keyEvent.ctrlKey) && keyEvent.key === "f") {
          e.preventDefault();
          if (open) {
            handleCloseDrawer();
          } else {
            setOpen(true);
          }
        }
      }

      // Handle click outside
      if (e.type === "mousedown" && open) {
        // Check if the click was outside the drawer
        if (
          drawerRef.current && !drawerRef.current.contains(e.target as Node)
        ) {
          handleCloseDrawer();
        }
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleCloseEvents);
    document.addEventListener("mousedown", handleCloseEvents);

    // Clean up event listeners
    return () => {
      document.removeEventListener("keydown", handleCloseEvents);
      document.removeEventListener("mousedown", handleCloseEvents);
    };
  }, [open]); // Remove currentFilters from dependencies

  // Accordion: only one collapsible section open at a time
  useEffect(() => {
    if (!open) return;

    const handleSectionToggle = (event: Event) => {
      const target = event.target as HTMLElement;
      const sectionButton = target.closest("button[data-section-toggle]");

      if (!sectionButton || !drawerRef.current?.contains(sectionButton)) return;

      const currentSection = sectionButton.nextElementSibling;
      const isCurrentlyExpanded = currentSection?.getAttribute(
        "data-section-expanded",
      ) === "true";

      // Only close others when opening a section (not when closing)
      if (!isCurrentlyExpanded) {
        const allSectionButtons = drawerRef.current.querySelectorAll(
          "button[data-section-toggle]",
        );
        allSectionButtons.forEach((button) => {
          if (button !== sectionButton) {
            const nextSibling = button.nextElementSibling;
            if (
              nextSibling?.getAttribute("data-section-expanded") === "true"
            ) {
              (button as HTMLButtonElement).click();
            }
          }
        });
      }
    };

    drawerRef.current?.addEventListener("click", handleSectionToggle, true);

    return () => {
      drawerRef.current?.removeEventListener(
        "click",
        handleSectionToggle,
        true,
      );
    };
  }, [open]);

  // Add tooltip state for close button
  const [isCloseTooltipVisible, setIsCloseTooltipVisible] = useState(false);
  const [allowCloseTooltip, setAllowCloseTooltip] = useState(true);
  const [closeTooltipText, setCloseTooltipText] = useState("CLOSE");
  const closeTooltipTimeoutRef = useRef<number | null>(null);

  const handleCloseMouseEnter = () => {
    if (allowCloseTooltip) {
      setCloseTooltipText("CLOSE");
      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }
      closeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCloseTooltipVisible(true);
      }, 1500);
    }
  };

  const handleCloseMouseLeave = () => {
    if (closeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(closeTooltipTimeoutRef.current);
    }
    setIsCloseTooltipVisible(false);
    setAllowCloseTooltip(true);
  };

  // Get the appropriate drawer ID based on type
  const drawerId = `drawer-form-${type}`;

  // Close the drawer with no updates
  const handleCloseDrawer = () => {
    setOpen(false);
  };

  const handleApplyFilters = () => {
    // SSR-safe browser environment check
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      setOpen(false);
      return; // Cannot apply filters during SSR
    }

    const existingParams = new URLSearchParams(globalThis.location.search);
    const baseParams = existingParams.get("type")
      ? `type=${existingParams.get("type")}`
      : "";

    let queryParams: string;
    if (type === "stamp") {
      queryParams = stampFiltersToQueryParams(
        baseParams,
        currentFilters as StampFilters,
      );
    } else if (type === "src20") {
      queryParams = src20FiltersToQueryParams(
        baseParams,
        currentFilters as SRC20Filters,
      );
    } else if (type === "explorer") {
      const viewParam = existingParams.get("view");
      const sortParam = existingParams.get("sortBy");
      const base = [
        viewParam && `view=${viewParam}`,
        sortParam && `sortBy=${sortParam}`,
      ].filter(Boolean).join("&");
      queryParams = explorerFiltersToQueryParams(
        base,
        currentFilters as ExplorerFilters,
      );
    } else {
      setOpen(false);
      return;
    }

    // Construct the new URL with the query params
    // SSR-safe browser environment check
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      setOpen(false);
      return; // Cannot navigate during SSR
    }

    const newUrl = globalThis.location.pathname +
      (queryParams ? `?${queryParams}` : "");

    // Update URL and close drawer
    safeNavigate(newUrl);
    setOpen(false);
  };

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return;
    } else {
      const timer = setTimeout(() => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }, 400); // Match drawer transition duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div
      id={drawerId}
      ref={drawerRef}
      class={`fixed top-0 z-40 h-[100dvh] left-0 right-auto w-full
        ${container0} ${transitionTransform}
        min-[420px]:w-[340px] min-[420px]:rounded-r-3xl min-[420px]:border-r-[1px] min-[420px]:border-r-color-border
        min-[420px]:shadow-[12px_0_12px_-6px_rgba(8,7,8,0.75)]
        tablet:right-0 tablet:left-auto tablet:w-[300px] tablet:rounded-l-3xl tablet:border-l-[1px] tablet:border-l-color-border tablet:shadow-[-12px_0_12px_-6px_rgba(8,7,8,0.75)]
        ${
        open ? "translate-x-0" : "-translate-x-full tablet:translate-x-full"
      }`}
      style="transition-timing-function: cubic-bezier(0.46,0.03,0.52,0.96);"
      aria-labelledby="drawer-form-label"
    >
      {/* Content container with flex column to separate scrollable area from sticky buttons */}
      <div class="h-full pt-[29px] mobileLg:pt-[41px] tablet:pt-[40px] flex flex-col">
        {/* Scrollable content area - overflow only on this section */}
        <div class="flex-1 overflow-y-auto scrollbar-background-overlay">
          <div class="px-9 tablet:px-6">
            <div class="relative w-full">
              {/* Mobile CloseIcon - shows by default, hidden on tablet+ */}
              <div class="flex flex-row tablet:hidden justify-between items-center w-full">
                <h6 class="font-extrabold text-2xl bg-gradient-to-r color-neutral-gradient tracking-wide select-none inline-block w-fit">
                  FILTERS
                </h6>
                <div class="relative">
                  <Tooltip
                    visible={isCloseTooltipVisible}
                    text={closeTooltipText}
                  />
                  <CloseIcon
                    size="md"
                    weight="bold"
                    color="greyLight"
                    onClick={handleCloseDrawer}
                    onMouseEnter={handleCloseMouseEnter}
                    onMouseLeave={handleCloseMouseLeave}
                    aria-label="Close"
                  />
                </div>
              </div>
              {/* Tablet+ Icon - hidden on mobile, shows on tablet+ */}
              <div class="hidden tablet:flex flex-row justify-between items-center w-full">
                <div class="relative">
                  <Tooltip
                    visible={isCloseTooltipVisible}
                    text={closeTooltipText}
                  />
                  <Icon
                    type="iconButton"
                    name="close"
                    weight="bold"
                    size="xs"
                    color="greyLight"
                    onClick={handleCloseDrawer}
                    onMouseEnter={handleCloseMouseEnter}
                    onMouseLeave={handleCloseMouseLeave}
                    aria-label="Close menu"
                  />
                </div>
                <h6 class="font-normal text-lg bg-gradient-to-r color-neutral-gradient mt-[2px] select-none inline-block w-fit">
                  FILTERS
                </h6>
              </div>
            </div>
          </div>

          {/* Filter content based on type */}
          <div class="flex flex-col pt-6 pb-[120px] px-9 tablet:pt-5 tablet:pb-[100px] tablet:px-6">
            {type === "stamp" && (
              <FilterContentStamps
                initialFilters={currentFilters as StampFilters}
                onFiltersChange={(filters) => {
                  setCurrentFilters(filters);
                }}
              />
            )}
            {type === "src20" && (
              <FilterContentSRC20
                initialFilters={currentFilters as SRC20Filters}
                onFiltersChange={(filters) => {
                  setCurrentFilters(filters);
                }}
              />
            )}
            {type === "explorer" && (
              <FilterContentExplorer
                initialFilters={currentFilters as ExplorerFilters}
                onFiltersChange={(filters) => {
                  setCurrentFilters(filters);
                }}
              />
            )}
          </div>
        </div>

        {/* Sticky buttons - now outside overflow container */}
        <div
          class={`flex justify-between ${containerStickyBottom} !mt-0 w-full px-9 tablet:px-6 gap-6 bg-transparent`}
        >
          <Button
            variant="outline"
            color="grey"
            size="smR"
            onClick={() => {
              isClearingRef.current = true;
              // Always clear to empty default filters (full reset)
              const clearedFilters = { ...emptyFilters };
              setCurrentFilters(clearedFilters);
              setTimeout(() => {
                isClearingRef.current = false;
              }, 100);
            }}
            class="w-full"
          >
            CLEAR
          </Button>
          <Button
            variant="flat"
            color="purple"
            size="smR"
            onClick={handleApplyFilters}
            class="w-full"
          >
            APPLY
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterDrawer;
