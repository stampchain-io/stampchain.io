/**
 * Root barrel export for lib/utils
 *
 * This file provides backward compatibility by re-exporting
 * all utilities from their new organized structure.
 *
 * NOTE: Prefer importing from specific subdirectories for better tree-shaking.
 */

export * from "./security/index.ts";
export * from "./ui/index.ts";
export * from "./bitcoin/index.ts";
export * from "./api/index.ts";
export * from "./data/index.ts";
export * from "./navigation/index.ts";
export * from "./performance/index.ts";

// Individual exports for backward compatibility
export * from "./security/securityUtils.ts";
export * from "./security/clientSecurityUtils.ts";
export * from "./security/securityHeaders.ts";
export * from "./security/cryptoUtils.ts";
export * from "./ui/formatting/formatUtils.ts";
export * from "./ui/rendering/svgUtils.ts";
export * from "./ui/media/imageUtils.ts";
export * from "./ui/formatting/emojiUtils.ts";
export * from "./ui/accessibility/accessibilityUtils.ts";
export * from "./ui/notifications/toastSignal.ts";
export * from "./bitcoin/calculations/btcCalculations.ts";
// Export available functions from utxoUtils
export { getTxInfo, getUTXOForAddress } from "./bitcoin/utxo/utxoUtils.ts";
export * from "./bitcoin/stamps/stampUtils.ts";
export * from "./bitcoin/transactions/transactionSizeEstimator.ts";
export * from "./bitcoin/scripts/scriptTypeUtils.ts";
export * from "./bitcoin/network/mempool.ts";
export * from "./api/responses/apiResponseUtil.ts";
// Export only specific items from responseUtil (excluding StampResponseOptions)
export { ResponseUtil } from "./api/responses/responseUtil.ts";
export type { ResponseOptions } from "./api/responses/responseUtil.ts";
export * from "./api/responses/webResponseUtil.ts"; // This has StampResponseOptions
export * from "./api/adapters/toolEndpointAdapters.ts";
export * from "./api/versioning/versionedApiResponse.ts";
export * from "./api/headers/headerUtils.ts";
export * from "./data/processing/balanceUtils.ts";
export * from "./data/pagination/paginationUtils.ts";
export * from "./data/filtering/filterOptions.ts";
export * from "./data/sorting/sortingConstants.ts";
export * from "./data/numbers/numberUtils.ts";
export * from "./data/identifiers/identifierUtils.ts";
export * from "./data/protocols/protocol.ts";
export * from "./data/protocols/imageProtocolUtils.ts";
export * from "./navigation/freshNavigationUtils.ts";
export * from "./monitoring/logging/logger.ts";
export * from "./performance/fees/feeMonitoring.ts";
export { ErrorHandlingUtils, type ErrorInfo } from "./errorHandling.ts";
export * from "./jsonLd.ts";
export { showToast } from "./ui/notifications/toastSignal.ts";
export * from "./performance/debounce.ts";
export * from "./performance/storage/localStorage.ts";
export * from "./performance/signals/feeSignal.ts";
export * from "./performance/fees/fee-estimation-utils.ts";
