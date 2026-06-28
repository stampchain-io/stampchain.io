/* ===== MARKETPLACE TABLE BASE COMPONENT ===== */
import type { StampRow, StampWithEnhancedSaleData } from "$types/stamp.d.ts";

import { StampListingsTable } from "./StampListings.tsx";
import { MarketplaceSalesTable } from "./StampSales.tsx";

/* ===== COMPONENT ===== */
interface MarketplaceTableBaseProps {
  stamps: StampRow[];
  isRecentSales: boolean;
}

export function MarketplaceTableBase(
  { stamps, isRecentSales }: MarketplaceTableBaseProps,
) {
  return isRecentSales
    ? (
      <MarketplaceSalesTable
        stamps={stamps as StampWithEnhancedSaleData[]}
      />
    )
    : <StampListingsTable stamps={stamps} />;
}
