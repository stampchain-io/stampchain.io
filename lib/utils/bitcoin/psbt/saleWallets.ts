/**
 * Wallets whose signPSBT passes a per-input sighash through and can sign
 * input 1 only. Horizon and Xverse ignore the sighash argument, so a seller
 * using them would sign SIGHASH_ALL and the buyer could not safely complete.
 */
export const PARTIAL_SALE_WALLETS = [
  "unisat",
  "okx",
  "phantom",
  "leather",
  "wonder",
  "tapwallet",
] as const;

export function walletCanSignSaleOffer(
  provider: string | undefined,
): boolean {
  if (!provider) return false;
  return (PARTIAL_SALE_WALLETS as readonly string[]).includes(provider);
}
