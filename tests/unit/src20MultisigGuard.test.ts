import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { arc4 } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { bin2hex, hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import {
  assertMultisigPayloadDecodesFromInput,
  extractMultisigPayloadSegments,
  multisigPayloadDecodesFromInput,
  reassembleMultisigPayload,
} from "$lib/utils/bitcoin/minting/src20MultisigGuard.ts";

// Two distinct, valid 32-byte (64 hex char) txids. Built via repeat() so no
// 64-char hex literal sits in source (it trips the secret-leak guard). ARC4
// accepts any key length, so synthetic txids exercise the logic identically to
// real inputs. These mirror the ARC4 key the SRC-20/101 services derive from
// inputs[0].txid (display byte order, what the indexer uses: vin.prevout.hash[::-1]).
const TXID_A = "a1".repeat(32);
const TXID_B = "b2".repeat(32);

// The constant 1-of-3 third pubkey the services use as filler (33 bytes of 0x02).
// Built via repeat() to avoid a long hex literal tripping the secret-leak guard.
const THIRD_PUBKEY = "02".repeat(33);

/**
 * Build the bare-multisig data outputs EXACTLY the way the SRC-20/101 services
 * do: take the "stamp:" plaintext, prepend the 2-byte length prefix, pad to a
 * multiple of 62 bytes, ARC4-encrypt with the given txid, chunk into 62-byte
 * segments, and emit one `5121<pk1>21<pk2>21<THIRD>53ae` script per chunk where
 * pk1/pk2 = sign-byte(1) || 31 data bytes || trailing-byte(1).
 *
 * We use deterministic 0x02 sign + 0x00 trailing bytes so the test is stable;
 * the guard ignores those bytes (it reads only the 31 data bytes of each pubkey).
 */
function buildMultisigOutputs(
  txidHex: string,
  tail = '{"p":"src-20","op":"mint","tick":"KEVIN","amt":"1"}',
): string[] {
  const stampPrefix = new TextEncoder().encode("stamp:");
  const tailBytes = new TextEncoder().encode(tail);
  const dataWithPrefix = new Uint8Array([...stampPrefix, ...tailBytes]);

  let dataLength = dataWithPrefix.length;
  while (dataLength > 0 && dataWithPrefix[dataLength - 1] === 0) dataLength--;
  const lengthPrefix = new Uint8Array([
    (dataLength >> 8) & 0xff,
    dataLength & 0xff,
  ]);

  let payloadBytes = new Uint8Array([...lengthPrefix, ...dataWithPrefix]);
  const padLength = (62 - (payloadBytes.length % 62)) % 62;
  if (padLength > 0) {
    payloadBytes = new Uint8Array([
      ...payloadBytes,
      ...new Uint8Array(padLength),
    ]);
  }

  const encrypted = arc4(new Uint8Array(hex2bin(txidHex)), payloadBytes);

  const scripts: string[] = [];
  for (let i = 0; i < encrypted.length; i += 62) {
    const chunk = encrypted.slice(i, i + 62);
    const seg1 = bin2hex(chunk.slice(0, 31));
    const seg2 = bin2hex(chunk.slice(31, 62));
    // sign byte 02, 31 data bytes, trailing byte 00 -> 33-byte pubkey
    const pubkey1 = "02" + seg1 + "00";
    const pubkey2 = "02" + seg2 + "00";
    scripts.push(`5121${pubkey1}21${pubkey2}21${THIRD_PUBKEY}53ae`);
  }
  return scripts;
}

// ---------------------------------------------------------------------------
// extractMultisigPayloadSegments
// ---------------------------------------------------------------------------

Deno.test("extractMultisigPayloadSegments - returns the 62 data bytes of a multisig output", () => {
  const seg1 = "11".repeat(31);
  const seg2 = "22".repeat(31);
  const script = `5121${"02" + seg1 + "00"}21${
    "02" + seg2 + "00"
  }21${THIRD_PUBKEY}53ae`;
  const out = extractMultisigPayloadSegments(script);
  assert(out !== null);
  assertEquals(out!.length, 62);
  assertEquals(bin2hex(out!.slice(0, 31)), seg1);
  assertEquals(bin2hex(out!.slice(31, 62)), seg2);
});

Deno.test("extractMultisigPayloadSegments - returns null for a non-multisig script", () => {
  // P2WPKH-style scriptPubKey (starts with 0x00, not OP_1 0x51).
  assertEquals(extractMultisigPayloadSegments("0014" + "ab".repeat(20)), null);
  assertEquals(extractMultisigPayloadSegments(""), null);
});

Deno.test("extractMultisigPayloadSegments - returns null when fewer than two pubkeys are present", () => {
  // OP_1 + a single 33-byte pubkey push, then OP_RETURN-ish garbage.
  const script = `5121${"02" + "11".repeat(31) + "00"}6a`;
  assertEquals(extractMultisigPayloadSegments(script), null);
});

// ---------------------------------------------------------------------------
// reassembleMultisigPayload
// ---------------------------------------------------------------------------

Deno.test("reassembleMultisigPayload - concatenates segments across outputs in order", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  const reassembled = reassembleMultisigPayload(scripts);
  assert(reassembled !== null);
  // Length must be a multiple of 62 (one 62-byte block per output).
  assertEquals(reassembled!.length % 62, 0);
  assertEquals(reassembled!.length, scripts.length * 62);
});

Deno.test("reassembleMultisigPayload - returns null on empty input", () => {
  assertEquals(reassembleMultisigPayload([]), null);
});

Deno.test("reassembleMultisigPayload - returns null if any output is malformed", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  scripts.push("0014" + "ab".repeat(20)); // a non-multisig output
  assertEquals(reassembleMultisigPayload(scripts), null);
});

// ---------------------------------------------------------------------------
// multisigPayloadDecodesFromInput — the fail-closed ARC4 guard (core invariant)
// ---------------------------------------------------------------------------

Deno.test("multisigPayloadDecodesFromInput - true when matched to the given vin[0] (round-trip)", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  assert(multisigPayloadDecodesFromInput(scripts, TXID_A));
});

Deno.test("multisigPayloadDecodesFromInput - false when matched to a DIFFERENT vin[0] (the indexer-drop bug)", () => {
  // Payload encrypted against TXID_A (the input the services derived ARC4 from)
  // but the transaction's vin[0] ended up being TXID_B — exactly the case the
  // btc_stamps indexer silently drops.
  const scripts = buildMultisigOutputs(TXID_A);
  assertFalse(multisigPayloadDecodesFromInput(scripts, TXID_B));
});

Deno.test("multisigPayloadDecodesFromInput - false for empty / malformed outputs", () => {
  assertFalse(multisigPayloadDecodesFromInput([], TXID_A));
  assertFalse(
    multisigPayloadDecodesFromInput(["0014" + "ab".repeat(20)], TXID_A),
  );
});

Deno.test("multisigPayloadDecodesFromInput - false when vin[0] txid is empty", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  assertFalse(multisigPayloadDecodesFromInput(scripts, ""));
});

// ---------------------------------------------------------------------------
// assertMultisigPayloadDecodesFromInput — throwing wrapper used by the services
// ---------------------------------------------------------------------------

Deno.test("assertMultisigPayloadDecodesFromInput - passes silently for a correctly matched payload", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  // Should not throw.
  assertMultisigPayloadDecodesFromInput(scripts, TXID_A, "SRC-20");
});

Deno.test("assertMultisigPayloadDecodesFromInput - throws a clear fail-closed error for a wrong-vin[0] payload", () => {
  const scripts = buildMultisigOutputs(TXID_A);
  assertThrows(
    () => assertMultisigPayloadDecodesFromInput(scripts, TXID_B, "SRC-101"),
    Error,
    "ARC4 key mismatch for SRC-101",
  );
});
