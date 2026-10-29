/**
 * Chain profile for the server process.
 *
 * `CHAIN=bitcoin` (default) leaves every transaction exactly as before.
 * `CHAIN=ecx` targets the ecash.com Bitcoin fork (first ECX block 973728).
 * ECX transactions must carry the opt-in replay marker: nLockTime 499999998
 * plus at least one input with nSequence below 0xffffffff. Bitcoin treats
 * that locktime as a far-future height and rejects the transaction as
 * non-final, so it cannot be replayed onto Bitcoin. If every input is final,
 * Bitcoin ignores the locktime and the transaction IS replayable.
 */
import * as bitcoin from "bitcoinjs-lib";

export type ChainId = "bitcoin" | "ecx";

/** LOCKTIME_THRESHOLD - 2. Betanet used 499999999, which is non-final on mainnet ECX too. */
export const ECX_REPLAY_LOCKTIME = 499_999_998;
export const SEQUENCE_FINAL = 0xffffffff;
export const SEQUENCE_RBF = 0xfffffffd;

export function getChainId(env: Pick<typeof Deno.env, "get"> = Deno.env): ChainId {
  const raw = (env.get("CHAIN") ?? "bitcoin").trim().toLowerCase();
  if (raw === "" || raw === "bitcoin") return "bitcoin";
  if (raw === "ecx") return "ecx";
  throw new Error(`Unsupported CHAIN=${raw}; expected "bitcoin" or "ecx"`);
}

/**
 * Apply the chain's replay protection to an UNSIGNED psbt, in place.
 * Bitcoin: no-op. ECX: set the marker locktime and make vin[0] non-final if
 * every input is final. Must run before signing; bitcoinjs refuses to change
 * locktime or sequence once an input carries a signature.
 */
export function applyReplayProtection(psbt: bitcoin.Psbt, chain: ChainId = getChainId()): void {
  if (chain !== "ecx") return;
  if (psbt.txInputs.length === 0) {
    throw new Error("ECX replay protection needs at least one input");
  }
  psbt.setLocktime(ECX_REPLAY_LOCKTIME);
  if (psbt.txInputs.every((input) => input.sequence === SEQUENCE_FINAL)) {
    psbt.setInputSequence(0, SEQUENCE_RBF);
  }
}

/** True when a transaction is protected against replay onto Bitcoin. */
export function isReplayProtected(tx: { locktime: number; ins: { sequence: number }[] }): boolean {
  return tx.locktime === ECX_REPLAY_LOCKTIME && tx.ins.some((input) => input.sequence !== SEQUENCE_FINAL);
}

/**
 * Re-check a SIGNED transaction before broadcast: wallets may rewrite
 * locktime or sequences. Bitcoin: no-op. ECX: throws if the marker is gone.
 */
export function assertReplayProtected(txHex: string, chain: ChainId = getChainId()): void {
  if (chain !== "ecx") return;
  const tx = bitcoin.Transaction.fromHex(txHex);
  if (!isReplayProtected(tx)) {
    throw new Error(
      `Refusing ECX broadcast of ${tx.getId()}: locktime ${tx.locktime} / sequences ` +
        `${tx.ins.map((i) => i.sequence.toString(16)).join(",")} lack the replay marker`,
    );
  }
}
