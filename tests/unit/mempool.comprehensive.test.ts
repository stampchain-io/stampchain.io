/**
 * @fileoverview Comprehensive tests for Mempool utility functions
 * Uses proper mocking for CI compliance - no external API calls
 * Covers getRecommendedFees, getCurrentBlock, getTransactionInfo, and getBTCBalanceFromMempool
 */

import {
  getBTCBalanceFromMempool,
  getCurrentBlock,
  getRecommendedFees,
  getTransactionInfo,
} from "$lib/utils/bitcoin/network/mempool.ts";
import { assert, assertEquals, assertExists } from "@std/assert";

// Mock fetch responses for testing
const mockFetchResponses: Map<string, any> = new Map();
let fetchCallCount = 0;
let consoleErrorCalls: any[] = [];

// Save original fetch and console.error
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

// Mock fetch function
function mockFetch(url: string): Promise<Response> {
  fetchCallCount++;

  // Find matching mock response
  for (const [pattern, response] of mockFetchResponses.entries()) {
    if (url.includes(pattern)) {
      if (response.error) {
        return Promise.reject(new Error(response.error));
      }

      return Promise.resolve({
        ok: response.status === undefined || response.status === 200,
        status: response.status || 200,
        json: () => Promise.resolve(response.data),
      } as Response);
    }
  }

  // Default 404 response
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({}),
  } as Response);
}

function setup() {
  mockFetchResponses.clear();
  fetchCallCount = 0;
  consoleErrorCalls = [];

  // Mock fetch
  globalThis.fetch = mockFetch as any;

  // Mock console.error to capture error logs
  console.error = (...args: any[]) => {
    consoleErrorCalls.push(args);
  };
}

function teardown() {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}

// Test fixtures
const FIXTURES = {
  recommendedFees: {
    valid: {
      fastestFee: 20,
      halfHourFee: 15,
      hourFee: 10,
      economyFee: 5,
      minimumFee: 1,
    },
    invalidStructure: {
      fastestFee: "not-a-number",
      halfHourFee: 15,
    },
  },
  currentBlock: {
    valid: 850000,
    invalid: "not-a-number",
  },
  transactionInfo: {
    validHex: "0200000001abc123...",
    invalidHex: null,
  },
  btcBalance: {
    valid: {
      chain_stats: {
        funded_txo_sum: 100000000, // 1 BTC
        spent_txo_sum: 50000000, // 0.5 BTC
        tx_count: 10,
      },
      mempool_stats: {
        funded_txo_sum: 20000000, // 0.2 BTC
        spent_txo_sum: 10000000, // 0.1 BTC
        tx_count: 2,
      },
    },
    empty: {
      chain_stats: {
        funded_txo_sum: 0,
        spent_txo_sum: 0,
        tx_count: 0,
      },
      mempool_stats: {
        funded_txo_sum: 0,
        spent_txo_sum: 0,
        tx_count: 0,
      },
    },
  },
};

Deno.test("getRecommendedFees - success scenario", async () => {
  setup();

  mockFetchResponses.set("fees/recommended", {
    status: 200,
    data: FIXTURES.recommendedFees.valid,
  });

  const result = await getRecommendedFees();

  assertExists(result, "Should return fee data");
  assertEquals(result!.fastestFee, 20);
  assertEquals(result!.halfHourFee, 15);
  assertEquals(result!.hourFee, 10);
  assertEquals(result!.economyFee, 5);
  assertEquals(result!.minimumFee, 1);
  assertEquals(fetchCallCount, 1, "Should make exactly one fetch call");

  teardown();
});

Deno.test("getRecommendedFees - invalid response structure", async () => {
  setup();

  mockFetchResponses.set("fees/recommended", {
    status: 200,
    data: FIXTURES.recommendedFees.invalidStructure,
  });

  const result = await getRecommendedFees();

  assertEquals(result, null, "Should return null for invalid structure");
  assertEquals(consoleErrorCalls.length, 1, "Should log error");
  assert(
    consoleErrorCalls[0][1].message.includes("Invalid fee data structure"),
    "Should log validation error",
  );

  teardown();
});

Deno.test("getRecommendedFees - HTTP error with retry", async () => {
  setup();

  mockFetchResponses.set("fees/recommended", {
    status: 500,
    data: {},
  });

  const result = await getRecommendedFees();

  assertEquals(result, null, "Should return null after retries");
  assertEquals(fetchCallCount, 4, "Should retry 3 times (4 total calls)");
  assertEquals(consoleErrorCalls.length, 1, "Should log final error");

  teardown();
});

Deno.test("getRecommendedFees - network error with retry", async () => {
  setup();

  mockFetchResponses.set("fees/recommended", {
    error: "Network error",
  });

  const result = await getRecommendedFees();

  assertEquals(result, null, "Should return null after network errors");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");
  assertEquals(consoleErrorCalls.length, 1, "Should log error");

  teardown();
});

Deno.test("getCurrentBlock - success scenario", async () => {
  setup();

  mockFetchResponses.set("blocks/tip/height", {
    status: 200,
    data: FIXTURES.currentBlock.valid,
  });

  const result = await getCurrentBlock();

  assertEquals(result, 850000, "Should return current block height");
  assertEquals(fetchCallCount, 1, "Should make exactly one fetch call");

  teardown();
});

Deno.test("getCurrentBlock - HTTP error with retry", async () => {
  setup();

  mockFetchResponses.set("blocks/tip/height", {
    status: 503,
    data: {},
  });

  const result = await getCurrentBlock();

  assertEquals(result, null, "Should return null after retries");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");
  assertEquals(consoleErrorCalls.length, 1, "Should log error");

  teardown();
});

Deno.test("getCurrentBlock - network error with retry", async () => {
  setup();

  mockFetchResponses.set("blocks/tip/height", {
    error: "Connection timeout",
  });

  const result = await getCurrentBlock();

  assertEquals(result, null, "Should return null after network errors");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");

  teardown();
});

Deno.test("getTransactionInfo - success scenario", async () => {
  setup();

  const testTxid = "abc123def456";
  mockFetchResponses.set(`tx/${testTxid}/hex`, {
    status: 200,
    data: FIXTURES.transactionInfo.validHex,
  });

  const result = await getTransactionInfo(testTxid);

  assertEquals(
    result,
    FIXTURES.transactionInfo.validHex,
    "Should return transaction hex",
  );
  assertEquals(fetchCallCount, 1, "Should make exactly one fetch call");

  teardown();
});

Deno.test("getTransactionInfo - transaction not found", async () => {
  setup();

  const testTxid = "nonexistent123";
  mockFetchResponses.set(`tx/${testTxid}/hex`, {
    status: 404,
    data: {},
  });

  const result = await getTransactionInfo(testTxid);

  assertEquals(result, null, "Should return null for 404");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");
  assertEquals(consoleErrorCalls.length, 1, "Should log error");

  teardown();
});

Deno.test("getTransactionInfo - network error with retry", async () => {
  setup();

  const testTxid = "error123";
  mockFetchResponses.set(`tx/${testTxid}/hex`, {
    error: "Network timeout",
  });

  const result = await getTransactionInfo(testTxid);

  assertEquals(result, null, "Should return null after network errors");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");

  teardown();
});

Deno.test("getBTCBalanceFromMempool - success scenario", async () => {
  setup();

  const testAddress = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
  mockFetchResponses.set(`address/${testAddress}`, {
    status: 200,
    data: FIXTURES.btcBalance.valid,
  });

  const result = await getBTCBalanceFromMempool(testAddress);

  assertExists(result, "Should return balance data");
  assertEquals(
    result!.confirmed,
    50000000,
    "Should calculate confirmed balance correctly",
  );
  assertEquals(
    result!.unconfirmed,
    10000000,
    "Should calculate unconfirmed balance correctly",
  );
  assertEquals(
    result!.total,
    60000000,
    "Should calculate total balance correctly",
  );
  assertEquals(result!.txCount, 10, "Should return confirmed tx count");
  assertEquals(
    result!.unconfirmedTxCount,
    2,
    "Should return unconfirmed tx count",
  );
  assertEquals(fetchCallCount, 1, "Should make exactly one fetch call");

  teardown();
});

Deno.test("getBTCBalanceFromMempool - empty balance", async () => {
  setup();

  const testAddress = "bc1qemptyaddress";
  mockFetchResponses.set(`address/${testAddress}`, {
    status: 200,
    data: FIXTURES.btcBalance.empty,
  });

  const result = await getBTCBalanceFromMempool(testAddress);

  assertExists(result, "Should return balance data even for empty address");
  assertEquals(result!.confirmed, 0, "Should show zero confirmed balance");
  assertEquals(result!.unconfirmed, 0, "Should show zero unconfirmed balance");
  assertEquals(result!.total, 0, "Should show zero total balance");
  assertEquals(result!.txCount, 0, "Should show zero tx count");
  assertEquals(
    result!.unconfirmedTxCount,
    0,
    "Should show zero unconfirmed tx count",
  );

  teardown();
});

Deno.test("getBTCBalanceFromMempool - address not found", async () => {
  setup();

  const testAddress = "bc1qnotfound";
  mockFetchResponses.set(`address/${testAddress}`, {
    status: 404,
    data: {},
  });

  const result = await getBTCBalanceFromMempool(testAddress);

  assertEquals(result, null, "Should return null for 404");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");
  assertEquals(consoleErrorCalls.length, 1, "Should log error");

  teardown();
});

Deno.test("getBTCBalanceFromMempool - network error with retry", async () => {
  setup();

  const testAddress = "bc1qnetworkerror";
  mockFetchResponses.set(`address/${testAddress}`, {
    error: "Network failure",
  });

  const result = await getBTCBalanceFromMempool(testAddress);

  assertEquals(result, null, "Should return null after network errors");
  assertEquals(fetchCallCount, 4, "Should retry 3 times");
  assertEquals(consoleErrorCalls.length, 1, "Should log balance fetch error");
  assert(
    consoleErrorCalls[0][0] === "Mempool balance fetch error:",
    "Should log specific balance error message",
  );

  teardown();
});

Deno.test("Mempool utilities - retry mechanism timing", async () => {
  setup();

  // Test that retries have proper delay
  const startTime = Date.now();

  mockFetchResponses.set("fees/recommended", {
    error: "Timeout",
  });

  await getRecommendedFees();

  const endTime = Date.now();
  const elapsed = endTime - startTime;

  // Should take at least 3 seconds (3 retries × 1 second delay)
  // But less than 5 seconds (allowing for test execution time)
  assert(
    elapsed >= 2500,
    `Should take at least 2.5s for retries, took ${elapsed}ms`,
  );
  assert(elapsed < 5000, `Should take less than 5s, took ${elapsed}ms`);
  assertEquals(fetchCallCount, 4, "Should make 4 total calls (1 + 3 retries)");

  teardown();
});

Deno.test("Mempool utilities - MAX_RETRIES constant behavior", async () => {
  setup();

  // Test that exactly MAX_RETRIES (3) retries are performed
  mockFetchResponses.set("blocks/tip/height", {
    status: 500,
  });

  const result = await getCurrentBlock();

  assertEquals(result, null, "Should return null after max retries");
  assertEquals(
    fetchCallCount,
    4,
    "Should make exactly 4 calls (1 initial + 3 retries)",
  );

  teardown();
});

Deno.test("Mempool utilities - URL construction", async () => {
  setup();

  // Capture the actual URLs being called
  const calledUrls: string[] = [];
  globalThis.fetch = ((url: string) => {
    calledUrls.push(url);

    // Return appropriate response based on URL to avoid retries
    let responseData = {};
    if (url.includes("fees/recommended")) {
      responseData = {
        fastestFee: 10,
        halfHourFee: 8,
        hourFee: 6,
        economyFee: 4,
        minimumFee: 1,
      };
    } else if (url.includes("blocks/tip/height")) {
      responseData = 850000;
    } else if (url.includes("/tx/")) {
      responseData = "0200000001abc123...";
    } else if (url.includes("/address/")) {
      responseData = FIXTURES.btcBalance.valid;
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseData),
    } as Response);
  }) as any;

  await getRecommendedFees();
  await getCurrentBlock();
  await getTransactionInfo("test123");
  await getBTCBalanceFromMempool("bc1qtest");

  assertEquals(calledUrls.length, 4, "Should make 4 API calls");
  assert(
    calledUrls[0].includes("/v1/fees/recommended"),
    "Should call fees endpoint",
  );
  assert(
    calledUrls[1].endsWith("/blocks/tip/height") &&
      !calledUrls[1].includes("/v1/"),
    "Should call the esplora block height endpoint (no /v1 prefix)",
  );
  assert(
    calledUrls[2].includes("/tx/test123/hex"),
    "Should call transaction hex endpoint",
  );
  assert(
    calledUrls[3].includes("/address/bc1qtest"),
    "Should call address endpoint",
  );

  teardown();
});
