// Pure helpers for a fail-closed ARC4 guard over SRC-20 / SRC-101 multisig
// issuances, mirroring the btc_stamps indexer's decode path.
//
// Background: unlike stamps/fairmint (which carry the ARC4-encrypted Counterparty
// payload in an OP_RETURN), SRC-20 and SRC-101 carry their encrypted payload in
// BARE-MULTISIG data outputs of the form:
//
//     5121<pubkey1>21<pubkey2>21<THIRD_PUBKEY>53ae
//
// where pubkey1 and pubkey2 are each 33 bytes = sign-byte(1) || 31 data bytes ||
// trailing-byte(1). So 31 + 31 = 62 encrypted payload bytes are recoverable per
// output, in output order. The indexer (and the building services) key ARC4 off
// the txid of vin[0] (display byte order): `vin.prevout.hash[::-1]`.
//
// The building services construct the plaintext payload as:
//
//     [ 2-byte length prefix ] [ "stamp:" ] [ transfer data ] [ zero padding ]
//
// then ARC4-encrypt with hex2bin(inputs[0].txid). This guard reverses that:
// reassemble the ciphertext from the multisig pubkey segments, decrypt with the
// claimed vin[0] txid, and assert the plaintext begins with the length-prefixed
// "stamp:" structure. A mismatch means the transaction's vin[0] is NOT the input
// the payload was keyed against — the indexer would silently drop it — so the
// caller MUST abort rather than broadcast an unindexable transaction.
//
// These functions are intentionally pure (no I/O) so the reassembly and ARC4
// round-trip can be unit-tested in isolation.

import { arc4 } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";

/** The plaintext marker that follows the 2-byte length prefix. */
export const STAMP_PREFIX = "stamp:";

/** Length, in bytes, of the leading length prefix in the plaintext payload. */
export const LENGTH_PREFIX_LEN = 2;

/** Bytes of encrypted payload recovered from each 33-byte multisig pubkey. */
const DATA_BYTES_PER_PUBKEY = 31;

/**
 * Extract the two data-bearing pubkey segments (31 bytes each) from a single
 * bare-multisig data output script of the canonical SRC-20/101 form
 * `5121<pubkey1>21<pubkey2>21<THIRD_PUBKEY>53ae`.
 *
 * Each pubkey is 33 bytes: a leading sign byte, 31 data bytes, and a trailing
 * byte. We return only the 31 data bytes from the FIRST TWO pubkeys (the third
 * pubkey is a constant filler that carries no payload), concatenated as 62
 * bytes. Returns null when the script is not a parseable 1-of-3 multisig with at
 * least two 33-byte pubkeys.
 */
export function extractMultisigPayloadSegments(
  scriptHex: string,
): Uint8Array | null {
  if (!scriptHex) return null;
  let buf: Uint8Array;
  try {
    buf = new Uint8Array(hex2bin(scriptHex));
  } catch {
    return null;
  }
  // Minimum: OP_1 (0x51) + push33 (0x21) + 33 + push33 (0x21) + 33 ...
  // First byte must be OP_1 (0x51) for a 1-of-N bare multisig.
  if (buf.length < 2 || buf[0] !== 0x51) return null;

  const segments: Uint8Array[] = [];
  let i = 1;
  // Walk the leading 33-byte pushes; we only need the first two.
  while (segments.length < 2 && i < buf.length) {
    const pushLen = buf[i];
    if (pushLen !== 0x21) break; // not a 33-byte pubkey push
    const start = i + 1;
    const end = start + 0x21;
    if (end > buf.length) return null;
    // Drop the leading sign byte and the trailing byte; keep 31 data bytes.
    segments.push(buf.subarray(start + 1, start + 1 + DATA_BYTES_PER_PUBKEY));
    i = end;
  }

  if (segments.length < 2) return null;

  const out = new Uint8Array(DATA_BYTES_PER_PUBKEY * 2);
  out.set(segments[0], 0);
  out.set(segments[1], DATA_BYTES_PER_PUBKEY);
  return out;
}

/**
 * Reassemble the full encrypted payload from an ordered list of multisig data
 * output scripts (62 bytes per output, in output order). Returns null if any
 * output is not a parseable multisig data output, so the caller fails closed.
 */
export function reassembleMultisigPayload(
  multisigScriptHexes: readonly string[],
): Uint8Array | null {
  if (multisigScriptHexes.length === 0) return null;
  const parts: Uint8Array[] = [];
  for (const scriptHex of multisigScriptHexes) {
    const seg = extractMultisigPayloadSegments(scriptHex);
    if (!seg) return null;
    parts.push(seg);
  }
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Fail-closed guard mirroring the btc_stamps indexer: reassemble the encrypted
 * payload from the multisig data outputs, ARC4-decrypt it with the key derived
 * from `vin0Txid` (display byte order — `vin.prevout.hash[::-1]`, which is what
 * the indexer uses), and report whether the plaintext carries the length-prefixed
 * `stamp:` structure the services build before encryption.
 *
 * Returns false (rather than throwing) for malformed/empty input so callers can
 * decide how to surface the failure.
 *
 * @param multisigScriptHexes ordered scriptPubKey hexes of the multisig data outputs
 * @param vin0Txid            display-order txid hex of input index 0
 */
export function multisigPayloadDecodesFromInput(
  multisigScriptHexes: readonly string[],
  vin0Txid: string,
): boolean {
  const ciphertext = reassembleMultisigPayload(multisigScriptHexes);
  if (
    !ciphertext || ciphertext.length < LENGTH_PREFIX_LEN + STAMP_PREFIX.length
  ) {
    return false;
  }
  let key: Uint8Array;
  try {
    key = new Uint8Array(hex2bin(vin0Txid));
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const decrypted = arc4(key, ciphertext);
  // Skip the 2-byte length prefix; the plaintext marker is "stamp:".
  const marker = decrypted.subarray(
    LENGTH_PREFIX_LEN,
    LENGTH_PREFIX_LEN + STAMP_PREFIX.length,
  );
  return new TextDecoder().decode(marker) === STAMP_PREFIX;
}

/**
 * Assert the multisig payload decodes from vin[0]; throw a clear fail-closed
 * error otherwise. Wired into the SRC-20/101 PSBT services after inputs are
 * added, before returning, so an ARC4-key/vin[0] mismatch aborts the build
 * rather than emitting a transaction the indexer would silently drop.
 *
 * @param multisigScriptHexes ordered scriptPubKey hexes of the multisig data outputs
 * @param vin0Txid            display-order txid hex of broadcast input index 0
 * @param context             label for the error message (e.g. "SRC-20", "SRC-101")
 */
export function assertMultisigPayloadDecodesFromInput(
  multisigScriptHexes: readonly string[],
  vin0Txid: string,
  context: string,
): void {
  if (!multisigPayloadDecodesFromInput(multisigScriptHexes, vin0Txid)) {
    throw new Error(
      `ARC4 key mismatch for ${context}: the multisig data outputs do not ` +
        `decode from vin[0] (${vin0Txid}). Aborting to avoid broadcasting an ` +
        `unindexable transaction.`,
    );
  }
}
