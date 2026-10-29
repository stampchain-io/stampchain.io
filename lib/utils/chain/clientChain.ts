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
import { type BrandChain, stampNumberPrefix } from "$lib/utils/chain/brand.ts";

export interface ClientChainInfo {
  CHAIN: "ecx";
  /**
   * Mempool-style web explorer for the chain (paths /tx/:txid,
   * /address/:address and /block/:hash), or "" when there is none. Links are
   * hidden when empty.
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
const BITCOIN_BLOCK_BASE = "https://mempool.space/block/";
const BITCOIN_EXPLORER_HOME = "https://mempool.space/";

function chainExplorerBase(info: ClientChainInfo | null = current): string {
  return (info?.EXPLORER_BASE_URL ?? "").replace(/\/+$/, "");
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

/**
 * Block link by hash or height, or null on a chain with no configured
 * explorer. `info` defaults to the published chain; server code that renders
 * before the Header island (the chain banner) passes it explicitly.
 */
export function blockExplorerUrl(
  block: string | number,
  info: ClientChainInfo | null = current,
): string | null {
  if (!info) return `${BITCOIN_BLOCK_BASE}${block}`;
  const base = chainExplorerBase(info);
  return base ? `${base}/block/${block}` : null;
}

/** Explorer home page, or null on a chain with no configured explorer. */
export function explorerHomeUrl(): string | null {
  if (!current) return BITCOIN_EXPLORER_HOME;
  const base = chainExplorerBase();
  return base ? `${base}/` : null;
}

/* ===== AMOUNTS AND MARKET DATA ===== */
/** Unit for on-chain amounts the site shows: "BTC" on Bitcoin. */
export type CoinUnit = "BTC" | "ECX";

/** Amount unit, e.g. the suffix in "0.0042 BTC". */
export function coinUnit(chain: BrandChain = getClientChainId()): CoinUnit {
  return chain === "ecx" ? "ECX" : "BTC";
}

/** Compact unit mark: "₿" on Bitcoin. ECX has no symbol, so its ticker. */
export function coinSymbol(chain: BrandChain = getClientChainId()): string {
  return chain === "ecx" ? "ECX" : "₿";
}

/**
 * The one switch for market data: USD values, the BTC/USD toggle, floor
 * price, market cap, volume, 24h change, value columns and charts. Off on
 * ECX, which has no price feed; the API still returns the fields.
 */
export function showMarketData(
  chain: BrandChain = getClientChainId(),
): boolean {
  return chain === "bitcoin";
}

/** Table columns that carry market data, as their header text reads. */
export const MARKET_DATA_COLUMNS: ReadonlySet<string> = new Set([
  "PRICE",
  "CHANGE",
  "VOLUME",
  "MARKETCAP",
  "VALUE",
]);

/**
 * Drop the market-data columns from a list aligned with `headers` (the
 * headers themselves, colgroup widths). Returns `items` itself when market
 * data is shown, so Bitcoin tables are unchanged.
 */
export function withoutMarketColumns<T>(
  items: T[],
  headers: readonly string[],
  chain: BrandChain = getClientChainId(),
): T[] {
  if (showMarketData(chain)) return items;
  return items.filter((_, i) => !MARKET_DATA_COLUMNS.has(headers[i] ?? ""));
}

/* ===== STAMP NUMBERS ===== */
/**
 * Mark in front of a displayed stamp number. "ECX #" for an ECX-native
 * stamp on ECX (`blockIndex` is the stamp's creation block, 973728 or
 * later). Otherwise what Bitcoin shows: "#", or "Stamp #" with a label.
 * Pass null when the row's block is not the creation block (sale rows):
 * unknown reads as inherited. Display only; links, API data and database
 * values keep the bare number.
 */
export function stampPrefix(
  blockIndex: number | string | null | undefined,
  bitcoinLabel = "",
  chain: BrandChain = getClientChainId(),
): string {
  const mark = stampNumberPrefix(chain, blockIndex);
  if (mark !== "#") return mark;
  return bitcoinLabel ? `${bitcoinLabel} #` : "#";
}

/**
 * Class for the mark before a card's stamp number. On ECX a native stamp's
 * "ECX #" is set as a small label above the number (static/estamps.css) so
 * long numbers are not cut off in narrow cards. Everything else keeps
 * "font-light".
 */
export function stampPrefixClass(
  blockIndex: number | string | null | undefined,
  chain: BrandChain = getClientChainId(),
): string {
  return stampNumberPrefix(chain, blockIndex) === "#"
    ? "font-light"
    : "font-light estamps-num-prefix";
}
