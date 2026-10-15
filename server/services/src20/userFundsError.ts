/**
 * True when a transaction-building error means the user's wallet cannot fund
 * the transaction. These are answered with a 400 and logged as warnings: they
 * describe the user's wallet, not a server fault.
 */
export function isUserFundsError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("insufficient funds") ||
    m.includes("no utxos available") ||
    m.includes("no spendable utxos") ||
    message.includes("UTXO selection failed");
}
