import {
  BIG_LIMIT,
  BLOCK_TABLE,
  BLOCKCHAIN_API_BASE_URL,
  BLOCKCYPHER_API_BASE_URL,
  BLOCKSTREAM_API_BASE_URL,
  BREAKPOINTS,
  CAROUSEL_STAMP_IDS,
  COINGECKO_API_BASE_URL,
  DEFAULT_CACHE_DURATION,
  DEFAULT_LIMIT,
  DEFAULT_PAGE_SIZE,
  DEFAULT_WALLET_CONNECTORS,
  MAX_XCP_RETRIES,
  MEMPOOL_API_BASE_URL,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW,
  ROOT_DOMAINS,
  SATOSHIS_PER_BTC,
  SATS_PER_KB_MULTIPLIER,
  SMALL_LIMIT,
  SRC20_BALANCE_TABLE,
  SRC20_TABLE,
  STAMP_TABLE,
  SUPPORTED_UNICODE_FROM_INDEXER_CODE,
  WALLET_PROVIDERS,
  type WalletProviderKey,
} from "$constants";
import { assert, assertEquals } from "@std/assert";

Deno.test("constants - breakpoints", () => {
  assertEquals(BREAKPOINTS.desktop, 1440, "Desktop breakpoint");
  assertEquals(BREAKPOINTS.tablet, 1024, "Tablet breakpoint");
  assertEquals(BREAKPOINTS.mobileLg, 768, "Mobile large breakpoint");
  assertEquals(BREAKPOINTS.mobileMd, 568, "Mobile medium breakpoint");
  assertEquals(BREAKPOINTS.mobileSm, 360, "Mobile small breakpoint");

  // Verify breakpoints are in descending order
  assert(BREAKPOINTS.desktop > BREAKPOINTS.tablet, "Desktop > Tablet");
  assert(BREAKPOINTS.tablet > BREAKPOINTS.mobileLg, "Tablet > Mobile Large");
  assert(
    BREAKPOINTS.mobileLg > BREAKPOINTS.mobileMd,
    "Mobile Large > Mobile Medium",
  );
  assert(
    BREAKPOINTS.mobileMd > BREAKPOINTS.mobileSm,
    "Mobile Medium > Mobile Small",
  );
});

Deno.test("constants - table names", () => {
  assertEquals(STAMP_TABLE, "StampTableV4", "STAMP_TABLE");
  assertEquals(BLOCK_TABLE, "blocks", "BLOCK_TABLE");
  assertEquals(SRC20_TABLE, "SRC20Valid", "SRC20_TABLE");
  assertEquals(SRC20_BALANCE_TABLE, "balances", "SRC20_BALANCE_TABLE");

  // Verify all table names are non-empty strings
  assert(STAMP_TABLE.length > 0, "STAMP_TABLE not empty");
  assert(BLOCK_TABLE.length > 0, "BLOCK_TABLE not empty");
  assert(SRC20_TABLE.length > 0, "SRC20_TABLE not empty");
  assert(SRC20_BALANCE_TABLE.length > 0, "SRC20_BALANCE_TABLE not empty");
});

Deno.test("constants - numeric values", () => {
  assertEquals(MAX_XCP_RETRIES, 5, "MAX_XCP_RETRIES");
  assertEquals(DEFAULT_CACHE_DURATION, 60 * 60 * 12, "12 hours in seconds");
  assertEquals(SATS_PER_KB_MULTIPLIER, 1000, "1 KB = 1000 vBytes");
  assertEquals(BIG_LIMIT, 200, "BIG_LIMIT");
  assertEquals(SMALL_LIMIT, 20, "SMALL_LIMIT");
  assertEquals(DEFAULT_LIMIT, 50, "DEFAULT_LIMIT");
  assertEquals(DEFAULT_PAGE_SIZE, 50, "DEFAULT_PAGE_SIZE");
  assertEquals(RATE_LIMIT_REQUESTS, 100, "RATE_LIMIT_REQUESTS");
  assertEquals(RATE_LIMIT_WINDOW, 60 * 1000, "1 minute in milliseconds");
  assertEquals(SATOSHIS_PER_BTC, 100000000, "Satoshis per Bitcoin");
});

Deno.test("constants - API base URLs", () => {
  assertEquals(
    BLOCKCYPHER_API_BASE_URL,
    "https://api.blockcypher.com",
    "BlockCypher API",
  );
  assertEquals(
    BLOCKCHAIN_API_BASE_URL,
    "https://blockchain.info",
    "Blockchain.info API",
  );
  assertEquals(
    MEMPOOL_API_BASE_URL,
    "https://mempool.space/api",
    "Mempool API",
  );
  assertEquals(
    BLOCKSTREAM_API_BASE_URL,
    "https://blockstream.info/api",
    "Blockstream API",
  );
  assertEquals(
    COINGECKO_API_BASE_URL,
    "https://api.coingecko.com/api/v3",
    "CoinGecko API",
  );

  // Verify all URLs start with https
  assert(
    BLOCKCYPHER_API_BASE_URL.startsWith("https://"),
    "BlockCypher uses HTTPS",
  );
  assert(
    BLOCKCHAIN_API_BASE_URL.startsWith("https://"),
    "Blockchain.info uses HTTPS",
  );
  assert(MEMPOOL_API_BASE_URL.startsWith("https://"), "Mempool uses HTTPS");
  assert(
    BLOCKSTREAM_API_BASE_URL.startsWith("https://"),
    "Blockstream uses HTTPS",
  );
  assert(COINGECKO_API_BASE_URL.startsWith("https://"), "CoinGecko uses HTTPS");
});

Deno.test("constants - carousel stamp IDs", () => {
  assertEquals(CAROUSEL_STAMP_IDS.length, 5, "Should have 5 carousel stamps");
  assertEquals(CAROUSEL_STAMP_IDS, [1185908, 1121162, 1040705, 932199, 897330]);

  // Verify all are positive numbers
  for (const id of CAROUSEL_STAMP_IDS) {
    assert(typeof id === "number", `ID ${id} should be a number`);
    assert(id > 0, `ID ${id} should be positive`);
  }
});

Deno.test("constants - wallet providers", () => {
  const expectedProviders: WalletProviderKey[] = [
    "unisat",
    "leather",
    "okx",
    "tapwallet",
    "phantom",
    "horizon",
    "xverse",
  ];

  assertEquals(
    DEFAULT_WALLET_CONNECTORS,
    expectedProviders,
    "Default wallet connectors",
  );
  assertEquals(
    Object.keys(WALLET_PROVIDERS).sort(),
    expectedProviders.sort(),
    "Wallet provider keys match",
  );

  // Verify each provider has required properties
  for (const [key, provider] of Object.entries(WALLET_PROVIDERS)) {
    assert("name" in provider, `${key} should have name`);
    assert("logo" in provider, `${key} should have logo`);
    assert(typeof provider.name === "string", `${key} name should be string`);
    assert(typeof provider.logo === "string", `${key} logo should be string`);
    assert(provider.name.length > 0, `${key} name should not be empty`);
    assert(provider.logo.length > 0, `${key} logo should not be empty`);
  }
});

Deno.test("constants - unicode string", () => {
  assert(
    typeof SUPPORTED_UNICODE_FROM_INDEXER_CODE === "string",
    "Unicode string should be string",
  );
  assert(
    SUPPORTED_UNICODE_FROM_INDEXER_CODE.length > 0,
    "Unicode string should not be empty",
  );

  // The string contains unicode escape sequences as literal text (e.g., "U0001f004")
  // Verify it contains the expected pattern
  assert(
    SUPPORTED_UNICODE_FROM_INDEXER_CODE.includes("U0001"),
    "Should contain Unicode escape patterns",
  );

  // Verify it's a long string of unicode escapes
  const unicodePattern = /U[0-9a-f]{8}/i;
  assert(
    unicodePattern.test(SUPPORTED_UNICODE_FROM_INDEXER_CODE),
    "Should match Unicode escape pattern",
  );
});

Deno.test("constants - root domains", () => {
  assertEquals(ROOT_DOMAINS.length, 5, "Should have 5 root domains");
  assertEquals(ROOT_DOMAINS, [".btc", ".sats", ".xbt", ".x", ".pink"]);

  // Verify all start with dot
  for (const domain of ROOT_DOMAINS) {
    assert(domain.startsWith("."), `Domain ${domain} should start with dot`);
    assert(domain.length > 1, `Domain ${domain} should have content after dot`);
  }
});
