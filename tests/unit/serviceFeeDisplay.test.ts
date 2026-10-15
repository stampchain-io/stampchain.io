/**
 * The website shows the operator service fee before signing. Fee estimates are
 * computed without it, so the display adds it to its own line and the total.
 */
import { assertEquals } from "@std/assert";
import {
  parseServiceFeeSats,
  withServiceFee,
} from "$lib/utils/performance/fees/fee-estimation-utils.ts";

Deno.test("parseServiceFeeSats: whole sats only", () => {
  assertEquals(parseServiceFeeSats("2500"), 2500);
  assertEquals(parseServiceFeeSats(2500), 2500);
  assertEquals(parseServiceFeeSats(" 2500 "), 2500);
  assertEquals(parseServiceFeeSats(""), 0);
  assertEquals(parseServiceFeeSats(undefined), 0);
  assertEquals(parseServiceFeeSats("0.00001"), 0); // legacy BTC-style fallback
  assertEquals(parseServiceFeeSats("-5"), 0);
  assertEquals(parseServiceFeeSats("abc"), 0);
});

Deno.test("withServiceFee adds the fee line and the total", () => {
  const d = withServiceFee(
    { minerFee: 900, dustValue: 330, totalValue: 1230 },
    2500,
  );
  assertEquals(d.serviceFee, 2500);
  assertEquals(d.totalValue, 3730);
  assertEquals(d.minerFee, 900);
});

Deno.test("withServiceFee: no fee leaves details untouched", () => {
  const base = { totalValue: 1230, serviceFee: 0 };
  assertEquals(withServiceFee(base, 0), base);
});

Deno.test("withServiceFee: an unestimated total stays 0", () => {
  assertEquals(withServiceFee({ totalValue: 0 }, 2500).totalValue, 0);
});
