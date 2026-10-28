/**
 * ECX env profile (CHAIN=ecx): no Bitcoin fallbacks. The public Counterparty
 * node and the default explorers index Bitcoin, so falling back to them would
 * answer ECX requests with Bitcoin state. Bitcoin mode must stay unchanged.
 *
 * Every case runs in its own child process. The constants are fixed at
 * import, and setting CHAIN in this process would leak into parallel test
 * workers, which share the environment.
 */
import { assert, assertEquals } from "@std/assert";

const ESPLORA = "https://esplora.ecash.ninja";
const PRIMARY = "http://xcp-ecx.test:4000/v2";

async function run(env: Record<string, string>, code: string) {
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", code],
    cwd: new URL("../..", import.meta.url).pathname,
    env: { HOME: Deno.env.get("HOME") ?? "", NO_COLOR: "1", ...env },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr);
  const last = text.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  return { code: out.code, text, json: last ? JSON.parse(last) : null };
}

const ECX_ENV = {
  CHAIN: "ecx",
  XCP_PRIMARY_NODE_URL: PRIMARY,
  MEMPOOL_API_URL: ESPLORA + "/",
};

Deno.test("ECX: our Counterparty node only; explorers on the ECX esplora", async () => {
  const r = await run(
    ECX_ENV,
    'const c = await import("./lib/constants/serverConstants.ts"); const u = await import("./lib/constants/apiUrls.ts");' +
      "console.log(JSON.stringify({ nodes: c.XCP_V2_NODES.map((n) => n.url), m: u.MEMPOOL_API_BASE_URL, b: u.BLOCKSTREAM_API_BASE_URL }));",
  );
  assertEquals(r.code, 0, r.text);
  assertEquals(r.json.nodes, [PRIMARY]);
  assertEquals(r.json.m, ESPLORA);
  assertEquals(r.json.b, ESPLORA);
});

Deno.test("ECX: UTXO lookups never reach Bitcoin-only providers, even when esplora fails", async () => {
  const r = await run(
    ECX_ENV,
    "const calls = []; globalThis.fetch = (i) => { calls.push(String(i instanceof Request ? i.url : i)); return Promise.resolve(new Response('down', { status: 503 })); };" +
      'const { getUTXOForAddress } = await import("./lib/utils/bitcoin/utxo/utxoUtils.ts");' +
      'await getUTXOForAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", undefined, undefined, false, 1);' +
      "console.log(JSON.stringify({ calls }));",
  );
  assertEquals(r.code, 0, r.text);
  assert(r.json.calls.length > 0, r.text);
  for (const u of r.json.calls) assert(u.startsWith(ESPLORA), u);
});

Deno.test("ECX without XCP_PRIMARY_NODE_URL refuses to start", async () => {
  const r = await run(
    { CHAIN: "ecx", MEMPOOL_API_URL: ESPLORA },
    'await import("./lib/constants/serverConstants.ts");',
  );
  assert(r.code !== 0, r.text);
  assert(r.text.includes("CHAIN=ecx requires XCP_PRIMARY_NODE_URL"), r.text);
});

Deno.test("ECX without MEMPOOL_API_URL refuses to start", async () => {
  const r = await run(
    { CHAIN: "ecx" },
    'await import("./lib/constants/apiUrls.ts");',
  );
  assert(r.code !== 0, r.text);
  assert(r.text.includes("CHAIN=ecx requires MEMPOOL_API_URL"), r.text);
});

Deno.test("Bitcoin (CHAIN unset): unchanged defaults, public fallback, all four UTXO providers", async () => {
  const r = await run(
    { XCP_PRIMARY_NODE_URL: PRIMARY },
    'const c = await import("./lib/constants/serverConstants.ts"); const u = await import("./lib/constants/apiUrls.ts");' +
      "const hosts = new Set(); globalThis.fetch = (i) => { hosts.add(new URL(String(i instanceof Request ? i.url : i)).host); return Promise.resolve(new Response('down', { status: 503 })); };" +
      'const { getUTXOForAddress } = await import("./lib/utils/bitcoin/utxo/utxoUtils.ts");' +
      'await getUTXOForAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", undefined, undefined, false, 1);' +
      "console.log(JSON.stringify({ nodes: c.XCP_V2_NODES.map((n) => n.url), m: u.MEMPOOL_API_BASE_URL, b: u.BLOCKSTREAM_API_BASE_URL, hosts: [...hosts].sort() }));",
  );
  assertEquals(r.code, 0, r.text);
  assertEquals(r.json.nodes, [PRIMARY, "https://api.counterparty.io:4000/v2"]);
  assertEquals(r.json.m, "https://mempool.space/api");
  assertEquals(r.json.b, "https://blockstream.info/api");
  assertEquals(r.json.hosts.length, 4, JSON.stringify(r.json.hosts));
});
