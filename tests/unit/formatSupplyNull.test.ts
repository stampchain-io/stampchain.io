/**
 * stamps.supply is `bigint unsigned DEFAULT NULL`, so the stamp detail page
 * receives `supply: null` for stamps with no Counterparty asset. formatSupply
 * and formatEditionCount used to check only for `undefined` and threw
 * "Cannot read properties of null (reading 'toString')" during SSR, about
 * 13 times an hour in production.
 */
import { assertEquals } from "@std/assert";
import { formatSupply } from "$lib/utils/ui/formatting/formatUtils.ts";
import { formatEditionCount } from "$lib/utils/ui/formatting/formatEditionCount.ts";

Deno.test("formatSupply: null supply renders as 0, divisible or not", () => {
  assertEquals(formatSupply(null, false), "0");
  assertEquals(formatSupply(null, true), "0");
});

Deno.test("formatEditionCount: null supply renders as 0, divisible or not", () => {
  assertEquals(formatEditionCount(null, false), "0");
  assertEquals(formatEditionCount(null, true), "0");
});

Deno.test("formatSupply: a non-numeric string renders as 0, not NaN", () => {
  assertEquals(formatSupply("", false), "0");
  assertEquals(formatSupply("abc", true), "0");
});

Deno.test("formatSupply: real supplies are unchanged", () => {
  assertEquals(formatSupply(150, false), "150");
  assertEquals(formatSupply("150", false), "150");
  assertEquals(formatSupply(150000000, true), "1.50");
  assertEquals(formatSupply(150n, false), "150");
  assertEquals(formatEditionCount(250000, false), "+100000");
});
