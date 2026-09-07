import { assertEquals } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import { extractPrevTxsFromPSBT } from "$lib/utils/bitcoin/psbt/psbtUtils.ts";

// A minimal P2PKH-style output script (OP_DUP OP_HASH160 <20> OP_EQUALVERIFY
// OP_CHECKSIG) — enough to stand in for a legacy previous output.
const p2pkhScript = bitcoin.script.compile([
  bitcoin.opcodes.OP_DUP,
  bitcoin.opcodes.OP_HASH160,
  new Uint8Array(20),
  bitcoin.opcodes.OP_EQUALVERIFY,
  bitcoin.opcodes.OP_CHECKSIG,
]);

function buildPrevTx(): bitcoin.Transaction {
  const prevTx = new bitcoin.Transaction();
  prevTx.version = 2;
  prevTx.addInput(new Uint8Array(32), 0xffffffff);
  prevTx.addOutput(p2pkhScript, 100_000n);
  return prevTx;
}

Deno.test("extractPrevTxsFromPSBT - legacy input, keyed by display txid", () => {
  const prevTx = buildPrevTx();
  const psbt = new bitcoin.Psbt();
  psbt.addInput({
    hash: prevTx.getId(),
    index: 0,
    nonWitnessUtxo: prevTx.toBuffer(),
  });
  psbt.addOutput({ script: p2pkhScript, value: 90_000n });

  const prevTxs = extractPrevTxsFromPSBT(psbt.toHex());

  assertEquals(Object.keys(prevTxs).length, 1);
  assertEquals(prevTxs[prevTx.getId()], prevTx.toHex());
});

Deno.test("extractPrevTxsFromPSBT - segwit-only PSBT yields an empty map", () => {
  const psbt = new bitcoin.Psbt();
  psbt.addInput({
    hash: new Uint8Array(32),
    index: 0,
    witnessUtxo: { script: p2pkhScript, value: 100_000n },
  });
  psbt.addOutput({ script: p2pkhScript, value: 90_000n });

  assertEquals(extractPrevTxsFromPSBT(psbt.toHex()), {});
});

Deno.test("extractPrevTxsFromPSBT - unparseable input returns an empty map", () => {
  assertEquals(extractPrevTxsFromPSBT("not-a-psbt"), {});
});
