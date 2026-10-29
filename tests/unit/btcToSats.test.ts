import { assertEquals, assertThrows } from "@std/assert";
import { btcToSats, MIN_SALE_SATS } from "$lib/utils/fees.ts";

Deno.test("btcToSats converts a whole-sat BTC amount", () => {
  assertEquals(btcToSats(0.001), 100_000);
  assertEquals(btcToSats(1), 100_000_000);
});

Deno.test("btcToSats rounds float error instead of truncating a sat", () => {
  // 0.00000767 * 1e8 is 766.999... floor would pay 766 sats.
  assertEquals(Math.floor(0.00000767 * 1e8), 766);
  assertEquals(btcToSats(0.00000767), 767);
  assertEquals(btcToSats(0.00000546), MIN_SALE_SATS);
});

Deno.test("btcToSats rejects dust, extra decimals, and non-amounts", () => {
  assertThrows(() => btcToSats(0.00000001), Error, "at least 546");
  assertThrows(() => btcToSats(0.00000545), Error, "at least 546");
  assertThrows(() => btcToSats(0.123456789), Error, "8 decimal");
  assertThrows(() => btcToSats(0), Error, "positive");
  assertThrows(() => btcToSats(-1), Error, "positive");
  assertThrows(() => btcToSats(Number.NaN), Error, "positive");
});
