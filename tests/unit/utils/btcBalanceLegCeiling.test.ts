import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  fetchJsonWithTimeout,
  getBTCBalanceFromMempool,
} from "$lib/utils/mempool.ts";
import {
  BTC_BALANCE_LEG_CEILING_MS,
  getBTCBalanceInfo,
  getBTCBalanceInfoBounded,
} from "$lib/utils/data/processing/balanceUtils.ts";

// Regression coverage for #1198 / task 1217: the aggregate
// /api/v2/balance/{address} endpoint still took 10-23s on a cold hit AFTER
// #1206 bounded each individual provider fetch, because nothing bounded the
// BTC leg as a whole: two sequential 5s deadlines (10s), plus the mempool
// retry loop on non-timeout errors (4 x 5s + 3 x 1s back-off ~= 23s). The
// provider chain now runs against ONE shared deadline, the body read is
// covered by the same deadline, and the handler applies a hard ceiling.

/* ===== fetch stubs ===== */

/** Upstream that never answers but honours the abort signal (real Deno behaviour). */
function hangUntilAbort() {
  return stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
  );
}

/** Upstream that never answers AND ignores the abort signal (worst case). */
function hangForever() {
  return stub(
    globalThis,
    "fetch",
    () => new Promise<Response>(() => {}),
  );
}

const MEMPOOL_OK_BODY = {
  address: "x",
  chain_stats: {
    funded_txo_count: 959,
    funded_txo_sum: 13272991,
    spent_txo_count: 944,
    spent_txo_sum: 13257661,
    tx_count: 981,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
};

function mempoolOk() {
  return stub(
    globalThis,
    "fetch",
    () => Promise.resolve(Response.json(MEMPOOL_OK_BODY)),
  );
}

// Distinct addresses per test: successful provider results are cached in
// dbManager's in-memory fallback cache for 60s within this test process.
const ADDR_RETRY_SHORT = "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq";
const ADDR_RETRY_LONG = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const ADDR_BUDGET_SPLIT = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";
const ADDR_FALLBACK = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const ADDR_NORMAL = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const ADDR_CEILING =
  "bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9";
const ADDR_UNAVAILABLE = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
const ADDR_BOUNDED_OK =
  "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3";

/* ===== fetchJsonWithTimeout: the deadline covers the body read ===== */

Deno.test("fetchJsonWithTimeout times out a body that never finishes streaming", async () => {
  // Headers arrive immediately; the body stalls. fetchWithTimeout disarmed its
  // timer once headers arrived, leaving response.json() unbounded — this helper
  // keeps the abort armed until the body is parsed.
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, init?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            controller.error(new DOMException("aborted", "AbortError"));
          });
        },
      });
      return Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  );
  try {
    const started = Date.now();
    let caught: unknown;
    try {
      await fetchJsonWithTimeout("https://example.com/", 50);
    } catch (e) {
      caught = e;
    }
    assert(caught instanceof Error, "expected an Error");
    assertEquals(caught.name, "TimeoutError");
    assert(Date.now() - started < 1000, "body read must be bounded");
  } finally {
    fetchStub.restore();
  }
});

/* ===== getBTCBalanceFromMempool: retries are bounded by the deadline ===== */

Deno.test("getBTCBalanceFromMempool does not retry a 429 when the deadline leaves no room", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("slow down", { status: 429 })),
  );
  try {
    const started = Date.now();
    const result = await getBTCBalanceFromMempool(
      ADDR_RETRY_SHORT,
      0,
      Date.now() + 500, // < 1s retry back-off: no retry may be attempted
    );
    assertEquals(result, null);
    assertEquals(fetchStub.calls.length, 1);
    assert(Date.now() - started < 500, "must give up without sleeping");
  } finally {
    fetchStub.restore();
  }
});

Deno.test("getBTCBalanceFromMempool stops retrying once the deadline is spent", async () => {
  // Before the fix a non-timeout error retried MAX_RETRIES (3) times with a
  // 1s back-off regardless of any deadline: 4 attempts, >= 3s.
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("upstream error", { status: 503 })),
  );
  try {
    const started = Date.now();
    const result = await getBTCBalanceFromMempool(
      ADDR_RETRY_LONG,
      0,
      Date.now() + 1500,
    );
    const elapsed = Date.now() - started;
    assertEquals(result, null);
    assertEquals(fetchStub.calls.length, 2); // one retry fits, a second does not
    assert(elapsed < 1500, `expected < 1500ms, took ${elapsed}ms`);
  } finally {
    fetchStub.restore();
  }
});

/* ===== getBTCBalanceInfo: one shared budget across providers ===== */

Deno.test("getBTCBalanceInfo bounds the WHOLE chain and still gives the fallback its share", async () => {
  const fetchStub = hangUntilAbort();
  try {
    const started = Date.now();
    const info = await getBTCBalanceInfo(ADDR_BUDGET_SPLIT, { timeoutMs: 400 });
    const elapsed = Date.now() - started;
    assertEquals(info, null);
    // Both providers were tried (mempool did not starve BlockCypher) ...
    assertEquals(fetchStub.calls.length, 2);
    // ... and the total stayed inside the budget (was 2 x 5s before).
    assert(elapsed < 1000, `expected < 1000ms, took ${elapsed}ms`);
  } finally {
    fetchStub.restore();
  }
});

Deno.test("getBTCBalanceInfo hands a fast-failing provider's unused budget to the fallback", async () => {
  let calls = 0;
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request) => {
      calls++;
      const url = String(input);
      if (url.includes("blockcypher")) {
        return Promise.resolve(
          Response.json({
            address: ADDR_FALLBACK,
            balance: 15330,
            unconfirmed_balance: 0,
            n_tx: 981,
            unconfirmed_n_tx: 0,
          }),
        );
      }
      return Promise.resolve(new Response("rate limited", { status: 429 }));
    },
  );
  try {
    const started = Date.now();
    const info = await getBTCBalanceInfo(ADDR_FALLBACK, { timeoutMs: 600 });
    const elapsed = Date.now() - started;
    assert(info !== null, "BlockCypher fallback should have answered");
    assertEquals(info.balance, 0.0001533);
    assertEquals(info.txCount, 981);
    assertEquals(calls, 2); // mempool once (no retry fits in its 300ms share), then BlockCypher
    assert(elapsed < 600, `expected < 600ms, took ${elapsed}ms`);
  } finally {
    fetchStub.restore();
  }
});

Deno.test("getBTCBalanceInfo normal path is unchanged: first provider answers, one fetch", async () => {
  const fetchStub = mempoolOk();
  try {
    const info = await getBTCBalanceInfo(ADDR_NORMAL);
    assert(info !== null);
    assertEquals(info.address, ADDR_NORMAL);
    assertEquals(info.balance, 0.0001533); // 15330 sats
    assertEquals(info.txCount, 981);
    assertEquals(info.unconfirmedBalance, 0);
    assertEquals(info.unconfirmedTxCount, 0);
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    fetchStub.restore();
  }
});

/* ===== getBTCBalanceInfoBounded: the handler-level ceiling ===== */

Deno.test("BTC_BALANCE_LEG_CEILING_MS keeps the aggregate endpoint under the 5s regression threshold", () => {
  assert(BTC_BALANCE_LEG_CEILING_MS > 0);
  assert(BTC_BALANCE_LEG_CEILING_MS <= 3000);
});

Deno.test("getBTCBalanceInfoBounded resolves 'timeout' when the chain never returns", async () => {
  // The upstream ignores the abort signal, so the chain can never finish on
  // its own; only the outer ceiling can resolve this. The ceiling must leave
  // the chain a real budget (ceiling - 200ms grace) — with a near-zero budget
  // the chain would legitimately give up as 'unavailable' before it fires.
  const fetchStub = hangForever();
  try {
    const started = Date.now();
    const leg = await getBTCBalanceInfoBounded(ADDR_CEILING, 500);
    const elapsed = Date.now() - started;
    assertEquals(leg.status, "timeout");
    assertEquals(leg.info, null);
    assert(elapsed >= 450, `ceiling fired early: ${elapsed}ms`);
    assert(elapsed < 1500, `expected < 1500ms, took ${elapsed}ms`);
  } finally {
    fetchStub.restore();
  }
});

Deno.test("getBTCBalanceInfoBounded resolves 'unavailable' when providers fail inside the budget", async () => {
  const fetchStub = hangUntilAbort();
  try {
    const started = Date.now();
    const leg = await getBTCBalanceInfoBounded(ADDR_UNAVAILABLE, 2000, {
      timeoutMs: 300,
    });
    const elapsed = Date.now() - started;
    assertEquals(leg.status, "unavailable");
    assertEquals(leg.info, null);
    assert(elapsed < 2000, `expected < 2000ms, took ${elapsed}ms`);
  } finally {
    fetchStub.restore();
  }
});

Deno.test("getBTCBalanceInfoBounded resolves 'ok' with the balance on the normal path", async () => {
  const fetchStub = mempoolOk();
  try {
    const leg = await getBTCBalanceInfoBounded(ADDR_BOUNDED_OK, 1000);
    assertEquals(leg.status, "ok");
    assert(leg.info !== null);
    assertEquals(leg.info.balance, 0.0001533);
    assertEquals(leg.info.txCount, 981);
  } finally {
    fetchStub.restore();
  }
});
