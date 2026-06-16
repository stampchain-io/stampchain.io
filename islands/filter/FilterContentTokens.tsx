import { RangeSliderDual } from "$button";
import type { StampRange } from "$constants";
import { Radiobutton } from "$islands/filter/FilterComponents.tsx";
import type { TokenFilters } from "$islands/filter/FilterOptionsTokens.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import { useEffect, useRef, useState } from "preact/hooks";

type SectionKey = "range" | "operation" | "amount";

export const FilterContentTokens = ({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: TokenFilters;
  onFiltersChange: (filters: TokenFilters) => void;
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({
    operation: true,
    amount: filters.amount !== "",
    range: filters.range !== null || filters.rangeMin !== "" ||
      filters.rangeMax !== "",
  });
  const [customRangeExpanded, setCustomRangeExpanded] = useState(
    !filters.range && (filters.rangeMin !== "" || filters.rangeMax !== ""),
  );

  const isDraggingRange = useRef(false);

  useEffect(() => {
    setFilters(initialFilters);
    if (
      !initialFilters.range && !initialFilters.rangeMin &&
      !initialFilters.rangeMax
    ) {
      setCustomRangeExpanded(false);
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

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRangeChange = (value: string | null) => {
    setFilters((prev) => {
      const newFilters: TokenFilters = {
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
        const newFilters: TokenFilters = {
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
      const newFilters: TokenFilters = {
        ...prev,
        range: null,
        rangeMin: min.toString(),
        rangeMax: max === Infinity ? "" : max.toString(),
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  const handleOpChange = (op: TokenFilters["op"]) => {
    setFilters((prev) => {
      const newFilters: TokenFilters = {
        ...prev,
        op: prev.op === op ? "" : op,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  const handleAmountChange = (amount: TokenFilters["amount"]) => {
    setFilters((prev) => {
      const newFilters: TokenFilters = {
        ...prev,
        amount: prev.amount === amount ? "" : amount,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  return (
    <div>
      {/* OPERATION SECTION */}
      <CollapsibleSection
        title="OPERATION"
        section="operation"
        expanded={expandedSections.operation}
        toggle={() => toggleSection("operation")}
        variant="collapsibleTitle"
      >
        <Radiobutton
          label="DEPLOY"
          value="deploy"
          name="tokenOp"
          checked={filters.op === "deploy"}
          onChange={() => handleOpChange("deploy")}
        />
        <Radiobutton
          label="MINT"
          value="mint"
          name="tokenOp"
          checked={filters.op === "mint"}
          onChange={() => handleOpChange("mint")}
        />
        <Radiobutton
          label="TRANSFER"
          value="transfer"
          name="tokenOp"
          checked={filters.op === "transfer"}
          onChange={() => handleOpChange("transfer")}
        />
      </CollapsibleSection>

      {/* AMOUNT SECTION */}
      <CollapsibleSection
        title="AMOUNT"
        section="amount"
        expanded={expandedSections.amount}
        toggle={() => toggleSection("amount")}
        variant="collapsibleTitle"
      >
        <Radiobutton
          label="< 50,000"
          value="<50000"
          name="tokenAmount"
          checked={filters.amount === "<50000"}
          onChange={() => handleAmountChange("<50000")}
        />
        <Radiobutton
          label="< 100,000"
          value="<100000"
          name="tokenAmount"
          checked={filters.amount === "<100000"}
          onChange={() => handleAmountChange("<100000")}
        />
        <Radiobutton
          label="< 250,000"
          value="<250000"
          name="tokenAmount"
          checked={filters.amount === "<250000"}
          onChange={() => handleAmountChange("<250000")}
        />
        <Radiobutton
          label="< 500,000"
          value="<500000"
          name="tokenAmount"
          checked={filters.amount === "<500000"}
          onChange={() => handleAmountChange("<500000")}
        />
        <Radiobutton
          label="< 1,000,000"
          value="<1000000"
          name="tokenAmount"
          checked={filters.amount === "<1000000"}
          onChange={() => handleAmountChange("<1000000")}
        />
      </CollapsibleSection>

      {/* RANGE SECTION */}
      <CollapsibleSection
        title="RANGE"
        section="range"
        expanded={expandedSections.range}
        toggle={() => toggleSection("range")}
        variant="collapsibleTitle"
      >
        {[100, 1000, 5000, 10000, 500000, 1000000].map((value) => (
          <Radiobutton
            key={value}
            label={`< ${value.toLocaleString("en")}`}
            value={value.toString()}
            name="tokenRange"
            checked={filters.range === value.toString()}
            onChange={() => handleRangeChange(value.toString())}
          />
        ))}

        <Radiobutton
          label="CUSTOM RANGE"
          value="custom"
          name="tokenRange"
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
            variant="range"
            onChange={handleRangeSliderChange}
          />
        </CollapsibleSection>
      </CollapsibleSection>
    </div>
  );
};

export default FilterContentTokens;
