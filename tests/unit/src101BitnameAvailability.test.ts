import {
  bitnameAvailabilityMessage,
  buildBitnameAvailabilityUrl,
  formatBitname,
  interpretBitnameAvailability,
  SRC101_BITNAME_DEPLOY_HASH,
} from "$lib/utils/src101/bitnameAvailability.ts";
import { assertEquals, assertThrows } from "@std/assert";

Deno.test("buildBitnameAvailabilityUrl encodes the lowercased name without TLD", () => {
  assertEquals(
    buildBitnameAvailabilityUrl("Kevin"),
    `/api/v2/src101/${SRC101_BITNAME_DEPLOY_HASH}/${btoa("kevin")}`,
  );
});

Deno.test("buildBitnameAvailabilityUrl matches the hash the mint payload uses", () => {
  assertEquals(
    SRC101_BITNAME_DEPLOY_HASH,
    "77fb147b72a551cf1e2f0b37dccf9982a1c25623a7fe8b4d5efaac566cf63fed",
  );
});

Deno.test("buildBitnameAvailabilityUrl throws for names btoa cannot encode", () => {
  assertThrows(() => buildBitnameAvailabilityUrl("\u{1F600}"));
});

Deno.test("interpretBitnameAvailability: non-empty data is registered", () => {
  const match = { tokenid_utf8: "kevin", owner: "bc1q" };
  assertEquals(
    interpretBitnameAvailability(200, { data: [match, { other: 1 }] }),
    { kind: "registered", match },
  );
});

Deno.test("interpretBitnameAvailability: empty data is available", () => {
  assertEquals(interpretBitnameAvailability(200, { data: [] }), {
    kind: "available",
  });
});

Deno.test("interpretBitnameAvailability: non-200 or malformed body is unknown", () => {
  assertEquals(interpretBitnameAvailability(404, { data: [] }), {
    kind: "unknown",
  });
  assertEquals(interpretBitnameAvailability(500, null), { kind: "unknown" });
  assertEquals(interpretBitnameAvailability(200, null), { kind: "unknown" });
  assertEquals(interpretBitnameAvailability(200, {}), { kind: "unknown" });
});

Deno.test("formatBitname lowercases the name and appends the TLD", () => {
  assertEquals(formatBitname("KeVin", ".btc"), "kevin.btc");
});

Deno.test("bitnameAvailabilityMessage keeps the page and modal wording", () => {
  assertEquals(
    bitnameAvailabilityMessage("Kevin", ".btc", true, "page"),
    "kevin.btc is already registered",
  );
  assertEquals(
    bitnameAvailabilityMessage("Kevin", ".btc", true, "modal"),
    "kevin.btc is registered",
  );
  assertEquals(
    bitnameAvailabilityMessage("Kevin", ".btc", false, "page"),
    "kevin.btc is available",
  );
  assertEquals(
    bitnameAvailabilityMessage("Kevin", ".btc", false, "modal"),
    "kevin.btc is available",
  );
});
