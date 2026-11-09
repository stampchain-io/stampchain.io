/**
 * Pure leaderboard math. No database and no network, so the ranking rules
 * can be tested without either.
 */
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPageData,
  LeaderboardSnapshot,
  LeaderboardSort,
} from "$types/leaderboard.d.ts";

export const LEADERBOARD_LIMIT = 500;
export const LEADERBOARD_PAGE_SIZE = 20;
export const LEADERBOARD_THUMBNAILS = 16;
export const SOFT_TTL_MS = 12 * 60 * 60 * 1000;
export const ESCROW_RETRY_MS = 15 * 60 * 1000;
export const HARD_TTL_SECONDS = 48 * 60 * 60;
export const PARTIAL_TTL_SECONDS = 15 * 60;
export const SATS_PER_BTC = 100_000_000;

/** Raw Counterparty units at or above this are not display units. */
export const RAW_UNIT_THRESHOLD = SATS_PER_BTC;

export const BURN_ADDRESSES: readonly string[] = [
  "1CounterpartyXXXXXXXXXXXXXXXUWLpVr",
  "1BitcoinEaterAddressDontSendf59kuE",
];

export const IMAGE_MIMETYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/svg+xml",
];

const LAYER_KEY = /^t\d+$/;

export interface Src721Body {
  cpid: string;
  stamp_base64: string | null;
}

export interface WalletTotal {
  address: string;
  stampCount: number;
  floorValue: number;
}

export interface Holding {
  cpid: string;
  quantity: number;
  divisible: boolean;
}

export interface RawDispenser {
  source: string;
  asset: string;
  give_remaining: number;
  give_quantity: number;
  satoshirate: number;
  status: number;
}

export interface Thumb {
  url: string;
  floor: number | null;
  stamp: number;
}

export function decodeStampBody(raw: string | null): unknown | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJson(trimmed);
  }
  try {
    const text = atob(trimmed);
    return parseJson(text);
  } catch {
    return null;
  }
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Deploy CPIDs plus every layer CPID named in deploy JSON.
 * Mint rows stay out. HTML and other non-JSON bodies are skipped.
 */
export function excludedCpidsFromBodies(rows: Src721Body[]): Set<string> {
  const excluded = new Set<string>();
  for (const row of rows) {
    const parsed = decodeStampBody(row.stamp_base64);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      continue;
    }
    const body = parsed as Record<string, unknown>;
    if (body.p !== "src-721" || body.op !== "deploy") continue;
    if (row.cpid) excluded.add(row.cpid);
    for (const [key, value] of Object.entries(body)) {
      if (key !== "icon" && !LAYER_KEY.test(key)) continue;
      collectStrings(value, excluded);
    }
  }
  return excluded;
}

function collectStrings(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("A") && value.length > 1) into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
  }
}

/** Drop layer strings that are not real stamp CPIDs. */
export function intersectCpids(
  excluded: Set<string>,
  known: Set<string>,
): Set<string> {
  const out = new Set<string>();
  for (const cpid of excluded) {
    if (known.has(cpid)) out.add(cpid);
  }
  return out;
}

/**
 * Holder-cache quantities are display units (DECIMAL 28,8). A divisible
 * stamp whose quantity is still in raw units (1 display = 1e8) is divided.
 * Amounts already in display units, including large ones under 1e8, stay.
 */
export function displayQuantity(
  quantity: number,
  divisible: boolean,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (divisible && quantity >= RAW_UNIT_THRESHOLD) {
    return quantity / SATS_PER_BTC;
  }
  return quantity;
}

/** Dispenser `give_remaining` is always a raw Counterparty integer. */
export function displayEscrowQty(
  giveRemaining: number,
  divisible: boolean,
): number {
  if (!Number.isFinite(giveRemaining) || giveRemaining <= 0) return 0;
  return divisible ? giveRemaining / SATS_PER_BTC : giveRemaining;
}

/**
 * BTC per display unit. Indivisible: satoshirate/give_quantity is sats per
 * stamp. Divisible: one display unit is 1e8 raw units, so the 1e8 cancels
 * and the price is satoshirate/give_quantity BTC.
 */
export function floorBtcPerDisplayUnit(
  satoshirate: number,
  giveQuantity: number,
  divisible: boolean,
): number {
  if (!(giveQuantity > 0) || !(satoshirate >= 0)) return 0;
  if (!Number.isFinite(satoshirate) || !Number.isFinite(giveQuantity)) {
    return 0;
  }
  const satsPerRaw = satoshirate / giveQuantity;
  const satsPerDisplay = divisible ? satsPerRaw * SATS_PER_BTC : satsPerRaw;
  return satsPerDisplay / SATS_PER_BTC;
}

export function effectiveFloor(
  cpid: string,
  dispenserFloors: ReadonlyMap<string, number>,
  storedFloors: ReadonlyMap<string, number | null>,
): number {
  const fromDispenser = dispenserFloors.get(cpid);
  if (fromDispenser != null && Number.isFinite(fromDispenser)) {
    return fromDispenser;
  }
  const stored = storedFloors.get(cpid);
  if (stored != null && Number.isFinite(stored) && stored > 0) return stored;
  return 0;
}

export function usableDispensers(
  rows: RawDispenser[],
  known: ReadonlySet<string>,
  excluded: ReadonlySet<string>,
  burn: ReadonlySet<string> = new Set(BURN_ADDRESSES),
): RawDispenser[] {
  return rows.filter((row) =>
    Number(row.status) === 0 &&
    known.has(row.asset) &&
    !excluded.has(row.asset) &&
    !!row.source &&
    !burn.has(row.source) &&
    row.give_remaining > 0
  );
}

export function floorsFromDispensers(
  rows: RawDispenser[],
  divisibleOf: (cpid: string) => boolean,
): Map<string, number> {
  const floors = new Map<string, number>();
  for (const row of rows) {
    const floor = floorBtcPerDisplayUnit(
      row.satoshirate,
      row.give_quantity,
      divisibleOf(row.asset),
    );
    if (!(floor > 0)) continue;
    const prev = floors.get(row.asset);
    if (prev == null || floor < prev) floors.set(row.asset, floor);
  }
  return floors;
}

/** source -> cpid -> display quantity, dispensers for one pair summed. */
export function escrowQtyBySeller(
  rows: RawDispenser[],
  divisibleOf: (cpid: string) => boolean,
): Map<string, Map<string, number>> {
  const bySeller = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const qty = displayEscrowQty(
      row.give_remaining,
      divisibleOf(row.asset),
    );
    if (qty <= 0) continue;
    let byCpid = bySeller.get(row.source);
    if (!byCpid) {
      byCpid = new Map();
      bySeller.set(row.source, byCpid);
    }
    byCpid.set(row.asset, (byCpid.get(row.asset) ?? 0) + qty);
  }
  return bySeller;
}

/**
 * Replace the stored-floor part of a non-seller total with the dispenser
 * floor. Sellers are skipped; their totals are recomputed exactly.
 */
export function adjustForDispenserFloors(
  totals: Map<string, WalletTotal>,
  holdings: Array<Holding & { address: string }>,
  storedFloors: ReadonlyMap<string, number | null>,
  dispenserFloors: ReadonlyMap<string, number>,
  sellers: ReadonlySet<string>,
): void {
  for (const holding of holdings) {
    if (sellers.has(holding.address)) continue;
    const next = dispenserFloors.get(holding.cpid);
    if (next == null) continue;
    const prev = storedFloors.get(holding.cpid) ?? 0;
    const qty = displayQuantity(holding.quantity, holding.divisible);
    const row = totals.get(holding.address);
    if (!row || qty <= 0) continue;
    row.floorValue += qty * (next - (prev ?? 0));
  }
}

/** Held plus escrowed, one count per CPID even when both exist. */
export function recomputeSeller(
  held: Holding[],
  escrow: ReadonlyMap<string, number>,
  floorOf: (cpid: string) => number,
): { stampCount: number; floorValue: number } {
  const qtyByCpid = new Map<string, number>();
  for (const holding of held) {
    const qty = displayQuantity(holding.quantity, holding.divisible);
    if (qty <= 0) continue;
    qtyByCpid.set(holding.cpid, (qtyByCpid.get(holding.cpid) ?? 0) + qty);
  }
  for (const [cpid, qty] of escrow) {
    if (qty <= 0) continue;
    qtyByCpid.set(cpid, (qtyByCpid.get(cpid) ?? 0) + qty);
  }
  let stampCount = 0;
  let floorValue = 0;
  for (const [cpid, qty] of qtyByCpid) {
    if (qty <= 0) continue;
    stampCount += 1;
    floorValue += qty * floorOf(cpid);
  }
  return { stampCount, floorValue };
}

function compareAddress(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function compareStamps(a: WalletTotal, b: WalletTotal): number {
  if (b.stampCount !== a.stampCount) return b.stampCount - a.stampCount;
  if (b.floorValue !== a.floorValue) return b.floorValue - a.floorValue;
  return compareAddress(a.address, b.address);
}

export function compareValuation(a: WalletTotal, b: WalletTotal): number {
  if (b.floorValue !== a.floorValue) return b.floorValue - a.floorValue;
  if (b.stampCount !== a.stampCount) return b.stampCount - a.stampCount;
  return compareAddress(a.address, b.address);
}

export function rankWallets(
  rows: WalletTotal[],
  limit = LEADERBOARD_LIMIT,
): { byStamps: WalletTotal[]; byValuation: WalletTotal[] } {
  const byStamps = rows
    .filter((row) => row.stampCount > 0)
    .sort(compareStamps)
    .slice(0, limit);
  const byValuation = rows
    .filter((row) => row.floorValue > 0)
    .sort(compareValuation)
    .slice(0, limit);
  return { byStamps, byValuation };
}

function thumbBetter(next: Thumb, prev: Thumb): boolean {
  return compareThumbs(next, prev) < 0;
}

function compareThumbs(a: Thumb, b: Thumb): number {
  const aMissing = a.floor == null;
  const bMissing = b.floor == null;
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  const floorDelta = (b.floor ?? 0) - (a.floor ?? 0);
  if (floorDelta !== 0) return floorDelta;
  return b.stamp - a.stamp;
}

export function mergeThumbnails(
  held: Thumb[],
  escrowed: Thumb[],
  limit = LEADERBOARD_THUMBNAILS,
): string[] {
  const byUrl = new Map<string, Thumb>();
  for (const thumb of [...held, ...escrowed]) {
    if (!thumb.url) continue;
    const prev = byUrl.get(thumb.url);
    if (!prev || thumbBetter(thumb, prev)) byUrl.set(thumb.url, thumb);
  }
  return [...byUrl.values()]
    .sort(compareThumbs)
    .slice(0, limit)
    .map((thumb) => thumb.url);
}

export function cacheDecision(input: {
  hasCached: boolean;
  ageMs: number;
  escrowIncluded: boolean;
  retryHold: boolean;
}): "serve" | "serve-and-rebuild" | "await-rebuild" {
  if (!input.hasCached) return "await-rebuild";
  const softExpired = input.ageMs >= SOFT_TTL_MS;
  const escrowDue = !input.escrowIncluded && input.ageMs >= ESCROW_RETRY_MS;
  if ((softExpired || escrowDue) && !input.retryHold) {
    return "serve-and-rebuild";
  }
  return "serve";
}

/**
 * A failed dispenser fetch must not replace a good board. With no previous
 * board, publish a short-lived one that leaves escrow out.
 */
export function failureAction(
  hasGoodPrevious: boolean,
  dispenserFailed: boolean,
): "keep" | "partial" | "throw" {
  if (!dispenserFailed) return "throw";
  return hasGoodPrevious ? "keep" : "partial";
}

export function presentLeaderboard(
  snapshot: LeaderboardSnapshot,
  query: {
    metric: LeaderboardMetric;
    sortBy: LeaderboardSort;
    page: number;
    pageSize: number;
    showValuation: boolean;
  },
): LeaderboardPageData {
  const metric: LeaderboardMetric = !query.showValuation ||
      query.metric !== "valuation"
    ? "stamps"
    : "valuation";
  const order = metric === "valuation"
    ? snapshot.by_valuation
    : snapshot.by_stamps;
  const rankOf = new Map(order.map((address, index) => [address, index + 1]));
  const shown = query.sortBy === "ASC" ? [...order].reverse() : order;
  const total = shown.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize) || 1);
  const page = Math.min(Math.max(1, query.page || 1), totalPages);
  const start = (page - 1) * query.pageSize;

  const toEntry = (address: string): LeaderboardEntry => {
    const wallet = snapshot.wallets[address];
    return {
      rank: rankOf.get(address) ?? 0,
      address,
      creatorName: wallet?.creator_name ?? null,
      stampCount: wallet?.stamp_count ?? 0,
      floorValueBtc: wallet?.floor_value_btc ?? 0,
      images: wallet?.images ?? [],
    };
  };

  return {
    metric,
    sortBy: query.sortBy === "ASC" ? "ASC" : "DESC",
    page,
    pageSize: query.pageSize,
    total,
    totalPages,
    generatedAt: snapshot.generated_at,
    escrowIncluded: snapshot.escrow_included,
    showValuation: query.showValuation,
    podium: order.slice(0, 3).map(toEntry),
    entries: shown.slice(start, start + query.pageSize).map(toEntry),
  };
}

export function updatedAgoLabel(
  generatedAt: number | null,
  now = Date.now(),
): string | null {
  if (generatedAt == null) return null;
  const minutes = Math.max(0, Math.floor((now - generatedAt) / 60000));
  if (minutes < 60) return `UPDATED ${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  return `UPDATED ${hours}H AGO`;
}
