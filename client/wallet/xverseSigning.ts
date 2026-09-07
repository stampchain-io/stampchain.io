/**
 * Pure helpers for choosing how the Xverse wallet signs a message.
 *
 * Kept free of the `xverse.ts` <-> `walletHelper.ts` <-> `wallet.ts` import
 * cycle so they can be imported (and unit-tested) in isolation.
 */
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import type { Wallet } from "$types/wallet.d.ts";

export type XverseSigningProtocol = "ECDSA" | "BIP322";

/**
 * Pick which of the connected Xverse addresses signs a message.
 *
 * Defaults to the payment address. A caller may request the ordinals address
 * (or, redundantly, the payment address) — anything the wallet does not
 * control is rejected so we never ask Xverse to sign for a foreign address.
 */
export const resolveXverseSigningAddress = (
  wallet: Pick<Wallet, "address" | "ordinalsAddress" | "accounts">,
  address?: string,
): string => {
  if (address === undefined) return wallet.address;
  if (!walletOwnsAddress(wallet, address)) {
    throw new Error(
      "Signing address is not controlled by the connected Xverse wallet",
    );
  }
  return address;
};

/**
 * Xverse only supports ECDSA message signing for its payment address
 * (P2WPKH / P2SH). Taproot (P2TR, `bc1p…`) addresses must sign with BIP-322,
 * which the server-side verifier (`verifySignature` in cryptoUtils) accepts.
 */
export const xverseSigningProtocolFor = (
  signingAddress: string,
): XverseSigningProtocol => {
  return /^(bc|tb|bcrt)1p/i.test(signingAddress) ? "BIP322" : "ECDSA";
};
