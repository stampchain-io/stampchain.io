/**
 * Picks live, funded inputs for the funded-compose Newman collection.
 *
 * Every compose endpoint returns an UNSIGNED PSBT, so CI can exercise the
 * success paths (mint, attach, detach, send, dispense, fairmint) against real
 * mainnet state without any private key: nothing can be signed or broadcast.
 * What it needs is addresses that really hold the BTC and assets. Balances
 * move, so this script chooses them at run time with read-only queries and
 * confirms each candidate with a read-only Counterparty compose call.
 *
 * Usage: deno run --allow-net --allow-write --allow-env \
 *          scripts/resolve-funded-test-data.ts <out-env.json>
 *
 * A category with no usable candidate is written as an empty string; the
 * collection skips that request and records why, instead of failing.
 */

const XCP = (Deno.env.get("RESOLVER_XCP_URL") ?? "https://api.counterparty.io:4000/v2")
  .replace(/\/+$/, "");
const ESPLORA = (Deno.env.get("RESOLVER_ESPLORA_URL") ?? "https://mempool.space/api")
  .replace(/\/+$/, "");
// stampchain's own fee address first: we control it and it carries BTC and stamps.
const FUNDED_CANDIDATES = (Deno.env.get("FUNDED_TEST_ADDRESSES") ??
  "bc1qhhv6rmxvq5mj2fc3zne2gpjqduy45urapje64m").split(",").map((s) => s.trim()).filter(Boolean);
const MIN_FUNDED_SATS = Number(Deno.env.get("FUNDED_MIN_SATS") ?? 100_000);
const MAX_DISPENSER_SATS = 20_000;
const MAX_TRIES = 8;
/** Must match satsPerVB in tests/postman/collections/funded-compose.json. */
const TEST_SATS_PER_VB = 2;

type Json = Record<string, any>;

async function getJson(url: string): Promise<Json | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

async function composes(path: string): Promise<boolean> {
  // Confirm at the fee rate the collection uses: at Counterparty's default rate
  // a UTXO whose owner has nothing else to spend still composes, then fails
  // for real at any non-zero rate.
  const r = await getJson(
    `${XCP}${path}${path.includes("?") ? "&" : "?"}verbose=true&return_psbt=false&sat_per_vbyte=${TEST_SATS_PER_VB}`,
  );
  return Boolean(r?.result?.rawtransaction);
}

async function spendableSats(address: string): Promise<number> {
  const utxos = await getJson(`${ESPLORA}/address/${address}/utxo`) as unknown as
    | Array<{ value: number; status: { confirmed: boolean } }>
    | null;
  // Outputs under 1000 sats are dust at any fee rate the tests use.
  return (utxos ?? []).filter((u) => u.value >= 1000).reduce((n, u) => n + u.value, 0);
}

const out: Record<string, string> = {
  base_url: (Deno.env.get("BASE_URL") ?? "https://stampchain.io").replace(/\/+$/, ""),
};
const notes: string[] = [];

// 1. A funded address.
let funded = "";
for (const a of FUNDED_CANDIDATES) {
  const sats = await spendableSats(a);
  notes.push(`funded candidate ${a}: ${sats} spendable sats`);
  if (sats >= MIN_FUNDED_SATS) {
    funded = a;
    break;
  }
}
out.funded_address = funded;

// 2. A stamp (numeric XCP asset) the funded address holds, for attach and send.
out.funded_stamp_cpid = "";
if (funded) {
  const b = await getJson(`${XCP}/addresses/${funded}/balances?type=address&limit=200`);
  const held = (b?.result ?? []).filter((x: Json) => /^A\d+$/.test(x.asset) && x.quantity >= 1);
  for (const h of held.slice(0, MAX_TRIES)) {
    if (await composes(`/addresses/${funded}/compose/attach?asset=${h.asset}&quantity=1`)) {
      out.funded_stamp_cpid = h.asset;
      break;
    }
  }
}

// 3. A UTXO with an attached asset whose owner can pay the detach fee.
out.attached_utxo = "";
out.attached_utxo_address = "";
{
  const ev = await getJson(`${XCP}/events/ATTACH_TO_UTXO?limit=100`);
  let tries = 0;
  for (const e of ev?.result ?? []) {
    if (tries >= MAX_TRIES * 2) break;
    const utxo = e.params?.destination as string | undefined;
    const addr = e.params?.destination_address as string | undefined;
    if (!utxo || !addr) continue;
    const bal = await getJson(`${XCP}/utxos/${utxo}/balances`);
    if (!(bal?.result ?? []).length) continue; // already detached or moved
    tries++;
    if (await composes(`/utxos/${utxo}/compose/detach?destination=${addr}`)) {
      out.attached_utxo = utxo;
      out.attached_utxo_address = addr;
      break;
    }
  }
}

// 4. A cheap open dispenser the funded address can pay.
out.dispenser_address = "";
out.dispenser_quantity_sats = "";
if (funded) {
  const d = await getJson(`${XCP}/dispensers?status=open&limit=1000`);
  const cheap = (d?.result ?? [])
    .filter((x: Json) =>
      x.satoshirate > 0 && x.satoshirate <= MAX_DISPENSER_SATS && x.give_remaining >= x.give_quantity
    )
    .sort((a: Json, b: Json) => b.satoshirate - a.satoshirate); // pricier = less likely dust-filtered
  for (const x of cheap.slice(0, MAX_TRIES)) {
    if (await composes(`/addresses/${funded}/compose/dispense?dispenser=${x.source}&quantity=${x.satoshirate}`)) {
      out.dispenser_address = x.source;
      out.dispenser_quantity_sats = String(x.satoshirate);
      break;
    }
  }
}

// 5. An open FREE fairminter (paid ones charge in XCP, which the wallet need not hold).
out.fairmint_asset = "";
if (funded) {
  const f = await getJson(`${XCP}/fairminters?status=open&limit=1000`);
  const free = (f?.result ?? []).filter((x: Json) => x.price === 0);
  for (const x of free.slice(0, MAX_TRIES)) {
    if (await composes(`/addresses/${funded}/compose/fairmint?asset=${x.asset}`)) {
      out.fairmint_asset = x.asset;
      break;
    }
  }
}

const file = Deno.args[0] ?? "tests/postman/funded/environment.json";
const env = {
  name: "funded-compose (resolved at run time)",
  values: Object.entries(out).map(([key, value]) => ({ key, value, enabled: true })),
};
await Deno.writeTextFile(file, JSON.stringify(env, null, 2));
for (const n of notes) console.log(n);
for (const [k, v] of Object.entries(out)) console.log(`${k}=${v || "(none found; requests will be skipped)"}`);
if (!funded) {
  console.log("::warning::No funded test address met the minimum; funded compose tests will be skipped.");
}
