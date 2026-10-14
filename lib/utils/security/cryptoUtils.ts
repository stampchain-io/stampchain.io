import { verify } from "https://esm.sh/bitcoinjs-message@2.2.0";
// bip322-js 3.0.0 breaks against bitcoinjs-lib >= 6.1.9 ("Need a Utxo input
// item for input #0"), which esm.sh serves by default for a fresh cache. Pin
// the version it was written against so verification does not depend on the
// lockfile being honoured.
import { Verifier } from "https://esm.sh/bip322-js@3.0.0?deps=bitcoinjs-lib@6.1.7";

export function verifySignature(
  message: string,
  signature: string,
  address: string,
): boolean {
  // Try legacy Bitcoin message verification first (most wallets)
  try {
    return verify(message, address, signature, undefined, true);
  } catch (_legacyError) {
    // Legacy verification failed — likely BIP-322 format (Leather, etc.)
  }

  // Try BIP-322 verification (handles modern wallet signature formats)
  try {
    return Verifier.verifySignature(address, message, signature);
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}
