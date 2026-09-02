import { serverConfig } from "$server/config/config.ts";

/**
 * Resolves the base URL used to construct SRC-20 stamp image URLs.
 *
 * Every SRC-20 transaction (deploy/mint/transfer) has a corresponding
 * generated stamp SVG served from `/stamps/{tx_hash}.svg`. This is the
 * single source of truth for that base URL so every server-side code path
 * that populates `stamp_url`/`deploy_img` on a `SRC20Row` stays consistent
 * (previously this formula was duplicated independently in
 * `SRC20QueryService.enrichData` and `SRC20Repository.getSrc20BalanceFromDb`).
 */
export function getSrc20ImageBaseUrl(): string {
  return serverConfig.IS_DEVELOPMENT
    ? serverConfig.DEV_BASE_URL
    : "https://stampchain.io";
}

/**
 * Builds the fully-qualified stamp image URL for a given transaction hash.
 * Returns `undefined` when no hash is available so callers can safely do
 * `row.stamp_url ??= buildSrc20StampUrl(row.tx_hash)`-style assignments.
 */
export function buildSrc20StampUrl(
  txHash?: string | null,
): string | undefined {
  return txHash ? `${getSrc20ImageBaseUrl()}/stamps/${txHash}.svg` : undefined;
}
