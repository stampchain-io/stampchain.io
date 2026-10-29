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

export function getChainId(env: Pick<typeof Deno.env, "get"> = chainEnv()): ChainId {
  const raw = (env.get("CHAIN") ?? "bitcoin").trim().toLowerCase();
  if (raw === "" || raw === "bitcoin") return "bitcoin";
  if (raw === "ecx") return "ecx";
  throw new Error(`Unsupported CHAIN=${raw}; expected "bitcoin" or "ecx"`);
}

/** Public origin of the Bitcoin site. */
export const BITCOIN_SITE_ORIGIN = "https://stampchain.io";
/** Public origin of the ECX site when APP_DOMAIN is unset. */
export const ECX_DEFAULT_SITE_ORIGIN = "https://ecx.stampchain.io";

/**
 * Public origin for canonical links, og:url, structured data and the
 * sitemap. Bitcoin always returns https://stampchain.io, so its pages are
 * unchanged. ECX returns https://APP_DOMAIN, so ECX pages stop pointing
 * search engines at the Bitcoin site, where the same number can be a
 * different stamp.
 */
export function siteOrigin(
  env: Pick<typeof Deno.env, "get"> = chainEnv(),
): string {
  if (getChainId(env) !== "ecx") return BITCOIN_SITE_ORIGIN;
  const domain = (env.get("APP_DOMAIN") ?? "").trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return domain ? `https://${domain}` : ECX_DEFAULT_SITE_ORIGIN;
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

/**
 * Why a broadcast was refused. `status` is the HTTP code an API route should
 * answer with: 403 when ECX broadcast is switched off, 400 when the
 * transaction itself is unacceptable (missing replay marker, unparseable).
 */
export class BroadcastRefusedError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403,
    readonly reason: "broadcast_disabled" | "replay_marker_missing" | "invalid_transaction",
  ) {
    super(message);
    this.name = "BroadcastRefusedError";
  }
}

type EnvReader = Pick<typeof Deno.env, "get">;

/**
 * The process env, read lazily. This module is reachable from the browser
 * bundle (server/config/config.ts is imported by shared lib/ code), so it
 * must not touch `Deno` at module load: that threw "Deno is not defined" on
 * every page. In the browser there is no env, which reads as Bitcoin.
 */
const processEnv: EnvReader = {
  get: (key: string) =>
    typeof Deno !== "undefined" ? Deno.env.get(key) : undefined,
};
let chainEnvSource: EnvReader | null = null;

/** The env the broadcast gate and /config read. The process env unless a test swapped it. */
export function chainEnv(): EnvReader {
  return chainEnvSource ?? processEnv;
}

/**
 * Test seam: swap the env read by assertBroadcastAllowed and getClientConfig.
 * Module state is per test worker, so unlike Deno.env.set it cannot leak into
 * test files running in parallel threads. Returns a restore function.
 */
export function setChainEnvForTesting(env: EnvReader): () => void {
  const previous = chainEnvSource;
  chainEnvSource = env;
  return () => {
    chainEnvSource = previous;
  };
}

/**
 * The single broadcast gate. Every server path that sends a signed
 * transaction upstream, or accepts one for sending, calls this first.
 *
 * Bitcoin (CHAIN unset or "bitcoin"): returns immediately; the hex is not
 * even parsed. ECX: refuses (403) unless ECX_BROADCAST_ENABLED is exactly
 * "true", then refuses (400) unless the replay marker is present. Both
 * variables are read on every call so the flag flips without a deploy.
 */
export function assertBroadcastAllowed(
  txHex: string,
  env: EnvReader = chainEnv(),
): void {
  if (getChainId(env) !== "ecx") return;
  if (env.get("ECX_BROADCAST_ENABLED") !== "true") {
    throw new BroadcastRefusedError(
      "ECX broadcast is disabled (set ECX_BROADCAST_ENABLED=true to enable)",
      403,
      "broadcast_disabled",
    );
  }
  try {
    bitcoin.Transaction.fromHex(txHex);
  } catch (error) {
    throw new BroadcastRefusedError(
      `Refusing ECX broadcast: not a valid signed transaction (${
        error instanceof Error ? error.message : String(error)
      })`,
      400,
      "invalid_transaction",
    );
  }
  try {
    assertReplayProtected(txHex, "ecx");
  } catch (error) {
    throw new BroadcastRefusedError(
      error instanceof Error ? error.message : String(error),
      400,
      "replay_marker_missing",
    );
  }
}
