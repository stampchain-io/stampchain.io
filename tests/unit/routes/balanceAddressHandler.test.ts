/**
 * Handler-level regression test for GET /api/v2/balance/{address} (#1198,
 * task 1217): the BTC leg is hard-capped at BTC_BALANCE_LEG_CEILING_MS so a
 * slow third-party provider degrades the `btc` block (zeros + an
 * `X-BTC-Balance-Status` header) instead of stalling the stamps + SRC-20
 * data or producing a 5xx. The response schema is unchanged.
 */
import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { handler } from "$routes/api/v2/balance/[address].ts";
import { BTC_BALANCE_LEG_CEILING_MS } from "$lib/utils/data/processing/balanceUtils.ts";
import { StampController } from "$server/controller/stampController.ts";
import { Src20Controller } from "$server/controller/src20Controller.ts";

/* ===== fixtures ===== */

const STAMP_ROW = { cpid: "A1234567890123456789", quantity: 1 };
const SRC20_ROW = { tick: "KEVIN", amt: "1000" };

const STAMPS_RESULT = {
  page: 1,
  limit: 50,
  totalPages: 1,
  total: 1,
  last_block: 900000,
  data: [STAMP_ROW],
};

const SRC20_RESULT = {
  page: 1,
  limit: 50,
  totalPages: 1,
  total: 1,
  last_block: 900001,
  data: [SRC20_ROW],
};

function stubControllers() {
  const stamps = stub(
    StampController,
    "getStampBalancesByAddress",
    () =>
      Promise.resolve(
        STAMPS_RESULT as unknown as Awaited<
          ReturnType<typeof StampController.getStampBalancesByAddress>
        >,
      ),
  );
  const src20 = stub(
    Src20Controller,
    "handleSrc20BalanceRequest",
    () =>
      Promise.resolve(
        SRC20_RESULT as unknown as Awaited<
          ReturnType<typeof Src20Controller.handleSrc20BalanceRequest>
        >,
      ),
  );
  return {
    restore() {
      stamps.restore();
      src20.restore();
    },
  };
}

async function callHandler(address: string, query = "") {
  const req = new Request(`http://localhost/api/v2/balance/${address}${query}`);
  const ctx = { params: { address } } as unknown as Parameters<
    NonNullable<typeof handler.GET>
  >[1];
  const started = Date.now();
  const res = await handler.GET!(req, ctx);
  const elapsed = Date.now() - started;
  const body = await res.json();
  return { res, body, elapsed };
}

// Distinct addresses per test: provider results are cached per address for 60s.
const ADDR_SLOW = "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq";
const ADDR_FAILING = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const ADDR_NORMAL = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";

const MEMPOOL_OK_BODY = {
  address: ADDR_NORMAL,
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

/* ===== (a) slow BTC leg does not delay the response beyond the ceiling ===== */

Deno.test("balance/[address]: a BTC provider that never answers yields a degraded btc block within the ceiling", async () => {
  const controllers = stubControllers();
  // Worst case: upstream hangs AND ignores the abort signal.
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => new Promise<Response>(() => {}),
  );
  try {
    const { res, body, elapsed } = await callHandler(ADDR_SLOW);

    assertEquals(res.status, 200); // never a 5xx for a slow third party
    assert(
      elapsed < BTC_BALANCE_LEG_CEILING_MS + 1000,
      `expected < ${BTC_BALANCE_LEG_CEILING_MS + 1000}ms, took ${elapsed}ms`,
    );
    assertEquals(res.headers.get("X-BTC-Balance-Status"), "timeout");

    // Stamps + SRC-20 data are served in full ...
    assertEquals(body.data.stamps, [STAMP_ROW]);
    assertEquals(body.data.src20, [SRC20_ROW]);
    assertEquals(body.total, 2);
    assertEquals(body.last_block, 900001);
    // ... and the btc block keeps its shape, degraded to zeros.
    assertEquals(body.btc, {
      address: ADDR_SLOW,
      balance: 0,
      txCount: 0,
      unconfirmedBalance: 0,
      unconfirmedTxCount: 0,
    });
    // Existing informational headers are untouched.
    assert(
      res.headers.get("X-Preferred-Endpoints")?.includes(
        "/api/v2/stamps/balance",
      ),
    );
  } finally {
    fetchStub.restore();
    controllers.restore();
  }
});

Deno.test("balance/[address]: providers answering 429 are retried only within budget and degrade to 'unavailable'", async () => {
  const controllers = stubControllers();
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("rate limited", { status: 429 })),
  );
  try {
    const { res, body, elapsed } = await callHandler(ADDR_FAILING);

    assertEquals(res.status, 200);
    assert(
      elapsed < BTC_BALANCE_LEG_CEILING_MS,
      `expected < ${BTC_BALANCE_LEG_CEILING_MS}ms, took ${elapsed}ms`,
    );
    assertEquals(res.headers.get("X-BTC-Balance-Status"), "unavailable");
    // Pre-fix this path was 4 mempool attempts + 3 x 1s sleeps + BlockCypher.
    assert(
      fetchStub.calls.length <= 3,
      `expected <= 3 provider calls, saw ${fetchStub.calls.length}`,
    );
    assertEquals(body.btc.balance, 0);
    assertEquals(body.data.stamps, [STAMP_ROW]);
  } finally {
    fetchStub.restore();
    controllers.restore();
  }
});

/* ===== (b) normal path is unchanged ===== */

Deno.test("balance/[address]: normal path returns the live btc balance with status 'ok'", async () => {
  const controllers = stubControllers();
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(Response.json(MEMPOOL_OK_BODY)),
  );
  try {
    const { res, body, elapsed } = await callHandler(
      ADDR_NORMAL,
      "?limit=50&page=1",
    );

    assertEquals(res.status, 200);
    assert(elapsed < 1000, `expected < 1000ms, took ${elapsed}ms`);
    assertEquals(res.headers.get("X-BTC-Balance-Status"), "ok");
    assertEquals(fetchStub.calls.length, 1);

    assertEquals(body.page, 1);
    assertEquals(body.limit, 50);
    assertEquals(body.total, 2);
    assertEquals(body.totalPages, 1);
    assertEquals(body.last_block, 900001);
    assertEquals(body.btc, {
      address: ADDR_NORMAL,
      balance: 0.0001533,
      txCount: 981,
      unconfirmedBalance: 0,
      unconfirmedTxCount: 0,
    });
    assertEquals(body.data.stamps, [STAMP_ROW]);
    assertEquals(body.data.src20, [SRC20_ROW]);
  } finally {
    fetchStub.restore();
    controllers.restore();
  }
});
