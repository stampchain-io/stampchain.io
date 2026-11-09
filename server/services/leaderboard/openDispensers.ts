/**
 * All open dispensers, failing loud.
 * fetchXcpV2WithCache returns an empty list when every node fails, which
 * would publish an undercounted board. This throws instead.
 */
import { XCP_V2_NODES } from "$constants";
import type { RawDispenser } from "$lib/utils/leaderboard/rank.ts";
import {
  isDefinitiveRejection,
  xcpHttpClient,
} from "$server/services/counterparty/xcpNodeClient.ts";

export class DispenserFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenserFetchError";
  }
}

interface DispenserPage {
  result?: unknown;
  next_cursor?: string | number | null;
  error?: unknown;
}

const PAGE_LIMIT = 1000;
const MAX_PAGES = 80;

function asDispenser(row: unknown): RawDispenser | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const source = record.source == null ? "" : String(record.source);
  const asset = record.asset == null ? "" : String(record.asset);
  const num = (value: unknown): number => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  if (!source || !asset) return null;
  return {
    source,
    asset,
    give_remaining: num(record.give_remaining),
    give_quantity: num(record.give_quantity),
    satoshirate: num(record.satoshirate),
    status: num(record.status),
  };
}

async function fetchPage(params: URLSearchParams): Promise<DispenserPage> {
  let lastError = "no Counterparty nodes configured";
  for (const node of XCP_V2_NODES) {
    const url = `${node.url.replace(/\/+$/, "")}/dispensers?${params}`;
    try {
      const response = await xcpHttpClient.get<DispenserPage>(url);
      if (!response.ok) {
        lastError = `dispensers status ${response.status}`;
        if (isDefinitiveRejection(response.status)) {
          throw new DispenserFetchError(lastError);
        }
        continue;
      }
      const data = response.data;
      if (!data || !Array.isArray(data.result)) {
        lastError = "dispensers response had no result list";
        continue;
      }
      return data;
    } catch (error) {
      if (error instanceof DispenserFetchError) throw error;
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new DispenserFetchError(lastError);
}

export async function fetchOpenDispensers(): Promise<RawDispenser[]> {
  const all: RawDispenser[] = [];
  let cursor: string | number | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      status: "open",
      limit: String(PAGE_LIMIT),
    });
    if (cursor != null) params.set("cursor", String(cursor));
    const body = await fetchPage(params);
    for (const row of body.result as unknown[]) {
      const dispenser = asDispenser(row);
      if (dispenser) all.push(dispenser);
    }
    const next = body.next_cursor;
    if (next == null || next === "" || next === cursor) return all;
    cursor = next;
  }
  throw new DispenserFetchError("open dispensers exceeded page cap");
}
