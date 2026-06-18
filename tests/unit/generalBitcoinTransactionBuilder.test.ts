import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing@1.0.14/mock";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import { arc4 } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import { GeneralBitcoinTransactionBuilder } from "$server/services/transaction/generalBitcoinTransactionBuilder.ts";
import { OptimalUTXOSelection } from "$server/services/utxo/optimalUtxoSelection.ts";

// Synthetic txids (repeat() so no 64-char hex literal trips the secret-leak guard).
const TXID_A = "a1".repeat(32); // Counterparty's vin[0] = the ARC4 key input
const TXID_B = "b2".repeat(32); // an unrelated funding UTXO our selector prefers
const P2WPKH_SCRIPT = "0014" + "11".repeat(20);
const CHANGE_ADDR = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

/** Build a Counterparty-style raw tx hex: optional input + an OP_RETURN that is
 *  ARC4-encrypted (CNTRPRTY-prefixed) against `keyTxid`. */
function buildCpRawHex(keyTxid: string, withInput: boolean): string {
  const payload = new Uint8Array([
    ...new TextEncoder().encode("CNTRPRTY"),
    ...new TextEncoder().encode("fairmint-test-payload"),
  ]);
  const enc = arc4(new Uint8Array(hex2bin(keyTxid)), payload);
  const opReturn = bitcoin.script.compile([bitcoin.opcodes.OP_RETURN, Buffer.from(enc)]);
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  if (withInput) {
    // CP's vin[0] prev-txid == keyTxid (hash stored internal/LE -> reverse display hex)
    tx.addInput(Buffer.from(hex2bin(keyTxid)).reverse(), 0);
  }
  tx.addOutput(opReturn, BigInt(0));
  return tx.toHex();
}

const utxo = (txid: string) => ({
  txid,
  vout: 0,
  value: 50000,
  script: P2WPKH_SCRIPT,
  scriptType: "P2WPKH",
});

function vin0Txid(psbt: bitcoin.Psbt): string {
  return Buffer.from(psbt.txInputs[0].hash).reverse().toString("hex");
}

Deno.test("generatePSBT - pins Counterparty vin[0] at PSBT index 0 even when the selector orders it elsewhere", async () => {
  const cpRawHex = buildCpRawHex(TXID_A, true);
  // Selector returns CP's vin[0] (utxo A) NOT first — the builder must move it to index 0.
  const selStub = stub(
    OptimalUTXOSelection,
    "selectUTXOs",
    () => ({ inputs: [utxo(TXID_B), utxo(TXID_A)], change: 0, fee: 1000 }) as any,
  );
  const poolStub = stub(
    GeneralBitcoinTransactionBuilder as any,
    "getFullUTXOsWithDetails",
    () => Promise.resolve([utxo(TXID_A), utxo(TXID_B)]),
  );
  try {
    const res = await GeneralBitcoinTransactionBuilder.generatePSBT(cpRawHex, {
      address: CHANGE_ADDR,
      satsPerVB: 5,
      operationType: "fairmint",
      customOutputs: [],
    });
    // vin[0] is CP's ARC4 key input, regardless of selector order...
    assertEquals(vin0Txid(res.psbt), TXID_A);
    // ...and the build succeeded (the fail-closed ARC4 guard passed).
    assert(res.psbt.txInputs.length === 2);
  } finally {
    selStub.restore();
    poolStub.restore();
  }
});

Deno.test("generatePSBT - fail-closed ARC4 guard aborts when vin[0] is NOT the OP_RETURN key input", async () => {
  // CP raw tx has NO input (parse-fallback shape) so there is no CP vin[0] to pin;
  // the selector's pick (TXID_B) becomes vin[0], but the OP_RETURN is keyed to
  // TXID_A — the indexer would silently drop it, so the guard MUST throw.
  const cpRawHex = buildCpRawHex(TXID_A, false);
  const selStub = stub(
    OptimalUTXOSelection,
    "selectUTXOs",
    () => ({ inputs: [utxo(TXID_B)], change: 0, fee: 1000 }) as any,
  );
  const poolStub = stub(
    GeneralBitcoinTransactionBuilder as any,
    "getFullUTXOsWithDetails",
    () => Promise.resolve([utxo(TXID_B)]),
  );
  try {
    await assertRejects(
      () =>
        GeneralBitcoinTransactionBuilder.generatePSBT(cpRawHex, {
          address: CHANGE_ADDR,
          satsPerVB: 5,
          operationType: "fairmint",
          customOutputs: [],
        }),
      Error,
      "ARC4 key mismatch",
    );
  } finally {
    selStub.restore();
    poolStub.restore();
  }
});
