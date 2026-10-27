/**
 * The chain as seen by rendering code that may run in the browser.
 *
 * Islands cannot read Deno.env. On the server, routes/_middleware.ts sets
 * this from the server's chain profile before rendering. In the browser, the
 * Header island receives the same value as a prop from routes/_app.tsx and
 * sets it while hydrating; Header is the first island on every page with an
 * app layout, so later islands see it too. On Bitcoin nothing is ever set,
 * Header gets no prop, and every helper below returns the pre-ECX value.
 */
import type { BrandChain } from "$lib/utils/chain/brand.ts";

export interface ClientChainInfo {
  CHAIN: "ecx";
  /**
   * Esplora/mempool-style web explorer for the chain (paths /tx/:id and
   * /address/:a), or "" when none is configured. Links are hidden when empty.
   */
  EXPLORER_BASE_URL: string;
}

let current: ClientChainInfo | null = null;

export function setClientChain(info: ClientChainInfo | null | undefined): void {
  current = info ?? null;
}

export function getClientChain(): ClientChainInfo | null {
  return current;
}

export function getClientChainId(): BrandChain {
  return current ? current.CHAIN : "bitcoin";
}

/* ===== EXPLORER LINKS ===== */
/** The two Bitcoin explorers the site links to today, kept per call site. */
export type BitcoinExplorer = "mempool" | "blockchain.com";

const BITCOIN_TX_BASE: Record<BitcoinExplorer, string> = {
  "mempool": "https://mempool.space/tx/",
  "blockchain.com": "https://www.blockchain.com/explorer/transactions/btc/",
};
const BITCOIN_ADDRESS_BASE = "https://mempool.space/address/";
const BITCOIN_EXPLORER_HOME = "https://mempool.space/";

function chainExplorerBase(): string {
  return (current?.EXPLORER_BASE_URL ?? "").replace(/\/+$/, "");
}

/** Transaction link, or null on a chain with no configured explorer. */
export function txExplorerUrl(
  txid: string,
  bitcoinExplorer: BitcoinExplorer = "mempool",
): string | null {
  if (!current) return `${BITCOIN_TX_BASE[bitcoinExplorer]}${txid}`;
  const base = chainExplorerBase();
  return base ? `${base}/tx/${txid}` : null;
}

/** Address link, or null on a chain with no configured explorer. */
export function addressExplorerUrl(address: string): string | null {
  if (!current) return `${BITCOIN_ADDRESS_BASE}${address}`;
  const base = chainExplorerBase();
  return base ? `${base}/address/${address}` : null;
}

/** Explorer home page, or null on a chain with no configured explorer. */
export function explorerHomeUrl(): string | null {
  if (!current) return BITCOIN_EXPLORER_HOME;
  const base = chainExplorerBase();
  return base ? `${base}/` : null;
}
