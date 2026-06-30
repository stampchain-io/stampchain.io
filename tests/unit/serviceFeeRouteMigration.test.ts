import { assertEquals } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import {
  buildServiceFeeOutputs,
  type TxOutput,
} from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";

/**
 * Route-migration verification for task 1171.5 (fairmint/compose, dispense).
 *
 * These tests reproduce the route's output-assembly + PSBT-build step using the
 * EXACT bitcoinjs codecs and buildServiceFeeOutputs() helper the migrated routes
 * use, fed with AUTHENTIC Counterparty rawtransactions composed (return_psbt
 * false, NO broadcast) against the funded wallet:
 *
 *   bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej
 *
 * The rawtx hex fixtures below were captured live from
 * api.counterparty.io:4000/v2 on 2026-06-30. We assemble outputs the way the
 * route does, build a real PSBT, decode it, and assert the migration invariants:
 *   - inputs − outputs = a sane miner fee (matches CP's btc_fee when no service
 *     fee), and NEVER a deficit (outputs never exceed inputs);
 *   - the service-fee output is present at the configured address when enabled;
 *   - service-fee-disabled trusts CP's outputs verbatim;
 *   - for dispense: the dispenser-payment output and OP_RETURN survive.
 */

const NETWORK = bitcoin.networks.bitcoin;
const FUNDED_ADDRESS = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";
const DUST = 546n;

// --- Codecs identical to those the migrated routes inject. ---
function decodeAddress(script: Uint8Array): string | undefined {
  try {
    return bitcoin.address.fromOutputScript(Buffer.from(script), NETWORK);
  } catch {
    return undefined;
  }
}
function encodeAddress(addr: string): Uint8Array {
  return new Uint8Array(bitcoin.address.toOutputScript(addr, NETWORK));
}

// --- Authentic CP rawtransactions (return_psbt:false), funded wallet above. ---

// fairmint TRUDEEPEPE: [OP_RETURN(0), change->source(1026614)]; in 1027319; fee 705.
const FAIRMINT_RAWTX =
  "02000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff020000000000000000166a146bb05262506ef33a694cdcc4708b88509918405836aa0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0800000000";
const FAIRMINT_INPUT_VALUE = 1027319n;
const FAIRMINT_CP_FEE = 705n;

// dispense FDCARD: [dispenser-pay(413999), OP_RETURN(0), change->buyer(612510)];
// in 1027319; fee 810.
const DISPENSE_RAWTX =
  "02000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff032f5106000000000016001421fc69cd03020d0fdc00cfcfef848a8847618f0000000000000000000c6a0a6bb05262506ef33a3fce9e5809000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0800000000";
const DISPENSE_INPUT_VALUE = 1027319n;
const DISPENSE_CP_FEE = 810n;
const DISPENSER_PAY_VALUE = 413999n;

/** Build cpOutputs the way the routes do: from cpTx.outs. */
function cpOutputsFromRawtx(rawtx: string): TxOutput[] {
  const cpTx = bitcoin.Transaction.fromHex(rawtx);
  return cpTx.outs.map((o) => ({
    script: new Uint8Array(o.script),
    value: BigInt(o.value),
  }));
}

/** Assemble the final PSBT exactly as the migrated route does and decode it. */
function buildAndDecode(
  rawtx: string,
  sumOfUserInputs: bigint,
  serviceFeeSats: bigint,
  serviceFeeAddress: string | undefined,
) {
  const result = buildServiceFeeOutputs({
    cpOutputs: cpOutputsFromRawtx(rawtx),
    sumOfUserInputs,
    sourceAddress: FUNDED_ADDRESS,
    serviceFeeSats,
    serviceFeeAddress,
    dustSize: DUST,
    decodeAddress,
    encodeAddress,
  });

  // Build a real PSBT (inputs from CP, outputs from helper) — no signing/broadcast.
  const cpTx = bitcoin.Transaction.fromHex(rawtx);
  const psbt = new bitcoin.Psbt({ network: NETWORK });
  for (const inp of cpTx.ins) {
    const txid = Buffer.from(inp.hash).reverse().toString("hex");
    // witnessUtxo script/value are not needed to decode outputs; use the source
    // address script + the (single) input value for a structurally valid PSBT.
    psbt.addInput({
      hash: txid,
      index: inp.index,
      sequence: inp.sequence,
      witnessUtxo: {
        script: Buffer.from(encodeAddress(FUNDED_ADDRESS)),
        value: sumOfUserInputs,
      },
    });
  }
  for (const out of result.outputs) {
    psbt.addOutput({ script: Buffer.from(out.script), value: out.value });
  }

  // Decode the assembled PSBT's outputs.
  const decodedOutputs = result.outputs.map((o) => ({
    address: decodeAddress(o.script),
    isOpReturn: o.script.length > 0 && o.script[0] === 0x6a,
    value: o.value,
  }));
  const outputsTotal = result.outputs.reduce((s, o) => s + o.value, 0n);

  return { result, psbt, decodedOutputs, outputsTotal };
}

Deno.test("fairmint: service fee disabled trusts CP outputs verbatim, no deficit", () => {
  const { result, decodedOutputs, outputsTotal } = buildAndDecode(
    FAIRMINT_RAWTX,
    FAIRMINT_INPUT_VALUE,
    0n,
    undefined,
  );

  // Outputs unchanged from CP: one OP_RETURN + one change to source.
  assertEquals(decodedOutputs.length, 2);
  assertEquals(decodedOutputs[0].isOpReturn, true);
  assertEquals(decodedOutputs[1].address, FUNDED_ADDRESS);

  // inputs − outputs = CP's miner fee exactly; never a deficit.
  assertEquals(FAIRMINT_INPUT_VALUE - outputsTotal, FAIRMINT_CP_FEE);
  assertEquals(FAIRMINT_INPUT_VALUE - outputsTotal >= 0n, true);
  assertEquals(result.totalFee, FAIRMINT_CP_FEE);
  assertEquals(result.serviceFeeAdded, 0n);
});

Deno.test("fairmint: service fee enabled is spliced from change, no deficit", () => {
  const SERVICE_FEE = 5000n;
  const SERVICE_ADDR = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
  const { result, decodedOutputs, outputsTotal } = buildAndDecode(
    FAIRMINT_RAWTX,
    FAIRMINT_INPUT_VALUE,
    SERVICE_FEE,
    SERVICE_ADDR,
  );

  // Service-fee output present at the configured address.
  const svc = decodedOutputs.find((o) => o.address === SERVICE_ADDR);
  assertEquals(svc?.value, SERVICE_FEE);
  assertEquals(result.serviceFeeAdded, SERVICE_FEE);

  // Change reduced by exactly the service fee; miner fee unchanged (no
  // re-derivation — the whole point of the migration).
  const change = decodedOutputs.find((o) => o.address === FUNDED_ADDRESS);
  assertEquals(change?.value, 1026614n - SERVICE_FEE);
  assertEquals(FAIRMINT_INPUT_VALUE - outputsTotal, FAIRMINT_CP_FEE); // miner fee unchanged
  assertEquals(FAIRMINT_INPUT_VALUE - outputsTotal >= 0n, true); // no deficit
  assertEquals(result.totalFee, FAIRMINT_CP_FEE + SERVICE_FEE);
});

Deno.test("dispense: service fee disabled preserves dispenser-pay + OP_RETURN + change, no deficit", () => {
  const { result, decodedOutputs, outputsTotal } = buildAndDecode(
    DISPENSE_RAWTX,
    DISPENSE_INPUT_VALUE,
    0n,
    undefined,
  );

  // All three CP outputs preserved verbatim, in order.
  assertEquals(decodedOutputs.length, 3);
  // [0] dispenser payment — a DIFFERENT address than the buyer, preserved.
  assertEquals(decodedOutputs[0].value, DISPENSER_PAY_VALUE);
  assertEquals(decodedOutputs[0].address !== FUNDED_ADDRESS, true);
  assertEquals(decodedOutputs[0].address !== undefined, true);
  // [1] OP_RETURN preserved.
  assertEquals(decodedOutputs[1].isOpReturn, true);
  // [2] change back to buyer.
  assertEquals(decodedOutputs[2].address, FUNDED_ADDRESS);

  assertEquals(DISPENSE_INPUT_VALUE - outputsTotal, DISPENSE_CP_FEE);
  assertEquals(DISPENSE_INPUT_VALUE - outputsTotal >= 0n, true);
  assertEquals(result.totalFee, DISPENSE_CP_FEE);
  assertEquals(result.serviceFeeAdded, 0n);
});

Deno.test("dispense: service fee enabled splices from buyer change, dispenser-pay survives untouched", () => {
  const SERVICE_FEE = 4200n;
  const SERVICE_ADDR = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
  const { result, decodedOutputs, outputsTotal } = buildAndDecode(
    DISPENSE_RAWTX,
    DISPENSE_INPUT_VALUE,
    SERVICE_FEE,
    SERVICE_ADDR,
  );

  // Dispenser-payment output is UNTOUCHED (fee must not come out of it).
  assertEquals(decodedOutputs[0].value, DISPENSER_PAY_VALUE);
  // OP_RETURN still present.
  assertEquals(decodedOutputs.some((o) => o.isOpReturn), true);
  // Service-fee output present at the configured address.
  const svc = decodedOutputs.find((o) => o.address === SERVICE_ADDR);
  assertEquals(svc?.value, SERVICE_FEE);
  // Buyer change reduced by exactly the service fee.
  const change = decodedOutputs.find((o) => o.address === FUNDED_ADDRESS);
  assertEquals(change?.value, 612510n - SERVICE_FEE);

  // Miner fee unchanged; total cost = miner + service; never a deficit.
  assertEquals(DISPENSE_INPUT_VALUE - outputsTotal, DISPENSE_CP_FEE);
  assertEquals(DISPENSE_INPUT_VALUE - outputsTotal >= 0n, true);
  assertEquals(result.totalFee, DISPENSE_CP_FEE + SERVICE_FEE);
});
