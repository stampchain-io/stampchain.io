/**
 * Read-only queries for the leaderboard snapshot.
 * Uses executeQuery, never executeQueryWithCache: a cached query that
 * mentions stamp_market_data or balances is wiped on every new block.
 */
import { dbManager } from "$server/database/databaseManager.ts";
import type { SqlQuery } from "$lib/utils/leaderboard/sql.ts";
import {
  aggregateQuery,
  creatorNamesQuery,
  holdingsByAddressQuery,
  holdingsByCpidQuery,
  imagesByAddressQuery,
  lastBlockQuery,
  src721BodiesQuery,
  stampFlagsQuery,
  stampImagesByCpidQuery,
} from "$lib/utils/leaderboard/sql.ts";

const CHUNK = 400;

export interface Src721BodyRow {
  cpid: string;
  stamp_base64: string | null;
}

export interface StampFlagRow {
  cpid: string;
  divisible: boolean;
  floorPriceBtc: number | null;
}

export interface AggregateRow {
  address: string;
  stampCount: number;
  floorValue: number;
}

export interface HoldingRow {
  address: string;
  cpid: string;
  quantity: number;
  divisible: boolean;
}

export interface ImageRow {
  address: string;
  url: string;
  floor: number | null;
  stamp: number;
}

export interface StampImageRow {
  cpid: string;
  url: string;
  stamp: number;
  mimetype: string;
  floor: number | null;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const rows = (result as { rows?: Record<string, unknown>[] })?.rows;
  return Array.isArray(rows) ? rows : [];
}

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null || value === "") return 0;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function isDivisible(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

async function run(query: SqlQuery): Promise<Record<string, unknown>[]> {
  const result = await dbManager.executeQuery<unknown>(query.sql, query.params);
  return rowsOf(result);
}

async function runChunks<T>(
  items: string[],
  build: (chunk: string[]) => SqlQuery,
  map: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    const rows = await run(build(chunk));
    for (const row of rows) out.push(map(row));
  }
  return out;
}

export class LeaderboardRepository {
  static async getSrc721Bodies(): Promise<Src721BodyRow[]> {
    const rows = await run(src721BodiesQuery());
    return rows.map((row) => ({
      cpid: text(row.cpid),
      stamp_base64: row.stamp_base64 == null ? null : String(row.stamp_base64),
    }));
  }

  static async getStampFlags(): Promise<StampFlagRow[]> {
    const rows = await run(stampFlagsQuery());
    return rows.map((row) => ({
      cpid: text(row.cpid),
      divisible: isDivisible(row.divisible),
      floorPriceBtc: numOrNull(row.floor_price_btc),
    }));
  }

  static async getAggregates(excluded: string[]): Promise<AggregateRow[]> {
    const rows = await run(aggregateQuery(excluded));
    return rows.map((row) => ({
      address: text(row.address),
      stampCount: num(row.stamp_count),
      floorValue: num(row.floor_value),
    }));
  }

  static getHoldingsForCpids(cpids: string[]): Promise<HoldingRow[]> {
    return runChunks(cpids, holdingsByCpidQuery, (row) => ({
      address: text(row.address),
      cpid: text(row.cpid),
      quantity: num(row.quantity),
      divisible: isDivisible(row.divisible),
    }));
  }

  static getHoldingsForAddresses(
    addresses: string[],
    excluded: string[],
  ): Promise<HoldingRow[]> {
    return runChunks(
      addresses,
      (chunk) => holdingsByAddressQuery(chunk, excluded),
      (row) => ({
        address: text(row.address),
        cpid: text(row.cpid),
        quantity: num(row.quantity),
        divisible: isDivisible(row.divisible),
      }),
    );
  }

  static getImagesForAddresses(
    addresses: string[],
    excluded: string[],
  ): Promise<ImageRow[]> {
    return runChunks(
      addresses,
      (chunk) => imagesByAddressQuery(chunk, excluded),
      (row) => ({
        address: text(row.address),
        url: text(row.stamp_url),
        floor: numOrNull(row.floor_price_btc),
        stamp: num(row.stamp),
      }),
    );
  }

  static getStampImages(cpids: string[]): Promise<StampImageRow[]> {
    return runChunks(cpids, stampImagesByCpidQuery, (row) => ({
      cpid: text(row.cpid),
      url: text(row.stamp_url),
      stamp: num(row.stamp),
      mimetype: text(row.stamp_mimetype),
      floor: numOrNull(row.floor_price_btc),
    }));
  }

  static async getCreatorNames(
    addresses: string[],
  ): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const rows = await runChunks(addresses, creatorNamesQuery, (row) => row);
    for (const row of rows) {
      const name = text(row.creator).trim();
      if (name) names.set(text(row.address), name);
    }
    return names;
  }

  static async getLastBlock(): Promise<number | null> {
    const rows = await run(lastBlockQuery());
    const block = numOrNull(rows[0]?.last_block);
    return block;
  }
}
