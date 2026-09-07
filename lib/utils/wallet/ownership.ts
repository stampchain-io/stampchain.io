/* ===== WALLET OWNERSHIP HELPERS ===== */
/**
 * Canonical "does the connected wallet control this address?" logic.
 *
 * Wallets can expose more than one address for the same session. Xverse, for
 * example, reports a payment address (P2WPKH, `bc1q…`) on `wallet.address`
 * and an ordinals address (P2TR, `bc1p…`) on `wallet.ordinalsAddress`, and
 * lists both in `wallet.accounts`. Any owner-gated decision (owner-only UI,
 * "is this my stamp/token", which address to sign with, …) MUST go through
 * these helpers instead of comparing `wallet.address` directly, otherwise the
 * secondary addresses are silently ignored.
 *
 * Comparison rules:
 *   - Bech32 / Bech32m addresses (`bc1…`, `tb1…`, `bcrt1…`) are case-insensitive
 *     by spec, so they are compared case-insensitively.
 *   - Base58Check addresses (`1…`, `3…`, `m…`, `n…`, `2…`) are case-sensitive,
 *     so they are compared exactly.
 *   - Surrounding whitespace is never significant.
 */
import type { Wallet } from "$types/wallet.d.ts";

/** Minimal shape needed to enumerate the addresses a wallet controls. */
export type WalletAddressSource = Partial<
  Pick<Wallet, "address" | "ordinalsAddress" | "accounts">
>;

const BECH32_PREFIX = /^(bc|tb|bcrt)1/i;

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Compare two Bitcoin addresses for equality, honouring the case rules of
 * each address format (see module docs).
 */
export function addressesEqual(a: unknown, b: unknown): boolean {
  const left = normalizeAddress(a);
  const right = normalizeAddress(b);
  if (left === null || right === null) return false;
  if (left === right) return true;
  if (BECH32_PREFIX.test(left) && BECH32_PREFIX.test(right)) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return false;
}

/**
 * All distinct, non-empty addresses the connected wallet reports as its own:
 * the primary/payment address, the optional ordinals address, and every entry
 * of `accounts`. Order is preserved (primary first) and duplicates removed.
 */
export function getWalletAddresses(
  wallet: WalletAddressSource | null | undefined,
): string[] {
  if (!wallet) return [];
  const candidates: unknown[] = [
    wallet.address,
    wallet.ordinalsAddress,
    ...(Array.isArray(wallet.accounts) ? wallet.accounts : []),
  ];
  const result: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeAddress(candidate);
    if (normalized === null) continue;
    if (result.some((existing) => addressesEqual(existing, normalized))) {
      continue;
    }
    result.push(normalized);
  }
  return result;
}

/**
 * True when `address` is one of the addresses controlled by `wallet`.
 * Returns false for a missing wallet, a disconnected wallet (no addresses),
 * or an empty/invalid target address.
 */
export function walletOwnsAddress(
  wallet: WalletAddressSource | null | undefined,
  address: unknown,
): boolean {
  const target = normalizeAddress(address);
  if (target === null) return false;
  return getWalletAddresses(wallet).some((owned) =>
    addressesEqual(owned, target)
  );
}
