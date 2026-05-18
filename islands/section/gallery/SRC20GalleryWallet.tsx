/**
 * @fileoverview SRC20GalleryWallet - Wallet-specific SRC-20 gallery
 * @description Client-side gallery for wallet SRC-20 token holdings with
 * pagination and sorting functionality (ASC/DESC)
 */

import { PaginationButtons } from "$button";
import { SRC20OverviewNarrow } from "$components/table/src20OverviewTable/SRC20OverviewNarrow.tsx";
import { LoadingIcon } from "$icon";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import { hasProperty, isNumber } from "$lib/utils/errorTypeGuards.ts";
import type { EnrichedSRC20Row } from "$types/src20.d.ts";
import type { SRC20GalleryProps as SRC20GalleryWalletProps } from "$types/ui.d.ts";
import { useEffect, useMemo, useState } from "preact/hooks";

// ===== TYPES =====

interface FreshNavigationOptions {
  /** Use f-partial for smooth transitions */
  usePartial?: boolean;
  /** Scroll to element after navigation */
  scrollTarget?: string;
  /** Update URL parameters */
  updateUrl?: boolean;
}

// ===== COMPONENT =====

export default function SRC20GalleryWallet({
  initialData,
  initialPagination,
  address,
  initialSort,
  fromPage = "wallet",
  showLoadingSkeleton = true,
  enablePartialNavigation = true,
}: SRC20GalleryWalletProps) {
  const { updateSearchParams, isClient } = useSSRSafeNavigation();
  // ===== STATE =====
  const [tokens, setTokens] = useState<EnrichedSRC20Row[]>(initialData);
  const [pagination, setPagination] = useState(
    initialPagination || {
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSort, setCurrentSort] = useState<"ASC" | "DESC">(
    typeof initialSort === "string" &&
      (initialSort === "ASC" || initialSort === "DESC")
      ? initialSort
      : "ASC",
  );

  // ===== FRESH PERFORMANCE OPTIMIZATION =====
  // Memoize tokens to prevent unnecessary re-renders when market data hasn't changed
  const memoizedTokens = useMemo(() => {
    // Create a stable reference for the token array based on market data values
    return tokens.map((token) => ({
      ...token,
      // Add a computed field for memoization stability using available market data
      _marketDataHash: token.market_data
        ? `${token.market_data.floor_price_btc}-${token.market_data.volume_24h_btc}-${token.market_data.market_cap_btc}`
        : "no-market-data",
    }));
  }, [
    // Re-memoize when:
    tokens.length, // Number of tokens changes
    tokens.map((t) => t.tick).join(","), // Token composition changes
    tokens.map((t) => {
      const md = t.market_data;
      return md
        ? `${md.floor_price_btc}-${md.volume_24h_btc}-${md.market_cap_btc}`
        : "none";
    }).join(","), // Market data values change
  ]);

  // ===== COMPUTED VALUES =====
  // const isWalletPage = fromPage === "wallet" ||
  //   (typeof globalThis !== "undefined" &&
  //     globalThis.location?.pathname?.includes("/wallet/"));

  // ===== FRESH.JS NAVIGATION =====
  const navigateWithFresh = async (
    url: string,
    options: FreshNavigationOptions = {},
  ) => {
    const {
      usePartial = enablePartialNavigation,
      scrollTarget = "src20-section",
      updateUrl = true,
    } = options;

    if (!enablePartialNavigation) {
      // Fallback to standard navigation with SSR protection
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return; // Cannot navigate during SSR
      }
      globalThis.location.href = url;
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use Fresh.js f-partial navigation
      if (usePartial && typeof globalThis !== "undefined") {
        // Check if the target element has f-partial attribute
        const targetElement = document.getElementById(scrollTarget);
        if (targetElement && targetElement.getAttribute("f-partial")) {
          // Update URL without full page reload
          if (updateUrl) {
            const urlObj = new URL(url, globalThis.location.origin);
            globalThis.history.pushState({}, "", urlObj.toString());
          }

          // Trigger Fresh.js partial reload
          const freshEvent = new CustomEvent("fresh-partial-reload", {
            detail: {
              url: url,
              target: scrollTarget,
            },
          });
          document.dispatchEvent(freshEvent);

          // Fresh.js will handle the partial reload automatically
          return;
        }
      }

      // Fallback to manual fetch if Fresh.js not available
      const response = await fetch(url, {
        headers: {
          "X-API-Version": "2.3",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch SRC-20 tokens: ${response.status}`);
      }

      const data = await response.json();

      // Update state with new data
      setTokens(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      );

      // Scroll to target element
      if (scrollTarget && typeof globalThis !== "undefined") {
        const targetElement = document.getElementById(scrollTarget);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    } catch (err) {
      console.error("Fresh navigation error:", err);
      setError(err instanceof Error ? err.message : "Navigation failed");
    } finally {
      setLoading(false);
    }
  };

  // ===== API URL BUILDER =====
  const buildApiUrl = (page: number, sort: "ASC" | "DESC"): string => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: (pagination?.limit ?? 10).toString(),
      sortBy: sort,
      includeMintData: "true",
    });

    return `/api/v2/src20/balance/${address}?${params.toString()}`;
  };

  // ===== EVENT HANDLERS =====
  const handlePageChange = async (page: number) => {
    const url = buildApiUrl(page, currentSort);
    await navigateWithFresh(url);

    // Ensure anchor scrolling happens after data update
    setTimeout(() => {
      const targetElement = document.getElementById("src20-section");
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 200); // Slightly longer delay to ensure DOM update
  };

  const handleSortChange = async (newSort: "ASC" | "DESC") => {
    setCurrentSort(newSort);

    // Update URL params to reflect sort change using SSR-safe navigation
    if (isClient) {
      updateSearchParams((params) => {
        params.set("src20SortBy", newSort);
        params.delete("src20_page"); // Reset to page 1 on sort change
        params.set("anchor", "src20");
      });
    }

    // Fetch new data with sort (reset to page 1)
    const apiUrl = buildApiUrl(1, newSort);
    await navigateWithFresh(apiUrl);

    // Ensure anchor scrolling happens after data update
    setTimeout(() => {
      const targetElement = document.getElementById("src20-section");
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 200); // Slightly longer delay to ensure DOM update
  };

  // ===== EFFECTS =====

  // Listen for external sort changes (e.g., from SortButton)
  useEffect(() => {
    if (typeof globalThis === "undefined") return;

    const handleSortEvent = (event: CustomEvent) => {
      const { sortBy } = event.detail;
      if (
        sortBy && (sortBy === "ASC" || sortBy === "DESC") &&
        sortBy !== currentSort
      ) {
        handleSortChange(sortBy);
      }
    };

    globalThis.addEventListener(
      "src20-sort-change",
      handleSortEvent as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "src20-sort-change",
        handleSortEvent as EventListener,
      );
    };
  }, [currentSort]);

  // Listen for Fresh.js partial reload events
  useEffect(() => {
    if (typeof globalThis === "undefined") return;

    const handleFreshPartialReload = async (event: CustomEvent) => {
      const { url, target } = event.detail;
      if (
        target === "src20-section" &&
        url.includes(`/api/v2/src20/balance/${address}`)
      ) {
        console.log("Fresh.js SRC-20 partial reload:", url);

        // Extract sort parameter from URL
        const urlObj = new URL(url, globalThis.location.origin);
        const sortParam = urlObj.searchParams.get("sortBy") ||
          urlObj.searchParams.get("src20SortBy");
        const newSort = (sortParam === "ASC" || sortParam === "DESC")
          ? sortParam
          : currentSort;

        // Update sort if it changed
        if (newSort !== currentSort) {
          setCurrentSort(newSort);
        }

        // Fetch new data
        try {
          setLoading(true);
          setError(null);

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch SRC-20 tokens: ${response.status}`,
            );
          }

          const data = await response.json();

          // Update state with new data
          setTokens(data.data || []);
          setPagination({
            page: data.page || 1,
            limit: data.limit || pagination?.limit || 10,
            totalPages: data.totalPages || 1,
            hasNext: (data.page || 1) < (data.totalPages || 1),
            hasPrev: (data.page || 1) > 1,
          });

          // Scroll to section after data loads
          setTimeout(() => {
            const targetElement = document.getElementById("src20-section");
            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }, 100);
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : "Failed to reload SRC-20 tokens";
          setError(errorMessage);
          console.error("Fresh.js SRC-20 partial reload error:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    document.addEventListener(
      "fresh-partial-reload",
      handleFreshPartialReload as unknown as EventListener,
    );

    return () => {
      document.removeEventListener(
        "fresh-partial-reload",
        handleFreshPartialReload as unknown as EventListener,
      );
    };
  }, [address]);

  // ===== LOADING SKELETON =====
  const renderLoadingSkeleton = () => {
    if (!showLoadingSkeleton) return null;

    return (
      <div class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
        <div class="flex flex-col items-center gap-4">
          <LoadingIcon />
          <div class="text-white text-sm">Loading SRC-20 tokens...</div>
        </div>
      </div>
    );
  };

  // ===== ERROR DISPLAY =====
  const renderError = () => {
    if (!error) return null;

    return (
      <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4">
        <div class="text-red-400 text-sm">
          Error: {error}
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            handlePageChange(pagination?.page ?? 1);
          }}
          class="mt-2 text-xs text-red-300 hover:text-red-100 underline"
        >
          Retry
        </button>
      </div>
    );
  };

  // ===== RENDER =====
  return (
    <div class="relative">
      {/* Error Display */}
      {renderError()}

      {/* Loading Overlay */}
      {loading && renderLoadingSkeleton()}

      {/* SRC-20 Token Table */}
      <div class="relative">
        <SRC20OverviewNarrow
          data={memoizedTokens}
          fromPage={fromPage}
          onImageClick={(imgSrc: string) => {
            console.log("SRC-20 image clicked:", imgSrc);
            // TODO(@dev): Implement image modal or navigation
          }}
        />
      </div>

      {/* Pagination */}
      {(() => {
        const totalPages = hasProperty(pagination, "totalPages") &&
            isNumber(pagination.totalPages)
          ? pagination.totalPages
          : hasProperty(pagination, "total") && isNumber(pagination.total) &&
              isNumber(pagination.limit)
          ? Math.ceil(pagination.total / Math.max(pagination.limit, 1))
          : 0;
        return totalPages > 1 && (
          <div class="mt-6">
            <PaginationButtons
              page={pagination?.page ?? 1}
              totalPages={totalPages}
              prefix="src20"
              onPageChange={handlePageChange}
            />
          </div>
        );
      })()}
    </div>
  );
}
