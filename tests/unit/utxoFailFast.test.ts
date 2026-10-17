/**
 * Fail-fast UTXO lookups and the fail-closed stamp-UTXO filter (#1287).
 *
 * - provider calls time out instead of hanging, and a hung provider fails
 *   over to the next one;
 * - an empty UTXO list is an answer, while "no provider answered" is a 503;
 * - a capped HTTP client does not sleep through a 429, it hands it back;
 * - the stamp-UTXO exclusion pages through every Counterparty balance, and
 *   refuses the build when Counterparty cannot answer;
 * - compose routes answer 503 + Retry-After at their deadline.
 */
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import { restore, stub } from "@std/testing/mock";
import { UpstreamUnavailableError } from "$lib/utils/api/upstreamUnavailableError.ts";
import { withComposeDeadline } from "$lib/utils/api/composeDeadline.ts";
import { providerFetch } from "$lib/utils/bitcoin/utxo/providerBudgets.ts";
import { getUTXOForAddress } from "$lib/utils/bitcoin/utxo/utxoUtils.ts";
import { FetchHttpClient } from "$server/interfaces/httpClient.ts";

(globalThis as any).__mockDbManager ??= {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, fetch: () => Promise<unknown>) => fetch(),
};
const { CounterpartyApiManager, _resetXcpCooldown } = await import(
  "$server/services/counterpartyApiService.ts"
);
const { CommonUTXOService } = await import(
  "$server/services/utxo/commonUtxoService.ts"
);
const { BitcoinUtxoManager } = await import(
  "$server/services/transaction/bitcoinUtxoManager.ts"
);

const ADDRESS = "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq";
const P2WPKH = "0014118100fc27679cf960e56fc6026165f05f0fdcc6";
const txid = (n: number) => n.toString(16).padStart(64, "0");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A fetch that never answers, but rejects once its signal aborts. */
function hangingFetch(_input: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

function withEnv(vars: Record<string, string>): () => void {
  const previous = Object.fromEntries(
    Object.keys(vars).map((k) => [k, Deno.env.get(k)]),
  );
  for (const [k, v] of Object.entries(vars)) Deno.env.set(k, v);
  return () => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  };
}

const opts = { sanitizeOps: false, sanitizeResources: false };

// ---------------------------------------------------------------- timeouts

Deno.test({
  ...opts,
  name: "providerFetch aborts a provider that never answers",
  async fn() {
    stub(globalThis, "fetch", hangingFetch as typeof fetch);
    try {
      const started = Date.now();
      await assertRejects(() => providerFetch("https://mempool.space/x", 50));
      assert(Date.now() - started < 2000, "timed out promptly");
    } finally {
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "getUTXOForAddress fails over from a hung provider within the timeout",
  async fn() {
    const restoreEnv = withEnv({ UTXO_PROVIDER_TIMEOUT_MS: "50" });
    stub(
      globalThis,
      "fetch",
      ((input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("mempool.space")) return hangingFetch(url, init);
        return Promise.resolve(json([{
          txid: txid(1),
          vout: 0,
          value: 50_000,
          scriptpubkey: P2WPKH,
          status: { confirmed: true },
        }]));
      }) as typeof fetch,
    );
    try {
      const started = Date.now();
      const result = await getUTXOForAddress(ADDRESS);
      assert(Array.isArray(result));
      assertEquals(result.length, 1);
      assertEquals(result[0].txid, txid(1));
      assert(Date.now() - started < 2000, "did not wait on the hung provider");
    } finally {
      restore();
      restoreEnv();
    }
  },
});

Deno.test({
  ...opts,
  name:
    "getUTXOForAddress stops at its lookup budget when every provider hangs",
  async fn() {
    const restoreEnv = withEnv({
      UTXO_PROVIDER_TIMEOUT_MS: "40",
      UTXO_LOOKUP_BUDGET_MS: "100",
    });
    stub(globalThis, "fetch", hangingFetch as typeof fetch);
    try {
      const started = Date.now();
      assertEquals(await getUTXOForAddress(ADDRESS), null);
      // 3 providers x 40 ms > 100 ms budget: at most one more call starts.
      assert(Date.now() - started < 1500, "bounded by the lookup budget");
    } finally {
      restore();
      restoreEnv();
    }
  },
});

// ---------------------------------------------------- empty list vs outage

Deno.test({
  ...opts,
  name: "getSpendableUTXOs returns [] for an empty wallet after one call",
  async fn() {
    let calls = 0;
    stub(
      globalThis,
      "fetch",
      (() => {
        calls++;
        return Promise.resolve(json([]));
      }) as typeof fetch,
    );
    try {
      const utxos = await new CommonUTXOService().getSpendableUTXOs(ADDRESS);
      assertEquals(utxos, []);
      assertEquals(calls, 1);
    } finally {
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name:
    "getSpendableUTXOs answers 'no provider answered' with an upstream error",
  async fn() {
    stub(
      globalThis,
      "fetch",
      (() => Promise.resolve(json({ error: "down" }, 500))) as typeof fetch,
    );
    try {
      const error = await assertRejects(() =>
        new CommonUTXOService().getSpendableUTXOs(ADDRESS)
      );
      assertInstanceOf(error, UpstreamUnavailableError);
    } finally {
      restore();
    }
  },
});

// ------------------------------------------------------------ 429 backoff

Deno.test({
  ...opts,
  name: "a capped FetchHttpClient hands back a 429 instead of sleeping 5 s",
  async fn() {
    let calls = 0;
    stub(
      globalThis,
      "fetch",
      (() => {
        calls++;
        return Promise.resolve(json({ error: "rate limited" }, 429));
      }) as typeof fetch,
    );
    try {
      const client = new FetchHttpClient(1000, 1, 500, 10, 20, 1000);
      const started = Date.now();
      const response = await client.get("https://mempool.space/api/x");
      assertEquals(response.status, 429);
      assertEquals(calls, 1);
      assert(Date.now() - started < 1000, "no rate-limit sleep");
    } finally {
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "a capped FetchHttpClient still retries a short 502 backoff once",
  async fn() {
    let calls = 0;
    stub(
      globalThis,
      "fetch",
      (() => {
        calls++;
        return Promise.resolve(
          calls === 1 ? json({}, 502) : json({ ok: true }),
        );
      }) as typeof fetch,
    );
    try {
      const client = new FetchHttpClient(1000, 1, 10, 10, 20, 1000);
      const response = await client.get("https://mempool.space/api/x");
      assertEquals(response.status, 200);
      assertEquals(calls, 2);
    } finally {
      restore();
    }
  },
});

// ------------------------------------------------- stamp filter: paging

/** Counterparty balance pages: `pages[i]` rows, cursor until the last page. */
function counterpartyBalances(pages: number[], seen: string[]) {
  let offset = 0;
  const starts = pages.map((n) => {
    const start = offset;
    offset += n;
    return start;
  });
  return ((input: string | URL) => {
    const url = new URL(String(input));
    seen.push(url.search);
    const page = Number(url.searchParams.get("cursor") ?? "0");
    const rows = Array.from({ length: pages[page] }, (_, i) => ({
      asset: `A${starts[page] + i}`,
      quantity: 1,
      utxo: `${txid(starts[page] + i)}:0`,
      utxo_address: ADDRESS,
    }));
    return Promise.resolve(json({
      result: rows,
      next_cursor: page + 1 < pages.length ? String(page + 1) : null,
      result_count: offset,
    }));
  }) as typeof fetch;
}

Deno.test({
  ...opts,
  name: "stamp-UTXO listing pages past the first 50 balances to the end",
  async fn() {
    const seen: string[] = [];
    stub(globalThis, "fetch", counterpartyBalances([500, 500, 37], seen));
    try {
      const utxos = await CounterpartyApiManager.getUtxoAttachedBalanceUtxos(
        ADDRESS,
      );
      assertEquals(utxos.size, 1037);
      assert(utxos.has(`${txid(1036)}:0`), "last page included");
      assertEquals(seen.length, 3);
      assert(seen[0].includes("type=utxo"));
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "getAddressUTXOs excludes a stamp UTXO that sits beyond balance 50",
  async fn() {
    // The wallet holds three UTXOs; #60 and #120 carry Counterparty balances
    // listed on later positions/pages, #9999 is plain BTC.
    stub(globalThis, "fetch", counterpartyBalances([100, 100], []));
    const manager = new BitcoinUtxoManager();
    (manager as any).commonUtxoService = {
      getSpendableUTXOs: () =>
        Promise.resolve([60, 120, 9999].map((n) => ({
          txid: txid(n),
          vout: 0,
          value: 10_000,
          script: P2WPKH,
        }))),
    };
    try {
      const utxos = await manager.getAddressUTXOs(ADDRESS, {
        filterStampUTXOs: true,
      });
      assertEquals(utxos.map((u) => u.txid), [txid(9999)]);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

// ---------------------------------------- stamp filter: fail closed

for (
  const [label, fake] of [
    [
      "a 500 from every node",
      () => Promise.resolve(json({ error: "boom" }, 500)),
    ],
    [
      "a network failure",
      () => Promise.reject(new TypeError("connection reset")),
    ],
    [
      "a 200 without a result array",
      () => Promise.resolve(json({ error: "weird" })),
    ],
  ] as const
) {
  Deno.test({
    ...opts,
    name: `getAddressUTXOs refuses to build on ${label}`,
    async fn() {
      stub(globalThis, "fetch", fake as typeof fetch);
      const manager = new BitcoinUtxoManager();
      (manager as any).commonUtxoService = {
        getSpendableUTXOs: () =>
          Promise.resolve([{
            txid: txid(1),
            vout: 0,
            value: 10_000,
            script: P2WPKH,
          }]),
      };
      try {
        const error = await assertRejects(() =>
          manager.getAddressUTXOs(ADDRESS, { filterStampUTXOs: true })
        );
        assertInstanceOf(error, UpstreamUnavailableError);
      } finally {
        _resetXcpCooldown();
        restore();
      }
    },
  });
}

Deno.test({
  ...opts,
  name: "an empty wallet skips the Counterparty check (stays a 400, not a 503)",
  async fn() {
    let counterpartyCalls = 0;
    stub(
      globalThis,
      "fetch",
      (() => {
        counterpartyCalls++;
        return Promise.resolve(json({ error: "down" }, 500));
      }) as typeof fetch,
    );
    const manager = new BitcoinUtxoManager();
    (manager as any).commonUtxoService = {
      getSpendableUTXOs: () => Promise.resolve([]),
    };
    try {
      assertEquals(
        await manager.getAddressUTXOs(ADDRESS, { filterStampUTXOs: true }),
        [],
      );
      assertEquals(counterpartyCalls, 0);
    } finally {
      restore();
    }
  },
});

// ------------------------------------------------------- route deadline

Deno.test("withComposeDeadline answers 503 + Retry-After at the deadline", async () => {
  const handler = withComposeDeadline(
    "test/route",
    () => new Promise<Response>(() => {}),
    { deadlineMs: 30 },
  );
  const started = Date.now();
  const res = await handler(new Request("http://x/"));
  assertEquals(res.status, 503);
  assertEquals(res.headers.get("Retry-After"), "10");
  assertEquals((await res.json()).code, "SERVICE_UNAVAILABLE");
  assert(Date.now() - started < 1000);
});

Deno.test("withComposeDeadline passes a fast response through untouched", async () => {
  const handler = withComposeDeadline(
    "test/route",
    () => Promise.resolve(new Response("ok", { status: 201 })),
    { deadlineMs: 1000 },
  );
  const res = await handler(new Request("http://x/"));
  assertEquals(res.status, 201);
  assertEquals(await res.text(), "ok");
});

Deno.test("withComposeDeadline reads its budget from the environment", async () => {
  const restoreEnv = withEnv({
    COMPOSE_DEADLINE_MS: "20",
    COMPOSE_RETRY_AFTER_SECONDS: "7",
  });
  try {
    const handler = withComposeDeadline(
      "test/route",
      () => new Promise<Response>(() => {}),
    );
    const res = await handler(new Request("http://x/"));
    assertEquals(res.status, 503);
    assertEquals(res.headers.get("Retry-After"), "7");
    await res.body?.cancel();
  } finally {
    restoreEnv();
  }
});

Deno.test("withComposeDeadline lets a handler error propagate", async () => {
  const handler = withComposeDeadline(
    "test/route",
    () => Promise.reject(new Error("boom")),
    { deadlineMs: 1000 },
  );
  await assertRejects(() => handler(new Request("http://x/")), Error, "boom");
});
