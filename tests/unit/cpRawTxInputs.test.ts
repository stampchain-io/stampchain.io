import { assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  buildCpPsbtInput,
  buildCpPsbtInputsFromRawTx,
  type CpInputUtxoDetails,
  type CpUtxoFetcher,
} from "$lib/utils/bitcoin/psbt/cpRawTxInputs.ts";

// Synthetic scriptPubKeys recognised by getScriptTypeInfo (see scriptTypeUtils):
//   P2WPKH  = 0014 + 20 bytes  -> witness
//   P2PKH   = 76a914 + 20 bytes + 88ac -> non-witness
//   P2SH    = a914 + 20 bytes + 87 -> non-witness, may carry a redeemScript
const P2WPKH = "0014" + "11".repeat(20);
const P2PKH = "76a914" + "22".repeat(20) + "88ac";
const P2SH = "a914" + "33".repeat(20) + "87";

function fill32(byte: number): Uint8Array {
  return new Uint8Array(32).fill(byte);
}
function hex32(byte: number): string {
  return byte.toString(16).padStart(2, "0").repeat(32);
}

// A fetcher backed by an in-memory map keyed by display txid. Records calls so
// we can assert getRawTransactionHex is invoked only for non-witness inputs.
function mockFetcher(
  utxos: Record<string, CpInputUtxoDetails | null>,
): CpUtxoFetcher & { rawTxCalls: string[] } {
  const rawTxCalls: string[] = [];
  return {
    rawTxCalls,
    getSpecificUTXO(txid: string, _vout: number) {
      return Promise.resolve(txid in utxos ? utxos[txid] : null);
    },
    getRawTransactionHex(txid: string) {
      rawTxCalls.push(txid);
      return Promise.resolve("0000"); // any truthy even-length hex
    },
  };
}

Deno.test("buildCpPsbtInput - witness input sets witnessUtxo, no rawtx fetch", async () => {
  const fetcher = mockFetcher({
    [hex32(0x0a)]: { script: P2WPKH, value: 100000 },
  });
  const built = await buildCpPsbtInput(fetcher, {
    txid: hex32(0x0a),
    vout: 0,
    sequence: 0xfffffffd,
  });
  assertEquals(built.value, 100000n);
  assertEquals(built.inputData.hash, hex32(0x0a));
  assertEquals(built.inputData.index, 0);
  assertEquals(built.inputData.sequence, 0xfffffffd);
  assertExists(built.inputData.witnessUtxo);
  assertEquals(built.inputData.nonWitnessUtxo, undefined);
  assertEquals(fetcher.rawTxCalls.length, 0); // witness: no parent-tx fetch
});

Deno.test("buildCpPsbtInput - non-witness input fetches parent tx for nonWitnessUtxo", async () => {
  const fetcher = mockFetcher({
    [hex32(0x0b)]: { script: P2PKH, value: 50000 },
  });
  const built = await buildCpPsbtInput(fetcher, {
    txid: hex32(0x0b),
    vout: 1,
    sequence: 0xffffffff,
  });
  assertExists(built.inputData.nonWitnessUtxo);
  assertEquals(built.inputData.witnessUtxo, undefined);
  assertEquals(fetcher.rawTxCalls, [hex32(0x0b)]);
});

Deno.test("buildCpPsbtInput - P2SH input attaches redeemScript when present", async () => {
  const fetcher = mockFetcher({
    [hex32(0x0c)]: { script: P2SH, value: 25000, redeemScript: "abcd" },
  });
  const built = await buildCpPsbtInput(fetcher, {
    txid: hex32(0x0c),
    vout: 0,
    sequence: 0xfffffffd,
  });
  assertExists(built.inputData.redeemScript);
});

Deno.test("buildCpPsbtInput - fails closed when UTXO cannot be resolved", async () => {
  const fetcher = mockFetcher({ [hex32(0x0a)]: null });
  await assertRejects(
    () =>
      buildCpPsbtInput(fetcher, {
        txid: hex32(0x0a),
        vout: 0,
        sequence: 0xfffffffd,
      }),
    Error,
    "Failed to fetch UTXO details",
  );
});

Deno.test("buildCpPsbtInputsFromRawTx - includes ALL inputs in order (the #1137 fix)", async () => {
  const fetcher = mockFetcher({
    [hex32(0x0a)]: { script: P2WPKH, value: 100000 },
    [hex32(0x0b)]: { script: P2PKH, value: 50000 },
    [hex32(0x0c)]: { script: P2SH, value: 25000, redeemScript: "abcd" },
  });
  const cpTxIns = [
    { hash: fill32(0x0a), index: 0, sequence: 0xfffffffd },
    { hash: fill32(0x0b), index: 1, sequence: 0xfffffffd },
    { hash: fill32(0x0c), index: 2, sequence: 0xfffffffd },
  ];

  const { builtInputs, inputsToSign, totalInputValue } =
    await buildCpPsbtInputsFromRawTx(
      fetcher,
      cpTxIns,
      "bc1qexampleaddress",
      [1],
    );

  // ALL three inputs present (prior code dropped inputs 2 and 3).
  assertEquals(builtInputs.length, 3);
  // Order preserved: vin[0] stays the first CP input (the ARC4 key input).
  assertEquals(builtInputs[0].inputData.hash, hex32(0x0a));
  assertEquals(builtInputs[1].inputData.hash, hex32(0x0b));
  assertEquals(builtInputs[2].inputData.hash, hex32(0x0c));
  // inputsToSign indices increment with input position.
  assertEquals(inputsToSign.map((i) => i.index), [0, 1, 2]);
  assertEquals(inputsToSign.every((i) => i.address === "bc1qexampleaddress"), true);
  // Summed value across ALL inputs (drives correct change in stampattach).
  assertEquals(totalInputValue, 175000n);
});

Deno.test("buildCpPsbtInputsFromRawTx - reverses internal hash to display txid order", async () => {
  // Asymmetric hash proves the byte-reversal (internal -> display) is applied.
  const internal = new Uint8Array(
    Array.from({ length: 32 }, (_, i) => i),
  );
  const expectedDisplay = Array.from(internal)
    .reverse()
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const fetcher = mockFetcher({
    [expectedDisplay]: { script: P2WPKH, value: 10000 },
  });
  const { builtInputs } = await buildCpPsbtInputsFromRawTx(
    fetcher,
    [{ hash: internal, index: 0, sequence: 0xfffffffd }],
    "bc1qexampleaddress",
    [1],
  );
  assertEquals(builtInputs[0].inputData.hash, expectedDisplay);
});

Deno.test("buildCpPsbtInputsFromRawTx - throws on an empty input set", async () => {
  const fetcher = mockFetcher({});
  await assertRejects(
    () => buildCpPsbtInputsFromRawTx(fetcher, [], "bc1qexampleaddress", [1]),
    Error,
    "no inputs",
  );
});
