/* ===== API BASE URL CONSTANTS ===== */

/**
 * External API base URLs used throughout the application
 */

/** BlockCypher API for Bitcoin blockchain data */
export const BLOCKCYPHER_API_BASE_URL = "https://api.blockcypher.com";

/** Blockchain.info API for Bitcoin data */
export const BLOCKCHAIN_API_BASE_URL = "https://blockchain.info";

/** Mempool.space API for Bitcoin mempool and transaction data */
const _mempoolUrl = typeof Deno !== "undefined"
  ? Deno.env.get("MEMPOOL_API_URL")
  : undefined;
// ECX (CHAIN=ecx) has no default explorer: the defaults below are Bitcoin.
// MEMPOOL_API_URL must point at an ECX esplora (e.g. https://esplora.ecash.ninja,
// no /api prefix), and BLOCKSTREAM_API_URL defaults to the same server.
const _isEcxChain = typeof Deno !== "undefined" &&
  (Deno.env.get("CHAIN") ?? "").trim().toLowerCase() === "ecx";
if (_isEcxChain && !_mempoolUrl) {
  throw new Error(
    "CHAIN=ecx requires MEMPOOL_API_URL (an ECX esplora); the default is Bitcoin's mempool.space",
  );
}
export const MEMPOOL_API_BASE_URL = _isEcxChain
  ? _mempoolUrl!.replace(/\/+$/, "")
  : _mempoolUrl || "https://mempool.space/api";

/** Blockstream API for Bitcoin blockchain explorer data */
const _blockstreamUrl = typeof Deno !== "undefined"
  ? Deno.env.get("BLOCKSTREAM_API_URL")
  : undefined;
export const BLOCKSTREAM_API_BASE_URL = _isEcxChain
  ? (_blockstreamUrl || MEMPOOL_API_BASE_URL).replace(/\/+$/, "")
  : _blockstreamUrl || "https://blockstream.info/api";

/** CoinGecko API for cryptocurrency price data */
export const COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3";
