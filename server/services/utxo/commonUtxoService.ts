import type { CommonUTXOFetchOptions } from "$types/base.d.ts";
import type {UTXO} from "$lib/types/base.d.ts";
import { logger } from "$lib/utils/logger.ts";
import { detectScriptType } from "$lib/utils/bitcoin/scripts/scriptTypeUtils.ts";
import {
    getUTXOForAddress as getUTXOsFromPublicAPIsForAddress
} from "$lib/utils/bitcoin/utxo/utxoUtils.ts";
import { serverConfig } from "$server/config/config.ts";
import { FetchHttpClient } from "$server/interfaces/httpClient.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import { fetchFromEsplora } from "$server/services/utxo/esploraFetch.ts";
import { UTXOOptions as QuicknodeInternalUTXOOptions, QuicknodeUTXOService } from "$server/services/quicknode/quicknodeUTXOService.ts";
import type {ICommonUTXOService, UTXOFetchOptions} from "$server/services/utxo/utxoServiceInterface.d.ts";

const httpClient = new FetchHttpClient();

/**
 * Raw tx hex and a transaction's outputs (value + scriptPubKey) are immutable
 * for a given txid — the txid is the hash of the serialized transaction — so
 * these lookups are safe to cache for a long time. A 30-day TTL bounds Redis
 * growth; a miss after expiry is just one cheap API call. Address UTXO *sets*
 * are deliberately NOT cached (they change whenever the address transacts and a
 * stale set could underfund a transaction).
 */
const IMMUTABLE_TX_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days, in seconds


// Added interface for mempool.space transaction response
interface MempoolTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout?: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address?: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness?: string[];
    is_coinbase: boolean;
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

/**
 * Common UTXO Service managing UTXO fetching from multiple sources,
 * prioritizing QuickNode if configured, and falling back to public APIs.
 */
export class CommonUTXOService implements ICommonUTXOService {
  private static instance: CommonUTXOService;
  protected isQuickNodeConfigured: boolean;

  constructor() {
    // Initialize QuickNode configuration check
    this.isQuickNodeConfigured = !!(
      serverConfig.QUICKNODE_ENDPOINT && serverConfig.QUICKNODE_API_KEY
    );
    logger.info("common-utxo-service", { message: "CommonUTXOService initialized", isQuickNodeConfigured: this.isQuickNodeConfigured });
  }

  static getInstance(): CommonUTXOService {
    if (!CommonUTXOService.instance) {
      CommonUTXOService.instance = new CommonUTXOService();
    }
    return CommonUTXOService.instance;
  }

  async getRawTransactionHex(txid: string): Promise<string | null> {
    // Raw tx hex is immutable for a given txid, so cache it in Redis (shared
    // across service instances + ECS tasks; handleCache falls back to an
    // in-memory cache automatically if Redis is unavailable).
    return await dbManager.handleCache<string | null>(
      `btc:rawtxhex:${txid}`,
      () => this.fetchRawTransactionHexUncached(txid),
      IMMUTABLE_TX_CACHE_TTL,
    );
  }

  private async fetchRawTransactionHexUncached(
    txid: string,
  ): Promise<string | null> {
    // QuickNode first when configured (gated; the QUICKNODE_* env vars are unset
    // in prod, so this branch is inert there and the public esplora providers
    // serve all traffic).
    if (this.isQuickNodeConfigured) {
      try {
        const qnResponse = await QuicknodeUTXOService.getRawTransactionHex(txid);
        if (qnResponse.data) {
          logger.info("common-utxo-service", { message: "Successfully fetched rawTxHex from QuickNode", txid });
          return qnResponse.data;
        }
        logger.warn("common-utxo-service", { message: "QuickNode returned no rawTxHex, falling back to public esplora APIs", txid, error: qnResponse.error });
      } catch (error) {
        logger.error("common-utxo-service", { message: "Error during QuickNode getRawTransactionHex call, falling back to public esplora APIs", txid, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Public esplora providers (mempool.space -> blockstream.info). Both expose
    // GET /tx/:txid/hex returning the raw transaction as a hex string; the
    // shared helper tries each in order so a single provider outage doesn't
    // break tx construction.
    return await fetchFromEsplora<string>(
      `/tx/${txid}/hex`,
      httpClient,
      (data) => {
        const hex = typeof data === "string" ? data.trim() : "";
        return hex.length > 0 && /^[0-9a-fA-F]+$/.test(hex) ? hex : null;
      },
      { txid, op: "getRawTransactionHex" },
    );
  }

  async getSpendableUTXOs(
    address: string,
    _amountNeeded?: number,
    options?: UTXOFetchOptions,
  ): Promise<UTXO[]> {
    const logContext = { address, options, quicknodeEnabled: this.isQuickNodeConfigured };
    logger.debug("common-utxo-service", { message: "getSpendableUTXOs called for basic UTXO list", ...logContext });

    if (this.isQuickNodeConfigured) {
      try {
        logger.debug("common-utxo-service", { message: "Attempting to fetch basic UTXOs via QuickNode", address });

        const qnOptions: QuicknodeInternalUTXOOptions = {};
        if (options?.confirmedOnly !== undefined) qnOptions.confirmedOnly = options.confirmedOnly;

        const result = await QuicknodeUTXOService.getUTXOs(address, qnOptions);

        if (result && "data" in result && Array.isArray(result.data)) {
          logger.info("common-utxo-service", { message: "Successfully received basic UTXO data from QuickNode", address, count: result.data.length });
          return result.data.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            script: "" // QuickNode doesn't provide script in basic UTXO response
          }));
        } else if (result && "error" in result) {
          logger.warn("common-utxo-service", { message: "QuickNode returned an error for getUTXOs", address, error: result.error });
        } else {
          logger.warn("common-utxo-service", { message: "QuickNode returned unexpected response for getUTXOs", address, response: result });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error("common-utxo-service", { message: "Error during QuickNode getUTXOs call", address, error: errorMessage, stack: errorStack });
      }
    }

    logger.debug("common-utxo-service", { message: "Falling back to public APIs for getSpendableUTXOs (basic list)", address });
    try {
      const publicUtxosResult = await getUTXOsFromPublicAPIsForAddress(address, undefined, undefined, false, 3);

      if (Array.isArray(publicUtxosResult)) {
        logger.info("common-utxo-service", { message: "Successfully fetched basic UTXOs from public APIs", address, count: publicUtxosResult.length });
        return publicUtxosResult.map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          script: utxo.script || ""
        }));
      }
      logger.warn("common-utxo-service", { message: "Public APIs returned non-array or null for getSpendableUTXOs", address, response: publicUtxosResult });
      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error("common-utxo-service", { message: "Error fetching basic UTXOs from public APIs", address, error: errorMessage, stack: errorStack });
      return [];
    }
  }

  async getSpecificUTXO(
    txid: string,
    vout: number,
    options?: CommonUTXOFetchOptions,
  ): Promise<UTXO | null> {
    // Context for debugging if needed
    // const logContext = { txid, vout, options, quicknodeEnabled: this.isQuickNodeConfigured };
    // logger.debug("common-utxo-service", { message: "getSpecificUTXO called for", txid, vout, options }); // Original debug line

    if (this.isQuickNodeConfigured && !options?.forcePublicAPI) {
      const qnAttemptLogContext = {
        message: "Attempting QuickNode for getSpecificUTXO",
        txid,
        vout,
        includeAncestorDetails: options?.includeAncestorDetails,
        isQuickNodeConfigured: this.isQuickNodeConfigured,
        forcePublicAPI: options?.forcePublicAPI,
      };
      logger.info("common-utxo-service", qnAttemptLogContext); // More visible log

      try {
        // logger.debug("common-utxo-service", { message: "Attempting QuickNode for getSpecificUTXO", txid, vout }); // Original debug line moved and enhanced above
        const qnResult = await QuicknodeUTXOService.getUTXO(txid, vout, options?.includeAncestorDetails);

        const qnResultLog = {
            message: "QuickNode getUTXO result received",
            txid,
            vout,
            hasData: !!(qnResult && qnResult.data),
            hasError: qnResult && qnResult.error ? qnResult.error : "no explicit error property",
        };
        logger.info("common-utxo-service", qnResultLog);

        if (qnResult && qnResult.data) {
          logger.info("common-utxo-service", {
            message: "[CommonUTXO] USING QuickNode for " + txid + ":" + vout + ". Script: " + qnResult.data.script?.substring(0,20) + "... Value: " + qnResult.data.value
          }); // Changed to logger.info and truncated script, using string concatenation
          return qnResult.data;
        }
        if (qnResult && qnResult.error) {
            logger.warn("common-utxo-service", { message: "QuickNode returned error for getSpecificUTXO (after detailed log)", txid, vout, error: qnResult.error });
        } else if (!qnResult?.data) { // Covers qnResult being null/undefined, or qnResult.data being null/undefined
            logger.info("common-utxo-service", { message: "QuickNode did not find specific UTXO or returned no data (after detailed log)", txid, vout });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error("common-utxo-service", { message: "Error during QuickNode getSpecificUTXO call (exception caught)", txid, vout, error: errorMessage, stack: errorStack });
      }
    }

    // Public esplora providers (mempool.space -> blockstream.info), cached.
    // A transaction's output (value + scriptPubKey) is immutable for a given
    // txid:vout (the txid commits to the outputs), so the result is safe to
    // cache long-term. `forcePublicAPI` only changes which source is queried,
    // not the resulting output, so it shares the same cache entry.
    return await dbManager.handleCache<UTXO | null>(
      `btc:txout:${txid}:${vout}`,
      () => this.fetchSpecificUTXOFromEsplora(txid, vout),
      IMMUTABLE_TX_CACHE_TTL,
    );
  }

  private async fetchSpecificUTXOFromEsplora(
    txid: string,
    vout: number,
  ): Promise<UTXO | null> {
    // mempool.space and blockstream.info both return the esplora tx JSON shape
    // (vout[].value / vout[].scriptpubkey / weight), so one extractor handles
    // both; the shared helper tries each provider in order.
    return await fetchFromEsplora<UTXO>(
      `/tx/${txid}`,
      httpClient,
      (data) => {
        const txData = data as MempoolTransaction;
        const output = txData?.vout?.[vout];
        if (!output || output.value === undefined || !output.scriptpubkey) {
          return null;
        }
        const script = output.scriptpubkey; // hex string
        return {
          txid,
          vout,
          value: output.value,
          script,
          vsize: txData.weight ? Math.ceil(txData.weight / 4) : 0,
          weight: txData.weight,
          scriptType: detectScriptType(script),
        };
      },
      { txid, vout, op: "getSpecificUTXO" },
    );
  }
}
