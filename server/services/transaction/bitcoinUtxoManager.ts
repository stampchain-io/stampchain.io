import { logger } from "$lib/utils/logger.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { OptimalUTXOSelection } from "$server/services/utxo/optimalUtxoSelection.ts";
import type { BasicUTXO, UTXO } from "$types/base.d.ts";
import type { Output } from "$types/transaction.d.ts";
import * as bitcoin from "bitcoinjs-lib";

export class BitcoinUtxoManager {
  private static readonly CHANGE_DUST = 1000;

  private commonUtxoService: CommonUTXOService;

  constructor() {
    this.commonUtxoService = new CommonUTXOService();
  }

  async getAddressUTXOs(
    address: string,
    options: {
      includeAncestors?: boolean;
      filterStampUTXOs?: boolean;
      excludeUtxos?: Array<{ txid: string; vout: number }>;
    } = {}
  ): Promise<BasicUTXO[]> {
    logger.debug("transaction-utxo-service", {
      message: "getAddressUTXOs called for basic UTXO list",
      address,
      options
    });

    let basicUtxos = await this.commonUtxoService.getSpendableUTXOs(address, undefined, {
      includeAncestorDetails: options.includeAncestors || false,
      confirmedOnly: false
    });

    if (options.excludeUtxos && options.excludeUtxos.length > 0) {
      const excludeSet = new Set(options.excludeUtxos.map(u => `${u.txid}:${u.vout}`));
      const originalCount = basicUtxos.length;
      basicUtxos = basicUtxos.filter(utxo => !excludeSet.has(`${utxo.txid}:${utxo.vout}`));
      logger.debug("transaction-utxo-service", {
        message: "Filtered excluded UTXOs",
        address,
        excludedCount: originalCount - basicUtxos.length,
        exclusionListSize: excludeSet.size
      });
    }

    if (options.filterStampUTXOs) {
      try {
        logger.debug("transaction-utxo-service", { message: "Filtering stamp UTXOs from basic list", address });
        const stampBalances = await CounterpartyApiManager.getXcpBalancesByAddress(
          address,
          undefined,
          true,
        );

        const utxosToExcludeFromStamps = new Set<string>();
        for (const balance of stampBalances.balances) {
          if (balance.utxo) {
            utxosToExcludeFromStamps.add(balance.utxo);
          }
        }
        const preStampFilterCount = basicUtxos.length;
        basicUtxos = basicUtxos.filter(
          (utxo) => !utxosToExcludeFromStamps.has(`${utxo.txid}:${utxo.vout}`),
        );
        logger.info("transaction-utxo-service", {
          message: "Filtered stamp UTXOs from basic list",
          address,
          stampUtxosExcluded: preStampFilterCount - basicUtxos.length,
          remainingCount: basicUtxos.length
        });
      } catch (error) {
        logger.error("transaction-utxo-service", {
          message: "Error fetching stamps balance for UTXO exclusion (from basic list)",
          address,
          error: (error as any).message
        });
      }
    }
    // Filter out UTXOs with undefined values to ensure BasicUTXO compatibility
    return basicUtxos.filter((utxo): utxo is BasicUTXO => 
      utxo.value !== undefined && 
      utxo.script !== undefined
    );
  }

  static estimateVoutSize(output: Output): number {
    let scriptSize = 0;
    if ((output as any).script) {
      scriptSize = (output as any).script.length / 2;
    } else if ((output as any).address) {
      try {
        const outputScript = bitcoin.address.toOutputScript((output as any).address, bitcoin.networks.bitcoin);
        scriptSize = outputScript.length;
      } catch (e) {
        logger.warn("transaction-utxo-service", { message: "Could not determine script size for address", address: (output as any).address, error: (e as any).message });
        scriptSize = 34;
      }
    }
    return 8 + 1 + scriptSize;
  }

  async selectUTXOsForTransaction(
    address: string,
    vouts: Output[],
    feeRate: number,
    _sigops_rate = 0,
    _rbfBuffer = 1.5,
    options: {
      filterStampUTXOs?: boolean;
      includeAncestors?: boolean;
      excludeUtxos?: Array<{ txid: string; vout: number }>;
    } = {}
  ): Promise<{
    inputs: UTXO[];
    change: number;
    fee: number;
  }> {
    logger.debug("transaction-utxo-service", {
      message: "selectUTXOsForTransaction called",
      address,
      voutsCount: vouts.length,
      feeRate,
      options
    });

    const basicUtxos = await this.getAddressUTXOs(address, {
      includeAncestors: options.includeAncestors || false,
      filterStampUTXOs: options.filterStampUTXOs || false,
      excludeUtxos: options.excludeUtxos || [],
    });

    if (!basicUtxos || basicUtxos.length === 0) {
      logger.warn("transaction-utxo-service", { message: "No basic UTXOs available for transaction after fetching/filtering", address, optionsReceived: options });
      // Phrase the message so every create/* route's error classifier (which
      // matches the lowercase substring "insufficient funds", some case-
      // sensitively) maps an empty/unfunded wallet to HTTP 400 instead of an
      // opaque 500 — an empty wallet is a client condition, not a server bug
      // (#1155).
      throw new Error("No spendable UTXOs available for this address (insufficient funds)");
    }

    return this.selectUTXOsLogic(basicUtxos, vouts, feeRate, !!options.includeAncestors);
  }

  private async selectUTXOsLogic(
    basicUtxos: BasicUTXO[],
    vouts: Output[],
    feeRate: number,
    fetchFullDetails: boolean,
  ): Promise<{
    inputs: UTXO[];
    change: number;
    fee: number;
  }> {
    try {
      // Use optimal UTXO selection algorithm
      const selectionResult = OptimalUTXOSelection.selectUTXOs(
        basicUtxos,
        vouts,
        feeRate,
        {
          avoidChange: true,
          consolidationMode: false,
          dustThreshold: BitcoinUtxoManager.CHANGE_DUST
        }
      );

      // If fetchFullDetails is true, we need to replace the selected UTXOs with full details
      if (fetchFullDetails) {
        // Fetch full details for all selected UTXOs (groups by transaction for parallel processing)
        logger.info("transaction-utxo-service", {
          message: "Starting UTXO enrichment for selected UTXOs",
          selectedCount: selectionResult.inputs.length,
          utxoIds: selectionResult.inputs.map(u => `${u.txid}:${u.vout}`)
        });

        const fullUTXOs: UTXO[] = await this.batchFetchFullUTXODetails(selectionResult.inputs);

        // Verify all UTXOs have required script data
        for (const [index, fullUtxo] of fullUTXOs.entries()) {
          const originalUtxo = selectionResult.inputs[index];
          if (!fullUtxo || !fullUtxo.script) {
            logger.error("transaction-utxo-service", {
              message: "Failed to fetch full UTXO details including script - this is required for PSBT creation",
              txid: originalUtxo.txid,
              vout: originalUtxo.vout,
              fullUtxoExists: !!fullUtxo,
              scriptExists: !!fullUtxo?.script
            });
            throw new Error(`Failed to fetch script (scriptPubKey) for UTXO ${originalUtxo.txid}:${originalUtxo.vout}. This is required for PSBT creation.`);
          }
        }

        selectionResult.inputs = fullUTXOs;
        logger.info("transaction-utxo-service", {
          message: "UTXO enrichment completed successfully",
          enrichedCount: fullUTXOs.length
        });
      }

      logger.info("transaction-utxo-service", {
        message: "UTXO selection successful using optimal algorithm",
        algorithm: selectionResult.algorithm,
        inputsSelected: selectionResult.inputs.length,
        totalInputValue: selectionResult.inputs.reduce((sum, u) => sum + (u.value ?? 0), 0),
        fee: selectionResult.fee,
        change: selectionResult.change,
        waste: selectionResult.waste,
        fetchFullDetails
      });

      return {
        inputs: selectionResult.inputs,
        change: selectionResult.change,
        fee: selectionResult.fee,
      };
    } catch (error) {
      logger.error("transaction-utxo-service", {
        message: "Error in selectUTXOsLogic with optimal selection",
        error: (error as any).message,
        stack: (error as any).stack,
        fetchFullDetails
      });
      throw error;
    }
  }

  /**
   * Fetch full UTXO details for selected UTXOs with parallel processing optimization
   * Groups UTXOs by transaction ID to process transactions concurrently
   * Note: Still requires individual API calls per UTXO, but improves performance through parallelization
   */
  private async batchFetchFullUTXODetails(selectedUtxos: BasicUTXO[]): Promise<UTXO[]> {
    // Group UTXOs by transaction to minimize API calls
    const txidToUtxos = new Map<string, { vout: number; originalIndex: number }[]>();

    selectedUtxos.forEach((utxo, index) => {
      if (!txidToUtxos.has(utxo.txid)) {
        txidToUtxos.set(utxo.txid, []);
      }
      txidToUtxos.get(utxo.txid)!.push({ vout: utxo.vout, originalIndex: index });
    });

    logger.info("transaction-utxo-service", {
      message: "UTXO fetch optimization by transaction grouping",
      totalUtxos: selectedUtxos.length,
      uniqueTransactions: txidToUtxos.size,
      optimizationRatio: `${selectedUtxos.length}:${txidToUtxos.size}`
    });

    // Fetch all unique transactions in parallel
    const txFetchPromises = Array.from(txidToUtxos.keys()).map(async (txid) => {
      const utxosInTx = txidToUtxos.get(txid)!;
      const results: Array<{ utxo: UTXO | null; originalIndex: number }> = [];

      // For each UTXO in this transaction, fetch details
      for (const { vout, originalIndex } of utxosInTx) {
        try {
          const fullUtxo = await this.commonUtxoService.getSpecificUTXO(
            txid,
            vout,
            { includeAncestorDetails: true, confirmedOnly: false }
          );
          results.push({ utxo: fullUtxo, originalIndex });
        } catch (error) {
          logger.error("transaction-utxo-service", {
            message: "Error fetching individual UTXO in batch",
            txid,
            vout,
            error: error instanceof Error ? error.message : String(error)
          });
          results.push({ utxo: null, originalIndex });
        }
      }

      return results;
    });

    // Wait for all transactions to be fetched
    const allResults = await Promise.all(txFetchPromises);

    // Flatten and sort results back to original order
    const flatResults = allResults.flat();
    flatResults.sort((a, b) => a.originalIndex - b.originalIndex);

    // Extract UTXOs in original order
    const fullUTXOs = flatResults.map(result => result.utxo).filter((utxo): utxo is UTXO => utxo !== null);

    logger.info("transaction-utxo-service", {
      message: "UTXO fetch completed",
      requested: selectedUtxos.length,
      successful: fullUTXOs.length,
      failed: selectedUtxos.length - fullUTXOs.length
    });

    return fullUTXOs;
  }
}
