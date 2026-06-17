// Pure helpers for aligning a Bitcoin Stamp issuance's funding inputs with the
// Counterparty composer, so the ARC4-encrypted OP_RETURN stays decodable by the
// Counterparty indexer.
//
// Background: the Counterparty indexer derives the ARC4 OP_RETURN key ONLY from
// vin[0].previous_output.txid and drops any transaction whose decrypted
// OP_RETURN does not start with the "CNTRPRTY" prefix. When stampchain pins the
// exact UTXO set via the compose API's `inputs_set`, the Counterparty composer
// sorts that set by raw value descending (stable, no secondary key) and keys
// ARC4 off the first entry. To keep our broadcast vin[0] equal to that key we
// MUST order our inputs the same way and send `inputs_set` in that exact order.
//
// These functions are intentionally pure (no I/O) so the ordering, serialization
// and ARC4 round-trip can be unit-tested in isolation.

import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import { arc4 } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";

/** Fields needed to order UTXOs the way the Counterparty composer does. */
export interface OrderableInput {
  txid: string; // display-order txid hex
  vout: number;
  value: number; // satoshis
}

/** Minimal UTXO shape required to build a Counterparty `inputs_set`. */
export interface CounterpartyInput extends OrderableInput {
  script?: string; // scriptPubKey hex (required at serialization time)
}

export const CNTRPRTY_PREFIX = "CNTRPRTY";

/**
 * Order UTXOs exactly the way the Counterparty composer does
 * (composer.py:798 — `sorted(..., key=value, reverse=True)`): raw value
 * descending. Python's sort is stable with no secondary key, so we add a
 * deterministic `(txid, vout)` tiebreak and send `inputs_set` in this same
 * order. The result's first element is the UTXO Counterparty keys ARC4 against,
 * which the caller pins to input index 0 of the broadcast transaction.
 */
export function orderInputsForCounterparty<T extends OrderableInput>(
  inputs: readonly T[],
): T[] {
  return [...inputs].sort(
    (a, b) =>
      (b.value - a.value) ||
      a.txid.localeCompare(b.txid) ||
      (a.vout - b.vout),
  );
}

/**
 * Serialize ordered UTXOs into a Counterparty `inputs_set` string
 * (`txid:vout:value:scriptPubKeyHex`, comma-joined). `value` is emitted as an
 * integer satoshi count — Counterparty runs `int(value)` and rejects a decimal
 * string with "invalid value" (composer.py:667).
 */
export function formatInputsSet(
  orderedInputs: readonly CounterpartyInput[],
): string {
  return orderedInputs
    .map((u) => {
      if (!u.script) {
        throw new Error(
          `UTXO ${u.txid}:${u.vout} is missing its scriptPubKey; cannot ` +
            `serialize it into a Counterparty inputs_set.`,
        );
      }
      return `${u.txid}:${u.vout}:${Math.round(u.value)}:${u.script}`;
    })
    .join(",");
}

/**
 * Extract the data push from an OP_RETURN scriptPubKey. Returns null when the
 * script is not an OP_RETURN carrying a single data payload.
 */
export function extractOpReturnPayload(scriptHex: string): Uint8Array | null {
  if (!scriptHex) return null;
  const buf = Buffer.from(scriptHex, "hex");
  if (buf.length === 0 || buf[0] !== 0x6a) return null; // 0x6a = OP_RETURN
  const decompiled = bitcoin.script.decompile(buf);
  if (!decompiled || decompiled.length < 2) return null;
  const last = decompiled[decompiled.length - 1];
  return Buffer.isBuffer(last) ? new Uint8Array(last) : null;
}

/**
 * Fail-closed guard mirroring the Counterparty indexer: decrypt the OP_RETURN
 * payload with the ARC4 key derived from `vin0Txid` (display byte order, which
 * is what the indexer uses) and report whether the plaintext carries the
 * CNTRPRTY prefix. Returns false (rather than throwing) for malformed scripts so
 * callers can decide how to surface the failure.
 *
 * @param opReturnScriptHex scriptPubKey hex of the OP_RETURN output
 * @param vin0Txid          display-order txid hex of input index 0
 */
export function opReturnDecodesFromInput(
  opReturnScriptHex: string,
  vin0Txid: string,
): boolean {
  const payload = extractOpReturnPayload(opReturnScriptHex);
  if (!payload || payload.length < CNTRPRTY_PREFIX.length) return false;
  const key = new Uint8Array(hex2bin(vin0Txid));
  if (key.length === 0) return false;
  const decrypted = arc4(key, payload);
  return Buffer.from(decrypted.subarray(0, CNTRPRTY_PREFIX.length)).toString(
    "utf8",
  ) === CNTRPRTY_PREFIX;
}
