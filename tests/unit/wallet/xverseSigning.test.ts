/**
 * Unit tests for client/wallet/xverseSigning.ts — selection of the signing
 * address and protocol used by Xverse `signMessage()`.
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  resolveXverseSigningAddress,
  xverseSigningProtocolFor,
} from "$client/wallet/xverseSigning.ts";

const PAYMENT = "bc1ql9y6eq0amutq8yhvuuhwrp68shg9r2979ecluw";
const ORDINALS =
  "bc1pr4zzasskelxqqqurj7pelzrcufrxl4kjqxn5zk0uaafkpt5ndtdq8t8w76";
const FOREIGN =
  "bc1pforeign0000000000000000000000000000000000000000000000000000";

const wallet = {
  address: PAYMENT,
  ordinalsAddress: ORDINALS,
  accounts: [PAYMENT, ORDINALS],
};

Deno.test("resolveXverseSigningAddress: defaults to the payment address", () => {
  assertEquals(resolveXverseSigningAddress(wallet), PAYMENT);
  assertEquals(resolveXverseSigningAddress(wallet, undefined), PAYMENT);
});

Deno.test("resolveXverseSigningAddress: allows the payment address explicitly", () => {
  assertEquals(resolveXverseSigningAddress(wallet, PAYMENT), PAYMENT);
});

Deno.test("resolveXverseSigningAddress: allows the ordinals address", () => {
  assertEquals(resolveXverseSigningAddress(wallet, ORDINALS), ORDINALS);
});

Deno.test("resolveXverseSigningAddress: rejects an address the wallet does not control", () => {
  assertThrows(
    () => resolveXverseSigningAddress(wallet, FOREIGN),
    Error,
    "not controlled by the connected Xverse wallet",
  );
  assertThrows(
    () => resolveXverseSigningAddress(wallet, ""),
    Error,
    "not controlled by the connected Xverse wallet",
  );
});

Deno.test("resolveXverseSigningAddress: rejects ordinals address on a wallet without one", () => {
  const single = { address: PAYMENT, accounts: [PAYMENT] };
  assertThrows(() => resolveXverseSigningAddress(single, ORDINALS), Error);
});

Deno.test("xverseSigningProtocolFor: ECDSA for the payment (P2WPKH) address", () => {
  assertEquals(xverseSigningProtocolFor(PAYMENT), "ECDSA");
  assertEquals(
    xverseSigningProtocolFor("3P14159f73E4gFr7JterCCQh9QjiTjiZrG"),
    "ECDSA",
  );
});

Deno.test("xverseSigningProtocolFor: BIP322 for taproot (P2TR) addresses", () => {
  assertEquals(xverseSigningProtocolFor(ORDINALS), "BIP322");
  assertEquals(xverseSigningProtocolFor(ORDINALS.toUpperCase()), "BIP322");
  assertEquals(xverseSigningProtocolFor("tb1p" + "q".repeat(58)), "BIP322");
});
