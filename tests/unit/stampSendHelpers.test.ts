import {
  buildStampSendRequest,
  normalizeSendQuantity,
} from "$lib/utils/stamps/sendHelpers.ts";
import { assertEquals } from "@std/assert";

Deno.test("normalizeSendQuantity - empty input becomes 1", () => {
  assertEquals(normalizeSendQuantity(""), 1);
});

Deno.test("normalizeSendQuantity - zero in any form becomes 1", () => {
  assertEquals(normalizeSendQuantity("0"), 1);
  assertEquals(normalizeSendQuantity("000"), 1);
});

Deno.test("normalizeSendQuantity - negative values become 1", () => {
  assertEquals(normalizeSendQuantity("-3"), 1);
});

Deno.test("normalizeSendQuantity - non-numeric input becomes 1", () => {
  assertEquals(normalizeSendQuantity("abc"), 1);
});

Deno.test("normalizeSendQuantity - keeps positive integers", () => {
  assertEquals(normalizeSendQuantity("1"), 1);
  assertEquals(normalizeSendQuantity("7"), 7);
  assertEquals(normalizeSendQuantity("007"), 7);
  assertEquals(normalizeSendQuantity("250"), 250);
});

Deno.test("normalizeSendQuantity - truncates decimals like parseInt", () => {
  assertEquals(normalizeSendQuantity("2.9"), 2);
  assertEquals(normalizeSendQuantity("0.5"), 1);
});

Deno.test("buildStampSendRequest - matches the /api/v2/create/send body", () => {
  assertEquals(
    buildStampSendRequest({
      address: "bc1qsender",
      destination: "bc1qrecipient",
      asset: "A12345",
      quantity: 3,
      feeRate: 7,
    }),
    {
      address: "bc1qsender",
      destination: "bc1qrecipient",
      asset: "A12345",
      quantity: 3,
      satsPerVB: 7,
      options: {
        return_psbt: true,
        fee_per_kb: 7000,
        allow_unconfirmed_inputs: true,
      },
    },
  );
});

Deno.test("buildStampSendRequest - converts fractional sat/vB to sat/kB", () => {
  const body = buildStampSendRequest({
    address: "a",
    destination: "b",
    asset: "c",
    quantity: 1,
    feeRate: 1.5,
  });
  assertEquals(body.satsPerVB, 1.5);
  assertEquals(body.options.fee_per_kb, 1500);
});
