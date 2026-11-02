/**
 * eSTAMP numbers on ECX: ECX_FIRST_STAMP, the server helper, the
 * `estamp_number` field on API stamp objects and the /stamp/e<N> redirect.
 * Bitcoin must stay unchanged: no field, no redirect, identical bytes.
 *
 * Nothing here sets Deno.env (parallel test files share it). The chain env
 * is swapped with setChainEnvForTesting, which is per test worker.
 */
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";

const chain = await import("$server/services/chain/chainProfile.ts");
const { ApiResponseUtil } = await import(
  "$lib/utils/api/responses/apiResponseUtil.ts"
);

const ESTAMP0 = 1_507_458;
const env = (vars: Record<string, string>) => ({
  get: (k: string) => vars[k],
});
const BITCOIN = env({});
const BITCOIN_WITH_VAR = env({ CHAIN: "bitcoin", ECX_FIRST_STAMP: "10" });
const ECX = env({ CHAIN: "ecx" });

/* ===== CONFIG ===== */
Deno.test("ECX_FIRST_STAMP: read on ECX only, default 1507458", () => {
  assertEquals(chain.getEcxFirstStamp(BITCOIN), null);
  assertEquals(chain.getEcxFirstStamp(BITCOIN_WITH_VAR), null);
  assertEquals(chain.getEcxFirstStamp(ECX), ESTAMP0);
  assertEquals(
    chain.getEcxFirstStamp(env({ CHAIN: "ecx", ECX_FIRST_STAMP: " " })),
    ESTAMP0,
  );
  assertEquals(
    chain.getEcxFirstStamp(env({ CHAIN: "ecx", ECX_FIRST_STAMP: "1507460" })),
    1_507_460,
  );
  for (const bad of ["-1", "abc", "1.5", "1e6", "99999999999999999999"]) {
    assertThrows(
      () => chain.getEcxFirstStamp(env({ CHAIN: "ecx", ECX_FIRST_STAMP: bad })),
      Error,
      "ECX_FIRST_STAMP",
    );
  }
});

Deno.test("estampNumberFor: boundaries on ECX, null on Bitcoin", () => {
  assertEquals(chain.estampNumberFor(ESTAMP0 - 1, ECX), null);
  assertEquals(chain.estampNumberFor(ESTAMP0, ECX), 0);
  assertEquals(chain.estampNumberFor(ESTAMP0 + 1, ECX), 1);
  assertEquals(chain.estampNumberFor(-1, ECX), null);
  assertEquals(chain.estampNumberFor(-1849, ECX), null);
  assertEquals(chain.estampNumberFor(null, ECX), null);
  assertEquals(chain.estampNumberFor(ESTAMP0, BITCOIN), null);
  assertEquals(chain.estampNumberFor(ESTAMP0 + 1, BITCOIN_WITH_VAR), null);
});

/* ===== API SERIALIZATION ===== */
const row = (stamp: number | null, extra: Record<string, unknown> = {}) => ({
  stamp,
  block_index: 973_731,
  cpid: `A${stamp}`,
  tx_hash: "ab".repeat(32),
  ...extra,
});
const body = () => ({
  last_block: 982_189,
  page: 1,
  data: [row(ESTAMP0 - 1), row(ESTAMP0), row(ESTAMP0 + 1), row(-5), row(null)],
  detail: { data: { stamp: row(ESTAMP0 + 2) } },
  // sale row: the stamp number also sits in stamp_number
  sale: { stamp: ESTAMP0 + 3, stamp_number: ESTAMP0 + 3, tx_hash: "cd" },
  // not stamp objects
  src20: { tx_hash: "ef", tick: "KEVIN", amt: "1" },
  counts: { stamp: 3 },
  big: BigInt("9007199254740993"),
});

async function serialize(chainEnv: ReturnType<typeof env>) {
  const restore = chain.setChainEnvForTesting(chainEnv);
  try {
    return await ApiResponseUtil.success(body()).text();
  } finally {
    restore();
  }
}

Deno.test("API, Bitcoin: no estamp_number, same bytes as before", async () => {
  for (const e of [BITCOIN, BITCOIN_WITH_VAR]) {
    const text = await serialize(e);
    assert(!text.includes("estamp_number"));
    assertEquals(
      text,
      JSON.stringify(
        body(),
        (_k, v) => typeof v === "bigint" ? v.toString() : v,
      ),
    );
  }
});

Deno.test("API, ECX: stamp objects carry estamp_number after stamp", async () => {
  const json = JSON.parse(await serialize(ECX));
  assertEquals(
    json.data.map((r: any) => r.estamp_number),
    [null, 0, 1, null, null],
  );
  // stamp itself is unchanged, and the new field sits right after it
  assertEquals(json.data[1].stamp, ESTAMP0);
  assertEquals(Object.keys(json.data[1]).slice(0, 2), [
    "stamp",
    "estamp_number",
  ]);
  assertEquals(json.detail.data.stamp.estamp_number, 2);
  assertEquals(json.sale.estamp_number, 3);
  assertEquals(json.sale.stamp_number, ESTAMP0 + 3);
  // objects that are not stamps are left alone
  assert(!("estamp_number" in json.src20));
  assert(!("estamp_number" in json.counts));
  assert(!("estamp_number" in json));
  assertEquals(json.big, "9007199254740993");
});

Deno.test("API, ECX: re-serializing a response does not duplicate the field", async () => {
  const restore = chain.setChainEnvForTesting(ECX);
  try {
    const once = await ApiResponseUtil.success(body()).json();
    const twice = await ApiResponseUtil.success(once).text();
    assertEquals(JSON.parse(twice), once);
    assertEquals(twice.match(/"estamp_number"/g)?.length, 7);
  } finally {
    restore();
  }
});

Deno.test("withEstampNumber: only plain stamp objects change", () => {
  const plain = { stamp: ESTAMP0 };
  assertStrictEquals(chain.withEstampNumber(plain, ESTAMP0), plain);
  const list = [row(ESTAMP0)];
  assertStrictEquals(chain.withEstampNumber(list, ESTAMP0), list);
  const nested = { cpid: "A1", stamp: { stamp: ESTAMP0 } };
  assertStrictEquals(chain.withEstampNumber(nested, ESTAMP0), nested);
  assertEquals(chain.withEstampNumber(5, ESTAMP0), 5);
  assertEquals(
    chain.withEstampNumber({ stamp: "1507460", tx_hash: "x" }, ESTAMP0),
    { stamp: "1507460", estamp_number: 2, tx_hash: "x" },
  );
});

/* ===== /stamp/e<N> ===== */
const { estampPagePath } = await import("$lib/utils/chain/ecxView.ts");

Deno.test("/stamp/e<N>: eSTAMP #N's page on ECX, nothing on Bitcoin", () => {
  assertEquals(estampPagePath("e0", ESTAMP0), `/stamp/${ESTAMP0}`);
  assertEquals(estampPagePath("E12", ESTAMP0), `/stamp/${ESTAMP0 + 12}`);
  assertEquals(estampPagePath("e1", 100), "/stamp/101");
  // Bitcoin, and ids that are stamp numbers, cpids or tx hashes
  assertEquals(estampPagePath("e0", null), null);
  for (
    const id of [String(ESTAMP0), "A123", "e", "e-1", "e1x", "ee1", "e1.5"]
  ) {
    assertEquals(estampPagePath(id, ESTAMP0), null, id);
  }
  assertEquals(estampPagePath("e" + "9".repeat(16), ESTAMP0), null);
});

/**
 * Call the stamp route's GET for /stamp/<id> in a clean child process: the
 * route needs the app's import map, and CHAIN is fixed at import.
 */
async function getStampPage(id: string, vars: Record<string, string>) {
  const code = `const m = await import("./routes/stamp/[id].tsx");
    const r = await m.handler.GET(new Request("http://localhost/stamp/${id}?ref=x"), {
      params: { id: "${id}" },
      render: () => new Response("page"),
      renderNotFound: () => new Response("not found", { status: 404 }),
    });
    console.log(JSON.stringify({ status: r.status, location: r.headers.get("location") }));
    Deno.exit(0);`;
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", code],
    cwd: new URL("../..", import.meta.url).pathname,
    env: {
      HOME: Deno.env.get("HOME") ?? "",
      NO_COLOR: "1",
      DENO_ENV: "test",
      SKIP_REDIS_CONNECTION: "true",
      // the ECX env profile refuses to start without these
      XCP_PRIMARY_NODE_URL: "http://xcp-ecx.test:4000/v2",
      MEMPOOL_API_URL: "https://esplora.ecash.ninja/",
      ...vars,
    },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout);
  const last = text.trim().split("\n").filter((l) => l.startsWith('{"status"'))
    .pop();
  assert(
    last,
    `no result from the child: ${text}${new TextDecoder().decode(out.stderr)}`,
  );
  return JSON.parse(last) as { status: number; location: string | null };
}

Deno.test("/stamp/e<N> redirects to the stamp's page on ECX only", async () => {
  assertEquals(await getStampPage("e3", { CHAIN: "ecx" }), {
    status: 302,
    location: `/stamp/${ESTAMP0 + 3}?ref=x`,
  });
  assertEquals(
    await getStampPage("E1", { CHAIN: "ecx", ECX_FIRST_STAMP: "100" }),
    { status: 302, location: "/stamp/101?ref=x" },
  );
  // Bitcoin: an ordinary lookup of "e3" (no DB here), never a redirect
  const btc = await getStampPage("e3", {});
  assert(btc.status !== 302, "Bitcoin redirected /stamp/e3");
  assertEquals(btc.location, null);
});
