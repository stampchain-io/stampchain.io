// TODO(@team): Move to /server

import { SATS_PER_KB_MULTIPLIER, XCP_V2_NODES } from "$constants";
import type { Fairminter } from "$lib/types/services.d.ts";
import { logger } from "$lib/utils/logger.ts";
import { formatSatoshisToBTC } from "$lib/utils/ui/formatting/formatUtils.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import { FetchHttpClient } from "$server/interfaces/httpClient.ts";
import type { DispenseEvent, Dispenser, DispenserFilter, XcpBalance } from "$types/services.d.ts";

// Create a shared httpClient instance
const httpClient = new FetchHttpClient(
  30000, // defaultTimeout - 30 seconds for XCP API calls
  2,     // defaultRetries
  1000   // defaultRetryDelay
);

// Re-export XCP nodes from $constants
export { XCP_V2_NODES as xcp_v2_nodes } from "$constants";


export interface XcpBalanceOptions {
  type?: 'all' | 'send' | 'dispenser' | 'issuance';  // Types of balances
  cursor?: string;      // Last index for cursor-based pagination
  limit?: number;       // Max results per request
  offset?: number;      // Skip count (overrides cursor)
  sort?: string;        // Sort order (overrides cursor)
  verbose?: boolean;    // Include additional info
  showUnconfirmed?: boolean;  // Include mempool results
}

export function normalizeFeeRate(params: {
  satsPerKB?: number;
  satsPerVB?: number;
}): {
  normalizedSatsPerVB: number;
  normalizedSatsPerKB: number;
} {
  let normalizedSatsPerVB: number;

  try {
    if (params.satsPerVB !== undefined) {
      normalizedSatsPerVB = params.satsPerVB;
    } else if (params.satsPerKB !== undefined) {
      // If satsPerKB/1000 < 1, assume it was intended as sats/vB
      normalizedSatsPerVB = params.satsPerKB < SATS_PER_KB_MULTIPLIER
        ? params.satsPerKB
        : params.satsPerKB / SATS_PER_KB_MULTIPLIER;
    } else {
      throw new Error("Either satsPerKB or satsPerVB must be provided");
    }

    // Allow any positive fee rate, including 0.1 sat/vB
    if (normalizedSatsPerVB <= 0) {
      throw new Error("Fee rate must be greater than 0");
    }

    return {
      normalizedSatsPerVB,
      normalizedSatsPerKB: normalizedSatsPerVB * SATS_PER_KB_MULTIPLIER
    };
  } catch (error) {
    throw error instanceof Error ? error.message : String(error);
  }
}

/**
 * Configuration for stale-if-error behavior
 * When XCP API fails, we can serve stale cached data for a longer period
 */
const STALE_IF_ERROR_TTL = 60 * 60; // 1 hour - serve stale data if all nodes fail

/**
 * In-memory stale cache for XCP API responses
 * This provides a fallback when Redis cache expires and API is unavailable
 */
const staleXcpCache = new Map<string, { data: any; timestamp: number; maxStaleAge: number }>();
const MAX_STALE_ENTRIES = 1000;

/**
 * Clean old entries from stale cache
 */
function cleanStaleCache(): void {
  const now = Date.now();
  for (const [key, entry] of staleXcpCache.entries()) {
    // Remove entries older than their max stale age
    if (now - entry.timestamp > entry.maxStaleAge * 1000) {
      staleXcpCache.delete(key);
    }
  }
  // If still over limit, remove oldest entries
  if (staleXcpCache.size > MAX_STALE_ENTRIES) {
    const entries = Array.from(staleXcpCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, staleXcpCache.size - MAX_STALE_ENTRIES);
    for (const [key] of toRemove) {
      staleXcpCache.delete(key);
    }
  }
}

/**
 * Store data in stale cache for fallback
 */
function setStaleCache<T>(key: string, data: T, maxStaleAge: number = STALE_IF_ERROR_TTL): void {
  cleanStaleCache();
  staleXcpCache.set(key, {
    data,
    timestamp: Date.now(),
    maxStaleAge,
  });
}

/**
 * Get stale data from cache if within max stale age
 */
function getStaleCache<T>(key: string): T | null {
  const entry = staleXcpCache.get(key);
  if (!entry) return null;

  const age = (Date.now() - entry.timestamp) / 1000;
  if (age > entry.maxStaleAge) {
    staleXcpCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export async function fetchXcpV2WithCache<T>(
  endpoint: string,
  queryParams: URLSearchParams,
  customCacheTimeout?: number,
): Promise<T> {
  const cacheKey = `api:v2:${endpoint}:${queryParams.toString()}`;
  const cacheTimeout = customCacheTimeout || 60 * 5; // 5 minutes default, in seconds

  await logger.info("api", {
    message: "Fetching XCP V2 with cache",
    endpoint,
    queryParams: queryParams.toString(),
    cacheKey,
    cacheTimeout
  });

  return await dbManager.handleCache(
    cacheKey,
    async () => {
      let errorMessage = null;
      let lastStatusCode: number | null = null;
      let isRateLimited = false;

      for (const node of XCP_V2_NODES) {
        const url = `${node.url}${endpoint}?${queryParams.toString()}`;
        await logger.debug("api", {
          message: "Attempting XCP node fetch",
          node: node.name,
          url,
          endpoint,
          queryParams: queryParams.toString()
        });

        try {
          const response = await httpClient.get(url);
          lastStatusCode = response.status;

          await logger.debug("api", {
            message: "XCP node response received",
            node: node.name,
            status: response.status,
            ok: response.ok,
            url
          });

          // Check for rate limiting
          if (response.status === 429) {
            isRateLimited = true;
            await logger.warn("api", {
              message: "XCP node rate limited (429)",
              node: node.name,
              url,
              retryAfter: response.headers?.["retry-after"],
            });
            errorMessage = "Rate limited (429)";
            continue; // Try the next node
          }

          if (!response.ok) {
            const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            await logger.error("api", {
              message: "XCP node error response",
              node: node.name,
              status: response.status,
              errorBody,
              url
            });
            errorMessage = errorBody
            continue; // Try the next node
          }

          const data = response.data;
          await logger.debug("api", {
            message: "XCP node successful response",
            node: node.name,
            url
          });

          // Store successful response in stale cache for fallback
          setStaleCache(cacheKey, data, STALE_IF_ERROR_TTL);

          return data;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);

          // Check if error message indicates rate limiting
          if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
            isRateLimited = true;
          }

          await logger.error("api", {
            message: "XCP node fetch error",
            node: node.name,
            error: errorMsg,
            url,
            stack: error instanceof Error ? error.stack : undefined
          });
          errorMessage = errorMsg;
          // Continue to the next node
        }
      }

      // All nodes failed - try to use stale cached data
      const staleData = getStaleCache<T>(cacheKey);
      if (staleData) {
        await logger.warn("api", {
          message: "All XCP nodes failed, using stale cached data",
          endpoint,
          queryParams: queryParams.toString(),
          error: errorMessage,
          isRateLimited,
        });
        return staleData;
      }

      // No stale data available, return minimal structure
      await logger.warn("api", {
        message: "All XCP nodes failed, no stale data available, returning minimal data structure",
        endpoint,
        queryParams: queryParams.toString(),
        error: errorMessage,
        isRateLimited,
        lastStatusCode,
      });

      return {
        result: [],
        next_cursor: null,
        result_count: 0,
        error: errorMessage,
        fromStaleCache: false,
      } as T;
    },
    cacheTimeout,
  );
}

export class CounterpartyDispenserService {

  static async getDispensersByCpid(
    cpid: string,
    page?: number,
    limit?: number,
    cacheTimeout?: number,
    filter: DispenserFilter = "all"
  ): Promise<{ dispensers: any[], total: number }> {
    const endpoint = `/assets/${cpid}/dispensers`;
    let allDispensers: any[] = [];
    let cursor: string | null = null;
    const apiLimit = 1000; // Use a larger batch size for API requests

    // Calculate how many items to skip based on page and limit
    const skipCount = (page && limit) ? (page - 1) * limit : 0;
    const effectiveLimit = limit || 50;

    await logger.debug("api", {
        message: "Fetching dispensers",
        cpid,
        page,
        limit: effectiveLimit,
        filter
    });

    do {
        const queryParams = new URLSearchParams({
            limit: apiLimit.toString(),
            status: filter
        });

        if (cursor) {
            queryParams.append("cursor", cursor);
        }

        try {
            const response = await fetchXcpV2WithCache<{
                result: any[];
                next_cursor: string | null;
                result_count: number;
            }>(endpoint, queryParams, cacheTimeout);

            if (!response || !Array.isArray(response.result)) {
                break;
            }

            const dispensers = response.result.map((dispenser: any) => ({
                tx_hash: dispenser.tx_hash,
                block_index: dispenser.block_index,
                source: dispenser.source,
                cpid: dispenser.asset,
                give_quantity: dispenser.give_quantity,
                give_remaining: dispenser.give_remaining,
                escrow_quantity: dispenser.escrow_quantity,
                satoshirate: dispenser.satoshirate,
                btcrate: Number(formatSatoshisToBTC(dispenser.satoshirate, { includeSymbol: false })),
                origin: dispenser.origin,
                confirmed: dispenser.confirmed,
                close_block_index: dispenser.close_block_index,
                status: dispenser.give_remaining > 0 ? "open" : "closed",
                asset_info: dispenser.asset_info,
                dispenser_info: dispenser.dispenser_info
            }));

            allDispensers = allDispensers.concat(dispensers);

            // Break if we have enough items for the requested page
            if (limit && allDispensers.length >= skipCount + limit) {
                break;
            }

            // Update cursor for next iteration
            cursor = response.next_cursor;

            // Break if no more results
            if (!cursor) {
                break;
            }

        } catch (error) {
            await logger.error("api", {
                message: "Error fetching dispensers",
                cpid,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            break;
        }
    } while (cursor);

    // Filter results if needed
    const filteredDispensers = filter === "all"
        ? allDispensers
        : allDispensers.filter(dispenser =>
            filter === "open"
                ? dispenser.give_remaining > 0
                : dispenser.give_remaining === 0
        );

    // Apply pagination to the final results
    const paginatedDispensers = limit
        ? filteredDispensers.slice(skipCount, skipCount + effectiveLimit)
        : filteredDispensers;

    await logger.debug("api", {
        message: "Dispensers fetched",
        cpid,
        totalCount: filteredDispensers.length,
        returnedCount: paginatedDispensers.length
    });

    return {
        dispensers: paginatedDispensers,
        total: filteredDispensers.length
    };
  }

  static async getDispensesByCpid(
    cpid: string,
    page: number = 1,
    limit: number = 50,
    cacheTimeout?: number
  ): Promise<{ dispenses: any[], total: number }> {
    const endpoint = `/assets/${cpid}/dispenses`;
    let allDispenses: any[] = [];
    let cursor: string | null = null;

    // Calculate how many items to skip based on page and limit
    const skipCount = (page - 1) * limit;
    let processedCount = 0;

    logger.debug("api", {
        message: `Fetching dispenses for CPID: ${cpid}, Page: ${page}, Limit: ${limit}`
    });

    while (true) {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        verbose: "true",
      });
      if (cursor) {
        queryParams.set("cursor", cursor);
      }

      try {
        const response = await fetchXcpV2WithCache<{
          result: any[];
          next_cursor: string | null;
          result_count: number;
        }>(
          endpoint,
          queryParams,
          cacheTimeout
        );

        if (!response || !Array.isArray(response.result)) {
          console.log(`No more results for CPID: ${cpid}`);
          break;
        }

        const dispenses = response.result.map((dispense: any) => ({
          tx_hash: dispense.tx_hash,
          block_index: dispense.block_index,
          block_time: dispense.block_time ? dispense.block_time * 1000 : null, // Convert to milliseconds
          cpid: cpid,
          source: dispense.source,
          destination: dispense.destination,
          dispenser_tx_hash: dispense.dispenser_tx_hash,
          dispense_quantity: dispense.dispense_quantity,
          confirmed: dispense.confirmed,
          btc_amount: dispense.btc_amount_normalized,
          close_block_index: dispense.dispenser?.close_block_index ?? null,
          dispenser_details: dispense.dispenser || null,
        }));

        allDispenses = allDispenses.concat(dispenses);
        processedCount += dispenses?.length ?? 0;

        // If we have enough items for the requested page, break
        if (allDispenses.length >= skipCount + limit) {
          break;
        }

        // Break if no next cursor or if it's the same as current
        if (!response.next_cursor || response.next_cursor === cursor) {
          break;
        }
        cursor = response.next_cursor;
      } catch (error) {
        console.error(
          `Error fetching dispenses for cpid ${cpid}:`,
          error instanceof Error ? error.message : String(error),
        );
        break;
      }
    }

    // Apply pagination to the collected results
    const paginatedDispenses = allDispenses.slice(skipCount, skipCount + limit);
    const total = allDispenses.length;

    console.log(
      `Fetched dispenses for CPID: ${cpid}, Count: ${total}`,
    );

    return {
      dispenses: paginatedDispenses,
      total
    };
  }
}

// Update only the ComposeAttachOptions interface
export interface ComposeAttachOptions {
  // Fee parameters
  fee_per_kb?: number;  // Optional - can be provided by caller or handled by API

  // Optional parameters
  destination_vout?: number;
  inputs_set?: string;  // txid:vout format for specifying UTXO
  encoding?: string;    // default: 'auto'
  regular_dust_size?: number;    // default: 546
  multisig_dust_size?: number;   // default: 1000
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean;  // default: false
  exact_fee?: number;
  fee_provided?: number;         // default: 0
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean;  // default: false
  p2sh_pretx_txid?: string;
  segwit?: boolean;             // default: false
  confirmation_target?: number;  // default: 3
  exclude_utxos?: string;
  return_psbt?: boolean;        // default: false (API v2 only)
  return_only_data?: boolean;   // default: false (API v2 only)
  extended_tx_info?: boolean;   // default: false (API v1 only)
  old_style_api?: boolean;      // default: false (API v1 only)
  use_utxos_with_balances?: boolean;    // default: false
  exclude_utxos_with_balances?: boolean; // default: false
  validate?: boolean;           // default: true
  verbose?: boolean;            // default: false
  show_unconfirmed?: boolean;   // default: false
}

// Also add ComposeDetachOptions since it's used in stampdetach.ts
export interface ComposeDetachOptions {
  // Fee parameters
  fee_per_kb?: number;

  // Optional parameters
  destination?: string;
  encoding?: string;
  regular_dust_size?: number;
  multisig_dust_size?: number;
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean;
  exact_fee?: number;
  fee_provided?: number;
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean;
  p2sh_pretx_txid?: string;
  segwit?: boolean;
  confirmation_target?: number;
  exclude_utxos?: string;
  inputs_set?: string;
  return_psbt?: boolean;
  return_only_data?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  use_utxos_with_balances?: boolean;
  exclude_utxos_with_balances?: boolean;
  validate?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
}

export interface IssuanceOptions {
  divisible?: boolean;
  source?: string;
  allow_unconfirmed_inputs?: boolean;
  fee_per_kb?: number;
  fee?: number;
  encoding?: string;
  pubkeys?: string;
  return_psbt?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
  lock?: boolean;
  description?: string;
}

export class CounterpartyApiManager {
  private static fetchXcpV2WithCache = fetchXcpV2WithCache;

  static async getXcpAsset(cpid: string): Promise<any> {
    const endpoint = `/assets/${cpid}`;
    const queryParams = new URLSearchParams();

    console.log(`Fetching XCP asset for CPID: ${cpid}`);

    try {
      const response = await this.fetchXcpV2WithCache<any>(
        endpoint,
        queryParams,
      );

      if (!response || typeof response !== "object") {
        throw new Error(`Invalid response for asset ${cpid}`);
      }

      console.log(
        `Fetched XCP asset for CPID: ${cpid}, Response: ${
          JSON.stringify(response)
        }`,
      );

      return response;
    } catch (error) {
      console.error(`Error fetching asset info for cpid ${cpid}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }



  static async getAllXcpHoldersByCpid(
    cpid: string,
    page: number = 1,
    limit: number = 50,
    cacheTimeout?: number
  ): Promise<{ holders: import("$lib/types/wallet.d.ts").HolderRow[], total: number }> {
    const endpoint = `/assets/${cpid}/balances`;
    let cursor: string | null = null;
    const apiLimit = 1000;  // FIXME: need to handle this more gracefully getAllXcpBalancesByAddress is a better example for fetching all

    // Use a Map to aggregate quantities by address
    const holderMap = new Map<string, number>();

    // Calculate how many items to skip based on page and limit
    const skipCount = (page - 1) * limit;
    let processedCount = 0;

    logger.info("api", {
        message: `Fetching ALL XCP holders for CPID: ${cpid} up to api limit: ${apiLimit}`
    });

    while (true) {
      const queryParams = new URLSearchParams({
        limit: apiLimit.toString(),
      });
      if (cursor) {
        queryParams.set("cursor", cursor);
      }

      try {
        const response = await fetchXcpV2WithCache<{
          result: any[];
          next_cursor: string | null;
          result_count: number;
        }>(
          endpoint,
          queryParams,
          cacheTimeout
        );

        if (!response || !Array.isArray(response.result)) {
          break;
        }

        // Process each holder and aggregate quantities
        response.result
          .filter((holder: any) => holder.quantity > 0)
          .forEach((holder: any) => {
            // Use utxo_address if address is null, otherwise use address
            const effectiveAddress = holder.address || holder.utxo_address;

            if (effectiveAddress) {
              // Add to existing quantity or create new entry
              const currentQuantity = holderMap.get(effectiveAddress) || 0;
              holderMap.set(effectiveAddress, currentQuantity + holder.quantity);
            }
          });

        processedCount += response.result.length;

        // Break if no next cursor or if it's the same as current
        if (!response.next_cursor || response.next_cursor === cursor) {
          break;
        }
        cursor = response.next_cursor;
      } catch (error) {
        console.error(`Error fetching holders for cpid ${cpid}:`, error instanceof Error ? error.message : String(error));
        break;
      }
    }

    // Convert map to array and sort by quantity (descending)
    const allHolders = Array.from(holderMap.entries())
      .map(([address, quantity]) => ({
        address,
        quantity,
        divisible: false // Default to false as we don't have this info from the API
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Apply pagination to the collected results
    const paginatedHolders = allHolders.slice(skipCount, skipCount + limit);
    const total = allHolders.length;

    return {
      holders: paginatedHolders,
      total
    };
  }


  static async getXcpBalancesByAddress(
    address: string,
    cpid?: string,
    utxoOnly: boolean = false,
    options: XcpBalanceOptions = {}
  ): Promise<{ balances: XcpBalance[]; total: number; next_cursor?: string }> {
    const baseEndpoint = `/addresses/${address}/balances`;
    const endpoint = cpid ? `${baseEndpoint}/${cpid}` : baseEndpoint;

    const defaultParams = new URLSearchParams();
    defaultParams.append("type", options.type || "all");
    defaultParams.append("limit", (options.limit || 50).toString());

    // Handle pagination options
    if (options.cursor) {
        defaultParams.append("cursor", options.cursor);
    }
    if (options.verbose) {
        defaultParams.append("verbose", "true");
    }

    await logger.debug("api", {
        message: "[CounterpartyApiManager] Fetching balances",
        endpoint,
        params: Object.fromEntries(defaultParams),
        address
    });

    try {
        const response = await fetchXcpV2WithCache<any>(endpoint, defaultParams);

        if (!response || !response.result) {
            await logger.warn("api", {
                message: "Unexpected response structure",
                address,
                response
            });
            return { balances: [], total: 0 };
        }

        // Handle the response based on whether it's a single balance or multiple balances
        let balances: XcpBalance[] = [];
        let total = 0;

        if (Array.isArray(response.result)) {
            const balanceMap = new Map<string, XcpBalance>();

            response.result
                .filter((balance: any) => balance.quantity > 0)
                .forEach((balance: any,index:number) => {
                    const effectiveAddress = balance.address || balance.utxo_address;

                    if (effectiveAddress) {
                        const key = `${effectiveAddress}-${balance.asset}-${index}`;
                        const existing = balanceMap.get(key);

                        if (existing) {
                            existing.quantity += balance.quantity;
                        } else {
                            balanceMap.set(key, {
                                address: effectiveAddress,
                                cpid: balance.asset,
                                quantity: balance.quantity,
                                utxo: balance.utxo || "",
                                utxo_address: balance.utxo_address || "",
                                divisible: balance.divisible || false,
                                assetName: balance.asset,
                                balance: balance.quantity,
                            });
                        }
                    }
                });

            balances = Array.from(balanceMap.values());
            total = balances.length;
        } else if (response.result.quantity > 0) {
            // Single balance response
            balances = [{
                address: response.result.address || response.result.utxo_address,
                cpid: response.result.asset,
                quantity: response.result.quantity,
                utxo: response.result.utxo || "",
                utxo_address: response.result.utxo_address || "",
                assetName: response.result.asset,
                balance: response.result.quantity,
                divisible: response.result.divisible || false,
            }];
            total = 1;
        }

        // Apply UTXO-only filter if requested
        if (utxoOnly) {
            balances = balances.filter(balance => balance.utxo !== "");
        }

        await logger.debug("api", {
            message: "[CounterpartyApiManager] Balances fetched",
            balancesCount: balances.length,
            total,
            nextCursor: response.next_cursor,
            address
        });

        return {
            balances,
            total: response.total || total, // Use response.total if available
            next_cursor: response.next_cursor
        };
    } catch (error) {
        await logger.error("api", {
            message: "Error fetching balances",
            error: error instanceof Error ? error.message : String(error),
            address,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
  }

  static async getAllXcpBalancesByAddress(
    address: string,
    utxoOnly: boolean = false
  ): Promise<{ balances: XcpBalance[]; total: number }> {
    try {
      const MAX_RETRIES = 3;
      const attempt = 0;

      while (attempt < MAX_RETRIES) {
        await logger.info("api", {
          message: "[CounterpartyApiManager] Starting balance fetch attempt",
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          address,
          utxoOnly
        });

        // Initialize collection for all balances
        let allBalances: XcpBalance[] = [];
        let cursor: string | null = null;
        let expectedTotal: number | null = null;

        do {
          // Prepare options for each request
          const options: XcpBalanceOptions = {
            type: "all",
            limit: 500,
            verbose: true
          };

          if (cursor) {
            options.cursor = cursor;
          }

          const result = await this.getXcpBalancesByAddress(
            address,
            undefined,
            utxoOnly,
            options
          );

          // Set expected total from first response's aggregated count
          if (expectedTotal === null) {
            expectedTotal = result.total;
          }

          // Add new balances to collection
          if (result.balances?.length) {
            allBalances = [...allBalances, ...result.balances];
          }

          await logger.debug("api", {
            message: "[CounterpartyApiManager] Pagination progress",
            currentCount: allBalances.length,
            expectedTotal,
            cursor,
            nextCursor: result.next_cursor,
            address
          });

          cursor = result.next_cursor || null;

          // Break if we have all expected results or more
          // Note: We might get more than expected due to new transactions
          if (allBalances.length >= expectedTotal) {
            break;
          }

          if (!cursor) {
            break;
          }

        } while (cursor);

        // Simplified success check - if we have balances, consider it successful
        if (allBalances.length === 0) {
          return { balances: [], total: 0 };
        } else {
          await logger.info("api", {
            message: "[CounterpartyApiManager] Successfully fetched balances",
            finalCount: allBalances.length,
            expectedTotal,
            address
          });
          // Use actual aggregated count for total
          return { balances: allBalances, total: allBalances.length };
        }
      }

      throw new Error(`Failed to fetch complete balance set after ${MAX_RETRIES} attempts`);
    } catch (error) {
      console.error(`Error fetching all balances for address ${address}:`, error);
      throw error;
    }
  }

  static async getXcpSendsByCPID(
    cpid: string,
    page: number = 1,
    limit: number = 50,
    cacheTimeout?: number
  ): Promise<{ sends: import("$lib/types/transaction.d.ts").SendRow[], total: number }> {
    const endpoint = `/assets/${cpid}/sends`;
    let allSends: import("$lib/types/transaction.d.ts").SendRow[] = [];
    let cursor: string | null = null;
    const apiLimit = 1000;

    // Calculate how many items to skip based on page and limit
    const skipCount = (page - 1) * limit;
    let processedCount = 0;

    console.log(`Fetching XCP sends for CPID: ${cpid}, Page: ${page}, Limit: ${limit}`);

    while (true) {
      const queryParams = new URLSearchParams({
        limit: apiLimit.toString(),
        verbose: "true",
      });
      if (cursor) {
        queryParams.set("cursor", cursor);
      }

      try {
        const response = await fetchXcpV2WithCache<{
          result: any[];
          next_cursor: string | null;
          result_count: number;
        }>(
          endpoint,
          queryParams,
          cacheTimeout
        );

        if (!response || !Array.isArray(response.result)) {
          console.log(`No more results for CPID: ${cpid}`);
          break;
        }

        // Map the sends with block_time from the API response
        const sends = response.result.map((send: any) => {
          return {
            tx_hash: send.tx_hash,
            block_index: send.block_index,
            block_time: send.block_time ? new Date(send.block_time * 1000) : new Date(), // Convert timestamp to Date
            source: send.source,
            destination: send.destination,
            quantity: send.quantity,
            asset: cpid,
            status: send.status,
            cpid: cpid, // Add cpid field
            tick: null, // Add optional tick field
            memo: send.memo, // Add optional memo field from API
            satoshirate: null, // Add optional satoshirate field
          };
        });

        allSends = allSends.concat(sends);
        processedCount += sends?.length ?? 0;

        // If we have enough items for the requested page, break
        if (allSends.length >= skipCount + limit) {
          break;
        }

        // Break if no next cursor or if it's the same as current
        if (!response.next_cursor || response.next_cursor === cursor) {
          break;
        }
        cursor = response.next_cursor;
      } catch (error) {
        console.error(`Error fetching sends for cpid ${cpid}:`, error instanceof Error ? error.message : String(error));
        break;
      }
    }

    // Apply pagination to the collected results
    const paginatedSends = allSends.slice(skipCount, skipCount + limit);
    const total = allSends.length;

    console.log(
      `Fetched XCP sends for CPID: ${cpid}, Count: ${total}`,
    );

    return {
      sends: paginatedSends,
      total
    };
  }

  private static getDispenseEvents(
    cursor: string | null = null,
    limit: number = 10000,
  ): Promise<{
    result: DispenseEvent[];
    next_cursor: string | null;
    result_count: number;
  }> {
    const endpoint = "/events/DISPENSE";
    const queryParams = new URLSearchParams();
    if (cursor) {
      queryParams.append("cursor", cursor);
    }
    queryParams.append("limit", limit.toString());

    return this.fetchXcpV2WithCache<{
      result: DispenseEvent[];
      next_cursor: string | null;
      result_count: number;
    }>(endpoint, queryParams);
  }

  static async fetchDispenseEvents(
    limit: number | "all" = "all",
  ): Promise<DispenseEvent[]> {
    let cursor: string | null = null;
    const batchSize = 1000;
    let allEvents: DispenseEvent[] = [];

    do {
      const response = await this.getDispenseEvents(cursor, batchSize);

      if (
        !response || typeof response !== "object" ||
        !Array.isArray(response.result)
      ) {
        throw new Error("Unexpected response structure from getDispenseEvents");
      }

      const validEvents = response.result.filter(
        (event): event is DispenseEvent => {
          const isValid = (
            typeof event === "object" &&
            event !== null &&
            typeof event.event_index === "number" &&
            event.event === "DISPENSE" &&
            typeof event.params === "object" &&
            event.params !== null &&
            typeof event.params.asset === "string" &&
            typeof event.params.block_index === "number" &&
            typeof event.params.btc_amount === "number" &&
            typeof event.params.destination === "string" &&
            typeof event.params.dispense_index === "number" &&
            typeof event.params.dispense_quantity === "number" &&
            typeof event.params.dispenser_tx_hash === "string" &&
            typeof event.params.source === "string" &&
            typeof event.params.tx_hash === "string" &&
            typeof event.params.tx_index === "number" &&
            typeof event.tx_hash === "string" &&
            typeof event.block_index === "number"
          );

          if (isValid) {
            // Convert btc_amount to BTC if it's in satoshis
            event.params.btc_amount = Number(formatSatoshisToBTC(event.params.btc_amount, {
              includeSymbol: false,
              stripZeros: false
            }));
          }

          return isValid;
        }
      );

      allEvents = allEvents.concat(validEvents);
      cursor = response.next_cursor;

      // If we've reached the desired limit, break the loop
      if (limit !== "all" && allEvents.length >= limit) {
        allEvents = allEvents.slice(0, limit);
        break;
      }
    } while (cursor);

    return allEvents;
  }

  static async getXcpAssetsByCpids(cpids: string[]): Promise<any[]> {
    console.log(`Fetching XCP assets for CPIDs: ${cpids.join(", ")}`);

    const assetPromises = cpids.map((cpid) => this.getXcpAsset(cpid));
    const assets = await Promise.all(assetPromises);

    console.log(`Fetched ${assets.length} XCP assets`);

    return assets.filter((asset) => asset !== null).map((asset) =>
      asset.result
    );
  }

  static async createDispense(
    address: string,
    dispenser: string,
    quantity: number,
    options: { // Options received from the route
      encoding?: string;
      fee_per_kb?: number; // Deprecated, but route might still normalize from it
      sat_per_vbyte?: number; // Preferred fee rate
      multisig_dust_size?: number;
      pubkeys?: string;
      allow_unconfirmed_inputs?: boolean;
      exact_fee?: number;
      fee_provided?: number;
      unspent_tx_hash?: string;
      dust_return_pubkey?: string;
      disable_utxo_locks?: boolean;
      p2sh_pretx_txid?: string;
      segwit?: boolean;
      confirmation_target?: number;
      exclude_utxos?: string;
      inputs_set?: string;
      return_psbt?: boolean;
      return_only_data?: boolean;
      extended_tx_info?: boolean;
      old_style_api?: boolean;
      verbose?: boolean;
      show_unconfirmed?: boolean;
    } = {},
  ): Promise<any> {
    const endpoint = `/addresses/${address}/compose/dispense`;
    const queryParams = new URLSearchParams();

    queryParams.append("dispenser", dispenser);
    queryParams.append("quantity", quantity.toString());

    // Handle options carefully to avoid deprecated fields and prioritize correct ones
    const finalApiOptions: Record<string, string | number | boolean> = {};

    // Prioritize sat_per_vbyte for fees
    if (options.sat_per_vbyte !== undefined) {
      finalApiOptions.sat_per_vbyte = options.sat_per_vbyte;
    } else if (options.fee_per_kb !== undefined) {
      // If only fee_per_kb is provided by caller, still send it for now if CP API handles fallback,
      // but ideally caller (route) should have normalized to sat_per_vbyte.
      // Or, convert it here: finalApiOptions.sat_per_vbyte = options.fee_per_kb / 1000; (approx)
      // For now, let route handle normalization to sat_per_vbyte for options.sat_per_vbyte
      // This CounterpartyApiManager method will just pass what it's given, preferring sat_per_vbyte.
      // If route sends options.fee_per_kb, it will be iterated below unless we exclude.
      // Let's ensure we only send one fee type.
      if (options.fee_per_kb !== undefined && options.sat_per_vbyte === undefined) {
         finalApiOptions.fee_per_kb = options.fee_per_kb; // Send deprecated if new one not present
      }
    }

    // Copy other relevant options, EXCLUDING deprecated ones explicitly
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        if (key === 'regular_dust_size') continue; // Skip deprecated
        if (key === 'fee_per_kb' && options.sat_per_vbyte !== undefined) continue; // Skip if sat_per_vbyte is used

        // If key is already set (like sat_per_vbyte from fee_per_kb), don't override from generic options spread
        if (!(key in finalApiOptions)) {
            finalApiOptions[key] = value.toString();
        }
      }
    }

    // Ensure return_psbt is explicitly set based on what the route wants (which is now false)
    if (options.return_psbt !== undefined) {
        finalApiOptions.return_psbt = options.return_psbt;
    } else {
        finalApiOptions.return_psbt = false; // Default if not specified by caller
    }

    // Append final processed options to queryParams
    for (const [key, value] of Object.entries(finalApiOptions)) {
        queryParams.append(key, String(value));
    }

    let lastError: string | null = null;

    for (const node of XCP_V2_NODES) {
      const url = `${node.url}${endpoint}?${queryParams.toString()}`;

      try {
        const response = await httpClient.get(url);

        if (!response.ok) {
          const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          console.error(`Error response body from ${node.name}: ${errorBody}`);
          try {
            const errorJson = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (errorJson.error) {
              lastError = errorJson.error;
            }
          } catch (_e) {
            lastError = errorBody;
          }
          continue; // Try the next node
        }

        const data = response.data;
        // DETAILED LOGGING OF THE RAW RESPONSE FROM COUNTERPARTY
        console.log(`[CounterpartyApiManager.createDispense] RAW RESPONSE from ${node.name} for dispense:`);
        console.log(JSON.stringify(data, null, 2));
        // END DETAILED LOGGING

        return data;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    // Throw the last error message instead of generic message
    throw new Error(lastError || "All nodes failed to compose dispense transaction.");
  }

  static async createSend(
    address: string,
    destination: string,
    asset: string,
    quantity: number,
    options: {
      memo?: string;
      memo_is_hex?: boolean;
      use_enhanced_send?: boolean;
      encoding?: string;
      fee_per_kb?: number;
      regular_dust_size?: number;
      multisig_dust_size?: number;
      pubkeys?: string;
      allow_unconfirmed_inputs?: boolean;
      exact_fee?: number;
      fee_provided?: number;
      unspent_tx_hash?: string;
      dust_return_pubkey?: string;
      disable_utxo_locks?: boolean;
      p2sh_pretx_txid?: string;
      segwit?: boolean;
      confirmation_target?: number;
      exclude_utxos?: string;
      inputs_set?: string;
      return_psbt?: boolean;
      return_only_data?: boolean;
      extended_tx_info?: boolean;
      old_style_api?: boolean;
      use_utxos_with_balances?: boolean;
      exclude_utxos_with_balances?: boolean;
      validate?: boolean;
      verbose?: boolean;
      show_unconfirmed?: boolean;
    } = {},
  ): Promise<any> {
    const endpoint = `/addresses/${address}/compose/send`;
    const queryParams = new URLSearchParams();

    queryParams.append("destination", destination);
    queryParams.append("asset", asset);
    queryParams.append("quantity", quantity.toString());

    // Set default dust size if not provided
    if (!options.regular_dust_size) {
      queryParams.append("regular_dust_size", "546"); // Bitcoin's standard dust limit
    }

    // Append optional parameters if provided
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    }

    let lastError: string | null = null;

    for (const node of XCP_V2_NODES) {
      const url = `${node.url}${endpoint}?${queryParams.toString()}`;
      console.log(`Attempting to fetch from URL: ${url}`);

      try {
        const response = await httpClient.get(url);
        console.log(`Response status from ${node.name}: ${response.status}`);

        if (!response.ok) {
          const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          console.error(`Error response body from ${node.name}: ${errorBody}`);
          try {
            const errorJson = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (errorJson.error) {
              lastError = errorJson.error;
            }
          } catch (_e) {
            lastError = errorBody;
          }
          continue; // Try the next node
        }

        const data = response.data;
        console.log(`Successful response from ${node.name}`);
        return data;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    // Throw the last error message instead of generic message
    throw new Error(lastError || "All nodes failed to compose dispense transaction.");
  }

  static async composeAttach(
    address: string,
    asset: string,
    quantity: number,
    options: ComposeAttachOptions = {}
  ): Promise<any> {
    const endpoint = `/addresses/${address}/compose/attach`;
    const queryParams = new URLSearchParams();

    queryParams.append("asset", asset);
    queryParams.append("quantity", quantity.toString());

    // Default verbose to true if not specified, useful for getting rawtx details
    if (options.verbose === undefined) {
      queryParams.append("verbose", "true");
    }

    // Default return_psbt to false if not specified by the caller for this new flow
    // If the caller wants a PSBT directly from CP, they can set options.return_psbt = true
    if (options.return_psbt === undefined) {
        queryParams.append("return_psbt", "false");
    } else {
        queryParams.append("return_psbt", options.return_psbt.toString());
    }

    // Handle fee_per_kb: XCP API for compose operations often requires fee_per_kb.
    // The route handler will later calculate the final fee with user's preferred satsPerVB.
    // For this call, if options.fee_per_kb is provided, use it. Otherwise, a default might be needed
    // or the CP API might error. For now, assume if not provided, CP uses a default or handles it.
    if (options.fee_per_kb) {
      queryParams.append("fee_per_kb", Math.floor(options.fee_per_kb).toString());
    }
    // Do not add default fee_per_kb here, let the caller (route) decide if a nominal one is needed for CP.

    // Handle segwit addresses implicitly if address starts with bc1 (already in current code, keep)
    if (address.startsWith("bc1") && options.segwit === undefined) {
      // queryParams.append("segwit", "true"); // This might be handled by CP based on address
    }

    // Append all other provided options to query parameters
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        // Avoid re-appending already handled options or ensure they are consistent
        if (key === 'asset' || key === 'quantity') continue;
        if (queryParams.has(key)) continue; // If already set by defaults/specific logic above
        queryParams.append(key, String(value));
      }
    }

    // Remove potentially problematic defaults that might have been in ComposeAttachOptions if not intended for this call
    // if (!options.multisig_dust_size) queryParams.delete("multisig_dust_size"); // Example: if you don't want default

    await logger.debug("api", {
        message: "[CounterpartyApiManager.composeAttach] Calling Counterparty API",
        endpoint,
        queryParams: queryParams.toString()
    });

    // fetchXcpV2WithCache handles node iteration and error logging
    const response = await this.fetchXcpV2WithCache<any>(endpoint, queryParams);

    if (response.error || !response.result) {
        await logger.error("api", {
            message: "[CounterpartyApiManager.composeAttach] Error from Counterparty API",
            error: response.error,
            result: response.result
        });
        throw new Error(response.error?.message || response.error?.description || response.error || "Failed to compose attach transaction with XCP.");
    }

    // The response.result could contain .psbt, .rawtransaction, or other fields.
    // The caller (route handler) will be responsible for checking for .rawtransaction.
    await logger.debug("api", {
        message: "[CounterpartyApiManager.composeAttach] Response from Counterparty API",
        result: response.result // Log the whole result for inspection
    });
    return response.result; // Return the entire result object
  }

  static async composeDetach(
    utxo: string,
    destination: string,
    options: ComposeDetachOptions = {},
  ): Promise<any> {
    const endpoint = `/utxos/${utxo}/compose/detach`;
    const queryParams = new URLSearchParams();

    // Required parameters
    if (destination) {
      queryParams.append("destination", destination);
    }

    // Default values
    queryParams.append("return_psbt", "false");
    queryParams.append("verbose", "true");

    // The API expects sat/kB
    if (options.fee_per_kb) {
      console.log(`Setting fee rate to ${options.fee_per_kb} sat/kB`);
      queryParams.append(
        "fee_per_kb",
        Math.floor(options.fee_per_kb).toString(),
      );
    }

    // Append all provided options to query parameters, except fee_per_kb which we handled above
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null && key !== 'fee_per_kb') {
        queryParams.append(key, value.toString());
      }
    }

    let lastError: string | null = null;

    for (const node of XCP_V2_NODES) {
      const url = `${node.url}${endpoint}?${queryParams.toString()}`;
      console.log(`Attempting to fetch from URL: ${url}`);

      try {
        const response = await httpClient.get(url);
        console.log(`Response status from ${node.name}: ${response.status}`);

        if (!response.ok) {
          const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          console.error(`Error response body from ${node.name}: ${errorBody}`);
          try {
            const errorJson = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (errorJson.error) {
              lastError = errorJson.error;
            }
          } catch (_e) {
            lastError = errorBody;
          }
          continue;
        }

        const data = response.data;
        console.log(`Successful response from ${node.name}`);
        return data;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    throw new Error(lastError || "All nodes failed to compose detach transaction.");
  }

  static async composeDispenser(
    address: string,
    asset: string,
    give_quantity: number,
    escrow_quantity: number,
    mainchainrate: number,
    status: number,
    options: {
      open_address?: string;
      oracle_address?: string;
      encoding?: string;
      fee_per_kb?: number;
      regular_dust_size?: number;
      multisig_dust_size?: number;
      pubkeys?: string;
      allow_unconfirmed_inputs?: boolean;
      exact_fee?: number;
      fee_provided?: number;
      unspent_tx_hash?: string;
      dust_return_pubkey?: string;
      disable_utxo_locks?: boolean;
      p2sh_pretx_txid?: string;
      segwit?: boolean;
      confirmation_target?: number;
      exclude_utxos?: string;
      inputs_set?: string;
      return_psbt?: boolean;
      return_only_data?: boolean;
      extended_tx_info?: boolean;
      old_style_api?: boolean;
      verbose?: boolean;
      show_unconfirmed?: boolean;
    } = {},
  ): Promise<any> {
    const endpoint = `/addresses/${address}/compose/dispenser`;
    const queryParams = new URLSearchParams();

    queryParams.append("asset", asset);
    queryParams.append("give_quantity", give_quantity.toString());
    queryParams.append("escrow_quantity", escrow_quantity.toString());
    queryParams.append("mainchainrate", mainchainrate.toString());
    queryParams.append("status", status.toString());

    if (options.open_address) {
      queryParams.append("open_address", options.open_address);
    }
    if (options.oracle_address) {
      queryParams.append("oracle_address", options.oracle_address);
    }

    // Append other optional parameters if provided
    for (const [key, value] of Object.entries(options)) {
      if (
        value !== undefined &&
        value !== null &&
        key !== "open_address" &&
        key !== "oracle_address"
      ) {
        queryParams.append(key, value.toString());
      }
    }

    for (const node of XCP_V2_NODES) {
      const url = `${node.url}${endpoint}?${queryParams.toString()}`;
      console.log(`Attempting to fetch from URL: ${url}`);

      try {
        const response = await httpClient.get(url);
        console.log(`Response status from ${node.name}: ${response.status}`);

        if (!response.ok) {
          const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          console.error(`Error response body from ${node.name}: ${errorBody}`);
          continue; // Try the next node
        }

        const data = response.data;
        console.log(`Successful response from ${node.name}`);
        return data;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        // Continue to the next node
      }
    }

    throw new Error("All nodes failed to compose dispenser transaction.");
  }

  static async composeFairmint(
    address: string,
    asset: string,
    quantity: number,
    options: {
      encoding?: string;
      fee_per_kb?: number;
      regular_dust_size?: number;
      multisig_dust_size?: number;
      pubkeys?: string;
      // Default allow_unconfirmed_inputs to true
      allow_unconfirmed_inputs?: boolean;
      exact_fee?: number;
      fee_provided?: number;
      unspent_tx_hash?: string;
      dust_return_pubkey?: string;
      disable_utxo_locks?: boolean;
      p2sh_pretx_txid?: string;
      segwit?: boolean;
      confirmation_target?: number;
      exclude_utxos?: string;
      inputs_set?: string;
      return_psbt?: boolean;
      return_only_data?: boolean;
      extended_tx_info?: boolean;
      old_style_api?: boolean;
      verbose?: boolean;
      show_unconfirmed?: boolean;
    } = {},
  ): Promise<any> {
    const endpoint = `/addresses/${address}/compose/fairmint`;
    const queryParams = new URLSearchParams();

    queryParams.append("asset", asset);
    queryParams.append("quantity", quantity.toString());

    // Set default options
    options.allow_unconfirmed_inputs = options.allow_unconfirmed_inputs ?? true;
    options.return_psbt = options.return_psbt ?? false;

    // Append optional parameters
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    }

    for (const node of XCP_V2_NODES) {
      const url = `${node.url}${endpoint}?${queryParams.toString()}`;
      console.log(`Attempting to fetch from URL: ${url}`);

      try {
        const response = await httpClient.get(url);
        console.log(`Response status from ${node.name}: ${response.status}`);

        if (!response.ok) {
          const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          console.error(`Error response body from ${node.name}: ${errorBody}`);
          continue; // Try the next node
        }

        const data = response.data;
        console.log(`Successful response from ${node.name}`, data);
        return data;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        // Continue to the next node
      }
    }

    throw new Error("All nodes failed to compose fairmint transaction.");
  }

  static async composeBroadcast(
    address: string,
    text: string,
    value: number = -1,
    fee_per_kb: number = 10000,
    timestamp: number = Math.floor(Date.now() / 1000)
  ): Promise<string> {
    const endpoint = `/addresses/${address}/compose/broadcast`;
    const body = {
      text,
      value,
      timestamp,
      fee_per_kb,
      allow_unconfirmed_inputs: true
    };

    let lastError: string | null = null;
    let isRateLimited = false;

    // We can't use fetchXcpV2WithCache because this is a POST request
    for (const node of XCP_V2_NODES) {
      if (node.name === "mock") continue; // Skip mock node for real composes
      const url = `${node.url}${endpoint}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (response.status === 429) {
          isRateLimited = true;
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          lastError = data.error?.message || data.error || `HTTP error ${response.status}`;
          continue;
        }

        if (data.result && data.result.rawtransaction) {
          return data.result.rawtransaction;
        } else {
          lastError = "Invalid response from Counterparty API";
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    if (isRateLimited) {
      throw new Error("All Counterparty nodes are currently rate limited.");
    }

    throw new Error(lastError || "All nodes failed to compose broadcast transaction.");
  }

  static async getFairminters(): Promise<Fairminter[]> {
    const endpoint = "/fairminters";
    let allFairminters: Fairminter[] = [];
    let cursor: string | null = null;
    const limit = 1000;

    while (true) {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (cursor) {
        queryParams.set("cursor", cursor);
      }

      try {
        const response = await this.fetchXcpV2WithCache<any>(
          endpoint,
          queryParams,
        );

        if (!response || !Array.isArray(response.result)) {
          console.log("No more results for fairminters");
          break;
        }

        const fairminters = response.result.map((entry: any) => ({
          tx_hash: entry.tx_hash,
          tx_index: entry.tx_index,
          block_index: entry.block_index,
          source: entry.source,
          asset: entry.asset,
          asset_parent: entry.asset_parent,
          asset_longname: entry.asset_longname,
          description: entry.description,
          price: entry.price,
          quantity_by_price: entry.quantity_by_price,
          hard_cap: entry.hard_cap,
          burn_payment: entry.burn_payment,
          max_mint_per_tx: entry.max_mint_per_tx,
          premint_quantity: entry.premint_quantity,
          start_block: entry.start_block,
          end_block: entry.end_block,
          minted_asset_commission_int: entry.minted_asset_commission_int,
          soft_cap: entry.soft_cap,
          soft_cap_deadline_block: entry.soft_cap_deadline_block,
          lock_description: entry.lock_description,
          lock_quantity: entry.lock_quantity,
          divisible: entry.divisible,
          pre_minted: entry.pre_minted,
          status: entry.status,
          paid_quantity: entry.paid_quantity,
          confirmed: entry.confirmed,
        }));

        allFairminters = allFairminters.concat(fairminters);

        // Break if no next cursor or if it's the same as current
        if (!response.next_cursor || response.next_cursor === cursor) {
          console.log("No more pages for fairminters");
          break;
        }
        cursor = response.next_cursor;
      } catch (error) {
        console.error("Error fetching fairminters:", error);
        break;
      }
    }

    console.log(`Fetched fairminters, Count: ${allFairminters.length}`);

    return allFairminters;
  }

  static async createIssuance(
    address: string,
    asset: string,
    quantity: number,
    options: IssuanceOptions = {}
  ): Promise<any> {
    // Validate address (sourceWallet in original)
    if (typeof address !== "string") {
      throw new Error("Invalid address parameter. Expected a string.");
    }

    // Validate asset (assetName in original)
    if (asset !== undefined && typeof asset !== "string") {
      throw new Error("Invalid asset parameter. Expected a string or undefined.");
    }

    // Validate quantity (qty in original)
    const validatedQuantity = typeof quantity === "string" ? Number(quantity) : quantity;
    if (isNaN(validatedQuantity) || !Number.isInteger(validatedQuantity) || validatedQuantity <= 0) {
      throw new Error("Invalid quantity parameter. Expected a positive integer.");
    }

    // Validate options
    if (options.lock !== undefined && typeof options.lock !== "boolean") {
      throw new Error("Invalid lock parameter. Expected a boolean.");
    }
    if (options.divisible !== undefined && typeof options.divisible !== "boolean") {
      throw new Error("Invalid divisible parameter. Expected a boolean.");
    }
    if (options.description !== undefined && typeof options.description !== "string") {
      throw new Error("Invalid description parameter. Expected a string.");
    }

    // Validate fee_per_kb (satsPerKB in original)
    const feePerKB = typeof options.fee_per_kb === "string"
      ? Number(options.fee_per_kb)
      : options.fee_per_kb;
    if (feePerKB !== undefined && (isNaN(feePerKB) || feePerKB <= 0)) {
      throw new Error("Invalid fee_per_kb parameter. Expected a positive number.");
    }

    const endpoint = `/addresses/${address}/compose/issuance`;
    const queryParams = new URLSearchParams();

    // Add required parameters
    queryParams.append("asset", asset);
    queryParams.append("quantity", validatedQuantity.toString());

    // Always set encoding to OP_RETURN for CIP33
    queryParams.append("encoding", "opreturn");

    // Add optional parameters if they exist
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && key !== 'encoding') { // Skip encoding as we set it above
        queryParams.append(key, value.toString());
      }
    }

    // Set defaults for issuance
    if (options.return_psbt === undefined) {
      queryParams.append("return_psbt", "true");
    }
    if (options.verbose === undefined) {
      queryParams.append("verbose", "true");
    }
    if (options.allow_unconfirmed_inputs === undefined) {
      queryParams.append("allow_unconfirmed_inputs", "true");
    }

    // Use the existing cache mechanism
    try {
      return await this.fetchXcpV2WithCache<any>(endpoint, queryParams);
    } catch (error) {
      console.error("Error in createIssuance:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes("Insufficient")) {
        throw error;
      }
      if (errorMessage?.includes("invalid base58")) {
        throw new Error("Invalid address format. Please use a supported Bitcoin address format.");
      }
      throw new Error(errorMessage || "Failed to create issuance transaction");
    }
  }

  static async getAssetInfo(asset: string): Promise<any> {
    const endpoint = `/assets/${asset}`;
    const queryParams = new URLSearchParams({
      verbose: "true"
    });

    try {
      for (const node of XCP_V2_NODES) {
        const url = `${node.url}${endpoint}?${queryParams.toString()}`;
        console.log(`Attempting to fetch from URL: ${url}`);

        try {
          const response = await httpClient.get(url);
          console.log(`Response status from ${node.name}: ${response.status}`);

          // If asset doesn't exist, it's available for use
          if (response.status === 404) {
            return null;
          }

          if (!response.ok) {
            const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            console.error(`Error response body from ${node.name}: ${errorBody}`);
            continue;
          }

          const data = response.data;
          if (data && data.result) {
            return data.result;
          }
        } catch (error) {
          console.error(`Fetch error for ${url}:`, error);
          continue;
        }
      }

      // If we get here, the asset wasn't found on any node
      return null;
    } catch (error) {
      console.error(`Error fetching asset info for ${asset}:`, error);
      throw error; // Throw non-404 errors
    }
  }

  static async getDispensersByAddress(
    address: string,
    options: {
      status?: string;
      cursor?: string;
      limit?: number;
      page?: number;
      offset?: number;
      sort?: string;
      verbose?: boolean;
      show_unconfirmed?: boolean;
    } = {}
  ): Promise<{ dispensers: Dispenser[]; total: number }> {
    const endpoint = `/addresses/${address}/dispensers`;
    const queryParams = new URLSearchParams();

    // Add optional parameters if they exist
    if (options.status) queryParams.append('status', options.status);
    if (options.cursor) queryParams.append('cursor', options.cursor);
    if (options.limit) queryParams.append('limit', options.limit.toString());
    if (options.offset) queryParams.append('offset', options.offset.toString());
    if (options.sort) queryParams.append('sort', options.sort);
    if (options.verbose) queryParams.append('verbose', 'true');
    if (options.show_unconfirmed) queryParams.append('show_unconfirmed', 'true');

    // Handle pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skipCount = (page - 1) * limit;

    try {
      // First, get total count by fetching with a large limit
      // FIXME: This is a hack to get the total count of dispensers for pagination
      const countParams = new URLSearchParams(queryParams);
      countParams.set('limit', '1000'); // Use a larger limit for counting
      const countResponse = await this.fetchXcpV2WithCache<any>(endpoint, countParams);
      const totalCount = countResponse?.result?.length || 0;

      console.log("[CounterpartyApiManager] Total dispenser count:", {
        address,
        totalCount,
        page,
        limit
      });

      // Then fetch the actual page
      const pageParams = new URLSearchParams(queryParams);
      pageParams.set('limit', limit.toString());
      pageParams.set('offset', skipCount.toString());
      const response = await this.fetchXcpV2WithCache<any>(endpoint, pageParams);

      if (!response || !Array.isArray(response.result)) {
        return {
          dispensers: [],
          total: 0
        };
      }

      const dispensers = response.result.map((dispenser: any) => ({
        tx_hash: dispenser.tx_hash,
        block_index: dispenser.block_index,
        source: dispenser.source,
        cpid: dispenser.asset,
        give_quantity: dispenser.give_quantity,
        give_remaining: dispenser.give_remaining,
        escrow_quantity: dispenser.escrow_quantity,
        satoshirate: dispenser.satoshirate,
        btcrate: Number(formatSatoshisToBTC(dispenser.satoshirate, { includeSymbol: false })),
        origin: dispenser.origin,
        confirmed: dispenser.confirmed,
        close_block_index: dispenser.close_block_index,
        status: String(dispenser.status || "unknown").toLowerCase(),
        asset_info: dispenser.asset_info,
        dispenser_info: dispenser.dispenser_info
      }));

      console.log("[CounterpartyApiManager] Returning dispensers:", {
        address,
        dispensersCount: dispensers?.length ?? 0,
        totalCount,
        page,
        limit
      });

      return {
        dispensers,
        total: totalCount
      };
    } catch (error) {
      console.error(`Error fetching dispensers for address ${address}:`, error);
      return {
        dispensers: [],
        total: 0
      };
    }
  }

  static async checkHealth(cacheTimeout: number = 0): Promise<boolean> {
    const endpoint = "/healthz";
    const queryParams = new URLSearchParams();

    try {
      // Using the cache function with a short timeout for health checks
      // Health checks should be cached for less time than regular API calls
      const cacheTime = cacheTimeout || 60000; // Default to 1 minute cache for health checks

      const response = await this.fetchXcpV2WithCache<{ result: { status: string } }>(
        endpoint,
        queryParams,
        cacheTime
      );

      return response?.result?.status === "Healthy";
    } catch (error) {
      console.error("XCP health check failed:", error);
      return false;
    }
  }
}
