import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  cacheReviver,
  cacheSerializer,
  jsonParseFromCache,
  jsonStringifyForCache,
} from "$server/database/cacheSerialization.ts";

/** The exact pair of operations setCachedData/getCachedData perform. */
function roundTrip<T>(value: T): T {
  return jsonParseFromCache<T>(jsonStringifyForCache(value));
}

Deno.test("round-trip preserves a bigint beyond 2^53", () => {
  const uint64Max = 18446744073709551615n; // real SRC20Valid `max` value
  const out = roundTrip({ max: uint64Max });
  assertEquals(typeof out.max, "bigint");
  assertEquals(out.max, uint64Max);
  assertEquals(out.max.toString(), "18446744073709551615");
});

Deno.test("round-trip preserves values either side of the 2^53 boundary", () => {
  const cases = [
    9007199254740990n, // MAX_SAFE_INTEGER - 1
    9007199254740991n, // MAX_SAFE_INTEGER
    9007199254740992n, // MAX_SAFE_INTEGER + 1
    9007199254740993n, // MAX_SAFE_INTEGER + 2, not representable as a double
  ];
  for (const value of cases) {
    const out = roundTrip({ value });
    assertEquals(typeof out.value, "bigint", `${value} changed type`);
    assertEquals(out.value, value, `${value} lost precision`);
    assertEquals(out.value.toString(), value.toString());
  }
});

Deno.test("an all-digit string stays a string", () => {
  // Every one of these is a deployed SRC-20 tick.
  const ticks = ["0", "1", "88", "888", "1000", "9527", "42069"];
  for (const tick of ticks) {
    const out = roundTrip({ tick });
    assertStrictEquals(
      typeof out.tick,
      "string",
      `tick "${tick}" was converted to a ${typeof out.tick}`,
    );
    assertStrictEquals(out.tick, tick);
  }
});

Deno.test("a leading-zero string keeps its leading zeros", () => {
  const out = roundTrip({ code: "007", padded: "0000123", zero: "00" });
  assertStrictEquals(out.code, "007");
  assertStrictEquals(out.padded, "0000123");
  assertStrictEquals(out.zero, "00");
});

Deno.test("an all-digit string past 2^53 keeps every digit", () => {
  // A string this long would previously have been converted to a BigInt; a
  // slightly shorter one to a Number, losing digits. It is a string either way.
  const big = "123456789012345678901234567890";
  const out = roundTrip({ id: big });
  assertStrictEquals(typeof out.id, "string");
  assertStrictEquals(out.id, big);
});

Deno.test("a negative all-digit string stays a string", () => {
  const out = roundTrip({ delta: "-42" });
  assertStrictEquals(typeof out.delta, "string");
  assertStrictEquals(out.delta, "-42");
});

Deno.test("numbers stay numbers and are not promoted", () => {
  const out = roundTrip({ block_index: 966826, deci: 18, zero: 0, neg: -5 });
  assertStrictEquals(typeof out.block_index, "number");
  assertStrictEquals(out.block_index, 966826);
  assertStrictEquals(out.zero, 0);
  assertStrictEquals(out.neg, -5);
});

Deno.test("a mixed row keeps every field's type", () => {
  const row = {
    tick: "1000", // varchar, all digits
    max: 18446744073709551615n, // BIGINT UNSIGNED past 2^53 -> bigint
    lim: 2100000000000000, // BIGINT UNSIGNED under 2^53 -> number
    amt: "1000.000000000000000000", // decimal(38,18) -> string
    deci: 18,
    block_index: 826308,
    tx_hash: "08800fba2723c83706e2f953e528aa1f30b15c1678054bb2847a41dbd45f89f1",
    creator_name: null,
  };
  const out = roundTrip(row);
  assertEquals(out, row);
  for (const key of Object.keys(row) as (keyof typeof row)[]) {
    assertStrictEquals(
      typeof out[key],
      typeof row[key],
      `field '${key}' changed type`,
    );
  }
});

Deno.test("arrays of rows round-trip element by element", () => {
  const rows = [{ tick: "0", max: 21000000n }, { tick: "888", max: 88888888 }];
  const out = roundTrip(rows);
  assertEquals(out, rows);
  assertStrictEquals(typeof out[0].tick, "string");
  assertStrictEquals(typeof out[0].max, "bigint");
  assertStrictEquals(typeof out[1].max, "number");
});

Deno.test("the marker format is unchanged, so entries already in Redis read back", () => {
  assertEquals(cacheSerializer("k", 123n), { __type: "BigInt", value: "123" });
  assertEquals(cacheSerializer("k", 0n), { __type: "BigInt", value: "0" });
  assertEquals(cacheSerializer("k", -456n), {
    __type: "BigInt",
    value: "-456",
  });

  // A payload written by the previous serializer.
  const legacy = '{"supply":{"__type":"BigInt","value":"18446744073709551615"}}';
  const out = jsonParseFromCache<{ supply: bigint }>(legacy);
  assertEquals(out.supply, 18446744073709551615n);
});

Deno.test("serializer passes non-bigint values through untouched", () => {
  assertStrictEquals(cacheSerializer("k", 123), 123);
  assertStrictEquals(cacheSerializer("k", "1000"), "1000");
  assertStrictEquals(cacheSerializer("k", true), true);
  assertStrictEquals(cacheSerializer("k", null), null);
  assertStrictEquals(cacheSerializer("k", undefined), undefined);
});

Deno.test("a marker whose value is not a valid bigint yields its digits, not the marker", () => {
  const out = jsonParseFromCache<unknown>(
    '{"__type":"BigInt","value":"not_a_number"}',
  );
  assertStrictEquals(out, "not_a_number");
});

Deno.test("an object that merely resembles a marker is left alone", () => {
  assertEquals(cacheReviver("k", { __type: "Stamp", value: "1000" }), {
    __type: "Stamp",
    value: "1000",
  });
  assertEquals(cacheReviver("k", { __type: "BigInt" }), { __type: "BigInt" });
});
