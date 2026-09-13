/**
 * Regression tests for the homepage outage in which every server-rendered
 * request threw
 *
 *   TypeError: Cannot mix BigInt and other types, use explicit conversions
 *
 * at formatSupply (lib/utils/ui/formatting/formatUtils.ts) from
 * StampCard.tsx, was swallowed by the route handler's catch, and rendered the
 * empty DATA_PLACEHOLDER_PROD_HOME with a 200 status.
 *
 * A stamp's `supply` reaches the UI as a bigint whenever the BIGINT column
 * exceeds Number.MAX_SAFE_INTEGER, on both the cache-miss path (the MySQL
 * driver maps MYSQL_TYPE_LONGLONG that way) and the cache-hit path (the Redis
 * layer preserves the type via bigIntSerializer/bigIntReviver).
 */
import { assertEquals } from "@std/assert";
import {
  bigIntReviver,
  bigIntSerializer,
  formatEditionCount,
  formatSupply,
} from "$lib/utils/ui/formatting/formatUtils.ts";

// 1e16 base units = 100000000.00 whole units, above Number.MAX_SAFE_INTEGER.
const LARGE_DIVISIBLE_SUPPLY = 10000000000000000n;

Deno.test("formatSupply - divisible bigint supply does not throw", () => {
  assertEquals(formatSupply(LARGE_DIVISIBLE_SUPPLY, true), "100000000.00");
});

Deno.test("formatSupply - indivisible bigint supply renders exactly", () => {
  assertEquals(
    formatSupply(18446744073709551615n, false),
    "18446744073709551615",
  );
});

Deno.test("formatSupply - bigint conversion keeps digits past 2^53", () => {
  // Number(9007199254740993n) / 1e8 rounds; the bigint path must not.
  assertEquals(formatSupply(9007199254740993n, true), "90071992.55");
  assertEquals(formatSupply(100000000n + 1n, true), "1.00");
  assertEquals(formatSupply(150000000n, true), "1.50");
  assertEquals(formatSupply(155000000n, true), "1.55");
  assertEquals(formatSupply(199999999n, true), "2.00"); // rounds half-up
});

Deno.test("formatSupply - existing number and string behaviour unchanged", () => {
  assertEquals(formatSupply(undefined, true), "0");
  assertEquals(formatSupply(21, false), "21");
  assertEquals(formatSupply("21", false), "21");
  assertEquals(formatSupply(5000000000, true), "50.00");
  assertEquals(formatSupply("5000000000", true), "50.00");
  assertEquals(formatSupply(100, true), "0.00");
});

Deno.test("formatSupply - survives a Redis cache round-trip", () => {
  // Exactly what DatabaseManager.setCachedData/getCachedData do to a row.
  const row = { supply: LARGE_DIVISIBLE_SUPPLY, divisible: 1 };
  const revived = JSON.parse(
    JSON.stringify(row, bigIntSerializer),
    bigIntReviver,
  );

  assertEquals(typeof revived.supply, "bigint");
  assertEquals(formatSupply(revived.supply, Boolean(revived.divisible)), "100000000.00");
});

Deno.test("formatEditionCount - matches the previous inline expression", () => {
  // Indivisible, at and around the display cap.
  assertEquals(formatEditionCount(21, false), "21");
  assertEquals(formatEditionCount(100000, false), "100000");
  assertEquals(formatEditionCount(100001, false), "+100000");
  assertEquals(formatEditionCount(undefined, false), "0");
  // Divisible renders whole units to two decimals.
  assertEquals(formatEditionCount(5000000000, true), "50.00");
});

Deno.test("formatEditionCount - bigint supply does not throw", () => {
  assertEquals(formatEditionCount(LARGE_DIVISIBLE_SUPPLY, true), "100000000.00");
  assertEquals(formatEditionCount(200000n, false), "+100000");
  assertEquals(formatEditionCount(21n, false), "21");
});
