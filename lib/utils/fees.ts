// Isomorphic fee utilities for client and server usage
// Source migrated from $server/services/counterpartyApiService.ts

import { SATS_PER_KB_MULTIPLIER } from "$constants";

export interface NormalizedFeeRate {
  normalizedSatsPerVB: number;
  normalizedSatsPerKB: number;
}

/**
 * Normalize fee rate inputs to both sats/vB and sats/kB forms.
 *
 * - If satsPerVB provided, use it directly
 * - If satsPerKB provided, convert to satsPerVB using SATS_PER_KB_MULTIPLIER
 * - Throws on non-positive results
 */
export function normalizeFeeRate(params: {
  satsPerKB?: number;
  satsPerVB?: number;
}): NormalizedFeeRate {
  let normalizedSatsPerVB: number;

  if (params.satsPerVB !== undefined) {
    normalizedSatsPerVB = params.satsPerVB;
  } else if (params.satsPerKB !== undefined) {
    normalizedSatsPerVB = params.satsPerKB < SATS_PER_KB_MULTIPLIER
      ? params.satsPerKB
      : params.satsPerKB / SATS_PER_KB_MULTIPLIER;
  } else {
    throw new Error("Either satsPerKB or satsPerVB must be provided");
  }

  if (normalizedSatsPerVB <= 0) {
    throw new Error("Fee rate must be greater than 0");
  }

  return {
    normalizedSatsPerVB,
    normalizedSatsPerKB: normalizedSatsPerVB * SATS_PER_KB_MULTIPLIER,
  };
}

/** Smallest sale output the trade tool will build. */
export const MIN_SALE_SATS = 546;

const SATS_PER_BTC = 100_000_000;
/**
 * Float noise on an 8-decimal BTC amount is far below this. A 9th decimal
 * place is 0.1 sat, so it fails the check.
 */
const SAT_ROUNDING_TOLERANCE = 1e-4;

/**
 * Convert a BTC sale price to integer satoshis.
 * Rounds half-sat float error (0.00000029 BTC is 29 sats, not 28).
 * Rejects more than 8 decimal places and amounts below MIN_SALE_SATS.
 */
export function btcToSats(btc: number): number {
  if (typeof btc !== "number" || !Number.isFinite(btc) || btc <= 0) {
    throw new Error("Sale price must be a positive BTC amount");
  }
  const exact = btc * SATS_PER_BTC;
  const sats = Math.round(exact);
  if (!Number.isSafeInteger(sats)) {
    throw new Error("Sale price is out of range");
  }
  if (Math.abs(exact - sats) > SAT_ROUNDING_TOLERANCE) {
    throw new Error("Sale price supports at most 8 decimal places");
  }
  if (sats < MIN_SALE_SATS) {
    throw new Error(
      `Sale price must be at least ${MIN_SALE_SATS} sats (0.00000546 BTC)`,
    );
  }
  return sats;
}
