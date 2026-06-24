/**
 * Shared helper for assembling the output set of a Counterparty-composed
 * transaction that we reconstruct into a PSBT (attach, and — as this is
 * consolidated — send/detach/mint).
 *
 * Core principle (matches `routes/api/v2/create/send.ts`, #1137): **trust
 * Counterparty's composed outputs.** CP has already deducted its network fee
 * and computed the change back to the source address, so we do NOT re-derive a
 * network fee or add a second change output. The previous stampattach code did
 * exactly that, double-counting the fee (`change = cpFee − ourFee`) and
 * producing a constant ~279-sat deficit on every wallet (#959).
 *
 * The only thing we optionally add on top of CP's outputs is an **operator
 * service fee**, funded by reducing CP's change output (an optional "service"
 * layer the operator enables via env vars). This module is pure and codec-
 * injected so it can be unit-tested without bitcoinjs/network coupling.
 */

export interface TxOutput {
  /** raw scriptPubKey */
  script: Uint8Array;
  /** value in satoshis */
  value: bigint;
}

export interface ServiceFeeOutputsParams {
  /** Counterparty's composed outputs, in order (includes CP's change). */
  cpOutputs: TxOutput[];
  /** Sum of the user's inputs the PSBT spends. */
  sumOfUserInputs: bigint;
  /** Source/change address (CP sends change back here). */
  sourceAddress: string;
  /** Operator service fee in sats (0 disables the service-fee output). */
  serviceFeeSats: bigint;
  /** Destination for the service fee; required when serviceFeeSats > 0. */
  serviceFeeAddress?: string | undefined;
  /** Dust threshold; a change output below this is dropped (rolls into fee). */
  dustSize: bigint;
  /** Decode a scriptPubKey to an address, or undefined if not address-like. */
  decodeAddress: (script: Uint8Array) => string | undefined;
  /** Encode an address to a scriptPubKey. */
  encodeAddress: (address: string) => Uint8Array;
}

export interface ServiceFeeOutputsResult {
  /** Final outputs to add to the PSBT, in order. */
  outputs: TxOutput[];
  /** CP's implicit miner fee: sumOfUserInputs − Σ(cpOutputs). */
  cpNetworkFee: bigint;
  /** Service fee actually added (0 if none). */
  serviceFeeAdded: bigint;
  /**
   * Total cost to the user beyond the attach itself: the on-chain miner fee
   * (inputs − final outputs) plus the service fee. Suitable for `estimatedFee`.
   */
  totalFee: bigint;
}

/**
 * Reconstruct the final output set, optionally splicing an operator service fee
 * out of Counterparty's change output.
 *
 * @throws Error (message contains "insufficient funds") when a service fee is
 * requested but there is no change output, or the change cannot cover it.
 */
export function buildServiceFeeOutputs(
  params: ServiceFeeOutputsParams,
): ServiceFeeOutputsResult {
  const {
    cpOutputs,
    sumOfUserInputs,
    sourceAddress,
    serviceFeeSats,
    serviceFeeAddress,
    dustSize,
    decodeAddress,
    encodeAddress,
  } = params;

  const cpOutputsTotal = cpOutputs.reduce((sum, o) => sum + o.value, 0n);
  const cpNetworkFee = sumOfUserInputs - cpOutputsTotal;
  if (cpNetworkFee < 0n) {
    // CP's own composition is internally consistent (inputs ≥ outputs); a
    // negative here means we mis-summed the inputs — fail loud rather than emit
    // a transaction that can't be mined.
    throw new Error(
      `insufficient funds: inputs ${sumOfUserInputs} do not cover Counterparty outputs ${cpOutputsTotal}`,
    );
  }

  // Default path (service fee disabled): trust CP's outputs verbatim.
  const outputs: TxOutput[] = cpOutputs.map((o) => ({
    script: o.script,
    value: o.value,
  }));
  let serviceFeeAdded = 0n;

  if (serviceFeeSats > 0n && serviceFeeAddress) {
    // Find CP's change output: the last output paying back to the source.
    let changeIndex = -1;
    for (let i = outputs.length - 1; i >= 0; i--) {
      const addr = decodeAddress(outputs[i].script);
      if (addr === sourceAddress) {
        changeIndex = i;
        break;
      }
    }
    if (changeIndex === -1) {
      throw new Error(
        "insufficient funds: no change output available to fund the service fee",
      );
    }

    const reducedChange = outputs[changeIndex].value - serviceFeeSats;
    if (reducedChange < 0n) {
      throw new Error(
        `insufficient funds: change ${
          outputs[changeIndex].value
        } cannot cover service fee ${serviceFeeSats}`,
      );
    }

    if (reducedChange < dustSize) {
      // Reduced change would be dust — drop it (its value rolls into the miner
      // fee) rather than create an unspendable output.
      outputs.splice(changeIndex, 1);
    } else {
      outputs[changeIndex] = {
        script: outputs[changeIndex].script,
        value: reducedChange,
      };
    }

    outputs.push({
      script: encodeAddress(serviceFeeAddress),
      value: serviceFeeSats,
    });
    serviceFeeAdded = serviceFeeSats;
  }

  const finalOutputsTotal = outputs.reduce((sum, o) => sum + o.value, 0n);
  const minerFee = sumOfUserInputs - finalOutputsTotal;
  const totalFee = minerFee + serviceFeeAdded;

  return { outputs, cpNetworkFee, serviceFeeAdded, totalFee };
}
