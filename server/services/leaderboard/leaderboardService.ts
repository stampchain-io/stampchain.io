/**
 * 12-hour leaderboard snapshot.
 * Soft TTL is checked here. The Redis TTL is only a backstop, because a
 * query cached through executeQueryWithCache would be invalidated every block.
 */
import type {
  LeaderboardMetric,
  LeaderboardPageData,
  LeaderboardSnapshot,
  LeaderboardSort,
  LeaderboardWallet,
} from "$types/leaderboard.d.ts";
import {
  adjustForDispenserFloors,
  BURN_ADDRESSES,
  cacheDecision,
  effectiveFloor,
  escrowQtyBySeller,
  excludedCpidsFromBodies,
  failureAction,
  floorsFromDispensers,
  HARD_TTL_SECONDS,
  IMAGE_MIMETYPES,
  intersectCpids,
  LEADERBOARD_PAGE_SIZE,
  mergeThumbnails,
  PARTIAL_TTL_SECONDS,
  presentLeaderboard,
  rankWallets,
  recomputeSeller,
  usableDispensers,
  type Thumb,
  type WalletTotal,
} from "$lib/utils/leaderboard/rank.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import {
  LeaderboardRepository,
  type HoldingRow,
  type StampFlagRow,
} from "$server/database/leaderboardRepository.ts";
import {
  DispenserFetchError,
  fetchOpenDispensers,
} from "$server/services/leaderboard/openDispensers.ts";

const CACHE_KEY = "btc:stamps:leaderboard:v1";
const RETRY_KEY = "btc:stamps:leaderboard:v1:escrow-retry";

const IMAGE_TYPES = new Set(IMAGE_MIMETYPES);
const BURN = new Set(BURN_ADDRESSES);

let inflight: Promise<LeaderboardSnapshot> | null = null;

function log(message: string): void {
  console.log(`[leaderboard] ${message}`);
}

export async function getLeaderboardPage(query: {
  metric: LeaderboardMetric;
  sortBy: LeaderboardSort;
  page: number;
  showValuation: boolean;
}): Promise<LeaderboardPageData> {
  const snapshot = await getSnapshot();
  return presentLeaderboard(snapshot, {
    ...query,
    pageSize: LEADERBOARD_PAGE_SIZE,
  });
}

export async function refreshLeaderboard(): Promise<LeaderboardSnapshot> {
  return await rebuild();
}

async function getSnapshot(): Promise<LeaderboardSnapshot> {
  const cached = await dbManager.getCacheValue<LeaderboardSnapshot>(CACHE_KEY);
  const retryHold = (await dbManager.getCacheValue<number>(RETRY_KEY)) != null;
  const ageMs = cached ? Date.now() - cached.generated_at : 0;
  const decision = cacheDecision({
    hasCached: cached != null,
    ageMs,
    escrowIncluded: cached?.escrow_included ?? false,
    retryHold,
  });
  if (decision === "serve" && cached) return cached;
  if (decision === "serve-and-rebuild" && cached) {
    void rebuild().catch((error) => {
      log(`background rebuild failed: ${errorMessage(error)}`);
    });
    return cached;
  }
  return await rebuild();
}

function rebuild(): Promise<LeaderboardSnapshot> {
  if (inflight) return inflight;
  inflight = storeBuild().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function storeBuild(): Promise<LeaderboardSnapshot> {
  try {
    const snapshot = await assemble(true);
    await dbManager.setCacheValue(CACHE_KEY, snapshot, HARD_TTL_SECONDS);
    return snapshot;
  } catch (error) {
    const action = failureAction(
      false,
      error instanceof DispenserFetchError,
    );
    if (action === "throw") throw error;
    const previous = await dbManager.getCacheValue<LeaderboardSnapshot>(
      CACHE_KEY,
    );
    const withPrevious = failureAction(
      previous?.escrow_included === true,
      true,
    );
    if (withPrevious === "keep" && previous) {
      await dbManager.setCacheValue(RETRY_KEY, Date.now(), PARTIAL_TTL_SECONDS);
      log(`dispenser fetch failed, keeping the previous board: ${errorMessage(error)}`);
      return previous;
    }
    log(`dispenser fetch failed, publishing without escrow: ${errorMessage(error)}`);
    const partial = await assemble(false);
    partial.escrow_included = false;
    await dbManager.setCacheValue(CACHE_KEY, partial, PARTIAL_TTL_SECONDS);
    return partial;
  }
}

async function assemble(includeEscrow: boolean): Promise<LeaderboardSnapshot> {
  const started = Date.now();
  const [bodies, flags, lastBlock] = await Promise.all([
    LeaderboardRepository.getSrc721Bodies(),
    LeaderboardRepository.getStampFlags(),
    LeaderboardRepository.getLastBlock(),
  ]);
  const flagByCpid = new Map<string, StampFlagRow>();
  for (const flag of flags) {
    if (flag.cpid) flagByCpid.set(flag.cpid, flag);
  }
  const known = new Set(flagByCpid.keys());
  const excluded = [...intersectCpids(excludedCpidsFromBodies(bodies), known)];
  const excludedSet = new Set(excluded);

  const aggregates = await LeaderboardRepository.getAggregates(excluded);
  const totals = new Map<string, WalletTotal>();
  for (const row of aggregates) {
    if (!row.address || BURN.has(row.address)) continue;
    totals.set(row.address, {
      address: row.address,
      stampCount: row.stampCount,
      floorValue: row.floorValue,
    });
  }

  const storedFloors = new Map<string, number | null>();
  for (const [cpid, flag] of flagByCpid) {
    storedFloors.set(cpid, flag.floorPriceBtc);
  }
  const divisibleOf = (cpid: string): boolean =>
    flagByCpid.get(cpid)?.divisible === true;

  let escrowIncluded = false;
  let escrowBySeller = new Map<string, Map<string, number>>();
  let dispenserFloors = new Map<string, number>();

  if (includeEscrow) {
    const open = await fetchOpenDispensers();
    const usable = usableDispensers(open, known, excludedSet, BURN);
    dispenserFloors = floorsFromDispensers(usable, divisibleOf);
    escrowBySeller = escrowQtyBySeller(usable, divisibleOf);
    escrowIncluded = true;

    const adjustCpids = [...dispenserFloors.keys()].filter((cpid) => {
      const stored = storedFloors.get(cpid);
      const next = dispenserFloors.get(cpid) ?? 0;
      return stored == null || Math.abs(stored - next) > 1e-12;
    });
    if (adjustCpids.length > 0) {
      const holdings = await LeaderboardRepository.getHoldingsForCpids(
        adjustCpids,
      );
      adjustForDispenserFloors(
        totals,
        holdings,
        storedFloors,
        dispenserFloors,
        new Set(escrowBySeller.keys()),
      );
    }
    await replaceSellers(
      totals,
      escrowBySeller,
      excluded,
      (cpid) => effectiveFloor(cpid, dispenserFloors, storedFloors),
    );
  }

  const ranked = rankWallets([...totals.values()]);
  const rankedAddresses = uniqueAddresses([
    ...ranked.byStamps,
    ...ranked.byValuation,
  ]);
  const images = await imagesFor(
    rankedAddresses,
    excluded,
    escrowBySeller,
    dispenserFloors,
    storedFloors,
  );
  const names = await LeaderboardRepository.getCreatorNames(rankedAddresses);
  const wallets: Record<string, LeaderboardWallet> = {};
  const byAddress = new Map<string, WalletTotal>();
  for (const row of [...ranked.byStamps, ...ranked.byValuation]) {
    byAddress.set(row.address, row);
  }
  for (const address of rankedAddresses) {
    const row = byAddress.get(address);
    if (!row) continue;
    wallets[address] = {
      address,
      creator_name: names.get(address) ?? null,
      stamp_count: row.stampCount,
      floor_value_btc: row.floorValue,
      images: images.get(address) ?? [],
    };
  }

  log(
    `built ${ranked.byStamps.length} stamp ranks and ${ranked.byValuation.length} valuation ranks in ${Date.now() - started}ms (escrow ${escrowIncluded})`,
  );
  return {
    generated_at: Date.now(),
    last_block: lastBlock,
    escrow_included: escrowIncluded,
    wallets,
    by_stamps: ranked.byStamps.map((row) => row.address),
    by_valuation: ranked.byValuation.map((row) => row.address),
  };
}

async function replaceSellers(
  totals: Map<string, WalletTotal>,
  escrowBySeller: Map<string, Map<string, number>>,
  excluded: string[],
  floorOf: (cpid: string) => number,
): Promise<void> {
  const sellers = [...escrowBySeller.keys()];
  if (sellers.length === 0) return;
  const holdings = await LeaderboardRepository.getHoldingsForAddresses(
    sellers,
    excluded,
  );
  const heldByAddress = new Map<string, HoldingRow[]>();
  for (const holding of holdings) {
    const list = heldByAddress.get(holding.address);
    if (list) list.push(holding);
    else heldByAddress.set(holding.address, [holding]);
  }
  for (const seller of sellers) {
    const next = recomputeSeller(
      heldByAddress.get(seller) ?? [],
      escrowBySeller.get(seller) ?? new Map(),
      floorOf,
    );
    if (next.stampCount <= 0) {
      totals.delete(seller);
      continue;
    }
    totals.set(seller, { address: seller, ...next });
  }
}

async function imagesFor(
  addresses: string[],
  excluded: string[],
  escrowBySeller: Map<string, Map<string, number>>,
  dispenserFloors: Map<string, number>,
  storedFloors: Map<string, number | null>,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (addresses.length === 0) return out;
  const heldRows = await LeaderboardRepository.getImagesForAddresses(
    addresses,
    excluded,
  );
  const held = new Map<string, Thumb[]>();
  for (const row of heldRows) {
    const list = held.get(row.address) ?? [];
    list.push({ url: row.url, floor: row.floor, stamp: row.stamp });
    held.set(row.address, list);
  }

  const escrowCpids = new Set<string>();
  for (const address of addresses) {
    const lots = escrowBySeller.get(address);
    if (!lots) continue;
    for (const cpid of lots.keys()) escrowCpids.add(cpid);
  }
  const imageByCpid = new Map<string, Thumb>();
  if (escrowCpids.size > 0) {
    const rows = await LeaderboardRepository.getStampImages([...escrowCpids]);
    for (const row of rows) {
      if (!row.url || !IMAGE_TYPES.has(row.mimetype)) continue;
      const floor = effectiveFloor(row.cpid, dispenserFloors, storedFloors);
      imageByCpid.set(row.cpid, {
        url: row.url,
        floor: floor > 0 ? floor : row.floor,
        stamp: row.stamp,
      });
    }
  }

  for (const address of addresses) {
    const escrowed: Thumb[] = [];
    const lots = escrowBySeller.get(address);
    if (lots) {
      for (const cpid of lots.keys()) {
        const thumb = imageByCpid.get(cpid);
        if (thumb) escrowed.push(thumb);
      }
    }
    out.set(address, mergeThumbnails(held.get(address) ?? [], escrowed));
  }
  return out;
}

function uniqueAddresses(rows: WalletTotal[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    if (seen.has(row.address)) continue;
    seen.add(row.address);
    out.push(row.address);
  }
  return out;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
