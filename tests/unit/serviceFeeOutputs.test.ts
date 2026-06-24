import { assertEquals, assertThrows } from "@std/assert";
import {
  buildServiceFeeOutputs,
  type TxOutput,
} from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";

// Simple in-memory address codec for testing (no bitcoinjs needed): an
// "address" output script is the bytes of `ADDR:<addr>`; anything else (e.g. an
// OP_RETURN data output) decodes to undefined.
const enc = new TextEncoder();
const dec = new TextDecoder();
function encodeAddress(addr: string): Uint8Array {
  return enc.encode(`ADDR:${addr}`);
}
function decodeAddress(script: Uint8Array): string | undefined {
  const s = dec.decode(script);
  return s.startsWith("ADDR:") ? s.slice(5) : undefined;
}
const DATA_SCRIPT = enc.encode("OP_RETURN_DATA"); // non-address output

const DUST = 546n;

function sum(outs: TxOutput[]): bigint {
  return outs.reduce((acc, o) => acc + o.value, 0n);
}

Deno.test("service_fee=0: trusts CP outputs verbatim, no deficit (#959 repro)", () => {
  // CP composed: data output + attach output + change back to source.
  const cpOutputs: TxOutput[] = [
    { script: DATA_SCRIPT, value: 0n },
    { script: DATA_SCRIPT, value: 330n }, // attach/destination
    { script: encodeAddress("src"), value: 9000n }, // CP change
  ];
  const r = buildServiceFeeOutputs({
    cpOutputs,
    sumOfUserInputs: 10000n,
    sourceAddress: "src",
    serviceFeeSats: 0n,
    dustSize: DUST,
    decodeAddress,
    encodeAddress,
  });

  // Outputs unchanged; fee is exactly CP's implicit fee; NO negative change.
  assertEquals(r.outputs, cpOutputs);
  assertEquals(r.cpNetworkFee, 670n); // 10000 - 9330
  assertEquals(r.serviceFeeAdded, 0n);
  assertEquals(r.totalFee, 670n);
  // Invariant: inputs >= outputs (no deficit — the old code produced one here).
  assertEquals(10000n - sum(r.outputs) >= 0n, true);
});

Deno.test("service_fee>0: funded from change, totals balance", () => {
  const cpOutputs: TxOutput[] = [
    { script: DATA_SCRIPT, value: 330n },
    { script: encodeAddress("src"), value: 9000n },
  ];
  const r = buildServiceFeeOutputs({
    cpOutputs,
    sumOfUserInputs: 10000n,
    sourceAddress: "src",
    serviceFeeSats: 500n,
    serviceFeeAddress: "svc",
    dustSize: DUST,
    decodeAddress,
    encodeAddress,
  });

  // change reduced by 500, service-fee output appended
  assertEquals(r.outputs.length, 3);
  assertEquals(r.outputs[1].value, 8500n); // reduced change
  assertEquals(decodeAddress(r.outputs[2].script), "svc");
  assertEquals(r.outputs[2].value, 500n);
  assertEquals(r.serviceFeeAdded, 500n);
  assertEquals(r.cpNetworkFee, 670n);
  // miner fee unchanged (670), total cost = miner + service
  assertEquals(10000n - sum(r.outputs), 670n);
  assertEquals(r.totalFee, 1170n);
});

Deno.test("service_fee>0: dust change is dropped (rolls into miner fee)", () => {
  const cpOutputs: TxOutput[] = [
    { script: DATA_SCRIPT, value: 330n },
    { script: encodeAddress("src"), value: 600n },
  ];
  const r = buildServiceFeeOutputs({
    cpOutputs,
    sumOfUserInputs: 1000n,
    sourceAddress: "src",
    serviceFeeSats: 100n,
    serviceFeeAddress: "svc",
    dustSize: DUST,
    decodeAddress,
    encodeAddress,
  });

  // 600 - 100 = 500 < dust(546) -> change dropped, only attach + service remain
  assertEquals(r.outputs.length, 2);
  assertEquals(decodeAddress(r.outputs[1].script), "svc");
  assertEquals(r.outputs[1].value, 100n);
  assertEquals(r.serviceFeeAdded, 100n);
  // dropped 500 sat change rolls into miner fee: 70 (cp) + 500 = 570
  assertEquals(1000n - sum(r.outputs), 570n);
  assertEquals(r.totalFee, 670n); // 570 miner + 100 service
});

Deno.test("service_fee>0: throws insufficient funds when change can't cover it", () => {
  const cpOutputs: TxOutput[] = [
    { script: DATA_SCRIPT, value: 330n },
    { script: encodeAddress("src"), value: 400n },
  ];
  assertThrows(
    () =>
      buildServiceFeeOutputs({
        cpOutputs,
        sumOfUserInputs: 1000n,
        sourceAddress: "src",
        serviceFeeSats: 500n, // > 400 change
        serviceFeeAddress: "svc",
        dustSize: DUST,
        decodeAddress,
        encodeAddress,
      }),
    Error,
    "insufficient funds",
  );
});

Deno.test("service_fee>0: throws when there is no change output to fund it", () => {
  const cpOutputs: TxOutput[] = [
    { script: DATA_SCRIPT, value: 330n }, // only a data/destination output
  ];
  assertThrows(
    () =>
      buildServiceFeeOutputs({
        cpOutputs,
        sumOfUserInputs: 1000n,
        sourceAddress: "src",
        serviceFeeSats: 100n,
        serviceFeeAddress: "svc",
        dustSize: DUST,
        decodeAddress,
        encodeAddress,
      }),
    Error,
    "no change output",
  );
});

Deno.test("throws when inputs do not cover CP outputs (mis-summed inputs)", () => {
  const cpOutputs: TxOutput[] = [
    { script: encodeAddress("src"), value: 5000n },
  ];
  assertThrows(
    () =>
      buildServiceFeeOutputs({
        cpOutputs,
        sumOfUserInputs: 4000n, // < outputs
        sourceAddress: "src",
        serviceFeeSats: 0n,
        dustSize: DUST,
        decodeAddress,
        encodeAddress,
      }),
    Error,
    "insufficient funds",
  );
});
