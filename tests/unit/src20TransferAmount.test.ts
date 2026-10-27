import { assertEquals } from "@std/assert";
import { clampTransferAmount } from "$lib/utils/bitcoin/src20/transferAmount.ts";

Deno.test("clampTransferAmount - passes through values within the balance", () => {
  assertEquals(clampTransferAmount("5", "10"), "5");
  assertEquals(clampTransferAmount("10", "10"), "10");
  assertEquals(clampTransferAmount("0.5", "1.25"), "0.5");
});

Deno.test("clampTransferAmount - clamps values above the balance", () => {
  assertEquals(clampTransferAmount("11", "10"), "10");
  assertEquals(clampTransferAmount("2", "1.25"), "1.25");
  assertEquals(clampTransferAmount("100", 42), "42");
});

Deno.test("clampTransferAmount - keeps partial and non-numeric input", () => {
  assertEquals(clampTransferAmount("1.", "10"), "1.");
  assertEquals(clampTransferAmount("", "10"), "");
  assertEquals(clampTransferAmount("abc", "10"), "abc");
});

Deno.test("clampTransferAmount - no clamp when the balance is unknown", () => {
  assertEquals(clampTransferAmount("5", undefined), "5");
  assertEquals(clampTransferAmount("5", "n/a"), "5");
});

Deno.test("clampTransferAmount - empty balance counts as zero", () => {
  // Number("") is 0, matching the form's behaviour before this was extracted.
  assertEquals(clampTransferAmount("5", ""), "0");
});
