/**
 * Optimal UTXO Selection Service
 * Implements world-class coin selection algorithms for Bitcoin transactions
 *
 * Algorithms implemented:
 * 1. Branch and Bound (BnB) - Finds exact matches without change
 * 2. Knapsack Solver - Approximates target amount
 * 3. Single Random Draw (SRD) - Accumulates randomly until target
 * 4. Largest First - Fallback greedy algorithm
 */

import type { BasicUTXO, Output, ScriptType, UTXO } from "$lib/types/index.d.ts";
import { logger } from "$lib/utils/logger.ts";

interface SelectionResult {
  inputs: UTXO[];
  change: number;
  fee: number;
  waste: number; // Cost metric for this selection
  algorithm: string; // Which algorithm was used
}

interface SelectionOptions {
  targetValue: bigint;
  feeRate: number;
  longTermFeeRate?: number; // For waste calculation
  dustThreshold?: number;
  consolidationMode?: boolean; // Prefer using more inputs
  avoidChange?: boolean; // Try to find exact matches
  maxTries?: number; // For random selection
}

// Performance metrics structure
interface AlgorithmMetrics {
  name: string;
  executionTimeMs: number;
  success: boolean;
  inputsSelected: number;
  totalInputValue: number;
  fee: number;
  change: number;
  waste: number;
  failureReason?: string | undefined;
  efficiency: number; // inputs selected / total available
  wastePercentage: number; // waste / total transaction value
}

interface SelectionMetrics {
  sessionId: string;
  totalExecutionTimeMs: number;
  availableUTXOs: number;
  spendableUTXOs: number;
  filteredUTXOs: number;
  targetValue: number;
  feeRate: number;
  algorithms: AlgorithmMetrics[];
  selectedAlgorithm: string;
  finalResult: {
    inputs: number;
    totalValue: number;
    fee: number;
    change: number;
    waste: number;
    efficiency: number;
  };
  dustAnalysis: {
    totalFiltered: number;
    averageFilteredValue: number;
    filterRatio: number;
  };
  recommendations: string[];
}

export class OptimalUTXOSelection {
  private static readonly MIN_CHANGE = 546; // Dust threshold in satoshis
  private static readonly CHANGE_COST_WEIGHT = 0.5; // How much we value avoiding change
  private static readonly DEFAULT_LONG_TERM_FEE_RATE = 10; // sat/vb for waste calculation

  /**
   * Main selection method that tries multiple algorithms
   */
  static selectUTXOs(
    availableUTXOs: BasicUTXO[],
    outputs: Output[],
    feeRate: number,
    options: Partial<SelectionOptions> = {}
  ): SelectionResult {
    const sessionId = crypto.randomUUID();
    const startTime = performance.now();

    // Calculate target value from outputs
    const targetValue = outputs.reduce((sum, out) => sum + BigInt(out.value), BigInt(0));

    const selectionOptions: SelectionOptions = {
      targetValue,
      feeRate,
      longTermFeeRate: options.longTermFeeRate || this.DEFAULT_LONG_TERM_FEE_RATE,
      dustThreshold: options.dustThreshold || this.MIN_CHANGE,
      consolidationMode: options.consolidationMode || false,
      avoidChange: options.avoidChange !== false, // Default true
      maxTries: options.maxTries || 1000,
    };

    logger.info("transaction-utxo-service", {
      message: "Starting UTXO selection",
      sessionId,
      availableUTXOs: availableUTXOs.length,
      targetValue: targetValue.toString(),
      feeRate,
      options: selectionOptions,
      utxoStatistics: {
        totalValue: availableUTXOs.reduce((sum, u) => sum + (u.value ?? 0), 0),
        averageValue: availableUTXOs.length > 0 ?
          Math.floor(availableUTXOs.reduce((sum, u) => sum + (u.value ?? 0), 0) / availableUTXOs.length) : 0,
        largestUTXO: availableUTXOs.length > 0 ? Math.max(...availableUTXOs.map(u => u.value ?? 0)) : 0,
        smallestUTXO: availableUTXOs.length > 0 ? Math.min(...availableUTXOs.map(u => u.value ?? 0)) : 0,
      }
    });

    // Filter out dust UTXOs that would cost more to spend than they're worth
    const dustFilterStart = performance.now();
    const spendableUTXOs = this.filterDustUTXOs(availableUTXOs, feeRate);
    const dustFilterTime = performance.now() - dustFilterStart;

    const filteredUTXOs = availableUTXOs.filter(u => !spendableUTXOs.includes(u));
    const totalFilteredValue = filteredUTXOs.reduce((sum, u) => sum + (u.value ?? 0), 0);
    const dustAnalysis = {
      totalFiltered: filteredUTXOs.length,
      averageFilteredValue: filteredUTXOs.length > 0 ? totalFilteredValue / filteredUTXOs.length : 0,
      filterRatio: availableUTXOs.length > 0 ? filteredUTXOs.length / availableUTXOs.length : 0,
    };

    if (spendableUTXOs.length === 0) {
      // Provide detailed analysis of why all UTXOs were filtered
      const dustAnalysisDetailed = availableUTXOs.map(utxo => {
        const cost = this.estimateInputCost(utxo, feeRate);
        return {
          txid: utxo.txid.substring(0, 8) + "...",
          vout: utxo.vout,
          value: utxo.value,
          spendCost: Number(cost),
          isDust: utxo.value <= Number(cost),
          netValue: utxo.value - Number(cost),
          efficiency: Number(cost) > 0 ? utxo.value / Number(cost) : utxo.value
        };
      });

      // The wallet, not the server: the caller answers 400.
      logger.warn("transaction-utxo-service", {
        message: "No spendable UTXOs - all filtered as dust",
        sessionId,
        feeRate,
        totalUTXOs: availableUTXOs.length,
        dustFilterTimeMs: dustFilterTime,
        dustAnalysis: dustAnalysisDetailed.slice(0, 10),
        totalValueFiltered: totalFilteredValue,
        worstEfficiency: Math.min(...dustAnalysisDetailed.map(d => d.efficiency)),
        recommendations: [
          "Consider using a lower fee rate",
          "Combine smaller UTXOs in a separate transaction first",
          "Wait for fee rates to decrease",
          "Use larger UTXOs for this transaction"
        ]
      });

      throw new Error(`No spendable UTXOs available: all ${availableUTXOs.length} UTXOs cost more to spend than their value at ${feeRate} sat/vb`);
    }

    logger.debug("transaction-utxo-service", {
      message: "After dust filtering",
      sessionId,
      originalCount: availableUTXOs.length,
      spendableCount: spendableUTXOs.length,
      filtered: availableUTXOs.length - spendableUTXOs.length,
      totalFilteredValue,
      dustFilterTimeMs: dustFilterTime,
      feeRate,
      dustAnalysis,
      examples: filteredUTXOs.slice(0, 3).map(u => ({
        value: u.value,
        spendCost: Number(this.estimateInputCost(u, feeRate)),
        efficiency: (() => {
          const cost = Number(this.estimateInputCost(u, feeRate));
          return cost > 0 ? u.value / cost : u.value;
        })()
      }))
    });

    // Try algorithms in order of preference
    const algorithms = [
      { name: "Branch and Bound", fn: this.branchAndBound.bind(this) },
      { name: "Knapsack", fn: this.knapsack.bind(this) },
      { name: "Single Random Draw", fn: this.singleRandomDraw.bind(this) },
      { name: "Largest First", fn: this.largestFirst.bind(this) },
    ];

    let bestResult: SelectionResult | null = null;
    let bestWaste = Number.MAX_SAFE_INTEGER;
    const algorithmMetrics: AlgorithmMetrics[] = [];

    for (const algo of algorithms) {
      const algoStart = performance.now();
      let algoResult: SelectionResult | null = null;
      let failureReason: string | undefined;

      try {
        algoResult = algo.fn(spendableUTXOs, outputs, selectionOptions);

        if (algoResult) {
          // Calculate waste metric for this selection
          const waste = this.calculateWaste(algoResult, selectionOptions);
          algoResult.waste = waste;
          algoResult.algorithm = algo.name;

          const totalTransactionValue = Number(targetValue) + algoResult.fee;
          const efficiency = spendableUTXOs.length > 0 ? algoResult.inputs.length / spendableUTXOs.length : 0;
          const wastePercentage = totalTransactionValue > 0 ? (waste / totalTransactionValue) * 100 : 0;

          const metrics: AlgorithmMetrics = {
            name: algo.name,
            executionTimeMs: performance.now() - algoStart,
            success: true,
            inputsSelected: algoResult.inputs.length,
            totalInputValue: algoResult.inputs.reduce((sum, u) => sum + (u.value ?? 0), 0),
            fee: algoResult.fee,
            change: algoResult.change,
            waste,
            efficiency,
            wastePercentage
          };

          algorithmMetrics.push(metrics);

          logger.info("transaction-utxo-service", {
            message: `${algo.name} algorithm success`,
            sessionId,
            ...metrics,
            selectedUTXOs: algoResult.inputs.slice(0, 5).map(u => ({
              txid: u.txid.substring(0, 8) + "...",
              vout: u.vout,
              value: u.value,
              scriptType: u.scriptType
            }))
          });

          // Keep best result based on waste metric
          if (waste < bestWaste) {
            bestResult = algoResult;
            bestWaste = waste;

            // If we found an exact match (no change), we can stop
            if (algoResult.change === 0 && selectionOptions.avoidChange) {
              logger.debug("transaction-utxo-service", {
                message: "Perfect match found - no change needed",
                sessionId,
                algorithm: algo.name,
                executionTimeMs: performance.now() - algoStart
              });
              break;
            }
          }
        } else {
          failureReason = "No viable selection found";
        }
      } catch (error) {
        failureReason = error instanceof Error ? error.message : String(error);
      }

      if (!algoResult) {
        const metrics: AlgorithmMetrics = {
          name: algo.name,
          executionTimeMs: performance.now() - algoStart,
          success: false,
          inputsSelected: 0,
          totalInputValue: 0,
          fee: 0,
          change: 0,
          waste: 0,
          efficiency: 0,
          wastePercentage: 0,
          failureReason
        };

        algorithmMetrics.push(metrics);

        logger.debug("transaction-utxo-service", {
          message: `${algo.name} algorithm failed`,
          sessionId,
          ...metrics
        });
      }
    }

    const totalExecutionTime = performance.now() - startTime;

    if (!bestResult) {
      // Enhanced UTXO analysis logging when selection fails
      const totalAvailable = spendableUTXOs.reduce((sum, u) => sum + BigInt(u.value ?? 0), BigInt(0));
      const totalRequired = targetValue;
      const estimatedFee = this.estimateFeeForInputCount(spendableUTXOs.length, outputs.length, feeRate);
      const totalWithFee = totalRequired + estimatedFee;

      // Detailed breakdown of why funds are insufficient
      const utxoAnalysis = {
        totalUtxos: {
          available: availableUTXOs.length,
          spendable: spendableUTXOs.length,
          filtered: availableUTXOs.length - spendableUTXOs.length
        },
        values: {
          totalAvailable: Number(totalAvailable),
          targetValue: Number(totalRequired),
          estimatedFee: Number(estimatedFee),
          totalRequired: Number(totalWithFee),
          deficit: Number(totalWithFee - totalAvailable)
        },
        utxoDistribution: {
          largest: Math.max(...spendableUTXOs.map(u => u.value)),
          smallest: Math.min(...spendableUTXOs.map(u => u.value)),
          average: Math.floor(Number(totalAvailable) / spendableUTXOs.length),
          median: this.calculateMedianUTXOValue(spendableUTXOs)
        },
        feeAnalysis: {
          feeRate,
          feePerInput: Number(estimatedFee) / Math.max(1, spendableUTXOs.length),
          feeToValueRatio: Number(estimatedFee) / Math.max(1, Number(totalAvailable))
        },
        algorithmAttempts: algorithmMetrics,
        performanceMetrics: {
          totalExecutionTimeMs: totalExecutionTime,
          dustFilterTimeMs: dustFilterTime,
          averageAlgorithmTimeMs: algorithmMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / algorithmMetrics.length
        }
      };

      const recommendations = this.generateSelectionRecommendations(spendableUTXOs, Number(totalWithFee), feeRate);

      logger.error("transaction-utxo-service", {
        message: "UTXO Selection Failed - Comprehensive Analysis",
        sessionId,
        ...utxoAnalysis,
        utxoSample: spendableUTXOs.slice(0, 5).map(u => ({
          txid: u.txid.substring(0, 8) + "...",
          vout: u.vout,
          value: u.value,
          efficiency: (() => {
            const cost = Number(this.estimateInputCost(u, feeRate));
            return cost > 0 ? (u.value / cost).toFixed(2) : u.value.toFixed(2);
          })()
        })),
        recommendations
      });

      throw new Error(`Insufficient funds: have ${totalAvailable} sats, need ${totalWithFee} sats (${targetValue} + ~${estimatedFee} fee), deficit: ${totalWithFee - totalAvailable} sats`);
    }

    // Create comprehensive success metrics
    const selectionMetrics: SelectionMetrics = {
      sessionId,
      totalExecutionTimeMs: totalExecutionTime,
      availableUTXOs: availableUTXOs.length,
      spendableUTXOs: spendableUTXOs.length,
      filteredUTXOs: filteredUTXOs.length,
      targetValue: Number(targetValue),
      feeRate,
      algorithms: algorithmMetrics,
      selectedAlgorithm: bestResult.algorithm,
      finalResult: {
        inputs: bestResult.inputs.length,
        totalValue: bestResult.inputs.reduce((sum, u) => sum + (u.value ?? 0), 0),
        fee: bestResult.fee,
        change: bestResult.change,
        waste: bestResult.waste,
        efficiency: bestResult.inputs.length / spendableUTXOs.length
      },
      dustAnalysis,
      recommendations: this.generateSelectionRecommendations(spendableUTXOs, Number(targetValue) + bestResult.fee, feeRate)
    };

    logger.info("transaction-utxo-service", {
      message: "UTXO selection completed successfully",
      ...selectionMetrics,
      selectedUTXOs: bestResult.inputs.slice(0, 10).map(u => ({
        txid: u.txid.substring(0, 8) + "...",
        vout: u.vout,
        value: u.value,
        scriptType: u.scriptType
      }))
    });

    // Log performance summary for monitoring
    logger.info("transaction-utxo-service", {
      message: "UTXO selection performance summary",
      sessionId,
      totalExecutionTimeMs: totalExecutionTime,
      selectedAlgorithm: bestResult.algorithm,
      algorithmPerformance: algorithmMetrics.map(m => ({
        name: m.name,
        executionTimeMs: m.executionTimeMs,
        success: m.success,
        efficiency: m.efficiency,
        wastePercentage: m.wastePercentage
      })),
      efficiency: {
        utxoUtilization: bestResult.inputs.length / spendableUTXOs.length,
        feeEfficiency: bestResult.fee / (Number(targetValue) + bestResult.fee),
        changeRatio: bestResult.change / (Number(targetValue) + bestResult.fee),
        wasteRatio: bestResult.waste / (Number(targetValue) + bestResult.fee)
      }
    });

    return bestResult;
  }

  /**
   * Branch and Bound algorithm - finds exact matches without change
   * Based on Bitcoin Core's implementation
   */
  private static branchAndBound(
    utxos: BasicUTXO[],
    outputs: Output[],
    options: SelectionOptions
  ): SelectionResult | null {
    const maxTries = 100000; // Prevent infinite loops
    let tries = 0;

    // Sort UTXOs by effective value (value - cost to spend)
    const effectiveUTXOs = utxos.map(utxo => ({
      utxo,
      effectiveValue: BigInt(utxo.value) - this.estimateInputCost(utxo, options.feeRate)
    })).filter(u => u.effectiveValue > 0n)
      .sort((a, b) => Number(b.effectiveValue - a.effectiveValue));

    const totalEffectiveValue = effectiveUTXOs.reduce((sum, u) => sum + (u.effectiveValue ?? 0n), 0n);
    const candidateUTXOs = effectiveUTXOs.slice(0, 10); // Show top UTXOs for debugging

    logger.debug("transaction-utxo-service", {
      message: "Branch and Bound algorithm starting",
      totalUTXOs: utxos.length,
      effectiveUTXOs: effectiveUTXOs.length,
      totalEffectiveValue: Number(totalEffectiveValue),
      targetValue: Number(options.targetValue),
      maxTries,
      topCandidates: candidateUTXOs.map(u => ({
        value: u.utxo.value,
        effectiveValue: Number(u.effectiveValue),
        efficiency: u.utxo.value / Number(u.effectiveValue)
      }))
    });

    let bestSelection: BasicUTXO[] | null = null;
    let bestWaste = BigInt(Number.MAX_SAFE_INTEGER - 1); // Subtract 1 to ensure safe conversion
    let exactMatches = 0;
    let candidateSolutions = 0;

    const search = (
      index: number,
      currentSelection: BasicUTXO[],
      currentValue: bigint,
      currentWaste: bigint
    ): boolean => {
      tries++;
              if (tries > maxTries) {
          logger.debug("transaction-utxo-service", {
            message: "Branch and Bound exceeded max tries",
            tries,
            maxTries,
            currentBestWaste: Number(bestWaste),
            bestSelectionInputs: bestSelection?.length || 0
          });
          return true; // Exceeded tries
        }

      // Calculate fee for current selection
      const currentFee = this.calculateFeeForSelection(currentSelection, outputs, options.feeRate);
      const totalNeeded = options.targetValue + currentFee;

      // If we have enough, check if this is better than our best
      if (currentValue >= totalNeeded) {
        const excess = currentValue - totalNeeded;

        // Only consider if excess is 0 (exact match) or above dust
        if (excess === 0n || excess >= BigInt(options.dustThreshold!)) {
          const waste = currentWaste + excess;
          candidateSolutions++;

          if (excess === 0n) {
            exactMatches++;
          }

          if (waste < bestWaste) {
            bestWaste = waste;
            bestSelection = [...currentSelection];

            logger.debug("transaction-utxo-service", {
              message: "Branch and Bound found better solution",
              inputs: currentSelection.length,
              totalValue: Number(currentValue),
              fee: Number(currentFee),
              change: Number(excess),
              waste: Number(waste),
              isExactMatch: excess === 0n,
              tries
            });
          }
        }

        // Don't explore further if we already have excess
        return excess > 0n;
      }

      // Try remaining UTXOs
      for (let i = index; i < effectiveUTXOs.length; i++) {
        const { utxo, effectiveValue } = effectiveUTXOs[i];

        // Skip if adding this would exceed our best waste
        if (currentWaste + effectiveValue > bestWaste) continue;

        // Add this UTXO and continue search
        const shouldPrune = search(
          i + 1,
          [...currentSelection, utxo],
          currentValue + BigInt(utxo.value),
          currentWaste + this.estimateInputCost(utxo, options.feeRate)
        );

        if (shouldPrune) break;
      }

      return false;
    };

    search(0, [], 0n, 0n);

    const searchResults = {
      tries,
      exactMatches,
      candidateSolutions,
      bestWaste: bestSelection ? Number(bestWaste) : null,
      searchEfficiency: tries > 0 ? candidateSolutions / tries : 0,
      success: bestSelection !== null
    };

    logger.debug("transaction-utxo-service", {
      message: "Branch and Bound algorithm completed",
      ...searchResults
    });

    if (!bestSelection) {
      logger.debug("transaction-utxo-service", {
        message: "Branch and Bound failed to find solution",
        ...searchResults,
        reasons: [
          totalEffectiveValue < options.targetValue ? "Insufficient effective value" : null,
          effectiveUTXOs.length === 0 ? "No effective UTXOs" : null,
          tries >= maxTries ? "Exceeded maximum tries" : null
        ].filter(Boolean)
      });
      return null;
    }

    // Convert BasicUTXOs to full UTXOs for the result
    // Type assertion needed because TypeScript doesn't narrow the type properly after null check
    const selectedUTXOs = (bestSelection as BasicUTXO[]).map((basicUtxo: BasicUTXO) => this.basicToFullUTXO(basicUtxo));
    const totalValue = (bestSelection as BasicUTXO[]).reduce((sum: bigint, u: BasicUTXO) => sum + BigInt(u.value), 0n);
    const fee = this.calculateFeeForSelection(bestSelection as BasicUTXO[], outputs, options.feeRate);
    const change = Number(totalValue - options.targetValue - fee);

    logger.debug("transaction-utxo-service", {
      message: "Branch and Bound success",
      ...searchResults,
      finalResult: {
        inputs: selectedUTXOs.length,
        totalValue: Number(totalValue),
        fee: Number(fee),
        change: change < options.dustThreshold! ? 0 : change,
        waste: Number(bestWaste)
      }
    });

    return {
      inputs: selectedUTXOs,
      change: change < options.dustThreshold! ? 0 : change,
      fee: Number(fee),
      waste: Number(bestWaste),
      algorithm: "Branch and Bound"
    };
  }

  /**
   * Knapsack solver - tries to get close to target amount
   */
  private static knapsack(
    utxos: BasicUTXO[],
    outputs: Output[],
    options: SelectionOptions
  ): SelectionResult | null {
    // Use a target slightly higher than needed to account for fees
    const feeEstimate = this.estimateFeeForInputCount(3, outputs.length, options.feeRate);
    const targetWithFee = options.targetValue + feeEstimate + BigInt(options.dustThreshold! * 2);

    // Sort by value
    const sortedUTXOs = [...utxos].sort((a, b) => b.value - a.value);

    // Try to find a subset that gets close to target
    let bestSelection: BasicUTXO[] = [];
    let bestDiff = BigInt(Number.MAX_SAFE_INTEGER);

    // Dynamic programming approach
    const n = Math.min(sortedUTXOs.length, 50); // Limit for performance
    const dp: Map<string, BasicUTXO[]> = new Map();

    for (let i = 0; i < n; i++) {
      const utxo = sortedUTXOs[i];
      const newEntries: [string, BasicUTXO[]][] = [];

      // Try adding this UTXO to all existing combinations
      for (const [sumStr, selection] of dp) {
        const sum = BigInt(sumStr);
        const newSum = sum + BigInt(utxo.value);
        const newSelection = [...selection, utxo];

        if (newSum <= targetWithFee * 2n) { // Don't go too far over
          newEntries.push([newSum.toString(), newSelection]);

          const diff = newSum >= targetWithFee ?
            newSum - targetWithFee : targetWithFee - newSum;

          if (diff < bestDiff) {
            bestDiff = diff;
            bestSelection = newSelection;
          }
        }
      }

      // Add new entries
      for (const entry of newEntries) {
        dp.set(entry[0], entry[1]);
      }

      // Also consider just this UTXO
      dp.set(utxo.value.toString(), [utxo]);
      const diff = BigInt(utxo.value) >= targetWithFee ?
        BigInt(utxo.value) - targetWithFee : targetWithFee - BigInt(utxo.value);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSelection = [utxo];
      }
    }

    if (bestSelection.length === 0) {
      return null;
    }

    // Calculate actual fee and change
    const selectedUTXOs = (bestSelection as BasicUTXO[]).map(u => this.basicToFullUTXO(u));
    const totalValue = (bestSelection as BasicUTXO[]).reduce((sum, u) => sum + BigInt(u.value ?? 0), 0n);
    const fee = this.calculateFeeForSelection(bestSelection as BasicUTXO[], outputs, options.feeRate);

    if (totalValue < options.targetValue + fee) {
      return null; // Insufficient funds
    }

    const change = Number(totalValue - options.targetValue - fee);

    return {
      inputs: selectedUTXOs,
      change: change < options.dustThreshold! ? 0 : change,
      fee: Number(fee),
      waste: 0,
      algorithm: "Knapsack"
    };
  }

  /**
   * Single Random Draw - accumulates random inputs until target
   * Good for privacy as it creates varied input sets
   */
  private static singleRandomDraw(
    utxos: BasicUTXO[],
    outputs: Output[],
    options: SelectionOptions
  ): SelectionResult | null {
    const maxTries = options.maxTries || 1000;
    let bestResult: SelectionResult | null = null;
    let bestWaste = Number.MAX_SAFE_INTEGER;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      // Shuffle UTXOs
      const shuffled = [...utxos].sort(() => Math.random() - 0.5);
      const selected: BasicUTXO[] = [];
      let totalValue = 0n;

      for (const utxo of shuffled) {
        selected.push(utxo);
        totalValue += BigInt(utxo.value);

        const fee = this.calculateFeeForSelection(selected, outputs, options.feeRate);
        const totalNeeded = options.targetValue + fee;

        if (totalValue >= totalNeeded) {
          const change = Number(totalValue - totalNeeded);

          // Skip if change is dust
          if (change > 0 && change < options.dustThreshold!) {
            continue; // Try adding more inputs
          }

          const selectedUTXOs = selected.map(u => this.basicToFullUTXO(u));
          const result: SelectionResult = {
            inputs: selectedUTXOs,
            change: change < options.dustThreshold! ? 0 : change,
            fee: Number(fee),
            waste: 0,
            algorithm: "Single Random Draw"
          };

          const waste = this.calculateWaste(result, options);
          if (waste < bestWaste) {
            bestWaste = waste;
            bestResult = result;
            bestResult.waste = waste;
          }

          break; // Try next random selection
        }
      }
    }

    return bestResult;
  }

  /**
   * Largest First - simple greedy algorithm (fallback)
   */
  private static largestFirst(
    utxos: BasicUTXO[],
    outputs: Output[],
    options: SelectionOptions
  ): SelectionResult {
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    const selected: BasicUTXO[] = [];
    let totalValue = 0n;

    for (const utxo of sorted) {
      selected.push(utxo);
      totalValue += BigInt(utxo.value);

      const fee = this.calculateFeeForSelection(selected, outputs, options.feeRate);
      const totalNeeded = options.targetValue + fee;

      if (totalValue >= totalNeeded) {
        const change = Number(totalValue - totalNeeded);
        const selectedUTXOs = selected.map(u => this.basicToFullUTXO(u));

        return {
          inputs: selectedUTXOs,
          change: change < options.dustThreshold! ? 0 : change,
          fee: Number(fee),
          waste: 0,
          algorithm: "Largest First"
        };
      }
    }

    throw new Error("Insufficient funds for transaction");
  }

  /**
   * Calculate waste metric for a selection
   * Waste = inputs cost + change cost + excess
   */
  private static calculateWaste(
    result: SelectionResult,
    options: SelectionOptions
  ): number {
    const longTermFeeRate = options.longTermFeeRate || this.DEFAULT_LONG_TERM_FEE_RATE;

    // Cost of spending these inputs in the future
    const inputsCost = result.inputs.reduce((sum, input) => {
      const cost = this.estimateInputCost(input, longTermFeeRate);
      return sum + Number(cost);
    }, 0);

    // Cost of spending the change output in the future
    const changeCost = result.change > 0 ?
      Number(this.estimateInputCost({ 
        txid: "", 
        vout: 0, 
        value: result.change 
      } as BasicUTXO, longTermFeeRate)) : 0;

    // Excess is any extra amount paid in fees
    const excess = result.fee - Number(this.calculateFeeForSelection(
      result.inputs,
      [], // outputs not needed for min fee calc
      options.feeRate
    ));

    return inputsCost + changeCost * this.CHANGE_COST_WEIGHT + excess;
  }

  /**
   * Filter out UTXOs that cost more to spend than they're worth
   */
  private static filterDustUTXOs(utxos: BasicUTXO[], feeRate: number): BasicUTXO[] {
    return utxos.filter(utxo => {
      const cost = this.estimateInputCost(utxo, feeRate);
      return BigInt(utxo.value) > cost;
    });
  }

  /**
   * Estimate the cost to spend a UTXO at given fee rate
   */
  private static estimateInputCost(utxo: BasicUTXO, feeRate: number): bigint {
    // Assume P2WPKH (68 vbytes) if script type unknown
    const inputSize = utxo.scriptType ?
      this.getInputSize(utxo.scriptType) : 68;

    // Ensure minimum cost of 1 to prevent division by zero
    const cost = Math.ceil(inputSize * feeRate);
    return BigInt(Math.max(1, cost));
  }

  /**
   * Get input size in vbytes for different script types
   */
  private static getInputSize(scriptType: ScriptType): number {
    // Handle undefined or empty input
    if (!scriptType) return 68; // Default to P2WPKH
    
    switch (scriptType) {
      case "P2PKH": return 148;
      case "P2WPKH": return 68;
      case "P2SH": return 91; // Assuming P2SH-P2WPKH
      case "P2WSH": return 104; // Approximate
      case "P2TR": return 58; // Taproot
      case "OP_RETURN": return 0; // OP_RETURN outputs don't create spendable inputs
      case "UNKNOWN":
      default: return 68; // Default to P2WPKH
    }
  }

  /**
   * Calculate fee for a selection of UTXOs
   */
  private static calculateFeeForSelection(
    inputs: BasicUTXO[],
    outputs: Output[],
    feeRate: number
  ): bigint {
    try {
      // Convert to format expected by calculateMiningFee
      // Simple fee calculation
      // Base transaction overhead (version + locktime)
      let totalWeight = 10 * 4;

      // Add input weights
      for (const input of inputs) {
        const inputSize = this.getInputSize(input.scriptType || "P2WPKH");
        const isWitness = (input.scriptType || "P2WPKH").toUpperCase().includes("P2W");

        if (isWitness) {
          // For witness inputs: base bytes * 4 + witness bytes * 1
          totalWeight += 41 * 4 + 27 * 1; // Typical P2WPKH
        } else {
          totalWeight += inputSize * 4;
        }
      }

      // Add output weights
      // Process outputs
      for (const output of outputs) {
        if ('address' in output && output.address) {
          // Estimate based on address type
          if (output.address.startsWith('bc1')) {
            // P2WSH addresses are longer than P2WPKH
            // P2WPKH: bc1q... (42 chars)
            // P2WSH: bc1q... (62 chars)
            if (output.address.length > 50) {
              totalWeight += 43 * 4; // P2WSH output
            } else {
              totalWeight += 31 * 4; // P2WPKH output
            }
          } else if (output.address.startsWith('3')) {
            totalWeight += 32 * 4; // P2SH output
          } else {
            totalWeight += 34 * 4; // P2PKH output
          }
        } else {
          totalWeight += 31 * 4; // Default to P2WPKH
        }
      }

      // Add change output
      totalWeight += 31 * 4; // P2WPKH change

      // Convert weight to vbytes
      const vbytes = Math.ceil(totalWeight / 4);

      return BigInt(Math.ceil(vbytes * feeRate));
    } catch (error) {
      logger.error("transaction-utxo-service", {
        message: "Error calculating fee",
        error: error instanceof Error ? error.message : String(error),
        inputCount: inputs.length,
        outputCount: outputs.length,
        feeRate
      });
      // Fallback to simple calculation
      return this.estimateFeeForInputCount(inputs.length, outputs.length, feeRate);
    }
  }

  /**
   * Estimate fee for a given number of inputs
   */
  private static estimateFeeForInputCount(
    inputCount: number,
    outputCount: number,
    feeRate: number
  ): bigint {
    // Assume P2WPKH inputs (68 vbytes each)
    const baseSize = 10; // Version + locktime
    const inputSize = inputCount * 68;
    const outputSize = outputCount * 31 + 31; // Outputs + change
    const totalSize = baseSize + inputSize + outputSize;

    return BigInt(Math.ceil(totalSize * feeRate));
  }

  /**
   * Convert BasicUTXO to full UTXO format
   */
  private static basicToFullUTXO(basic: BasicUTXO): UTXO {
    const scriptType: ScriptType = basic.scriptType || "P2WPKH";
    return {
      ...basic,
      script: basic.script || "",
      scriptType: scriptType,
      scriptDesc: scriptType
    };
  }

  /**
   * Calculate median UTXO value from an array
   */
  private static calculateMedianUTXOValue(utxos: BasicUTXO[]): number {
    if (utxos.length === 0) return 0;

    const sortedValues = [...utxos].sort((a, b) => a.value - b.value);
    const mid = Math.floor(sortedValues.length / 2);

    if (sortedValues.length % 2 === 0) {
      const val1 = sortedValues[mid - 1].value;
      const val2 = sortedValues[mid].value;
      return Math.floor((val1 + val2) / 2);
    } else {
      return sortedValues[mid].value;
    }
  }

  /**
   * Generate selection recommendations based on analysis
   */
  private static generateSelectionRecommendations(
    spendableUTXOs: BasicUTXO[],
    totalWithFee: number,
    feeRate: number
  ): string[] {
    const recommendations: string[] = [];
    const totalAvailable = spendableUTXOs.reduce((sum, u) => sum + BigInt(u.value ?? 0), BigInt(0));
    const deficit = totalWithFee - Number(totalAvailable);

    if (deficit > 0) {
      recommendations.push(`Consider adding more UTXOs (e.g., from a different wallet or address).`);
    }

    if (spendableUTXOs.length === 0) {
      recommendations.push(`No spendable UTXOs available. Ensure your wallet has UTXOs and they are not locked.`);
    }

    if (feeRate > 0) {
      recommendations.push(`Consider lowering the fee rate (sat/vb) to reduce the total fee.`);
    }

    if (totalWithFee > 0 && totalAvailable > 0) {
      recommendations.push(`The total required (${totalWithFee} sats) is greater than the available funds (${totalAvailable} sats).`);
    }

    return recommendations;
  }
}

/**
 * Backward compatibility wrapper for existing code
 */
export function selectOptimalUTXOs(
  utxos: BasicUTXO[],
  outputs: Output[],
  feeRate: number,
  options?: Partial<SelectionOptions>
): SelectionResult {
  return OptimalUTXOSelection.selectUTXOs(utxos as BasicUTXO[], outputs, feeRate, options);
}
