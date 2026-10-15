/**
 * Fee Estimation Utilities
 *
 * Shared utility functions for progressive fee estimation across all tools
 *
 * @author stampchain.io
 * @version 1.0.0
 */

import type { FeeDetails } from "$types/base.d.ts";
import type { ProgressiveFeeEstimationResult as FeeEstimationResult } from "$types/fee-estimation.ts";
import type { ProgressiveFeeEstimationProps } from "$types/ui.d.ts";

/**
 * Converts FeeEstimationResult to UIProgressiveResult
 */
function convertToUIProgressiveResult(
  result: FeeEstimationResult | null,
): FeeEstimationResult | null {
  if (!result) return null;

  // Return the result as-is since both types are compatible
  // FeeEstimationResult from fee-estimation.ts has all required fields
  return {
    ...result,
    phase: result.phase || "instant",
  } as FeeEstimationResult;
}

/**
 * The operator service fee from /config, in whole sats. The server sends it
 * as a string; anything that is not a positive integer (unset, "", or the
 * legacy BTC-style fallback "0.00001") means no fee, matching how the mint
 * and fairmint routes parse it.
 */
export function parseServiceFeeSats(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return 0;
  const sats = Number(text);
  return Number.isSafeInteger(sats) && sats > 0 ? sats : 0;
}

/**
 * Show the operator service fee the request will carry. Fee estimates are
 * computed without it, so it is added both as its own line and to the total;
 * a not-yet-estimated total (0) stays 0.
 */
export function withServiceFee<T extends FeeDetails>(
  details: T,
  sats: number,
): T {
  if (sats <= 0) return details;
  return {
    ...details,
    serviceFee: sats,
    totalValue: details.totalValue > 0
      ? details.totalValue + sats
      : details.totalValue,
  };
}

/**
 * Maps progressive fee estimation result to FeeDetails interface
 * Used by all tools to ensure consistent fee details formatting
 */
export function mapProgressiveFeeDetails(
  progressiveFeeDetails: FeeEstimationResult | null,
  defaultEstimatedSize = 300,
): FeeDetails {
  if (!progressiveFeeDetails) {
    return {
      minerFee: 0,
      dustValue: 0,
      totalValue: 0,
      hasExactFees: false,
      estimatedSize: defaultEstimatedSize,
    };
  }

  const feeDetails: FeeDetails = {
    minerFee: progressiveFeeDetails.minerFee || 0,
    dustValue: progressiveFeeDetails.dustValue || 0,
    totalValue: progressiveFeeDetails.totalValue || 0,
    hasExactFees: progressiveFeeDetails.hasExactFees || false,
    estimatedSize: progressiveFeeDetails.estimatedSize || defaultEstimatedSize,
  };

  // Add optional fields only if they exist
  const optionalFields = [
    "serviceFee",
    "itemPrice",
    "effectiveFeeRate",
    "totalVsize",
  ];

  optionalFields.forEach((field) => {
    const value = progressiveFeeDetails[field];
    if (value !== undefined) {
      feeDetails[field] = value;
    }
  });

  return feeDetails;
}

/**
 * Common progressive fee estimation props for FeeCalculatorBase
 * Ensures consistent props across all tools
 */

/**
 * Extracts progressive fee estimation props from hook result
 * Standardizes the props passed to FeeCalculatorBase
 */
export function extractProgressiveFeeProps(hookResult: {
  isEstimating?: boolean;
  isPreFetching?: boolean;
  currentPhase?: "instant" | "cached" | "exact";
  phase1Result?: FeeEstimationResult | null;
  phase2Result?: FeeEstimationResult | null;
  phase3Result?: FeeEstimationResult | null;
  error?: Error | null;
  clearError?: () => void;
}): ProgressiveFeeEstimationProps {
  const props: ProgressiveFeeEstimationProps = {};

  if (hookResult.isEstimating !== undefined) {
    props.isEstimating = hookResult.isEstimating;
  }
  if (hookResult.isPreFetching !== undefined) {
    props.isPreFetching = hookResult.isPreFetching;
  }
  if (hookResult.currentPhase !== undefined) {
    props.currentPhase = hookResult.currentPhase;
  }
  if (hookResult.phase1Result !== undefined) {
    props.phase1Result = convertToUIProgressiveResult(hookResult.phase1Result);
  }
  if (hookResult.phase2Result !== undefined) {
    props.phase2Result = convertToUIProgressiveResult(hookResult.phase2Result);
  }
  if (hookResult.phase3Result !== undefined) {
    props.phase3Result = convertToUIProgressiveResult(hookResult.phase3Result);
  }
  if (hookResult.error !== undefined) {
    props.feeEstimationError = hookResult.error;
  }
  if (hookResult.clearError !== undefined) {
    props.clearError = hookResult.clearError;
  }

  return props;
}
