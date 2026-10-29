import { assertEquals, assertThrows } from "@std/assert";
import { resolveAttachDestinationVout } from "$lib/utils/bitcoin/psbt/attachDestinationVout.ts";

const opReturn = (value = 0n) => ({
  script: Uint8Array.of(0x6a, 0x04, 1, 2, 3, 4),
  value,
});
const pay = (byte: number, value: bigint) => ({
  script: Uint8Array.of(0x00, byte),
  value,
});

Deno.test("attach destination defaults to the first non-OP_RETURN output", () => {
  const outputs = [opReturn(), pay(1, 1000n), pay(2, 5000n)];
  assertEquals(resolveAttachDestinationVout(outputs, outputs), 1);
});

Deno.test("attach destination keeps an explicit vout", () => {
  const outputs = [pay(1, 1000n), opReturn(), pay(2, 5000n)];
  assertEquals(resolveAttachDestinationVout(outputs, outputs, 2), 2);
});

Deno.test("attach destination follows an output shifted by a dropped change", () => {
  const cpOutputs = [pay(9, 800n), pay(1, 1000n)];
  // Change at index 0 was dropped; the asset output slid to index 0.
  const finalOutputs = [pay(1, 1000n), pay(3, 200n)];
  assertEquals(
    resolveAttachDestinationVout(cpOutputs, finalOutputs, 1),
    0,
  );
});

Deno.test("attach destination falls back when the requested vout is unusable", () => {
  const outputs = [opReturn(), pay(1, 1000n)];
  assertEquals(resolveAttachDestinationVout(outputs, outputs, 0), 1);
  assertEquals(resolveAttachDestinationVout(outputs, outputs, 9), 1);
});

Deno.test("attach destination throws when every output is OP_RETURN", () => {
  const outputs = [opReturn()];
  assertThrows(
    () => resolveAttachDestinationVout(outputs, outputs),
    Error,
    "no non-OP_RETURN",
  );
});
