/**
 * Which output of an attach transaction receives the stamp.
 *
 * Counterparty credits the attach to `destination_vout`, or to the first
 * non-OP_RETURN output when that is omitted. A service fee can drop the
 * change output and append a fee output, so the index in Counterparty's
 * raw transaction is not always the index in the PSBT we hand the wallet.
 */

export interface AttachOutput {
  script: Uint8Array;
  value: bigint;
}

export function isOpReturnScript(script: Uint8Array): boolean {
  return script.length > 0 && script[0] === 0x6a;
}

function scriptsEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function firstPayableVout(outputs: AttachOutput[]): number {
  return outputs.findIndex((output) => !isOpReturnScript(output.script));
}

/**
 * @param cpOutputs Outputs Counterparty composed, before the service-fee splice.
 * @param finalOutputs Outputs actually added to the PSBT.
 * @param requested `options.destination_vout` when the caller set one.
 */
export function resolveAttachDestinationVout(
  cpOutputs: AttachOutput[],
  finalOutputs: AttachOutput[],
  requested?: number,
): number {
  const fallback = firstPayableVout(finalOutputs);
  if (fallback === -1) {
    throw new Error("Attach transaction has no non-OP_RETURN output");
  }

  const requestedIsUsable = requested !== undefined &&
    Number.isInteger(requested) &&
    requested >= 0 &&
    requested < cpOutputs.length &&
    !isOpReturnScript(cpOutputs[requested].script);

  if (!requestedIsUsable) return fallback;

  const target = cpOutputs[requested];
  if (
    requested < finalOutputs.length &&
    scriptsEqual(finalOutputs[requested].script, target.script) &&
    !isOpReturnScript(finalOutputs[requested].script)
  ) {
    return requested;
  }

  // An earlier output was removed (change dropped below dust). Find the
  // same script at its new index. Value may be lower when the fee was
  // spliced out of that output.
  const shifted = finalOutputs.findIndex((output) =>
    scriptsEqual(output.script, target.script) &&
    !isOpReturnScript(output.script) &&
    output.value <= target.value
  );
  return shifted === -1 ? fallback : shifted;
}
