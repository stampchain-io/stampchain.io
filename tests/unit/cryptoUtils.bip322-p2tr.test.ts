/**
 * Server-side signature verification for owner actions signed with a
 * taproot (P2TR) address, as produced by Xverse's ordinals address via
 * BIP-322. Guards the contract relied on by EditCreatorNameModal: the
 * signature must verify against the *resource* address being updated, and
 * a signature from one of the wallet's addresses must never verify against
 * another of its addresses.
 *
 * Vectors were generated once with bip322-js Signer from a throwaway key;
 * verification is deterministic so they are embedded as fixtures.
 */

import { assertEquals } from "@std/assert";
import { verifySignature } from "$lib/utils/security/cryptoUtils.ts";

const MESSAGE = "Update creator name to Alice at 1700000000000";
const P2TR = "bc1pr4zzasskelxqqqurj7pelzrcufrxl4kjqxn5zk0uaafkpt5ndtdq8t8w76";
const P2WPKH = "bc1ql9y6eq0amutq8yhvuuhwrp68shg9r2979ecluw";
const P2TR_BIP322_SIG =
  "AUFxE/c+HJy8KIJI78VuvBAUWcsRPoX+cQZ+I7hX3Ask1iHGpmv6Tg9ytCva8hMKsLGAJWhMdij3DmL89Jzy1Q76AQ==";
const P2WPKH_BIP322_SIG =
  "AkcwRAIgYmvpu8cox1sRJVZ8gt8Hz5dWVnZh12Edq3oPUpVzqToCIDkcbD/W1Myb9t80hOHwcEXawzSaxseKTLj3tAP9ZRGVASECU0VpPw96QfHpm9Ns0/ilY74g/hMLzdjwzss85M5Hilc=";

const originalConsoleError = console.error;

function withQuietConsole(fn: () => void) {
  console.error = () => {};
  try {
    fn();
  } finally {
    console.error = originalConsoleError;
  }
}

Deno.test("verifySignature: accepts a BIP-322 signature from a P2TR (ordinals) address", () => {
  assertEquals(verifySignature(MESSAGE, P2TR_BIP322_SIG, P2TR), true);
});

Deno.test("verifySignature: accepts a BIP-322 signature from a P2WPKH (payment) address", () => {
  assertEquals(verifySignature(MESSAGE, P2WPKH_BIP322_SIG, P2WPKH), true);
});

Deno.test("verifySignature: P2TR signature does not verify against the sibling payment address", () => {
  withQuietConsole(() => {
    assertEquals(verifySignature(MESSAGE, P2TR_BIP322_SIG, P2WPKH), false);
  });
});

Deno.test("verifySignature: payment signature does not verify against the sibling P2TR address", () => {
  withQuietConsole(() => {
    assertEquals(verifySignature(MESSAGE, P2WPKH_BIP322_SIG, P2TR), false);
  });
});

Deno.test("verifySignature: P2TR signature rejects a tampered message", () => {
  withQuietConsole(() => {
    assertEquals(verifySignature(MESSAGE + "!", P2TR_BIP322_SIG, P2TR), false);
  });
});
