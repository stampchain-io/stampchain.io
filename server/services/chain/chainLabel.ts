/**
 * Chain label for pages and API responses.
 *
 * Under CHAIN=ecx every page header and every /api response says which chain
 * the data comes from, at what indexed height and block hash. Under Bitcoin
 * nothing here runs: callers check `getChainId()` first, or call
 * `withChainHeaders`, which returns its input untouched.
 */
import { BlockRepository } from "$server/database/blockRepository.ts";
import { type ChainId, getChainId } from "$server/services/chain/chainProfile.ts";
import type { ClientChainInfo } from "$lib/utils/chain/clientChain.ts";

export interface ChainLabel {
  chain: ChainId;
  /** "ECX" */
  label: string;
  /** Newest block in the indexer's `blocks` table; null if the lookup failed. */
  height: number | null;
  blockHash: string | null;
}

export const CHAIN_HEADER = "X-Chain";
export const CHAIN_HEIGHT_HEADER = "X-Chain-Height";
export const CHAIN_BLOCK_HASH_HEADER = "X-Chain-Block-Hash";

/**
 * In-process memo on top of the 30 s query cache, so a page load or API
 * request does not even pay a cache round trip. Short enough that the label
 * trails the indexer by at most one cache window plus this.
 */
const MEMO_MS = 10_000;
let memo: { at: number; value: Promise<{ height: number | null; blockHash: string | null }> } | null =
  null;

async function lookupTip(): Promise<{ height: number | null; blockHash: string | null }> {
  const result = await BlockRepository.getLastBlockWithHashFromDb() as {
    rows?: Array<{ block_index: number | string; block_hash: string }>;
  };
  const row = result?.rows?.[0];
  if (!row) return { height: null, blockHash: null };
  return { height: Number(row.block_index), blockHash: row.block_hash };
}

async function getTip(): Promise<{ height: number | null; blockHash: string | null }> {
  const now = Date.now();
  if (!memo || now - memo.at > MEMO_MS) {
    memo = { at: now, value: lookupTip() };
  }
  try {
    return await memo.value;
  } catch (error) {
    // The label must not take a page or an API response down with it. Drop
    // the memo so the next request retries, and label the chain without a tip.
    memo = null;
    console.error(
      `[chainLabel] tip lookup failed: ${(error as Error)?.name ?? typeof error}: ${
        (error as Error)?.message ?? error
      }`,
    );
    return { height: null, blockHash: null };
  }
}

/** Test hook: forget the memoised tip. */
export function resetChainLabelCache(): void {
  memo = null;
}

/** The label for a non-Bitcoin chain, or null on Bitcoin. */
export async function getChainLabel(chain: ChainId = getChainId()): Promise<ChainLabel | null> {
  if (chain === "bitcoin") return null;
  const tip = await getTip();
  return { chain, label: chain.toUpperCase(), ...tip };
}

/**
 * ECX block explorer used when ECX_EXPLORER_URL is unset. A mempool fork:
 * /tx/:txid, /address/:address and /block/:hash (or height).
 */
export const ECX_DEFAULT_EXPLORER_URL = "https://explorer.ecash.ninja";

/**
 * What islands need to know about the chain; null on Bitcoin.
 * ECX_EXPLORER_URL overrides the explorer; set it to "" to hide the links.
 */
export function getClientChainInfo(
  chain: ChainId = getChainId(),
  env: Pick<typeof Deno.env, "get"> = Deno.env,
): ClientChainInfo | null {
  if (chain === "bitcoin") return null;
  const explorer = env.get("ECX_EXPLORER_URL") ?? ECX_DEFAULT_EXPLORER_URL;
  return { CHAIN: chain, EXPLORER_BASE_URL: explorer.trim() };
}

/**
 * Add X-Chain, X-Chain-Height and X-Chain-Block-Hash to an API response.
 * Bitcoin: returns the same Response object. Responses with immutable
 * headers (Response.redirect, a proxied fetch) are re-wrapped first.
 */
export async function withChainHeaders(
  response: Response,
  chain: ChainId = getChainId(),
): Promise<Response> {
  if (chain === "bitcoin") return response;
  const label = await getChainLabel(chain);
  if (!label) return response;
  const headers: Array<[string, string]> = [[CHAIN_HEADER, label.chain]];
  if (label.height !== null) headers.push([CHAIN_HEIGHT_HEADER, String(label.height)]);
  if (label.blockHash) headers.push([CHAIN_BLOCK_HASH_HEADER, label.blockHash]);

  let out = response;
  try {
    for (const [k, v] of headers) out.headers.set(k, v);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    out = new Response(response.body, response);
    for (const [k, v] of headers) out.headers.set(k, v);
  }
  return out;
}
