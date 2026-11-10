import {
  adjustForDispenserFloors,
  BURN_ADDRESSES,
  cacheDecision,
  compareStamps,
  displayEscrowQty,
  displayQuantity,
  effectiveFloor,
  escrowQtyBySeller,
  excludedCpidsFromBodies,
  failureAction,
  floorBtcPerDisplayUnit,
  floorsFromDispensers,
  intersectCpids,
  LEADERBOARD_PAGE_SIZE,
  mergeThumbnails,
  presentLeaderboard,
  rankWallets,
  type RawDispenser,
  recomputeSeller,
  thumbnailUrl,
  usableDispensers,
  type WalletTotal,
} from "$lib/utils/leaderboard/rank.ts";
import {
  aggregateQuery,
  imagesByAddressQuery,
} from "$lib/utils/leaderboard/sql.ts";
import type { LeaderboardSnapshot } from "$types/leaderboard.d.ts";
import { assert, assertEquals } from "@std/assert";

function b64(value: unknown): string {
  return btoa(JSON.stringify(value));
}

const DEPLOY = "A1473703777372088053";

Deno.test("deploy JSON excludes the deploy and its layer CPIDs", () => {
  const withIcon = b64({
    p: "src-721",
    op: "deploy",
    name: "Chain Legends",
    icon: "A111",
    t0: ["A222", "A333"],
    t1: ["A444"],
  });
  const noIcon = b64({ p: "src-721", op: "deploy", t0: ["A555"] });
  const mint = b64({
    p: "src-721",
    op: "mint",
    c: DEPLOY,
    ts: [8, 5, 1, 3, 7, 2],
  });
  const excluded = excludedCpidsFromBodies([
    { cpid: DEPLOY, stamp_base64: withIcon },
    { cpid: "ADEPLOY2", stamp_base64: noIcon },
    { cpid: "AMINT", stamp_base64: mint },
    {
      cpid: "AHTML",
      stamp_base64: '<!DOCTYPE html><script src="/s/A1"></script>',
    },
    { cpid: "ABAD", stamp_base64: "not-json" },
    {
      cpid: "ARAW",
      stamp_base64: JSON.stringify({
        p: "src-721",
        op: "deploy",
        t0: ["A666"],
      }),
    },
  ]);
  assertEquals(
    [...excluded].sort(),
    [
      DEPLOY,
      "A111",
      "A222",
      "A333",
      "A444",
      "A555",
      "A666",
      "ADEPLOY2",
      "ARAW",
    ].sort(),
  );
  const known = new Set([DEPLOY, "A222", "AMINT"]);
  assertEquals(
    [...intersectCpids(excluded, known)].sort(),
    [DEPLOY, "A222"].sort(),
  );
});

Deno.test("quantity units and dispenser floor", () => {
  assertEquals(displayQuantity(21, true), 21);
  assertEquals(displayQuantity(200_000_000, true), 2);
  assertEquals(displayQuantity(5, false), 5);
  assertEquals(displayEscrowQty(200_000_000, true), 2);
  assertEquals(displayEscrowQty(3, false), 3);
  assertEquals(floorBtcPerDisplayUnit(792000, 1, false), 792000 / 1e8);
  assertEquals(floorBtcPerDisplayUnit(5500, 1e8, true), 5500 / 1e8);
  assertEquals(floorBtcPerDisplayUnit(100, 0, false), 0);
});

Deno.test("dispenser floor beats a stale stored floor", () => {
  const stored = new Map<string, number | null>([
    ["ALISTED", 0.001],
    ["AQUIET", 0.002],
    ["ANONE", null],
  ]);
  const dispensers = new Map([["ALISTED", 0.01], ["ANONE", 0.004]]);
  assertEquals(effectiveFloor("ALISTED", dispensers, stored), 0.01);
  assertEquals(effectiveFloor("AQUIET", dispensers, stored), 0.002);
  assertEquals(effectiveFloor("ANONE", dispensers, stored), 0.004);
  assertEquals(effectiveFloor("AMISSING", dispensers, stored), 0);
});

Deno.test("open dispensers: escrow, floors, filters", () => {
  const rows: RawDispenser[] = [
    {
      source: "seller",
      asset: "ASTAMP",
      give_remaining: 2,
      give_quantity: 1,
      satoshirate: 100_000_000,
      status: 0,
    },
    {
      source: "seller",
      asset: "ASTAMP",
      give_remaining: 1,
      give_quantity: 1,
      satoshirate: 50_000_000,
      status: 0,
    },
    {
      source: "seller",
      asset: "ADIV",
      give_remaining: 2e8,
      give_quantity: 1e8,
      satoshirate: 5500,
      status: 0,
    },
    {
      source: "seller",
      asset: "ALAYER",
      give_remaining: 1,
      give_quantity: 1,
      satoshirate: 10,
      status: 0,
    },
    {
      source: "seller",
      asset: "AXCP",
      give_remaining: 1,
      give_quantity: 1,
      satoshirate: 10,
      status: 0,
    },
    {
      source: BURN_ADDRESSES[0] ?? "",
      asset: "ASTAMP",
      give_remaining: 9,
      give_quantity: 1,
      satoshirate: 1,
      status: 0,
    },
    {
      source: "closing",
      asset: "ASTAMP",
      give_remaining: 4,
      give_quantity: 1,
      satoshirate: 1,
      status: 10,
    },
  ];
  const known = new Set(["ASTAMP", "ADIV", "ALAYER"]);
  const excluded = new Set(["ALAYER"]);
  const usable = usableDispensers(rows, known, excluded);
  assertEquals(usable.map((row) => row.asset), ["ASTAMP", "ASTAMP", "ADIV"]);
  const floors = floorsFromDispensers(
    usable,
    (cpid) => cpid === "ADIV",
  );
  assertEquals(floors.get("ASTAMP"), 50_000_000 / 1e8);
  assertEquals(floors.get("ADIV"), 5500 / 1e8);
  const escrow = escrowQtyBySeller(usable, (cpid) => cpid === "ADIV");
  assertEquals(escrow.get("seller")?.get("ASTAMP"), 3);
  assertEquals(escrow.get("seller")?.get("ADIV"), 2);
});

Deno.test("seller who holds and escrows the same stamp is counted once", () => {
  const floor = () => 0.01;
  const both = recomputeSeller(
    [{ cpid: "ASTAMP", quantity: 3, divisible: false }],
    new Map([["ASTAMP", 2]]),
    floor,
  );
  assertEquals(both, { stampCount: 1, floorValue: 0.05 });
  const onlyEscrow = recomputeSeller([], new Map([["ASTAMP", 1]]), floor);
  assertEquals(onlyEscrow.stampCount, 1);
  const divisible = recomputeSeller(
    [{ cpid: "ADIV", quantity: 200_000_000, divisible: true }],
    new Map(),
    () => 1,
  );
  assertEquals(divisible, { stampCount: 1, floorValue: 2 });
});

Deno.test("floor adjustment skips sellers and uses the dispenser price", () => {
  const totals = new Map<string, WalletTotal>([
    ["holder", { address: "holder", stampCount: 1, floorValue: 0 }],
    ["seller", { address: "seller", stampCount: 1, floorValue: 0.5 }],
  ]);
  adjustForDispenserFloors(
    totals,
    [
      { address: "holder", cpid: "ASTAMP", quantity: 2, divisible: false },
      { address: "seller", cpid: "ASTAMP", quantity: 4, divisible: false },
    ],
    new Map([["ASTAMP", null]]),
    new Map([["ASTAMP", 0.01]]),
    new Set(["seller"]),
  );
  assertEquals(totals.get("holder")?.floorValue, 0.02);
  assertEquals(totals.get("seller")?.floorValue, 0.5);
});

Deno.test("ranking is deterministic and valuation drops zero-value wallets", () => {
  const rows: WalletTotal[] = [
    { address: "b", stampCount: 2, floorValue: 1 },
    { address: "a", stampCount: 2, floorValue: 1 },
    { address: "c", stampCount: 3, floorValue: 0 },
    { address: "d", stampCount: 1, floorValue: 5 },
  ];
  const ranked = rankWallets(rows, 10);
  assertEquals(ranked.byStamps.map((row) => row.address), ["c", "a", "b", "d"]);
  assertEquals(
    ranked.byValuation.map((row) => row.address),
    ["d", "a", "b"],
  );
  assertEquals(compareStamps(rows[0]!, rows[1]!), 1);
});

Deno.test("gallery pages keep real ranks and the podium stays the top 3", () => {
  const addresses = Array.from(
    { length: 500 },
    (_, index) => `addr${String(index).padStart(4, "0")}`,
  );
  const wallets: LeaderboardSnapshot["wallets"] = {};
  for (const [index, address] of addresses.entries()) {
    wallets[address] = {
      address,
      creator_name: null,
      stamp_count: 500 - index,
      floor_value_btc: index === 0 ? 0 : 500 - index,
      images: [],
    };
  }
  const snapshot: LeaderboardSnapshot = {
    generated_at: 1,
    last_block: 1,
    escrow_included: true,
    wallets,
    by_stamps: addresses,
    by_valuation: addresses.filter((address) => address !== "addr0000"),
  };
  const desc = presentLeaderboard(snapshot, {
    metric: "stamps",
    sortBy: "DESC",
    page: 1,
    pageSize: LEADERBOARD_PAGE_SIZE,
    showValuation: true,
  });
  assertEquals(desc.entries[0]?.rank, 1);
  assertEquals(desc.entries[19]?.rank, 20);
  assertEquals(desc.totalPages, 25);
  assertEquals(desc.podium.map((entry) => entry.rank), [1, 2, 3]);

  const asc = presentLeaderboard(snapshot, {
    metric: "stamps",
    sortBy: "ASC",
    page: 1,
    pageSize: LEADERBOARD_PAGE_SIZE,
    showValuation: true,
  });
  assertEquals(asc.entries[0]?.rank, 500);
  assertEquals(asc.entries[19]?.rank, 481);
  assertEquals(asc.podium.map((entry) => entry.rank), [1, 2, 3]);

  const last = presentLeaderboard(snapshot, {
    metric: "stamps",
    sortBy: "ASC",
    page: 99,
    pageSize: LEADERBOARD_PAGE_SIZE,
    showValuation: true,
  });
  assertEquals(last.page, 25);
  assertEquals(last.podium[0]?.rank, 1);

  const valuation = presentLeaderboard(snapshot, {
    metric: "valuation",
    sortBy: "DESC",
    page: 1,
    pageSize: LEADERBOARD_PAGE_SIZE,
    showValuation: true,
  });
  assertEquals(valuation.metric, "valuation");
  assertEquals(valuation.total, 499);
  const hidden = presentLeaderboard(snapshot, {
    metric: "valuation",
    sortBy: "DESC",
    page: 1,
    pageSize: 20,
    showValuation: false,
  });
  assertEquals(hidden.metric, "stamps");
});

Deno.test("thumbnails prefer floor price, then newest, and cap at 16", () => {
  const held = Array.from({ length: 16 }, (_, index) => ({
    url: `held-${index}`,
    floor: index === 0 ? null : index,
    stamp: index,
  }));
  const merged = mergeThumbnails(
    held,
    [{ url: "escrow", floor: 100, stamp: 1 }],
  );
  assertEquals(merged[0], "escrow");
  assertEquals(merged.length, 16);
  assertEquals(merged.includes("held-0"), false);
  assertEquals(merged.at(-1), "held-1");
});

Deno.test("cache serves a stale board and retries a partial one", () => {
  assertEquals(
    cacheDecision({
      hasCached: false,
      ageMs: 0,
      escrowIncluded: true,
      retryHold: false,
    }),
    "await-rebuild",
  );
  assertEquals(
    cacheDecision({
      hasCached: true,
      ageMs: 13 * 60 * 60 * 1000,
      escrowIncluded: true,
      retryHold: false,
    }),
    "serve-and-rebuild",
  );
  assertEquals(
    cacheDecision({
      hasCached: true,
      ageMs: 13 * 60 * 60 * 1000,
      escrowIncluded: true,
      retryHold: true,
    }),
    "serve",
  );
  assertEquals(
    cacheDecision({
      hasCached: true,
      ageMs: 16 * 60 * 1000,
      escrowIncluded: false,
      retryHold: false,
    }),
    "serve-and-rebuild",
  );
  assertEquals(failureAction(true, true), "keep");
  assertEquals(failureAction(false, true), "partial");
  assertEquals(failureAction(true, false), "throw");
});

Deno.test("holder aggregate joins one row per CPID", () => {
  const query = aggregateQuery(["ALAYER"]);
  assert(query.sql.includes("MIN(stamp)"));
  assert(query.sql.includes("GROUP BY cpid"));
  assert(query.sql.includes("one_cpid.stamp = s.stamp"));
  assert(!query.sql.toLowerCase().includes("executequerywithcache"));
  assertEquals(query.params[0], BURN_ADDRESSES[0]);
  assertEquals(query.params.at(-1), "ALAYER");
  const images = imagesByAddressQuery(["addr"], []);
  assert(images.sql.includes("ROW_NUMBER()"));
  assert(images.sql.includes("rn <= 16"));
  assert(images.sql.includes("stamp_mimetype"));
  assert(images.params.includes("text/html"));
  assert(images.params.includes("image/png"));
});

Deno.test("html thumbnails use the preview route", () => {
  const file = "https://stampchain.io/content/stamp.html";
  const png = "https://stampchain.io/stamps/a.png";
  assertEquals(
    thumbnailUrl("text/html", file, 42),
    "/api/v2/stamp/42/preview?placeholderOnFail=true",
  );
  assertEquals(thumbnailUrl("image/png", png, 42), png);
  assertEquals(thumbnailUrl("text/html", file, 0), "");
});
