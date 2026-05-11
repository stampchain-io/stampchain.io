/* ===== WALLET PROFILE CONTENT COMPONENT ===== */
import { PaginationButtons, SortButton } from "$button";
import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import {
  containerBackground,
  glassmorphismL2,
  rowContainerBackground,
} from "$layout";
import { tooltipIcon } from "$notification";
import {
  label,
  labelSm,
  subtitleGrey,
  titleGreyLD,
  valueDarkSm,
  valueSm,
} from "$text";
import type { DispenserRow as Dispenser, StampRow } from "$types/stamp.d.ts";
import type {
  EnhancedWalletContentProps,
  SectionHeaderProps,
} from "$types/ui.d.ts";
// AjaxStampGallery has been replaced with FreshStampGallery for Fresh.js partial navigation
import FreshSRC20Gallery from "$islands/section/gallery/FreshSRC20Gallery.tsx";
import { FreshStampGallery } from "$islands/section/gallery/FreshStampGallery.tsx";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  createPaginationHandler,
  isBrowser,
  safeNavigate,
} from "$utils/navigation/freshNavigationUtils.ts";
import { useEffect, useRef, useState } from "preact/hooks";

// ===== ADVANCED SORTING IMPORTS =====
import SortingErrorBoundary from "$islands/sorting/SortingErrorBoundary.tsx";
import { WalletSortingProvider } from "$islands/sorting/SortingProviderWithURL.tsx";

// ===== TYPES AND INTERFACES =====

/**
 * Enhanced wallet content props with feature flag support
 */

/**
 * Section-specific sorting configuration for advanced mode
 */
interface SectionSortingConfig {
  section: "stamps" | "src20" | "dispensers";
  paramName: string;
  pageParamName: string;
  anchorName: string;
  sortOptions: string[]; // Will expand to include advanced options
}

// ===== SECTION CONFIGURATIONS =====

/**
 * Configuration for each wallet section with support for advanced sorting
 */
const SECTION_CONFIGS: Record<string, SectionSortingConfig> = {
  stamps: {
    section: "stamps",
    paramName: "stampsSortBy",
    pageParamName: "stamps_page",
    anchorName: "stamps",
    sortOptions: [
      "ASC",
      "DESC",
      // Advanced options (only used when enableAdvancedSorting is true)
      "value_asc", // Sort by BTC value ascending
      "value_desc", // Sort by BTC value descending
      "stamp_asc", // Sort by stamp number ascending
      "stamp_desc", // Sort by stamp number descending
    ],
  },
  src20: {
    section: "src20",
    paramName: "src20SortBy",
    pageParamName: "src20_page",
    anchorName: "src20",
    sortOptions: [
      "ASC",
      "DESC",
      // Advanced options
      "value_asc", // Sort by BTC value ascending
      "value_desc", // Sort by BTC value descending
      "quantity_asc", // Sort by quantity ascending
      "quantity_desc", // Sort by quantity descending
    ],
  },
  dispensers: {
    section: "dispensers",
    paramName: "dispensersSortBy",
    pageParamName: "dispensers_page",
    anchorName: "closed_listings",
    sortOptions: [
      "ASC",
      "DESC",
      // Advanced options
      "value_asc",
      "value_desc",
    ],
  },
};

// ===== SECTION HEADER COMPONENT =====

/**
 * Section header with conditional rendering for legacy/advanced sorting
 */
function SectionHeader({
  title,
  config,
  sortBy = "DESC", // Provide a default value
  onSortChange,
  enableAdvancedSorting = false,
  showMetrics = false,
}: SectionHeaderProps) {
  // Performance metrics placeholder for advanced mode
  const sortMetrics = enableAdvancedSorting && showMetrics
    ? { count: 0, avgDuration: 0 } // Will be connected to real metrics
    : null;

  return (
    <div
      class="flex items-center justify-between mb-2"
      f-partial={`/${config.paramName}`}
    >
      <div class="flex items-center gap-4">
        <h2 class={titleGreyLD}>
          {title}
        </h2>
        {sortMetrics && (
          <div class="text-xs text-color-grey opacity-75">
            {sortMetrics.count} sorts • {sortMetrics.avgDuration}ms avg
          </div>
        )}
      </div>

      <div class="flex items-center gap-2">
        {
          /* {enableAdvancedSorting
          ? (
            // Advanced sorting interface
            <SortingErrorBoundary
              context="wallet"
              maxRetries={2}
              testId="sorting-interface-boundary"
              onError={(error: Error) => {
                console.error("Sorting interface error:", error);
              }}
            >
              <CompleteSortingInterface
                config={{
                  defaultSort: sortBy as WalletSortKey,
                }}
                options={config.sortOptions.map((option: any) => ({
                  value: option as WalletSortKey,
                  label: getSortLabel(option),
                  direction: option.includes("_desc") ? "desc" : "asc",
                }))}
                sortBy={sortBy}
                sortOrder={sortBy.includes("_desc") ? "desc" : "asc"}
                onSortChange={(
                  newSortBy: string,
                  newSortOrder: "asc" | "desc",
                ) => {
                  const sortValue = newSortOrder === "desc"
                    ? newSortBy + "_desc"
                    : newSortBy;
                  onSortChange?.(sortValue);
                }}
                variant="buttons"
                size="sm"
                showLabel={false}
              />
            </SortingErrorBoundary>
          )
          : ( */
        }
        <div
          class={`flex relative ${glassmorphismL2} !rounded-full
             items-start justify-between
             gap-7 py-1.5 px-5
             tablet:gap-5 tablet:py-1 tablet:px-4`}
        >
          <SortButton
            initSort={sortBy as "ASC" | "DESC"}
            onChangeSort={(newSort: any) => onSortChange?.(newSort)}
            sortParam={config.paramName}
          />
        </div>
        {/* )} */}
      </div>
    </div>
  );
}

// ===== DISPENSER ITEM SUBCOMPONENT =====
function DispenserItem({
  dispensers = [],
  pagination,
}: {
  dispensers?: Dispenser[];
  pagination?: {
    page: number;
    totalPages: number;
    prefix?: string;
    onPageChange?: (page: number) => void;
  };
}) {
  /* ===== EMPTY STATE HANDLING ===== */
  if (!dispensers?.length) {
    return (
      <div class={rowContainerBackground}>
        <h6 class={valueDarkSm}>
          NO LISTINGS FOUND
        </h6>
      </div>
    );
  }

  /* ===== DISPENSER FILTERING ===== */
  const dispensersWithStamps = dispensers?.filter((d) => d.stamp) ?? [];
  const openDispensers = dispensersWithStamps.filter((d) =>
    d.give_remaining > 0
  );
  const closedDispensers = dispensersWithStamps.filter((d) =>
    d.give_remaining === 0
  );

  if (!openDispensers.length && !closedDispensers.length) {
    return (
      <div class={rowContainerBackground}>
        <h6 class={valueDarkSm}>
          NO LISTINGS FOUND
        </h6>
      </div>
    );
  }

  /* ===== RENDER DISPENSER ITEM ===== */
  return (
    <div class="relative shadow-md">
      <div class="hidden mobileLg:flex flex-col">
        {/* Open Dispensers Section */}
        {openDispensers.length > 0 && (
          <div id="open-listings-section">
            <div class="flex flex-col gap-5">
              {openDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="tablet" />
              ))}
            </div>
          </div>
        )}

        {/* Closed Dispensers Section */}
        {closedDispensers.length > 0 && (
          <div id="closed-listings-section">
            <div class="flex flex-col gap-5">
              {closedDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="tablet" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* For mobile */}
      <div class="flex mobileLg:hidden flex-col gap-3">
        {/* Open Dispensers Section */}
        {openDispensers.length > 0 && (
          <div class="mb-10 space-y-10" id="open-listings-section">
            <div class="flex flex-col gap-6">
              {openDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="mobile" />
              ))}
            </div>
          </div>
        )}

        {/* Closed Dispensers Section */}
        {closedDispensers.length > 0 && (
          <div class="space-y-10" id="closed-listings-section">
            <div class="flex flex-col gap-6">
              {closedDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="mobile" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div class="mt-6">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            prefix="dispensers"
            onPageChange={createPaginationHandler(
              "dispensers_page",
              "closed_listings",
            )}
          />
        </div>
      )}
    </div>
  );
}

/* ===== DISPENSER ROW SUBCOMPONENT ===== */
function DispenserRow(
  { dispenser, view }: { dispenser: Dispenser; view: "mobile" | "tablet" },
) {
  /* ===== STATE ===== */
  const imageSize = view === "mobile"
    ? "w-[72px] h-[72px]"
    : "w-[78px] h-[78px]";
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);

  /* ===== REFS ===== */
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  /* ===== IMAGE FETCHING ===== */
  const fetchStampImage = () => {
    setLoading(true);
    const res = getStampImageSrc(dispenser.stamp as StampRow);
    setSrc(res);
    setLoading(false);
  };

  /* ===== EFFECTS ===== */
  useEffect(() => {
    fetchStampImage();
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== EVENT HANDLERS ===== */
  const handleCopyMouseEnter = () => {
    if (allowTooltip) {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = copyButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleCopyMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setShowCopied(false);
    setAllowTooltip(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dispenser.origin);
      setShowCopied(true);
      setIsTooltipVisible(false);
      setAllowTooltip(false);

      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setShowCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!dispenser.stamp) {
    return null;
  }

  /* ===== RENDER DISPENSER ROW ===== */
  return (
    <div
      class={`${glassmorphismL2} p-5`}
    >
      <div class="flex gap-6 w-full">
        <a
          href={`/stamp/${dispenser.stamp.stamp}`}
          class={`${imageSize} relative flex-shrink-0`}
        >
          <div
            class={`${glassmorphismL2} !border relative aspect-square`}
          >
            <div class="stamp-container absolute inset-0 flex items-center justify-center p-1">
              <div class="relative z-10 w-full h-full">
                {loading && !src ? <LoadingIcon /> : src
                  ? (
                    <img
                      width="100%"
                      height="100%"
                      loading="lazy"
                      class="max-w-none w-full h-full object-contain rounded-2xl pixelart stamp-image"
                      src={src}
                      alt={`Stamp ${dispenser.stamp.stamp}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                        (e.target as HTMLImageElement).alt =
                          "Content not available";
                      }}
                    />
                  )
                  : <PlaceholderImage variant="no-image" />}
              </div>
            </div>
          </div>
        </a>
        <div class="flex flex-col w-full">
          {/* First Row: Stamp Number + Address (left) and GIVE/QUANTITY/PRICE (right) */}
          <div class="flex justify-between items-start w-full mt-[6px]">
            {/* Left side: Stamp number and address */}
            <div class="flex flex-col gap-1">
              <div class="relative">
                <a
                  href={`/stamp/${dispenser.stamp.stamp}`}
                  class={subtitleGrey}
                >
                  {`#${dispenser.stamp.stamp}`}
                </a>
              </div>

              <div class="flex flex-row-reverse justify-end gap-4">
                <div
                  ref={copyButtonRef}
                  class="relative peer"
                  onMouseEnter={handleCopyMouseEnter}
                  onMouseLeave={handleCopyMouseLeave}
                >
                  <Icon
                    type="iconButton"
                    name="copy"
                    weight="normal"
                    size="smR"
                    color="greyDark"
                    className="mb-1"
                    onClick={copy}
                  />
                  <div
                    class={`${tooltipIcon} ${
                      isTooltipVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    COPY ADDY
                  </div>
                  <div
                    class={`${tooltipIcon} ${
                      showCopied ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    ADDY COPIED
                  </div>
                </div>

                {/* Full address - hidden on smaller screens */}
                <h6
                  class={`${label} text-color-grey hidden tablet:block transition-colors duration-200 peer-hover:text-color-grey-light`}
                >
                  {dispenser.origin}
                </h6>

                {/* Abbreviated address for smaller screens */}
                <h6
                  class={`${label} text-color-grey hidden mobileLg:block tablet:hidden transition-colors duration-200 peer-hover:text-color-grey-light`}
                >
                  {abbreviateAddress(dispenser.origin, 13)}
                </h6>

                <h6
                  class={`${label} text-color-grey hidden mobileMd:block mobileLg:hidden transition-colors duration-200 peer-hover:text-color-grey-light`}
                >
                  {abbreviateAddress(dispenser.origin, 9)}
                </h6>

                <h6
                  class={`${label} text-color-grey block mobileMd:hidden transition-colors duration-200 peer-hover:text-color-grey-light`}
                >
                  {abbreviateAddress(dispenser.origin, 5)}
                </h6>
              </div>
            </div>

            {/* Right side: GIVE, QUANTITY, PRICE, VALUE */}
            <div class="flex flex-col items-end text-right">
              <h6 class={labelSm}>
                GIVE{" "}
                <span class={valueSm}>
                  {Number(dispenser.give_quantity).toLocaleString()}
                </span>
              </h6>
              <h6 class={labelSm}>
                QUANTITY{" "}
                <span class={valueSm}>
                  {dispenser.give_remaining === 0
                    ? Number(dispenser.escrow_quantity).toLocaleString()
                    : `${Number(dispenser.give_remaining).toLocaleString()}/${
                      Number(dispenser.escrow_quantity).toLocaleString()
                    }`}
                </span>
              </h6>
              <h6 class={labelSm}>
                PRICE{" "}
                <span class={valueSm}>
                  {formatBTCAmount(Number(dispenser.btcrate), {
                    includeSymbol: false,
                  })}
                </span>{" "}
                <span className="text-color-grey-light">BTC</span>
              </h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT WRAPPER =====

/**
 * Production-ready wallet profile content with optional advanced sorting
 */
export default function WalletProfileContent(
  props: EnhancedWalletContentProps,
) {
  const { enableAdvancedSorting = false } = props;

  // When advanced sorting is enabled, wrap with WalletSortingProvider and error boundary
  if (enableAdvancedSorting) {
    return (
      <SortingErrorBoundary
        context="wallet"
        maxRetries={3}
        testId="wallet-sorting-boundary"
        onError={(error: Error, details: any) => {
          console.error("Wallet sorting error:", error);
          console.debug("Error details:", details);
          // TODO(#sorting): Report error to monitoring system
        }}
      >
        <WalletSortingProvider
          defaultSort={props.stampsSortBy || "DESC"}
          testId="wallet-sorting-provider"
        >
          <WalletProfileContentInner {...props} />
        </WalletSortingProvider>
      </SortingErrorBoundary>
    );
  }

  // Otherwise render directly
  return <WalletProfileContentInner {...props} />;
}

// ===== MAIN COMPONENT IMPLEMENTATION =====

/**
 * Inner component with all the wallet profile logic
 */
function WalletProfileContentInner({
  stamps,
  src20,
  dispensers,
  address,
  anchor,
  stampsSortBy = "DESC",
  src20SortBy = "DESC",
  dispensersSortBy = "DESC",
  // Feature flag support
  enableAdvancedSorting = false, // Default to false for backward compatibility
  showSortingMetrics = false,
  sortingConfig = {
    enableUrlSync: true,
    enablePersistence: true,
    enableMetrics: true,
  },
}: EnhancedWalletContentProps) {
  /* ===== STATE MANAGEMENT ===== */
  const [sortStamps] = useState<string>(stampsSortBy);
  const [sortTokens] = useState<string>(src20SortBy);
  const [sortDispensers] = useState<string>(dispensersSortBy);
  const [_openSetting, _setOpenSetting] = useState(false);
  const [_openSettingModal, _setOpenSettingModal] = useState(false);

  /* ===== COMPUTED VALUES ===== */
  const openDispensersCount =
    dispensers.data.filter((d: any) => d.give_remaining > 0).length;
  const closedDispensersCount = dispensers.data.length - openDispensersCount;

  /* ===== EFFECTS ===== */
  useEffect(() => {
    if (anchor) {
      const sectionMap: Record<string, string> = {
        stamp: "stamps-section",
        stamps: "stamps-section",
        src20: "src20-section",
        open_listings: "open-listings-section",
        closed_listings: "closed-listings-section",
      };
      const sectionId = sectionMap[anchor];
      if (sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [anchor]);

  /* ===== HANDLERS ===== */
  const handleStampSort = (newSort: string) => {
    // SSR safety check
    if (!isBrowser()) {
      return; // Cannot navigate during SSR
    }
    const url = new URL(globalThis.location.href);
    url.searchParams.set(SECTION_CONFIGS.stamps.paramName, newSort);
    url.searchParams.delete(SECTION_CONFIGS.stamps.pageParamName);
    url.searchParams.set("anchor", SECTION_CONFIGS.stamps.anchorName);
    safeNavigate(url.toString());
  };

  const handleTokenSort = (newSort: string) => {
    // SSR safety check
    if (!isBrowser()) {
      return; // Cannot navigate during SSR
    }
    const url = new URL(globalThis.location.href);
    url.searchParams.set(SECTION_CONFIGS.src20.paramName, newSort);
    url.searchParams.delete(SECTION_CONFIGS.src20.pageParamName);
    url.searchParams.set("anchor", SECTION_CONFIGS.src20.anchorName);
    safeNavigate(url.toString());
  };

  const handleDispenserSort = (newSort: string) => {
    // SSR safety check
    if (!isBrowser()) {
      return; // Cannot navigate during SSR
    }
    const url = new URL(globalThis.location.href);
    url.searchParams.set(SECTION_CONFIGS.dispensers.paramName, newSort);
    url.searchParams.delete(SECTION_CONFIGS.dispensers.pageParamName);
    url.searchParams.set(
      "anchor",
      openDispensersCount > 0 ? "open_listings" : "closed_listings",
    );
    safeNavigate(url.toString());
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col gap-6">
      {/* Stamps Section */}
      <div id="stamps-section" class={containerBackground}>
        <SectionHeader
          title="STAMPS"
          config={SECTION_CONFIGS.stamps}
          sortBy={sortStamps}
          onSortChange={handleStampSort}
          enableAdvancedSorting={enableAdvancedSorting}
          showMetrics={showSortingMetrics}
        />

        <div f-partial="/stamps">
          {stamps.data?.length
            ? (
              <FreshStampGallery
                initialData={stamps.data}
                initialPagination={{
                  page: stamps.pagination.page,
                  limit: stamps.pagination.limit,
                  total: stamps.pagination.total,
                  totalPages: Math.ceil(
                    stamps.pagination.total / stamps.pagination.limit,
                  ),
                  hasNext: stamps.pagination.page <
                    Math.ceil(
                      stamps.pagination.total / stamps.pagination.limit,
                    ),
                  hasPrev: stamps.pagination.page > 1,
                  currentPage: stamps.pagination.page,
                  pageSize: stamps.pagination.limit,
                  totalItems: stamps.pagination.total,
                  hasNextPage: stamps.pagination.page <
                    Math.ceil(
                      stamps.pagination.total / stamps.pagination.limit,
                    ),
                  hasPreviousPage: stamps.pagination.page > 1,
                  startIndex: (stamps.pagination.page - 1) *
                    stamps.pagination.limit,
                  endIndex: Math.min(
                    stamps.pagination.page * stamps.pagination.limit,
                    stamps.pagination.total,
                  ),
                }}
                address={address}
                initialSort="DESC"
                showDetails={false}
                gridClass={`
                grid w-full
                gap-3
                mobileMd:gap-6
                grid-cols-3
                mobileSm:grid-cols-4
                mobileLg:grid-cols-5
                tablet:grid-cols-6
                desktop:grid-cols-8
                `}
              />
            )
            : (
              <div class={rowContainerBackground}>
                <h6 class={valueDarkSm}>
                  NO STAMPS IN THE WALLET
                </h6>
              </div>
            )}
        </div>
      </div>

      {/* SRC20 (TOKENS) Section */}
      <div id="src20-section" class={containerBackground}>
        <SectionHeader
          title="TOKENS"
          config={SECTION_CONFIGS.src20}
          sortBy={sortTokens}
          onSortChange={handleTokenSort}
          enableAdvancedSorting={enableAdvancedSorting}
          showMetrics={showSortingMetrics}
        />

        <div f-partial="/src20">
          {src20.data?.length
            ? (
              <FreshSRC20Gallery
                initialData={src20.data}
                initialPagination={{
                  page: src20.pagination.page,
                  limit: src20.pagination.limit || 50,
                  total: src20.pagination.total || src20.data.length,
                }}
                address={address}
                initialSort={{ key: "stamp", direction: "desc" }}
                fromPage="wallet"
              />
            )
            : (
              <div class={rowContainerBackground}>
                <h6 class={valueDarkSm}>
                  NO TOKENS IN THE WALLET
                </h6>
              </div>
            )}
        </div>
      </div>

      {/* Dispensers Section */}
      {dispensers.data.length > 0 && (
        <div id="dispensers-section" class={containerBackground}>
          <SectionHeader
            title="LISTINGS"
            config={SECTION_CONFIGS.dispensers}
            sortBy={sortDispensers}
            onSortChange={handleDispenserSort}
            enableAdvancedSorting={enableAdvancedSorting}
            showMetrics={showSortingMetrics}
          />

          {/* Open Dispensers */}
          {openDispensersCount > 0 && (
            <div id="open-listings-section" class="mb-10">
              <h3 class={subtitleGrey}>
                OPEN DISPENSERS - {openDispensersCount}
              </h3>
              <DispenserItem
                dispensers={dispensers.data.filter((d: any) =>
                  d.give_remaining > 0
                )}
              />
            </div>
          )}

          {/* Closed Dispensers */}
          {closedDispensersCount > 0 && (
            <div id="closed-listings-section">
              <h3 class={subtitleGrey}>
                CLOSED DISPENSERS - {closedDispensersCount}
              </h3>
              <DispenserItem
                dispensers={dispensers.data.filter((d: any) =>
                  d.give_remaining === 0
                )}
              />
            </div>
          )}
        </div>
      )}

      {/* Feature Flag Debug Info */}
      {enableAdvancedSorting && showSortingMetrics && (
        <div class="mt-8 p-4 bg-color-grey-lightest rounded-2xl">
          <h3 class="text-sm font-semibold text-color-grey-dark mb-2">
            Advanced Sorting Status
          </h3>
          <div class="text-xs text-color-grey space-y-1">
            <div>Status: ✅ Enabled (Phase 1 - Infrastructure)</div>
            <div>URL Sync: {sortingConfig.enableUrlSync ? "✅" : "❌"}</div>
            <div>
              Persistence: {sortingConfig.enablePersistence ? "✅" : "❌"}
            </div>
            <div>Metrics: {sortingConfig.enableMetrics ? "✅" : "❌"}</div>
            <div class="mt-2 text-color-orange">
              Note: Advanced sorting UI will be available in Phase 2
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {_openSettingModal && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          {/* Modal content would go here */}
        </div>
      )}
    </div>
  );
}
