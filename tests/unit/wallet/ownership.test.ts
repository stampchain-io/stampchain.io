/**
 * Unit tests for lib/utils/wallet/ownership.ts
 *
 * The helper is the single source of truth for "does the connected wallet
 * control this address?". Dual-address wallets (Xverse) expose a payment
 * address on `wallet.address` and an ordinals address on
 * `wallet.ordinalsAddress`; both must be recognised as owned.
 */

import { assertEquals } from "@std/assert";
import {
  addressesEqual,
  getWalletAddresses,
  walletOwnsAddress,
} from "$lib/utils/wallet/ownership.ts";

const PAYMENT = "bc1ql9y6eq0amutq8yhvuuhwrp68shg9r2979ecluw";
const ORDINALS =
  "bc1pr4zzasskelxqqqurj7pelzrcufrxl4kjqxn5zk0uaafkpt5ndtdq8t8w76";
const OTHER = "bc1qpayment123abcdefghijklmnopqrstuvwxyz0123456";
const LEGACY = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
const LEGACY_RECASED = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVn2";

const xverseWallet = {
  address: PAYMENT,
  ordinalsAddress: ORDINALS,
  accounts: [PAYMENT, ORDINALS],
};

const singleAddressWallet = {
  address: PAYMENT,
  accounts: [PAYMENT],
};

// ============================================================================
// walletOwnsAddress
// ============================================================================

Deno.test("walletOwnsAddress: matches the payment address", () => {
  assertEquals(walletOwnsAddress(xverseWallet, PAYMENT), true);
  assertEquals(walletOwnsAddress(singleAddressWallet, PAYMENT), true);
});

Deno.test("walletOwnsAddress: matches the ordinals address (Xverse)", () => {
  assertEquals(walletOwnsAddress(xverseWallet, ORDINALS), true);
});

Deno.test("walletOwnsAddress: rejects an address the wallet does not control", () => {
  assertEquals(walletOwnsAddress(xverseWallet, OTHER), false);
  assertEquals(walletOwnsAddress(singleAddressWallet, ORDINALS), false);
});

Deno.test("walletOwnsAddress: false for missing ordinalsAddress on single-address wallets", () => {
  const wallet = { address: PAYMENT, accounts: [] as string[] };
  assertEquals(walletOwnsAddress(wallet, PAYMENT), true);
  assertEquals(walletOwnsAddress(wallet, ORDINALS), false);
});

Deno.test("walletOwnsAddress: false for null / undefined / disconnected wallet", () => {
  assertEquals(walletOwnsAddress(null, PAYMENT), false);
  assertEquals(walletOwnsAddress(undefined, PAYMENT), false);
  assertEquals(walletOwnsAddress({}, PAYMENT), false);
  assertEquals(
    walletOwnsAddress({ address: "", accounts: [] }, PAYMENT),
    false,
  );
  assertEquals(walletOwnsAddress({ address: "", accounts: [] }, ""), false);
});

Deno.test("walletOwnsAddress: false for empty / non-string target address", () => {
  assertEquals(walletOwnsAddress(xverseWallet, ""), false);
  assertEquals(walletOwnsAddress(xverseWallet, "   "), false);
  assertEquals(walletOwnsAddress(xverseWallet, undefined), false);
  assertEquals(walletOwnsAddress(xverseWallet, null), false);
  assertEquals(walletOwnsAddress(xverseWallet, 42), false);
});

Deno.test("walletOwnsAddress: an empty wallet address never matches an empty target", () => {
  // Guards against "" === "" treating a disconnected wallet as owner.
  assertEquals(walletOwnsAddress({ address: "" }, ""), false);
});

Deno.test("walletOwnsAddress: recognises addresses only present in accounts", () => {
  const wallet = { address: PAYMENT, accounts: [PAYMENT, ORDINALS] };
  assertEquals(walletOwnsAddress(wallet, ORDINALS), true);
});

Deno.test("walletOwnsAddress: ignores non-string entries in accounts", () => {
  const wallet = {
    address: PAYMENT,
    accounts: [PAYMENT, undefined, null, 7] as unknown as string[],
  };
  assertEquals(walletOwnsAddress(wallet, PAYMENT), true);
  assertEquals(walletOwnsAddress(wallet, "7"), false);
});

Deno.test("walletOwnsAddress: bech32 comparison is case-insensitive", () => {
  assertEquals(walletOwnsAddress(xverseWallet, PAYMENT.toUpperCase()), true);
  assertEquals(walletOwnsAddress(xverseWallet, ORDINALS.toUpperCase()), true);
  assertEquals(
    walletOwnsAddress({ address: PAYMENT.toUpperCase() }, PAYMENT),
    true,
  );
});

Deno.test("walletOwnsAddress: base58 (legacy) comparison is case-sensitive", () => {
  const legacyWallet = { address: LEGACY, accounts: [LEGACY] };
  assertEquals(walletOwnsAddress(legacyWallet, LEGACY), true);
  assertEquals(walletOwnsAddress(legacyWallet, LEGACY_RECASED), false);
  assertEquals(walletOwnsAddress(legacyWallet, LEGACY.toLowerCase()), false);
});

Deno.test("walletOwnsAddress: surrounding whitespace is not significant", () => {
  assertEquals(walletOwnsAddress(xverseWallet, `  ${ORDINALS}\n`), true);
  assertEquals(walletOwnsAddress({ address: ` ${PAYMENT} ` }, PAYMENT), true);
});

// ============================================================================
// getWalletAddresses
// ============================================================================

Deno.test("getWalletAddresses: returns payment first, then ordinals, deduplicated", () => {
  assertEquals(getWalletAddresses(xverseWallet), [PAYMENT, ORDINALS]);
});

Deno.test("getWalletAddresses: single-address wallet yields one entry", () => {
  assertEquals(getWalletAddresses(singleAddressWallet), [PAYMENT]);
});

Deno.test("getWalletAddresses: drops empty strings and non-strings", () => {
  const wallet = {
    address: "",
    ordinalsAddress: ORDINALS,
    accounts: ["", " ", ORDINALS, 5 as unknown as string],
  };
  assertEquals(getWalletAddresses(wallet), [ORDINALS]);
});

Deno.test("getWalletAddresses: dedupes bech32 case variants", () => {
  const wallet = { address: PAYMENT, accounts: [PAYMENT.toUpperCase()] };
  assertEquals(getWalletAddresses(wallet), [PAYMENT]);
});

Deno.test("getWalletAddresses: empty for null / undefined / empty wallet", () => {
  assertEquals(getWalletAddresses(null), []);
  assertEquals(getWalletAddresses(undefined), []);
  assertEquals(getWalletAddresses({}), []);
});

// ============================================================================
// addressesEqual
// ============================================================================

Deno.test("addressesEqual: exact match", () => {
  assertEquals(addressesEqual(PAYMENT, PAYMENT), true);
  assertEquals(addressesEqual(LEGACY, LEGACY), true);
});

Deno.test("addressesEqual: bech32 case-insensitive, base58 case-sensitive", () => {
  assertEquals(addressesEqual(PAYMENT, PAYMENT.toUpperCase()), true);
  assertEquals(addressesEqual("tb1qabc", "TB1QABC"), true);
  assertEquals(addressesEqual(LEGACY, LEGACY_RECASED), false);
});

Deno.test("addressesEqual: different addresses and invalid inputs are not equal", () => {
  assertEquals(addressesEqual(PAYMENT, ORDINALS), false);
  assertEquals(addressesEqual(PAYMENT, ""), false);
  assertEquals(addressesEqual("", ""), false);
  assertEquals(addressesEqual(undefined, undefined), false);
  assertEquals(addressesEqual(null, PAYMENT), false);
  assertEquals(addressesEqual(1, 1), false);
});
