import { RangeSliderDual, ToggleButton } from "$button";
import { Radiobutton } from "$islands/filter/FilterComponents.tsx";
import { SRC20Filters } from "$islands/filter/FilterOptionsSRC20.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import { useEffect, useState } from "preact/hooks";

// Helper function to check if a section has active filters
function hasActiveFilters(section: string, filters: SRC20Filters) {
  switch (section) {
    case "status":
      return filters.status.fullyMinted ||
        filters.status.minting ||
        filters.status.trendingMints;
    case "details":
      return filters.details.deploy ||
        filters.details.supply ||
        filters.details.holders;
    case "market":
      return filters.market.marketcap ||
        filters.market.volume ||
        filters.market.priceChange;
    default:
      return false;
  }
}

type SectionKey =
  | "status"
  | "market"
  | "details"
  | "holdersRange"
  | "volumePeriod"
  | "priceChangePeriod";

type PeriodType = "24h" | "3d" | "7d";

export const FilterContentSRC20 = ({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: SRC20Filters;
  onFiltersChange: (filters: SRC20Filters) => void;
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [volumePeriod, setVolumePeriod] = useState<PeriodType>(
    initialFilters.market.volumePeriod || "24h",
  );
  const [priceChangePeriod, setPriceChangePeriod] = useState<PeriodType>(
    initialFilters.market.priceChangePeriod || "24h",
  );

  // Add this effect to watch for changes to initialFilters
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Add this effect to update the period states when initialFilters changes
  useEffect(() => {
    if (initialFilters.market.volumePeriod) {
      setVolumePeriod(initialFilters.market.volumePeriod as PeriodType);
    }

    if (initialFilters.market.priceChangePeriod) {
      setPriceChangePeriod(
        initialFilters.market.priceChangePeriod as PeriodType,
      );
    }
  }, [initialFilters]);

  const [expandedSections, setExpandedSections] = useState({
    status: true,
    market: hasActiveFilters("market", filters),
    details: hasActiveFilters("details", filters),
    holdersRange: false,
    volumePeriod: false,
    priceChangePeriod: false,
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const handleHoldersRangeChange = (min: number, max: number) => {
    // Only update if values are defined
    if (min !== undefined && max !== undefined) {
      // Convert min to number, or default if it's 0
      const minVal = min === 0 ? 0 : min;

      // For max, if it's Infinity, use a reasonable default
      const maxVal = max === Infinity ? 10000 : max;

      // Update the filters state with the new values
      setFilters((prevFilters) => {
        const newFilters = {
          ...prevFilters,
          details: {
            ...prevFilters.details,
            holdersRange: {
              min: minVal,
              max: maxVal,
            },
          },
        };
        onFiltersChange(newFilters);
        return newFilters;
      });
    }
  };

  // Update the handleStatusChange function to allow deselection
  const handleStatusChange = (
    statusType: "fullyMinted" | "minting" | "trendingMints",
  ) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        status: {
          ...prevFilters.status,
          fullyMinted: prevFilters.status.fullyMinted === true
            ? false
            : statusType === "fullyMinted",
          minting: prevFilters.status.minting === true
            ? false
            : statusType === "minting",
          trendingMints: prevFilters.status.trendingMints === true
            ? false
            : statusType === "trendingMints",
        },
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Modify the handler functions to handle the combined Details + Market group
  const handleDetailsAndMarketChange = (
    category: "details" | "market",
    option: string,
  ) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        details: {
          ...prevFilters.details,
          deploy: category === "details" && option === "deploy"
            ? (prevFilters.details.deploy === true ? false : true)
            : false,
          supply: category === "details" && option === "supply"
            ? (prevFilters.details.supply === true ? false : true)
            : false,
          holders: category === "details" && option === "holders"
            ? (prevFilters.details.holders === true ? false : true)
            : false,
        },
        market: {
          ...prevFilters.market,
          marketcap: category === "market" && option === "marketcap"
            ? (prevFilters.market.marketcap === true ? false : true)
            : false,
          volume: category === "market" && option === "volume"
            ? (prevFilters.market.volume === true ? false : true)
            : false,
          priceChange: category === "market" && option === "priceChange"
            ? (prevFilters.market.priceChange === true ? false : true)
            : false,
        },
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  return (
    <div class="space-y-1.5 tablet:space-y-1">
      {/* STATUS SECTION - Independent group */}
      <CollapsibleSection
        title="STATUS"
        section="status"
        expanded={expandedSections.status}
        toggle={() => toggleSection("status")}
        variant="collapsibleTitle"
      >
        <Radiobutton
          label="FULLY MINTED"
          value="fullyMinted"
          checked={filters.status.fullyMinted}
          onChange={() => handleStatusChange("fullyMinted")}
          name="status"
        />

        <Radiobutton
          label="MINTING"
          value="minting"
          checked={filters.status.minting}
          onChange={() => handleStatusChange("minting")}
          name="status"
        />

        <Radiobutton
          label="TRENDING MINTS"
          value="trendingMints"
          checked={filters.status.trendingMints}
          onChange={() => handleStatusChange("trendingMints")}
          name="status"
        />
      </CollapsibleSection>

      {/* SPECIFICATIONS SECTION - Part of combined group */}
      <CollapsibleSection
        title="DETAILS"
        section="details"
        expanded={expandedSections.details}
        toggle={() => toggleSection("details")}
        variant="collapsibleTitle"
      >
        <Radiobutton
          label="DEPLOY DATE"
          value="deploy"
          checked={filters.details.deploy}
          onChange={() => handleDetailsAndMarketChange("details", "deploy")}
          name="specsAndMarket"
        />

        <Radiobutton
          label="SUPPLY"
          value="supply"
          checked={filters.details.supply}
          onChange={() => handleDetailsAndMarketChange("details", "supply")}
          name="specsAndMarket"
        />

        <Radiobutton
          label="HOLDERS"
          value="holders"
          checked={filters.details.holders}
          onChange={() => handleDetailsAndMarketChange("details", "holders")}
          name="specsAndMarket"
        />

        {filters.details.holders && (
          <CollapsibleSection
            title=""
            section="holdersRange"
            expanded
            toggle={() => {}}
            variant="collapsibleLabel"
          >
            <RangeSliderDual
              variant="holders"
              onChange={handleHoldersRangeChange}
            />
          </CollapsibleSection>
        )}
      </CollapsibleSection>

      {/* MARKET SECTION - Part of combined group */}
      <CollapsibleSection
        title="MARKET"
        section="market"
        expanded={expandedSections.market}
        toggle={() => toggleSection("market")}
        variant="collapsibleTitle"
      >
        <Radiobutton
          label="MARKET CAP"
          value="marketcap"
          checked={filters.market.marketcap}
          onChange={() => handleDetailsAndMarketChange("market", "marketcap")}
          name="specsAndMarket"
        />

        <Radiobutton
          label="VOLUME"
          value="volume"
          checked={filters.market.volume}
          onChange={() => handleDetailsAndMarketChange("market", "volume")}
          name="specsAndMarket"
        />

        <Radiobutton
          label="PRICE CHANGE"
          value="priceChange"
          checked={filters.market.priceChange}
          onChange={() => handleDetailsAndMarketChange("market", "priceChange")}
          name="specsAndMarket"
        />

        {/* Wrap VOLUME time period buttons in CollapsibleSection */}
        {filters.market.volume && (
          <CollapsibleSection
            title=""
            section="volumePeriod"
            expanded
            toggle={() => {}}
            variant="collapsibleLabel"
          >
            <ToggleButton
              size="md"
              options={["24h", "3d", "7d"]}
              selected={volumePeriod}
              onChange={(newPeriod: string | string[]) => {
                const period = newPeriod as PeriodType;
                setVolumePeriod(period);

                // Update the parent's filter state
                setFilters((prevFilters) => {
                  const newFilters = {
                    ...prevFilters,
                    market: {
                      ...prevFilters.market,
                      volumePeriod: period,
                    },
                  };
                  onFiltersChange(newFilters);
                  return newFilters;
                });
              }}
              mode="single"
              spacing="even"
            />
          </CollapsibleSection>
        )}

        {/* Wrap PRICE CHANGE time period buttons in CollapsibleSection */}
        {filters.market.priceChange && (
          <CollapsibleSection
            title=""
            section="priceChangePeriod"
            expanded
            toggle={() => {}}
            variant="collapsibleLabel"
          >
            <ToggleButton
              size="md"
              options={["24h", "3d", "7d"]}
              selected={priceChangePeriod}
              onChange={(newPeriod: string | string[]) => {
                const period = newPeriod as PeriodType;
                setPriceChangePeriod(period);

                // Update the parent's filter state
                setFilters((prevFilters) => {
                  const newFilters = {
                    ...prevFilters,
                    market: {
                      ...prevFilters.market,
                      priceChangePeriod: period,
                    },
                  };
                  onFiltersChange(newFilters);
                  return newFilters;
                });
              }}
              mode="single"
              spacing="even"
            />
          </CollapsibleSection>
        )}
      </CollapsibleSection>
    </div>
  );
};

export default FilterContentSRC20;
