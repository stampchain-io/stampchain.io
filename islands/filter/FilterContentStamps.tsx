import { RangeSliderDual, ToggleButton } from "$button";
import type {
  FrontendStampType,
  StampEdition,
  StampFilesize,
  StampFiletype,
  StampRange,
} from "$constants";
import { inputCheckbox } from "$form";
import { Checkbox } from "$islands/filter/FilterComponents.tsx";
import { StampFilters } from "$islands/filter/FilterOptionsStamps.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import {
  eyebrowPositionFilter,
  eyebrowPrimary,
  labelLogicResponsive,
} from "$text";
import type { RadioProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

const defaultFilters: StampFilters = {
  // Stamp Type
  stampType: "all",
  // Market Place
  market: "",
  dispensers: false,
  atomics: false,
  listings: "",
  listingsMin: "",
  listingsMax: "",
  sales: "",
  salesMin: "",
  salesMax: "",
  volume: "",
  volumeMin: "",
  volumeMax: "",
  // File Type
  fileType: [],
  // File Size
  fileSize: null,
  fileSizeMin: "",
  fileSizeMax: "",
  // Editions
  editions: [],
  // Range
  range: null,
  rangeMin: "",
  rangeMax: "",
  // Market Data Filters
  minHolderCount: "",
  maxHolderCount: "",
  minDistributionScore: "",
  maxTopHolderPercentage: "",
  minFloorPriceBTC: "",
  maxFloorPriceBTC: "",
  minVolume24h: "",
  minPriceChange24h: "",
  minDataQualityScore: "",
  maxCacheAgeMinutes: "",
  priceSource: "",
};

export function filtersToQueryParams(search: string, filters: StampFilters) {
  const queryParams = new URLSearchParams(search);

  // MARKET TYPE
  if (filters.market) {
    queryParams.set("market", filters.market);
  } else {
    queryParams.delete("market");
  }

  // LISTINGS OPTIONS
  if (filters.dispensers) {
    queryParams.set("dispensers", "true");
  } else {
    queryParams.delete("dispensers");
  }

  if (filters.atomics) {
    queryParams.set("atomics", "true");
  } else {
    queryParams.delete("atomics");
  }

  if (filters.listings) {
    queryParams.set("listings", filters.listings);
  } else {
    queryParams.delete("listings");
  }

  // SALES OPTIONS
  if (filters.sales) {
    queryParams.set("sales", filters.sales);
  } else {
    queryParams.delete("sales");
  }

  // Handle listings price range - only include min/max for custom preset
  if (filters.listings === "custom" && filters.listingsMin) {
    queryParams.set("listingsMin", filters.listingsMin);
  } else {
    queryParams.delete("listingsMin");
  }

  if (filters.listings === "custom" && filters.listingsMax) {
    queryParams.set("listingsMax", filters.listingsMax);
  } else {
    queryParams.delete("listingsMax");
  }

  // Handle sales price range - only include min/max for custom preset
  if (filters.sales === "custom" && filters.salesMin) {
    queryParams.set("salesMin", filters.salesMin);
  } else {
    queryParams.delete("salesMin");
  }

  if (filters.sales === "custom" && filters.salesMax) {
    queryParams.set("salesMax", filters.salesMax);
  } else {
    queryParams.delete("salesMax");
  }

  // Volume period
  if (filters.volume) {
    queryParams.set("volume", filters.volume);
  } else {
    queryParams.delete("volume");
  }

  // FILETYPE
  if (filters.fileType.length > 0) {
    // Convert 'jpg' to 'jpeg' and 'mp3' to 'mpeg' in the URL parameters
    const fileTypes = filters.fileType.map((type) => {
      if (type === "jpg") return "jpeg";
      if (type === "mp3") return "mpeg";
      return type;
    });
    queryParams.set("filetype", fileTypes.join(","));
  } else {
    queryParams.delete("filetype");
  }

  // EDITIONS
  if (filters.editions.length > 0) {
    queryParams.set("editions", filters.editions.join(","));
  } else {
    queryParams.delete("editions");
  }

  // RANGE
  if (filters.range) {
    queryParams.set("range", filters.range);
  } else {
    queryParams.delete("range");
  }

  if (filters.rangeMin) {
    queryParams.set("rangeMin", filters.rangeMin);
  } else {
    queryParams.delete("rangeMin");
  }

  if (filters.rangeMax) {
    queryParams.set("rangeMax", filters.rangeMax);
  } else {
    queryParams.delete("rangeMax");
  }

  return queryParams.toString();
}

export function filtersToServicePayload(filters: typeof defaultFilters) {
  const filterPayload = {
    vector: {
      fileType: [] as StampFiletype[],
      ident: ["STAMP"],
    },
    pixel: {
      fileType: [] as StampFiletype[],
      ident: ["STAMP, SRC-721"],
    },
    recursive: {
      fileType: [] as StampFiletype[],
      ident: ["SRC-721"],
    },
    audio: {
      fileType: [] as StampFiletype[],
      ident: ["STAMP"],
    },
    encoding: {
      fileType: [] as StampFiletype[],
      ident: ["STAMP"],
    },
  };

  // JPG/JPEG (combined)
  if (filters.fileType.includes("jpg")) {
    filterPayload.pixel.fileType.push("jpg");
    filterPayload.pixel.fileType.push("jpeg");
  }

  // PNG
  if (filters.fileType.includes("png")) {
    filterPayload.pixel.fileType.push("png");
  }

  // GIF
  if (filters.fileType.includes("gif")) {
    filterPayload.pixel.fileType.push("gif");
  }

  // WEBP
  if (filters.fileType.includes("webp")) {
    filterPayload.pixel.fileType.push("webp");
  }

  // AVIF
  if (filters.fileType.includes("avif")) {
    filterPayload.pixel.fileType.push("avif");
  }

  // BMP
  if (filters.fileType.includes("bmp")) {
    filterPayload.pixel.fileType.push("bmp");
  }

  // SVG
  if (filters.fileType.includes("svg")) {
    filterPayload.vector.fileType.push("svg");
    filterPayload.recursive.fileType.push("svg");
  }

  // HTML
  if (filters.fileType.includes("html")) {
    filterPayload.vector.fileType.push("html");
    filterPayload.recursive.fileType.push("html");
  }

  // TXT
  // if (filters.fileType.includes("txt")) {
  //   filterPayload.vector.fileType.push("txt");
  //   filterPayload.recursive.fileType.push("txt");
  // }

  // MP3/MPEG (combined)
  if (filters.fileType.includes("mp3")) {
    filterPayload.audio.fileType.push("mp3");
    filterPayload.audio.fileType.push("mpeg");
  }

  // LEGACY
  if (filters.fileType.includes("legacy")) {
    filterPayload.encoding.fileType.push("legacy");
  }

  // OLGA
  if (filters.fileType.includes("olga")) {
    filterPayload.encoding.fileType.push("olga");
  }

  // Collect all file types
  const fileType = Object.entries(filterPayload).reduce(
    (acc, [_key, value]) => {
      if (value.fileType.length > 0) {
        acc.push(...value.fileType);
      }
      return acc;
    },
    [] as StampFiletype[],
  );

  return {
    ident: [],
    fileType: Array.from(new Set(fileType)),
    editions: filters.editions.length > 0 ? filters.editions : undefined,
  };
}

// export function queryParamsToServicePayload(query: URLSearchParams): {
//   filterBy: STAMP_FILTER_TYPES[];
// } {
//   return {
//     filterBy: [],
//   };
// }

export const allQueryKeysFromFilters = [
  "market",
  "dispensers",
  "atomics",
  "listings",
  "listingsMin",
  "listingsMax",
  "sales",
  "salesMin",
  "salesMax",
  "volume",
  "volumeMin",
  "volumeMax",
  "filetype",
  "fileSize",
  "fileSizeMin",
  "fileSizeMax",
  "editions",
  "range",
  "rangeMin",
  "rangeMax",
];

export function queryParamsToFilters(query: string): StampFilters {
  const params = new URLSearchParams(query);
  // Initialize with default filters
  const filters = { ...defaultFilters };

  // Parse market type parameter
  const marketParam = params.get("market");
  if (
    marketParam &&
    (marketParam === "listings" || marketParam === "sales")
  ) {
    filters.market = marketParam;
  }

  // Parse dispensers and atomics
  const dispensersParam = params.get("dispensers");
  if (dispensersParam === "true") {
    filters.dispensers = true;
  }

  const atomicsParam = params.get("atomics");
  if (atomicsParam === "true") {
    filters.atomics = true;
  }

  // Parse listings type
  const listingsParam = params.get("listings");
  if (
    listingsParam &&
    ["all", "bargain", "affordable", "premium", "custom"].includes(
      listingsParam,
    )
  ) {
    filters.listings = listingsParam as
      | "all"
      | "bargain"
      | "affordable"
      | "premium"
      | "custom";
  }

  // Parse listings price range
  const listingsMin = params.get("listingsMin");
  if (listingsMin) {
    filters.listingsMin = listingsMin;
  }

  const listingsMax = params.get("listingsMax");
  if (listingsMax) {
    filters.listingsMax = listingsMax;
  }

  // Parse sales type
  const salesParam = params.get("sales");
  if (
    salesParam &&
    ["recent", "premium", "custom", "volume"].includes(salesParam)
  ) {
    filters.sales = salesParam as
      | "recent"
      | "premium"
      | "custom"
      | "volume";
  }

  // Parse sales price range
  const salesMin = params.get("salesMin");
  if (salesMin) {
    filters.salesMin = salesMin;
  }

  const salesMax = params.get("salesMax");
  if (salesMax) {
    filters.salesMax = salesMax;
  }

  // Parse volume parameters
  const volume = params.get("volume");
  if (volume) {
    filters.volume = volume as "24h" | "7d" | "30d" | "";
  }

  const volumeMin = params.get("volumeMin");
  if (volumeMin) {
    filters.volumeMin = volumeMin;
  }

  const volumeMax = params.get("volumeMax");
  if (volumeMax) {
    filters.volumeMax = volumeMax;
  }

  // Parse filetype parameter
  const filetypeParam = params.get("filetype");
  if (filetypeParam) {
    filters.fileType = filetypeParam.split(",") as StampFiletype[];
  }

  // Parse file size parameters
  const fileSize = params.get("fileSize");
  if (fileSize) {
    filters.fileSize = fileSize as StampFilesize;
  }

  const fileSizeMin = params.get("fileSizeMin");
  if (fileSizeMin) {
    filters.fileSizeMin = fileSizeMin;
  }

  const fileSizeMax = params.get("fileSizeMax");
  if (fileSizeMax) {
    filters.fileSizeMax = fileSizeMax;
  }

  // Parse editions parameter (comma-separated string to array)
  const editionsParam = params.get("editions");
  if (editionsParam) {
    filters.editions = editionsParam.split(",") as StampEdition[];
  }

  // Parse range parameters (flat structure)
  const range = params.get("range");
  if (range) {
    filters.range = range as StampRange;
  }

  const rangeMin = params.get("rangeMin");
  if (rangeMin) {
    filters.rangeMin = rangeMin;
  }

  const rangeMax = params.get("rangeMax");
  if (rangeMax) {
    filters.rangeMax = rangeMax;
  }

  return filters;
}

export function queryParamsToServicePayload(search: string) {
  const filters = queryParamsToFilters(search);
  // Convert filters to service payload format
  return {
    market: filters.market,
    dispensers: filters.dispensers,
    atomics: filters.atomics,
    listings: filters.listings,
    listingsMin: filters.listingsMin,
    listingsMax: filters.listingsMax,
    sales: filters.sales,
    salesMin: filters.salesMin,
    salesMax: filters.salesMax,
    volume: filters.volume,
    volumeMin: filters.volumeMin,
    volumeMax: filters.volumeMax,
    fileTypes: filters.fileType,
    fileSize: filters.fileSize,
    fileSizeMin: filters.fileSizeMin,
    fileSizeMax: filters.fileSizeMax,
    editions: filters.editions,
    range: filters.range,
    rangeMin: filters.rangeMin,
    rangeMax: filters.rangeMax,
  };
}

const Radio = ({ label, value, checked, onChange, name }: RadioProps) => {
  const [canHover, setCanHover] = useState(true);

  const handleChange = () => {
    onChange();
    setTimeout(() => setCanHover(false), 0);
  };

  const handleMouseLeave = () => {
    setCanHover(true);
  };

  return (
    <div
      class="flex items-center py-1.5 mobileLg:py-1.5 cursor-pointer group"
      onMouseLeave={handleMouseLeave}
      onClick={handleChange}
    >
      <input
        class={inputCheckbox(checked, canHover)}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        readOnly
      />
      <label class={labelLogicResponsive(checked, canHover)}>
        {label}
      </label>
    </div>
  );
};

// Helper function to check if a section has active filters
function hasActiveFilters(section: string, filters: StampFilters): boolean {
  switch (section) {
    case "market":
      return filters.market !== "" || filters.dispensers ||
        filters.atomics ||
        filters.listings !== "" || filters.sales !== "";
    case "priceRange":
      return filters.listingsMin !== "" || filters.listingsMax !== "" ||
        filters.salesMin !== "" || filters.salesMax !== "";
    case "volume":
      return filters.volume !== "";
    case "fileType":
      return filters.fileType.length > 0;
    case "fileSize":
      return filters.fileSize !== null ||
        filters.fileSizeMin !== "" ||
        filters.fileSizeMax !== "";
    case "editions":
      return filters.editions.length > 0;
    case "range":
      return filters.range !== null ||
        filters.rangeMin !== "" ||
        filters.rangeMax !== "";
    default:
      return false;
  }
}

export const FilterContentStamps = ({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: StampFilters;
  onFiltersChange: (filters: StampFilters) => void;
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [expandedSections, setExpandedSections] = useState({
    stampType: true, // Always show stamp type filter
    fileType: hasActiveFilters("fileType", filters),
    fileSize: hasActiveFilters("fileSize", filters),
    editions: hasActiveFilters("editions", filters),
    range: hasActiveFilters("range", filters),
    market: hasActiveFilters("market", filters),
    customRange: filters.rangeMin !== "" || filters.rangeMax !== "",
    priceRange: hasActiveFilters("priceRange", filters),
  });

  // Watch for changes to initialFilters
  useEffect(() => {
    setFilters(initialFilters);

    // When filters are cleared, explicitly reset min/max values in RangeSlider
    if (
      !initialFilters.range && !initialFilters.rangeMin &&
      !initialFilters.rangeMax
    ) {
      // Force RangeSlider to reset by updating its key
      setExpandedSections((prev) => ({
        ...prev,
        customRange: false, // Close the custom range section
      }));
    } else {
      setExpandedSections((prev) => ({
        ...prev,
        customRange: initialFilters.rangeMin !== "" ||
          initialFilters.rangeMax !== "",
      }));
    }
  }, [initialFilters]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const [isDraggingPrice, setIsDraggingPrice] = useState(false);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = (_e: MouseEvent) => {
      // Check if we're currently dragging either slider
      if (isDraggingPrice) {
        // Reset dragging state
        setIsDraggingPrice(false);
      }

      if (isDraggingRange) {
        // Reset dragging state
        setIsDraggingRange(false);
      }
    };

    // Add event listener for mouse up
    globalThis.addEventListener("mouseup", handleMouseUp);
    globalThis.addEventListener("mouseleave", handleMouseUp);

    // Clean up
    return () => {
      globalThis.removeEventListener("mouseup", handleMouseUp);
      globalThis.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isDraggingPrice, isDraggingRange]);

  const handleRangeChange = (value: string | null) => {
    setFilters((prevFilters) => {
      // If clicking the same value, clear it
      if (prevFilters.range === value) {
        const newFilters = {
          ...prevFilters,
          range: null,
          rangeMin: "",
          rangeMax: "",
        };
        onFiltersChange(newFilters);
        return newFilters;
      }

      // Otherwise set the new value
      const newFilters = {
        ...prevFilters,
        range: value as StampRange | null,
        rangeMin: "",
        rangeMax: "",
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  const handleCustomRangeToggle = () => {
    setFilters((prevFilters) => {
      // If custom range is active, clear it
      if (prevFilters.rangeMin || prevFilters.rangeMax) {
        const newFilters = {
          ...prevFilters,
          range: null,
          rangeMin: "",
          rangeMax: "",
        };
        onFiltersChange(newFilters);
        return newFilters;
      }

      // Otherwise just toggle the section
      setExpandedSections((prev) => ({
        ...prev,
        customRange: true,
      }));
      return prevFilters;
    });
  };

  const handleRangeSliderChange = (min: number, max: number) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        range: null,
        rangeMin: min.toString(),
        rangeMax: max === Infinity ? "" : max.toString(),
      };

      // Important: update parent component state
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Fix: Add a dedicated file type toggle function
  const toggleFileType = (type: StampFiletype) => {
    setFilters((prevFilters) => {
      let newFileTypes = [...prevFilters.fileType];

      if (type === "jpg") {
        // Remove both 'jpg' and 'jpeg' if either is present
        if (newFileTypes.includes("jpg") || newFileTypes.includes("jpeg")) {
          newFileTypes = newFileTypes.filter(
            (t) => t !== "jpg" && t !== "jpeg",
          );
        } else {
          newFileTypes.push("jpg");
        }
      } else if (type === "mp3") {
        // Remove both 'mp3' and 'mpeg' if either is present
        if (newFileTypes.includes("mp3") || newFileTypes.includes("mpeg")) {
          newFileTypes = newFileTypes.filter(
            (t) => t !== "mp3" && t !== "mpeg",
          );
        } else {
          newFileTypes.push("mp3");
        }
      } else {
        // Default toggle for other types
        const index = newFileTypes.indexOf(type);
        if (index === -1) {
          newFileTypes.push(type);
        } else {
          newFileTypes.splice(index, 1);
        }
      }

      const newFilters = {
        ...prevFilters,
        fileType: newFileTypes,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Fix: Add a dedicated editions toggle function
  const toggleEdition = (type: StampEdition) => {
    setFilters((prevFilters) => {
      const newEditions = [...prevFilters.editions];
      const index = newEditions.indexOf(type);

      if (index === -1) {
        newEditions.push(type);
      } else {
        newEditions.splice(index, 1);
      }

      const newFilters = {
        ...prevFilters,
        editions: newEditions,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Helper function to toggle main market type (LISTINGS vs SALES)
  const toggleMarketType = (type: "listings" | "sales") => {
    setFilters((prevFilters) => {
      const newFilters: StampFilters = {
        ...prevFilters,
        market: prevFilters.market === type ? "" : type,
        // Reset all sub-options when switching main type
        dispensers: type === "listings" || type === "sales" ? true : false, // Auto-select DISPENSERS for both listings and sales
        atomics: false,
        listings: type === "listings" ? "all" : "", // Auto-select "all" when dispensers selected
        sales: type === "sales" ? "recent" : "", // Auto-select "recent" for sales
        listingsMin: "",
        listingsMax: "",
        salesMin: "",
        salesMax: "",
        volume: "",
      };

      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Helper function to toggle dispensers/atomics
  const toggleListingOption = (option: "dispensers" | "atomics") => {
    setFilters((prevFilters) => {
      const newValue = !prevFilters[option];
      const newFilters: StampFilters = {
        ...prevFilters,
        [option]: newValue,
        // Auto-select "all" when first dispenser/atomic is selected
        listings: (newValue ||
            prevFilters[option === "dispensers" ? "atomics" : "dispensers"])
          ? (prevFilters.listings || "all")
          : (!prevFilters[
              option === "dispensers" ? "atomics" : "dispensers"
            ]
            ? ""
            : prevFilters.listings),
      } as StampFilters;

      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Helper function to handle listing price type
  const handleListingPriceType = (
    type: "all" | "bargain" | "affordable" | "premium" | "custom",
  ) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        // "all" cannot be deselected - clicking it again keeps it selected
        listings: type === "all"
          ? "all"
          : (prevFilters.listings === type ? "all" : type),
        // Clear custom price range if switching away from custom
        listingsMin: type === "custom" ? prevFilters.listingsMin : "",
        listingsMax: type === "custom" ? prevFilters.listingsMax : "",
      } as StampFilters;

      // Set predefined price ranges
      if (type === "bargain") {
        newFilters.listingsMin = "0";
        newFilters.listingsMax = "0.0025";
      } else if (type === "affordable") {
        newFilters.listingsMin = "0.005";
        newFilters.listingsMax = "0.01";
      } else if (type === "premium") {
        newFilters.listingsMin = "0.1";
        newFilters.listingsMax = "";
      }

      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Helper function to handle sales type
  const handleSalesType = (
    type: "recent" | "premium" | "custom" | "volume",
  ) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        sales: type === "recent"
          ? "recent"
          : (prevFilters.sales === type ? "recent" : type),
        // Clear price range and volume based on selection
        salesMin: type === "custom" ? prevFilters.salesMin : "",
        salesMax: type === "custom" ? prevFilters.salesMax : "",
        volume: type === "volume"
          ? ("24h" as "24h" | "7d" | "30d" | "")
          : ("" as "24h" | "7d" | "30d" | ""),
      } as StampFilters;

      // Set predefined price range for premium sales
      if (type === "premium") {
        newFilters.salesMin = "0.1";
        newFilters.salesMax = "";
      }

      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // TODO(@claude): Implement volume filter when UI is ready
  // Handler for volume changes
  // const handleVolumeChange = (period: string) => {
  //   setFilters((prevFilters) => {
  //     const newFilters = {
  //       ...prevFilters,
  //       volume: period as "24h" | "7d" | "30d",
  //     };
  //     onFiltersChange(newFilters);
  //     return newFilters;
  //   });
  // };

  const handleFileSizeChange = (sizeType: StampFilesize | null) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        fileSize: prevFilters.fileSize === sizeType ? null : sizeType,
        // Clear custom range if switching to preset
        fileSizeMin: sizeType !== "custom" ? "" : prevFilters.fileSizeMin,
        fileSizeMax: sizeType !== "custom" ? "" : prevFilters.fileSizeMax,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  const handleFileSizeRangeChange = (min: number, max: number) => {
    if (min !== undefined && max !== undefined) {
      setFilters((prevFilters) => {
        const newFilters = {
          ...prevFilters,
          fileSizeMin: min.toString(),
          fileSizeMax: max === Infinity ? "1048576" : max.toString(),
        };
        onFiltersChange(newFilters);
        return newFilters;
      });
    }
  };

  const handlePriceRangeChange = (min: number, max: number) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        // Update the appropriate price range based on current market type
        ...(prevFilters.market === "listings"
          ? {
            listingsMin: min.toString(),
            listingsMax: max === Infinity ? "" : max.toString(),
          }
          : {
            salesMin: min.toString(),
            salesMax: max === Infinity ? "" : max.toString(),
          }),
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  // Handler for stamp type changes
  const handleStampTypeChange = (
    type: FrontendStampType,
  ) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        stampType: type,
        // Clear filters that don't apply to recursive stamps
        ...(type === "src-721" && {
          fileType: [],
          fileSize: null,
          fileSizeMin: "",
          fileSizeMax: "",
          editions: [],
        }),
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  return (
    <div ref={drawerRef}>
      {/* 🎯 STAMP TYPE FILTER */}
      <CollapsibleSection
        title="STAMP TYPE"
        section="stampType"
        expanded={expandedSections.stampType}
        toggle={() => toggleSection("stampType")}
        variant="collapsibleTitle"
      >
        <Radio
          label="ALL"
          value="all"
          name="stampType"
          checked={filters.stampType === "all"}
          onChange={() => handleStampTypeChange("all")}
        />
        <Radio
          label="CLASSIC"
          value="classic"
          name="stampType"
          checked={filters.stampType === "classic"}
          onChange={() => handleStampTypeChange("classic")}
        />
        <Radio
          label="POSH"
          value="posh"
          name="stampType"
          checked={filters.stampType === "posh"}
          onChange={() => handleStampTypeChange("posh")}
        />
        <Radio
          label="RECURSIVE"
          value="src-721"
          name="stampType"
          checked={filters.stampType === "src-721"}
          onChange={() => handleStampTypeChange("src-721")}
        />
        <Radio
          label="CURSED"
          value="cursed"
          name="stampType"
          checked={filters.stampType === "cursed"}
          onChange={() => handleStampTypeChange("cursed")}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="MARKET PLACE"
        section="market"
        expanded={expandedSections.market}
        toggle={() => toggleSection("market")}
        variant="collapsibleTitle"
      >
        {/* Top Level: LISTINGS vs SALES */}
        <div class="my-2">
          <ToggleButton
            options={["listings", "sales"]}
            selected={filters.market}
            onChange={(value) =>
              toggleMarketType(value as "listings" | "sales")}
            mode="single"
            size="xsR"
            spacing="evenFullwidth"
          />
        </div>

        {/* LISTINGS Section */}
        {filters.market === "listings" && (
          <div>
            {/* Dispensers and Atomics buttons */}
            <div class="my-4">
              <ToggleButton
                options={["dispensers", "atomics"]}
                selected={[
                  ...(filters.dispensers ? ["dispensers"] : []),
                  ...(filters.atomics ? ["atomics"] : []),
                ]}
                onChange={(values) => {
                  const selectedArray = Array.isArray(values) ? values : [];
                  const newDispensers = selectedArray.includes("dispensers");
                  const newAtomics = selectedArray.includes("atomics");

                  // Prevent deselecting dispensers - it should always stay selected
                  if (
                    newDispensers !== filters.dispensers &&
                    newDispensers === true
                  ) {
                    toggleListingOption("dispensers");
                  }
                  if (newAtomics !== filters.atomics) {
                    toggleListingOption("atomics");
                  }
                }}
                mode="multi"
                size="xsR"
                spacing="evenFullwidth"
                disabledOptions={["atomics"]}
                alwaysSelectedOptions={["dispensers"]}
                color="grey"
              />
            </div>

            {/* Price options */}
            {(filters.dispensers || filters.atomics) && (
              <div>
                <Radio
                  label="ALL"
                  value="all"
                  name="listingPrice"
                  checked={filters.listings === "all"}
                  onChange={() => handleListingPriceType("all")}
                />
                <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
                  PRICE RANGE
                </div>
                <Radio
                  label="BARGAIN"
                  value="bargain"
                  name="listingPrice"
                  checked={filters.listings === "bargain"}
                  onChange={() => handleListingPriceType("bargain")}
                />
                <Radio
                  label="AFFORDABLE"
                  value="affordable"
                  name="listingPrice"
                  checked={filters.listings === "affordable"}
                  onChange={() => handleListingPriceType("affordable")}
                />
                <Radio
                  label="PREMIUM"
                  value="premium"
                  name="listingPrice"
                  checked={filters.listings === "premium"}
                  onChange={() => handleListingPriceType("premium")}
                />
                <Radio
                  label="CUSTOM PRICE"
                  value="custom"
                  name="listingPrice"
                  checked={filters.listings === "custom"}
                  onChange={() => handleListingPriceType("custom")}
                />

                {/* Custom price range slider */}
                {filters.listings === "custom" && (
                  <div class="mt-3 pl-0.5">
                    <RangeSliderDual
                      variant="price"
                      onChange={handlePriceRangeChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SALES Section */}
        {filters.market === "sales" && (
          <div>
            {/* Dispensers and Atomics buttons */}
            <div class="my-4">
              <ToggleButton
                options={["dispensers", "atomics"]}
                selected={[
                  ...(filters.dispensers ? ["dispensers"] : []),
                  ...(filters.atomics ? ["atomics"] : []),
                ]}
                onChange={(values) => {
                  const selectedArray = Array.isArray(values) ? values : [];
                  const newDispensers = selectedArray.includes("dispensers");
                  const newAtomics = selectedArray.includes("atomics");

                  // Prevent deselecting dispensers - it should always stay selected
                  if (
                    newDispensers !== filters.dispensers &&
                    newDispensers === true
                  ) {
                    toggleListingOption("dispensers");
                  }
                  if (newAtomics !== filters.atomics) {
                    toggleListingOption("atomics");
                  }
                }}
                mode="multi"
                size="xsR"
                spacing="evenFullwidth"
                disabledOptions={["atomics"]}
                alwaysSelectedOptions={["dispensers"]}
                color="grey"
              />
            </div>

            <Radio
              label="RECENT"
              value="recent"
              name="salesType"
              checked={filters.sales === "recent"}
              onChange={() => handleSalesType("recent")}
            />

            {
              /* <Radio
              label="TRENDING"
              value="volume"
              name="salesType"
              checked={filters.sales === "volume"}
              onChange={() => handleSalesType("volume")}
            />
            <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
              PRICE RANGE
            </div>
            <Radio
              label="PREMIUM"
              value="premium"
              name="salesType"
              checked={filters.sales === "premium"}
              onChange={() => handleSalesType("premium")}
            />
            <Radio
              label="CUSTOM PRICE"
              value="custom"
              name="salesType"
              checked={filters.sales === "custom"}
              onChange={() => handleSalesType("custom")}
            /> */
            }

            {/* Custom price range slider for sales */}
            {
              /* {filters.sales === "custom" && (
              <div class="mt-3 pl-0.5">
                <RangeSliderDual
                  variant="price"
                  onChange={handlePriceRangeChange}
                />
              </div>
            )} */
            }

            {/* Volume Period Selection - only show if TRENDING is selected */}
            {
              /* {filters.sales === "volume" && (
              <div class="mt-3 pl-0.5">
                <ToggleButton
                  options={["24h", "7d", "30d"]}
                  selected={filters.volume}
                  onChange={(value) => handleVolumeChange(value as string)}
                  mode="single"
                  spacing="evenFullwidth"
                  size="xsR"
                />
              </div>
            )} */
            }
          </div>
        )}
      </CollapsibleSection>

      {filters.stampType !== "src-721" && (
        <CollapsibleSection
          title="FILE TYPE"
          section="fileType"
          expanded={expandedSections.fileType}
          toggle={() => toggleSection("fileType")}
          variant="collapsibleTitle"
        >
          {/* Category: PIXEL */}
          <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
            PIXELS
          </div>
          <Checkbox
            key="jpg"
            label="JPG/JPEG"
            checked={filters.fileType.includes("jpg") ||
              filters.fileType.includes("jpeg")}
            onChange={() => toggleFileType("jpg")}
          />

          <Checkbox
            key="png"
            label="PNG"
            checked={filters.fileType.includes("png")}
            onChange={() => toggleFileType("png")}
          />
          <Checkbox
            key="gif"
            label="GIF"
            checked={filters.fileType.includes("gif")}
            onChange={() => toggleFileType("gif")}
          />
          <Checkbox
            key="webp"
            label="WEBP"
            checked={filters.fileType.includes("webp")}
            onChange={() => toggleFileType("webp")}
          />
          <Checkbox
            key="avif"
            label="AVIF"
            checked={filters.fileType.includes("avif")}
            onChange={() => toggleFileType("avif")}
          />
          <Checkbox
            key="bmp"
            label="BMP"
            checked={filters.fileType.includes("bmp")}
            onChange={() => toggleFileType("bmp")}
          />

          {/* Category: VECTOR */}
          <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
            VECTOR
          </div>
          <Checkbox
            key="svg"
            label="SVG"
            checked={filters.fileType.includes("svg")}
            onChange={() => toggleFileType("svg")}
          />
          <Checkbox
            key="html"
            label="HTML"
            checked={filters.fileType.includes("html")}
            onChange={() => toggleFileType("html")}
          />
          {
            /* <Checkbox
          key="txt"
          label="TXT"
          checked={filters.fileType.includes("txt")}
          onChange={() => toggleFileType("txt")}
        />*/
          }

          {/* Category: AUDIO */}
          <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
            AUDIO
          </div>
          <Checkbox
            key="mp3"
            label="MP3/MPEG"
            checked={filters.fileType.includes("mp3") ||
              filters.fileType.includes("mpeg")}
            onChange={() => toggleFileType("mp3")}
          />

          {/* Category: ENCODING */}
          <div class={`${eyebrowPrimary} ${eyebrowPositionFilter}`}>
            ENCODING
          </div>
          <Checkbox
            key="legacy"
            label="LEGACY"
            checked={filters.fileType.includes("legacy")}
            onChange={() => toggleFileType("legacy")}
          />
          <Checkbox
            key="olga"
            label="OLGA"
            checked={filters.fileType.includes("olga")}
            onChange={() => toggleFileType("olga")}
          />
        </CollapsibleSection>
      )}

      {filters.stampType !== "src-721" && (
        <CollapsibleSection
          title="FILE SIZE"
          section="fileSize"
          expanded={expandedSections.fileSize}
          toggle={() => toggleSection("fileSize")}
          variant="collapsibleTitle"
        >
          <Radio
            label="< 1KB"
            value="<1kb"
            checked={filters.fileSize === "<1kb"}
            onChange={() => handleFileSizeChange("<1kb")}
            name="fileSize"
          />
          <Radio
            label="1KB - 7KB"
            value="1kb-7kb"
            checked={filters.fileSize === "1kb-7kb"}
            onChange={() => handleFileSizeChange("1kb-7kb")}
            name="fileSize"
          />
          <Radio
            label="7KB - 32KB"
            value="7kb-32kb"
            checked={filters.fileSize === "7kb-32kb"}
            onChange={() => handleFileSizeChange("7kb-32kb")}
            name="fileSize"
          />
          <Radio
            label="32KB - 64KB"
            value="32kb-64kb"
            checked={filters.fileSize === "32kb-64kb"}
            onChange={() => handleFileSizeChange("32kb-64kb")}
            name="fileSize"
          />
          <Radio
            label="CUSTOM FILE SIZE"
            value="custom"
            checked={filters.fileSize === "custom"}
            onChange={() => handleFileSizeChange("custom")}
            name="fileSize"
          />

          {filters.fileSize === "custom" && (
            <div class="mt-2">
              <RangeSliderDual
                variant="fileSize"
                onChange={handleFileSizeRangeChange}
                initialMin={filters.fileSizeMin
                  ? parseInt(filters.fileSizeMin)
                  : 0}
                initialMax={filters.fileSizeMax
                  ? parseInt(filters.fileSizeMax)
                  : Infinity}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {filters.stampType !== "src-721" && (
        <CollapsibleSection
          title="EDITIONS"
          section="editions"
          expanded={expandedSections.editions}
          toggle={() => toggleSection("editions")}
          variant="collapsibleTitle"
        >
          <Checkbox
            label="1/1"
            checked={filters.editions.includes("single")}
            onChange={() => toggleEdition("single")}
          />
          <Checkbox
            label="MULTIPLE"
            checked={filters.editions.includes("multiple")}
            onChange={() => toggleEdition("multiple")}
          />
          <Checkbox
            label="LOCKED"
            checked={filters.editions.includes("locked")}
            onChange={() => toggleEdition("locked")}
          />
          <Checkbox
            label="UNLOCKED"
            checked={filters.editions.includes("unlocked")}
            onChange={() => toggleEdition("unlocked")}
          />
          <Checkbox
            label="DIVISIBLE"
            checked={filters.editions.includes("divisible")}
            onChange={() => toggleEdition("divisible")}
          />
        </CollapsibleSection>
      )}

      {filters.stampType !== "posh" && filters.stampType !== "cursed" && (
        <CollapsibleSection
          title="RANGE"
          section="range"
          expanded={expandedSections.range}
          toggle={() => toggleSection("range")}
          variant="collapsibleTitle"
        >
          {/* Preset ranges */}
          {[100, 1000, 5000, 10000, 500000, 1000000].map((value) => (
            <Radio
              key={value}
              label={`< ${value.toLocaleString("en")}`}
              value={value.toString()}
              name="range"
              checked={filters.range === value.toString()}
              onChange={() => handleRangeChange(value.toString())}
            />
          ))}

          {/* Custom range option */}
          <Radio
            label="CUSTOM RANGE"
            value="custom"
            name="range"
            checked={!filters.range &&
              (filters.rangeMin !== "" || filters.rangeMax !== "")}
            onChange={handleCustomRangeToggle}
          />

          {/* Custom range slider */}
          <CollapsibleSection
            title=""
            section="customRange"
            expanded={expandedSections.customRange}
            toggle={() => {}}
            variant="collapsibleLabel"
          >
            <RangeSliderDual
              variant="range"
              onChange={handleRangeSliderChange}
            />
          </CollapsibleSection>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default FilterContentStamps;
