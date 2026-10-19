import type { MarketListingAggregated } from "$types/marketData.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";

/** 1 XCP = 100_000_000 base units. Counterparty often omits `divisible`. */
export const XCP_BASE_UNITS = 100_000_000;

/** Fixed XCP supply, used when asset info is missing. */
export const XCP_SUPPLY_FALLBACK = 2648755.63;

export interface XcpBalanceQuantity {
  cpid?: string;
  quantity?: number | string;
}

export interface XcpAssetInfo {
  supply?: unknown;
  divisible?: boolean;
  supply_normalized?: unknown;
}

export interface XcpPriceQuote {
  priceBtc: number;
  change24hPercent: number | null;
}

function toAmountString(value: number): string {
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

/** Sum XCP rows and convert base units to XCP. Other assets are ignored. */
export function xcpQuantityFromBalances(
  balances: XcpBalanceQuantity[],
): number {
  const baseUnits = balances.reduce((sum, balance) => {
    if (balance.cpid !== "XCP") return sum;
    const quantity = Number(balance.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? sum + quantity : sum;
  }, 0);
  if (baseUnits <= 0) return 0;
  return baseUnits / XCP_BASE_UNITS;
}

/**
 * Human XCP supply. Divisible asset `supply` is base units.
 * Missing or unusable info falls back to the fixed supply.
 */
export function xcpSupplyFromAsset(
  asset: XcpAssetInfo | null | undefined,
): number {
  if (!asset) return XCP_SUPPLY_FALLBACK;

  if (asset.divisible === true) {
    const supply = Number(asset.supply);
    if (Number.isFinite(supply) && supply > 0) {
      return supply / XCP_BASE_UNITS;
    }
  }

  const normalized = Number(asset.supply_normalized);
  if (Number.isFinite(normalized) && normalized > 0) return normalized;

  return XCP_SUPPLY_FALLBACK;
}

function xcpMarketData(
  supply: number,
  price: XcpPriceQuote | null,
): MarketListingAggregated | undefined {
  if (!price || !(price.priceBtc > 0) || !Number.isFinite(price.priceBtc)) {
    return undefined;
  }

  const market: MarketListingAggregated = {
    tick: "XCP",
    price_btc: price.priceBtc,
    floor_price_btc: price.priceBtc,
    market_cap_btc: supply * price.priceBtc,
    volume_24h_btc: 0,
    tx_hash: "xcp",
    holder_count: 0,
    market_data: null,
  };

  if (
    price.change24hPercent != null &&
    Number.isFinite(price.change24hPercent)
  ) {
    market.change_24h_percent = price.change24hPercent;
  }

  return market;
}

/**
 * SRC-20-shaped balance row for a positive XCP holding.
 * Returns null when the normalized balance is 0.
 * Holders are omitted so the card pill stays N/A.
 */
export function buildXcpBalanceRow(input: {
  quantity: number;
  supply: number;
  price: XcpPriceQuote | null;
}): SRC20Row | null {
  if (!(input.quantity > 0) || !Number.isFinite(input.quantity)) return null;

  const supply = Number.isFinite(input.supply) && input.supply > 0
    ? input.supply
    : XCP_SUPPLY_FALLBACK;
  const marketData = xcpMarketData(supply, input.price);

  const row: SRC20Row = {
    tx_hash: "xcp",
    block_index: 0,
    p: "counterparty",
    op: "",
    tick: "XCP",
    tick_hash: "",
    creator: "",
    creator_name: null,
    amt: toAmountString(input.quantity),
    max: toAmountString(supply),
    destination: "",
    block_time: new Date(0),
    status: "",
    row_num: 0,
    holders: undefined as unknown as number,
    fee_rate_sat_vb: null,
    fee: null,
  };

  if (marketData) row.market_data = marketData;
  return row;
}
