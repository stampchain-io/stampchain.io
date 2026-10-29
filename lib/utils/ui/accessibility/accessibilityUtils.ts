/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { coinUnit } from "$lib/utils/chain/clientChain.ts";
import { focusableWithin, nextFocusTarget } from "./focusTrap.ts";

/* ===== ACCESSIBILITY UTILITIES ===== */

/**
 * Generates accessible labels and descriptions for recent sales components
 */
export class AccessibilityUtils {
  /**
   * Create accessible label for sale card
   */
  static getSaleCardLabel(sale: {
    stamp?: string | number | null | undefined;
    sale_data?: {
      btc_amount: number;
      time_ago?: string;
      buyer_address?: string;
    } | undefined;
  }): string {
    const stampId = sale.stamp;
    const saleData = sale.sale_data;

    if (!saleData) {
      return `Stamp ${stampId} - No sale data available`;
    }

    const btcAmount = saleData.btc_amount.toFixed(8);
    const timeAgo = saleData.time_ago || "recently";
    const buyerInfo = saleData.buyer_address
      ? ` to buyer ${saleData.buyer_address.slice(0, 8)}...`
      : "";

    return `Stamp ${stampId} sold for ${btcAmount} ${coinUnit()} ${timeAgo}${buyerInfo}`;
  }

  /**
   * Create accessible description for sale transaction
   */
  static getSaleTransactionDescription(sale: {
    stamp?: string | number | null | undefined;
    sale_data?:
      | {
        btc_amount: number;
        btc_amount_satoshis?: number;
        block_index: number;
        tx_hash: string;
        buyer_address?: string;
        dispenser_address?: string;
        time_ago?: string;
      }
      | null
      | undefined;
  }): string {
    const saleData = sale.sale_data;
    if (!saleData) return "No transaction details available";

    const parts = [
      `Transaction ${saleData.tx_hash.slice(0, 8)}...${
        saleData.tx_hash.slice(-8)
      }`,
      `confirmed in block ${saleData.block_index.toLocaleString()}`,
    ];

    if (saleData.buyer_address) {
      parts.push(
        `purchased by ${saleData.buyer_address.slice(0, 8)}...${
          saleData.buyer_address.slice(-8)
        }`,
      );
    }

    if (saleData.dispenser_address) {
      parts.push(
        `via dispenser ${saleData.dispenser_address.slice(0, 8)}...${
          saleData.dispenser_address.slice(-8)
        }`,
      );
    }

    if (saleData.btc_amount_satoshis) {
      parts.push(
        `amount: ${saleData.btc_amount_satoshis.toLocaleString()} satoshis`,
      );
    }

    return parts.join(", ");
  }

  /**
   * Generate ARIA labels for gallery navigation
   */
  static getGalleryNavigationLabel(
    currentPage: number,
    totalPages: number,
    totalItems?: number,
  ): string {
    const itemsInfo = totalItems ? ` showing ${totalItems} items` : "";
    return `Gallery navigation: page ${currentPage} of ${totalPages}${itemsInfo}`;
  }

  /**
   * Generate ARIA labels for refresh buttons
   */
  static getRefreshButtonLabel(
    isLoading: boolean,
    lastRefreshTime?: string,
  ): string {
    if (isLoading) {
      return "Refreshing sales data, please wait";
    }

    const timeInfo = lastRefreshTime ? ` Last updated: ${lastRefreshTime}` : "";
    return `Refresh sales data.${timeInfo}`;
  }

  /**
   * Generate screen reader announcements for real-time updates
   */
  static getUpdateAnnouncement(newSalesCount: number): string {
    if (newSalesCount === 0) {
      return "No new sales found";
    } else if (newSalesCount === 1) {
      return "1 new sale found and added to the list";
    } else {
      return `${newSalesCount} new sales found and added to the list`;
    }
  }

  /**
   * Generate accessible loading states
   */
  static getLoadingLabel(
    context: "gallery" | "feed" | "card" | "refresh",
  ): string {
    switch (context) {
      case "gallery":
        return "Loading sales gallery, please wait";
      case "feed":
        return "Loading sales activity feed, please wait";
      case "card":
        return "Loading sale details, please wait";
      case "refresh":
        return "Refreshing data, please wait";
      default:
        return "Loading, please wait";
    }
  }

  /**
   * Generate accessible error messages
   */
  static getErrorMessage(
    context: "network" | "data" | "auth" | "generic",
    details?: string,
  ): string {
    const baseMessages = {
      network: "Unable to load sales data due to network error",
      data: "Sales data is currently unavailable",
      auth: "Authentication required to view sales data",
      generic: "An error occurred while loading sales data",
    };

    const baseMessage = baseMessages[context];
    return details ? `${baseMessage}: ${details}` : baseMessage;
  }

  /**
   * Check if reduced motion is preferred
   */
  static prefersReducedMotion(): boolean {
    if (typeof globalThis === "undefined" || !globalThis.matchMedia) {
      return false;
    }

    return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Generate keyboard navigation instructions
   */
  static getKeyboardInstructions(context: "gallery" | "feed"): string {
    switch (context) {
      case "gallery":
        return "Use arrow keys to navigate between sale cards, Enter to view details, Space to select";
      case "feed":
        return "Use arrow keys to navigate between sale items, Enter to view stamp details, Tab to access links";
      default:
        return "Use Tab to navigate, Enter to activate";
    }
  }

  /**
   * Generate focus management utilities
   */
  static manageFocus = {
    /**
     * Set focus to element with proper error handling
     */
    setFocus: (selector: string, fallbackSelector?: string): boolean => {
      try {
        const element = globalThis.document?.querySelector(
          selector,
        ) as HTMLElement;
        if (element && typeof element.focus === "function") {
          element.focus();
          return true;
        }

        if (fallbackSelector) {
          const fallback = globalThis.document?.querySelector(
            fallbackSelector,
          ) as HTMLElement;
          if (fallback && typeof fallback.focus === "function") {
            fallback.focus();
            return true;
          }
        }

        return false;
      } catch {
        return false;
      }
    },

    /**
     * Create focus trap for modal-like components
     */
    createTrap: (containerSelector: string): (() => void) | null => {
      // Same rule the modal overlay uses (focusTrap.ts). Focusable elements
      // are re-read on every Tab, so content rendered after the trap is set
      // up is still covered.
      try {
        const container = globalThis.document?.querySelector<HTMLElement>(
          containerSelector,
        );
        if (!container) return null;
        // Keep the existing contract: nothing to trap means no trap.
        if (focusableWithin(container).length === 0) return null;

        const handleTabKey = (e: KeyboardEvent) => {
          if (e.key !== "Tab") return;
          const target = nextFocusTarget(
            focusableWithin(container),
            globalThis.document?.activeElement as HTMLElement | null,
            e.shiftKey,
            (el) => !!el && el !== container && container.contains(el),
          );
          if (target === null) return;
          e.preventDefault();
          (target === "dialog" ? container : target).focus();
        };

        globalThis.document?.addEventListener("keydown", handleTabKey);

        return () => {
          globalThis.document?.removeEventListener("keydown", handleTabKey);
        };
      } catch {
        return null;
      }
    },
  };

  /**
   * Generate responsive breakpoint labels for screen readers
   */
  static getResponsiveLabel(
    breakpoint: "mobile" | "tablet" | "desktop",
  ): string {
    switch (breakpoint) {
      case "mobile":
        return "Mobile view: simplified layout with essential information";
      case "tablet":
        return "Tablet view: enhanced layout with additional details";
      case "desktop":
        return "Desktop view: full layout with all available information";
      default:
        return "Responsive layout adapts to screen size";
    }
  }
}
