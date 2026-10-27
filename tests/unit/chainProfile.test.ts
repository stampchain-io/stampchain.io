import { assert, assertEquals, assertThrows } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import {
  applyReplayProtection,
  assertReplayProtected,
  ECX_REPLAY_LOCKTIME,
  getChainId,
  isReplayProtected,
  SEQUENCE_FINAL,
  SEQUENCE_RBF,
} from "$server/services/chain/chainProfile.ts";

const env = (v?: string) => ({ get: (k: string) => (k === "CHAIN" ? v : undefined) });
const TXID = "11".repeat(32);
const script = new Uint8Array(22).fill(0);
script[1] = 20; // OP_0 <20 bytes> (p2wpkh-shaped)

function psbtWith(...sequences: number[]): bitcoin.Psbt {
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  sequences.forEach((sequence, index) =>
    psbt.addInput({ hash: TXID, index, sequence, witnessUtxo: { script, value: 10_000n } })
  );
  psbt.addOutput({ script, value: 5_000n });
  return psbt;
}

function unsignedHex(psbt: bitcoin.Psbt): string {
  // deno-lint-ignore no-explicit-any
  return (psbt as any).__CACHE.__TX.toHex();
}

Deno.test("getChainId defaults to bitcoin and rejects unknown chains", () => {
  assertEquals(getChainId(env(undefined)), "bitcoin");
  assertEquals(getChainId(env("")), "bitcoin");
  assertEquals(getChainId(env("ECX")), "ecx");
  assertThrows(() => getChainId(env("betanet")));
});

Deno.test("bitcoin profile leaves locktime and sequences untouched", () => {
  const psbt = psbtWith(SEQUENCE_FINAL);
  applyReplayProtection(psbt, "bitcoin");
  assertEquals(psbt.locktime, 0);
  assertEquals(psbt.txInputs[0].sequence, SEQUENCE_FINAL);
});

Deno.test("ecx profile sets the marker and keeps an existing non-final input", () => {
  const psbt = psbtWith(SEQUENCE_RBF, SEQUENCE_FINAL);
  applyReplayProtection(psbt, "ecx");
  assertEquals(psbt.locktime, ECX_REPLAY_LOCKTIME);
  assertEquals(psbt.txInputs.map((i) => i.sequence), [SEQUENCE_RBF, SEQUENCE_FINAL]);
  assert(isReplayProtected(bitcoin.Transaction.fromHex(unsignedHex(psbt))));
});

Deno.test("ecx profile makes vin[0] non-final when every input is final", () => {
  const psbt = psbtWith(SEQUENCE_FINAL, SEQUENCE_FINAL);
  applyReplayProtection(psbt, "ecx");
  assertEquals(psbt.txInputs[0].sequence, SEQUENCE_RBF);
  assertEquals(psbt.txInputs[1].sequence, SEQUENCE_FINAL);
});

Deno.test("assertReplayProtected rejects missing marker, betanet value and all-final inputs", () => {
  const ok = psbtWith(SEQUENCE_RBF);
  applyReplayProtection(ok, "ecx");
  assertReplayProtected(unsignedHex(ok), "ecx");

  assertThrows(() => assertReplayProtected(unsignedHex(psbtWith(SEQUENCE_RBF)), "ecx"));
  const betanet = psbtWith(SEQUENCE_RBF);
  betanet.setLocktime(499_999_999);
  assertThrows(() => assertReplayProtected(unsignedHex(betanet), "ecx"));
  const allFinal = psbtWith(SEQUENCE_FINAL);
  allFinal.setLocktime(ECX_REPLAY_LOCKTIME);
  assertThrows(() => assertReplayProtected(unsignedHex(allFinal), "ecx"));
  // bitcoin profile never blocks
  assertReplayProtected(unsignedHex(psbtWith(SEQUENCE_FINAL)), "bitcoin");
});
