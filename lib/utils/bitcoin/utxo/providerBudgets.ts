/**
 * Time budgets for calls to public Bitcoin UTXO/tx providers (mempool.space,
 * blockstream.info, blockchain.info). One hung or rate-limiting provider used
 * to stall a compose route for 30 s or more (#1287): bare fetches had no
 * timeout, the esplora client waited 30 s per call with three retries, and a
 * 429 slept at least 5 s before each retry.
 *
 * Every value can be overridden through the environment; the defaults are
 * the fail-fast budgets from the UTXO design review.
 */

function readEnv(key: string): string | undefined {
  try {
    return typeof Deno !== "undefined" ? Deno.env.get(key) : undefined;
  } catch {
    // No env permission (or a non-Deno runtime): use the defaults.
    return undefined;
  }
}

/** A non-negative integer from the environment, else `fallback`. */
export function envInt(key: string, fallback: number): number {
  const raw = readEnv(key);
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** Per-request timeout for one provider call, headers and body included. */
export const UTXO_PROVIDER_TIMEOUT_MS = envInt(
  "UTXO_PROVIDER_TIMEOUT_MS",
  5000,
);

/** Retries after the first attempt (per HTTP call, or per provider pass). */
export const UTXO_PROVIDER_RETRIES = envInt("UTXO_PROVIDER_RETRIES", 1);

/**
 * Longest a provider call may sleep before retrying. A 429 whose required
 * wait (Retry-After, or the 5 s rate-limit floor) is longer than this is not
 * retried at all: the caller moves straight to the next provider.
 */
export const UTXO_PROVIDER_MAX_BACKOFF_MS = envInt(
  "UTXO_PROVIDER_MAX_BACKOFF_MS",
  1000,
);

/**
 * Total time one address-UTXO lookup may spend before it stops starting new
 * provider calls (calls already in flight still finish within their own
 * timeout). Keeps the worst case well under the compose-route deadline.
 */
export const UTXO_LOOKUP_BUDGET_MS = envInt("UTXO_LOOKUP_BUDGET_MS", 12000);

/**
 * Call-time readers for the same settings, for code that runs per request
 * (the constants above are read once, when a client is constructed).
 */
export const utxoProviderTimeoutMs = () =>
  envInt("UTXO_PROVIDER_TIMEOUT_MS", 5000);
export const utxoProviderRetries = () => envInt("UTXO_PROVIDER_RETRIES", 1);
export const utxoLookupBudgetMs = () => envInt("UTXO_LOOKUP_BUDGET_MS", 12000);

/** `fetch` with a timeout that covers the whole exchange, body included. */
export function providerFetch(
  url: string,
  timeoutMs: number = utxoProviderTimeoutMs(),
): Promise<Response> {
  // The signal stays attached to the response body, so a provider that sends
  // headers and then stalls the body is also cut off at `timeoutMs`.
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
}
