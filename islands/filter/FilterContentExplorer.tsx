import { RangeSliderDual, SelectorButtons } from "$button";
import type { StampRange } from "$constants";
import { Radiobutton } from "$islands/filter/FilterComponents.tsx";
import { FilterContentExplorerSRC20 } from "$islands/filter/FilterContentExplorerSRC20.tsx";
import { FilterContentExplorerStamp } from "$islands/filter/FilterContentExplorerStamp.tsx";
import {
  ExplorerFilters,
  ExplorerSection,
} from "$islands/filter/FilterOptionsExplorer.tsx";
import type { ExplorerSRC20Filters } from "$islands/filter/FilterOptionsExplorerSRC20.tsx";
import type { ExplorerStampFilters } from "$islands/filter/FilterOptionsExplorerStamp.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const FilterContentExplorer = ({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: ExplorerFilters;
  onFiltersChange: (filters: ExplorerFilters) => void;
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [rangeExpanded, setRangeExpanded] = useState(
    filters.range !== null || filters.rangeMin !== "" ||
      filters.rangeMax !== "",
  );
  const [customRangeExpanded, setCustomRangeExpanded] = useState(
    !filters.range && (filters.rangeMin !== "" || filters.rangeMax !== ""),
  );

  const isDraggingRange = useRef(false);

  // Bumping this forces RangeSliderDual (variant="range") to remount so its
  // internal handle positions reset instead of staying at the last dragged
  // spot after the custom range is cleared/deselected.
  const [rangeResetKey, setRangeResetKey] = useState(0);

  useEffect(() => {
    setFilters(initialFilters);
    if (
      !initialFilters.range && !initialFilters.rangeMin &&
      !initialFilters.rangeMax
    ) {
      setCustomRangeExpanded(false);
      setRangeResetKey((k) => k + 1);
    } else {
      setCustomRangeExpanded(
        !initialFilters.range &&
          (initialFilters.rangeMin !== "" || initialFilters.rangeMax !== ""),
      );
    }
  }, [initialFilters]);

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRange.current = false;
    };
    globalThis.addEventListener("mouseup", handleMouseUp);
    globalThis.addEventListener("mouseleave", handleMouseUp);
    return () => {
      globalThis.removeEventListener("mouseup", handleMouseUp);
      globalThis.removeEventListener("mouseleave", handleMouseUp);
    };
  }, []);

  /* ===== SECTION CHANGE ===== */
  const handleSectionChange = (section: string) => {
    const newFilters: ExplorerFilters = {
      ...filters,
      section: section as ExplorerSection,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  /* ===== ALL RANGE HANDLERS ===== */
  const handleRangeChange = (value: string | null) => {
    setFilters((prev) => {
      const newFilters: ExplorerFilters = {
        ...prev,
        range: prev.range === value ? null : value as StampRange | null,
        rangeMin: "",
        rangeMax: "",
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  const handleCustomRangeToggle = () => {
    setFilters((prev) => {
      if (prev.rangeMin || prev.rangeMax) {
        const newFilters: ExplorerFilters = {
          ...prev,
          range: null,
          rangeMin: "",
          rangeMax: "",
        };
        onFiltersChange(newFilters);
        return newFilters;
      }
      setCustomRangeExpanded(true);
      return prev;
    });
  };

  const handleRangeSliderChange = (min: number, max: number) => {
    setFilters((prev) => {
      const newFilters: ExplorerFilters = {
        ...prev,
        range: null,
        rangeMin: min.toString(),
        rangeMax: max === Infinity ? "" : max.toString(),
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  /* ===== STAMP FILTERS CHANGE ===== */
  const handleStampFiltersChange = (stampFilters: ExplorerStampFilters) => {
    setFilters((prev) => {
      const newFilters: ExplorerFilters = { ...prev, stampFilters };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  /* ===== TOKEN FILTERS CHANGE ===== */
  const handleTokenFiltersChange = (tokenFilters: ExplorerSRC20Filters) => {
    setFilters((prev) => {
      const newFilters: ExplorerFilters = { ...prev, tokenFilters };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  /* ===== RENDER ===== */
  return (
    <div>
      {/* Section Selector */}
      <div class="pb-5 tablet:pb-4">
        <SelectorButtons
          options={[
            { value: "all", label: "ALL" },
            { value: "stamps", label: "STAMPS" },
            { value: "tokens", label: "TOKENS" },
          ]}
          value={filters.section}
          onChange={handleSectionChange}
          size="xsR"
          color="primary"
          className="w-full"
        />
      </div>

      {/* ALL: Range section */}
      {filters.section === "all" && (
        <div class="space-y-1.5 tablet:space-y-1">
          <CollapsibleSection
            title="RANGE"
            section="range"
            expanded={rangeExpanded}
            toggle={() => setRangeExpanded((v) => !v)}
            variant="collapsibleTitle"
          >
            {[100, 1000, 5000, 10000, 500000, 1000000].map((value) => (
              <Radiobutton
                key={value}
                label={`< ${value.toLocaleString("en")}`}
                value={value.toString()}
                name="explorerRange"
                checked={filters.range === value.toString()}
                onChange={() => handleRangeChange(value.toString())}
              />
            ))}

            <Radiobutton
              label="CUSTOM RANGE"
              value="custom"
              name="explorerRange"
              checked={!filters.range &&
                (filters.rangeMin !== "" || filters.rangeMax !== "")}
              onChange={handleCustomRangeToggle}
            />

            <CollapsibleSection
              title=""
              section="customRange"
              expanded={customRangeExpanded}
              toggle={() => {}}
              variant="collapsibleLabel"
            >
              <RangeSliderDual
                key={rangeResetKey}
                variant="range"
                onChange={handleRangeSliderChange}
                initialMin={filters.rangeMin ? parseInt(filters.rangeMin) : 0}
                initialMax={filters.rangeMax
                  ? parseInt(filters.rangeMax)
                  : Infinity}
              />
            </CollapsibleSection>
          </CollapsibleSection>
        </div>
      )}

      {/* STAMPS: Full stamp filters */}
      {filters.section === "stamps" && (
        <FilterContentExplorerStamp
          initialFilters={filters.stampFilters}
          onFiltersChange={handleStampFiltersChange}
        />
      )}

      {/* TOKENS: Token-specific filters */}
      {filters.section === "tokens" && (
        <FilterContentExplorerSRC20
          initialFilters={filters.tokenFilters}
          onFiltersChange={handleTokenFiltersChange}
        />
      )}
    </div>
  );
};

export default FilterContentExplorer;
