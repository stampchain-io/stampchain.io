const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
import { MEMPOOL_API_BASE_URL } from "$constants";
import type { BTCBalance, MempoolAddressResponse } from "$lib/types/index.d.ts";

// Default deadline for external balance/API fetches. Without a timeout a hung
// upstream (mempool.space / BlockCypher) blocks the caller indefinitely — this
// is what hung the aggregate `/api/v2/balance/{address}` endpoint (#1198).
export const DEFAULT_FETCH_TIMEOUT_MS = 5000;

function makeTimeoutError(timeoutMs: number): Error {
  const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
  timeoutError.name = "TimeoutError";
  return timeoutError;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** `true` when `error` is the `TimeoutError` thrown by the helpers below. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

/**
 * `fetch` with an `AbortController` deadline so a slow/unresponsive upstream
 * fails fast instead of hanging the caller. On timeout it throws an `Error`
 * with `name === "TimeoutError"`; otherwise it behaves exactly like `fetch`.
 */
export async function fetchWithTimeout(
  input: string | URL,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) throw makeTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface JsonFetchResult<T> {
  ok: boolean;
  status: number;
  /** Parsed body when `ok`; `null` for non-2xx responses. */
  data: T | null;
}

/**
 * Like `fetchWithTimeout`, but the deadline covers the *whole* exchange —
 * headers AND body. `fetchWithTimeout` disarms its timer as soon as `fetch()`
 * resolves (headers received), so a `response.json()` issued afterwards is
 * unbounded again. Here the abort signal stays armed until the body has been
 * parsed; aborting mid-read rejects the body stream, which is mapped to the
 * same `TimeoutError`. Non-2xx responses are drained and returned with
 * `data: null` so callers can decide whether to retry.
 */
export async function fetchJsonWithTimeout<T>(
  input: string | URL,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
  init: RequestInit = {},
): Promise<JsonFetchResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return { ok: false, status: response.status, data: null };
    }
    const data = await response.json() as T;
    return { ok: true, status: response.status, data };
  } catch (error) {
    if (isAbortError(error)) throw makeTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export const getRecommendedFees = async (
  retries = 0,
): Promise<RecommendedFees | null> => {
  try {
    const endpoint = `${MEMPOOL_API_BASE_URL}/v1/fees/recommended`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Error: response for: ${endpoint} unsuccessful. Response: ${response.status}`,
      );
    }
    const data = await response.json();

    // Validate the response shape
    if (typeof data?.fastestFee !== "number") {
      throw new Error("Invalid fee data structure");
    }

    return data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await getRecommendedFees(retries + 1);
    } else {
      console.error("Mempool fees error:", error);
      return null;
    }
  }
};

export const getCurrentBlock = async (retries = 0): Promise<number | null> => {
  try {
    const endpoint = `${MEMPOOL_API_BASE_URL}/v1/blocks/tip/height`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Error: response for: ${endpoint} unsuccessful. Response: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await getCurrentBlock(retries + 1);
    } else {
      console.error(error);
      return null;
    }
  }
};

export const getTransactionInfo = async (
  txid: string,
  retries = 0,
): Promise<string | null> => {
  try {
    const endpoint = `${MEMPOOL_API_BASE_URL}/tx/${txid}/hex`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Error: response for: ${endpoint} unsuccessful. Response: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await getTransactionInfo(txid, retries + 1);
    } else {
      console.error(error);
      return null;
    }
  }
};

/**
 * Fetch the BTC balance of `address` from mempool.space.
 *
 * `deadlineAt` (epoch ms) bounds the WHOLE call — every attempt, every retry
 * back-off, and the body read — so the worst case is `deadlineAt - now`, not
 * `MAX_RETRIES x per-fetch timeout + back-offs`. Before this the per-fetch
 * deadline added by #1206 still let a provider that answered 429/5xx (a
 * non-timeout error) retry 4 x 5s + 3 x 1s ~= 23s, which is exactly what the
 * aggregate `/api/v2/balance/{address}` endpoint was measured at (#1198).
 */
export const getBTCBalanceFromMempool = async (
  address: string,
  retries = 0,
  deadlineAt: number = Date.now() + DEFAULT_FETCH_TIMEOUT_MS,
): Promise<BTCBalance | null> => {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) return null;

  const endpoint = `${MEMPOOL_API_BASE_URL}/address/${address}`;
  try {
    const result = await fetchJsonWithTimeout<MempoolAddressResponse>(
      endpoint,
      Math.min(remaining, DEFAULT_FETCH_TIMEOUT_MS),
    );
    if (!result.ok || !result.data) {
      throw new Error(
        `Error: response for: ${endpoint} unsuccessful. Response: ${result.status}`,
      );
    }

    const data = result.data;
    const confirmed = data.chain_stats.funded_txo_sum -
      data.chain_stats.spent_txo_sum;
    const unconfirmed = data.mempool_stats.funded_txo_sum -
      data.mempool_stats.spent_txo_sum;

    return {
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
      txCount: data.chain_stats.tx_count,
      unconfirmedTxCount: data.mempool_stats.tx_count,
    };
  } catch (error) {
    // A timeout means the upstream is unresponsive; retrying just re-accumulates
    // the delay (MAX_RETRIES x timeout) — exactly what let this hang the aggregate
    // balance endpoint (#1198). Fail fast so the caller can fall through / degrade.
    if (isTimeoutError(error)) {
      console.error("Mempool balance fetch timed out:", error);
      return null;
    }
    // Retry non-timeout errors (429 / 5xx / network) only while there is still
    // budget for the back-off AND another attempt.
    if (
      retries < MAX_RETRIES &&
      deadlineAt - Date.now() > RETRY_DELAY_MS
    ) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return await getBTCBalanceFromMempool(address, retries + 1, deadlineAt);
    }
    console.error("Mempool balance fetch error:", error);
    return null;
  }
};
