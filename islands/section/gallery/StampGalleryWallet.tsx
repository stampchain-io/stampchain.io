/**
 * @fileoverview StampGalleryWallet - Wallet-specific stamp gallery
 * @description Client-side gallery for wallet stamp holdings with
 * pagination and sorting infrastructure integration
 */

import { PaginationButtons } from "$button";
import { LoadingIcon } from "$icon";
import { StampCard } from "$islands/card/StampCard.tsx";
import type { StampGalleryWalletProps, StampRow } from "$types/stamp.d.ts";
import type { PaginationState } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

// ===== TYPES =====

interface FreshNavigationOptions {
  usePartial?: boolean;
  scrollTarget?: string;
  updateUrl?: boolean;
}

// ===== MAIN COMPONENT =====

export function StampGalleryWallet({
  initialData,
  initialPagination,
  address,
  initialSort,
  enablePartialNavigation = true,
  showLoadingSkeleton = true,
  gridClass =
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
  variant = "imageDetailExplorer",
}: StampGalleryWalletProps) {
  // ===== STATE =====
  const [stamps, setStamps] = useState<StampRow[]>(initialData);
  const [currentSort, setCurrentSort] = useState<"ASC" | "DESC">(
    (initialSort ?? "DESC") as "ASC" | "DESC",
  );
  const [pagination, setPagination] = useState<PaginationState>(
    initialPagination,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== UTILITY FUNCTIONS =====

  const buildApiUrl = (page: number, sort: "ASC" | "DESC"): string => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pagination.limit.toString());
    params.set("sortBy", sort);
    params.set("enhanced", "true");

    return `/api/v2/stamps/balance/${address}?${params.toString()}`;
  };

  const navigateWithFresh = async (
    url: string,
    options: FreshNavigationOptions = {},
  ) => {
    const {
      usePartial = enablePartialNavigation,
      scrollTarget = "stamps-section",
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch stamps: ${response.status}`);
      }

      const data = await response.json();

      // Update state with new data
      setStamps(data.data || []);
      setPagination((prev) => ({
        ...prev,
        page: data.page || 1,
        limit: data.limit || prev.limit,
        totalPages: data.totalPages || 1,
        hasNext: (data.page || 1) < (data.totalPages || 1),
        hasPrev: (data.page || 1) > 1,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to load stamps";
      setError(errorMessage);
      console.error("StampGalleryWallet navigation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ===== EVENT HANDLERS =====

  const handlePageChange = async (page: number) => {
    const url = buildApiUrl(page, currentSort);
    await navigateWithFresh(url);

    // Ensure anchor scrolling happens after data update
    setTimeout(() => {
      const targetElement = document.getElementById("stamps-section");
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 200); // Slightly longer delay to ensure DOM update
  };

  // ===== EFFECTS =====

  // Sync with external sort changes
  useEffect(() => {
    if (initialSort !== currentSort) {
      setCurrentSort((initialSort ?? "DESC") as "ASC" | "DESC");
    }
  }, [initialSort]);

  // Listen for Fresh.js partial reload events
  useEffect(() => {
    if (typeof globalThis === "undefined") return;

    const handleFreshPartialReload = async (event: CustomEvent) => {
      const { url, target } = event.detail;
      if (
        target === "stamps-section" &&
        url.includes(`/api/v2/stamps/balance/${address}`)
      ) {
        console.log("Fresh.js stamp partial reload:", url);

        // Extract sort parameter from URL
        const urlObj = new URL(url, globalThis.location.origin);
        const sortParam = urlObj.searchParams.get("sortBy") ||
          urlObj.searchParams.get("stampsSortBy");
        const newSort = (sortParam === "ASC" || sortParam === "DESC")
          ? sortParam
          : currentSort;

        // Update sort if it changed
        if (newSort !== currentSort) {
          setCurrentSort(newSort as "ASC" | "DESC");
        }

        // Fetch new data
        try {
          setLoading(true);
          setError(null);

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch stamps: ${response.status}`);
          }

          const data = await response.json();

          // Update state with new data
          setStamps(data.data || []);
          setPagination((prev) => ({
            ...prev,
            page: data.pagination?.page || data.page || 1,
            limit: data.pagination?.limit || data.limit || prev.limit,
            totalPages: data.pagination?.totalPages || data.totalPages || 1,
            hasNext: (data.pagination?.page || data.page || 1) <
              (data.pagination?.totalPages || data.totalPages || 1),
            hasPrev: (data.pagination?.page || data.page || 1) > 1,
          }));

          // Scroll to section after data loads
          setTimeout(() => {
            const targetElement = document.getElementById("stamps-section");
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
            : "Failed to reload stamps";
          setError(errorMessage);
          console.error("Fresh.js stamp partial reload error:", err);
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

  // ===== RENDER HELPERS =====

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
            handlePageChange(pagination.page);
          }}
          class="mt-2 text-xs text-red-300 hover:text-red-100 underline"
        >
          Retry
        </button>
      </div>
    );
  };

  const renderLoadingOverlay = () => {
    if (!loading || !showLoadingSkeleton) return null;

    return (
      <div class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
        <div class="flex flex-col items-center gap-4">
          <LoadingIcon />
          <div class="text-white text-sm">Loading stamps...</div>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
  return (
    <div class="relative">
      {/* Error Display */}
      {renderError()}

      {/* Loading Overlay */}
      {renderLoadingOverlay()}

      {/* Stamp Grid */}
      <div class="relative">
        <div class={`stamps-grid ${gridClass}`}>
          {stamps.map((stamp) => (
            <StampCard
              key={stamp.stamp}
              stamp={stamp}
              variant={variant}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div class="mt-6">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
