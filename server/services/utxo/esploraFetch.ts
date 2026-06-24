/**
 * Shared esplora-provider fetch helper.
 *
 * mempool.space and blockstream.info expose the **same** HTTP API (the esplora
 * API: `GET /tx/:txid`, `/tx/:txid/hex`, `/address/:addr/utxo`, ...), so a
 * single code path can serve all of them. This module centralises the
 * provider list and the "try each provider in order until one succeeds" logic
 * so callers (e.g. CommonUTXOService) don't duplicate per-provider blocks.
 *
 * Both base URLs are env-overridable (`MEMPOOL_API_URL` / `BLOCKSTREAM_API_URL`
 * in `lib/constants/apiUrls.ts`), so a self-hosted esplora instance can be
 * slotted in as the primary provider without any code change.
 */

import { BLOCKSTREAM_API_BASE_URL, MEMPOOL_API_BASE_URL } from "$constants";
import { logger } from "$lib/utils/logger.ts";
import type { HttpClient } from "$server/interfaces/httpClient.ts";

const LOG_NS = "common-utxo-service" as const;

export interface EsploraProvider {
  name: string;
  baseUrl: string;
}

/**
 * Ordered esplora providers. First entry is tried first; later entries are
 * fallbacks. mempool.space is primary (typically lower latency / fresher
 * mempool), blockstream.info is the fallback.
 */
export function getEsploraProviders(): EsploraProvider[] {
  return [
    { name: "mempool.space", baseUrl: MEMPOOL_API_BASE_URL },
    { name: "blockstream.info", baseUrl: BLOCKSTREAM_API_BASE_URL },
  ];
}

/**
 * Fetch `path` from each esplora provider in order, returning the first result
 * that `extract` maps to a non-null value. Returns `null` if every provider
 * fails or none yields a usable value.
 *
 * `extract` lets the caller validate/transform the raw response (e.g. confirm a
 * hex string is well-formed, or pull a specific vout out of a tx). Returning
 * `null` from `extract` is treated as "this provider didn't have what we need"
 * and moves on to the next provider.
 *
 * A network error or non-OK status from one provider is logged and the next
 * provider is tried — a single provider outage never fails the whole lookup.
 */
export async function fetchFromEsplora<T>(
  path: string,
  httpClient: HttpClient,
  extract: (data: unknown, provider: EsploraProvider) => T | null,
  logContext: Record<string, unknown> = {},
): Promise<T | null> {
  const providers = getEsploraProviders();

  for (const provider of providers) {
    const url = `${provider.baseUrl}${path}`;
    try {
      const response = await httpClient.get(url);

      if (
        !response.ok || response.data === undefined || response.data === null
      ) {
        logger.warn(LOG_NS, {
          message: "esplora provider returned non-OK / empty, trying next",
          component: "esplora-fetch",
          provider: provider.name,
          path,
          status: response.status,
          ...logContext,
        });
        continue;
      }

      const value = extract(response.data, provider);
      if (value !== null && value !== undefined) {
        logger.info(LOG_NS, {
          message: "esplora request served by provider",
          component: "esplora-fetch",
          provider: provider.name,
          path,
          ...logContext,
        });
        return value;
      }

      // extract() rejected this provider's payload (e.g. malformed) — try next.
      logger.warn(LOG_NS, {
        message: "esplora provider payload not usable, trying next",
        component: "esplora-fetch",
        provider: provider.name,
        path,
        ...logContext,
      });
    } catch (error) {
      logger.warn(LOG_NS, {
        message: "esplora provider request threw, trying next",
        component: "esplora-fetch",
        provider: provider.name,
        path,
        error: error instanceof Error ? error.message : String(error),
        ...logContext,
      });
    }
  }

  logger.warn(LOG_NS, {
    message: "all esplora providers failed",
    component: "esplora-fetch",
    path,
    providers: providers.map((p) => p.name),
    ...logContext,
  });
  return null;
}
