/**
 * Unit tests for the unified explorer feed (stamps + SRC-20 interwoven by
 * transaction order).
 *
 * Covers:
 *  - StampRepository.buildFeedFragment / SRC20Repository.buildFeedFragment —
 *    pure SQL-fragment builders, no DB needed.
 *  - ExplorerFeedRepository.getFeedPage — verifies the UNION ALL query
 *    shape (ordering/pagination clauses) and the total/totalPages math that
 *    combines the two per-table counts.
 */

import { dbManager } from "$server/database/databaseManager.ts";
import { ExplorerFeedRepository } from "$server/database/explorerFeedRepository.ts";
import { SRC20Repository } from "$server/database/src20Repository.ts";
import { StampRepository } from "$server/database/stampRepository.ts";
import { assertEquals, assertMatch } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing@1.0.14/bdd";

describe("StampRepository.buildFeedFragment", () => {
  it("selects the ordering-only columns tagged as 'stamp' and excludes SRC-20 by default", () => {
    const { subquery, params } = StampRepository.buildFeedFragment({});

    assertMatch(subquery, /FROM\s+StampTableV4\s+st/i);
    assertMatch(subquery, /'stamp'\s+AS\s+kind/i);
    assertMatch(subquery, /st\.tx_hash/i);
    assertMatch(subquery, /st\.block_index/i);
    assertMatch(subquery, /st\.tx_index/i);
    assertEquals(params.length, 0);
  });

  it("adds an ident whitelist condition and matching params when ident is provided", () => {
    const { subquery, params } = StampRepository.buildFeedFragment({
      ident: ["STAMP", "SRC-721", "SRC-101"],
    });

    assertMatch(subquery, /WHERE/i);
    assertMatch(subquery, /st\.ident\s*=\s*\?/i);
    assertEquals(params, ["STAMP", "SRC-721", "SRC-101"]);
  });

  it("joins collection_stamps only when a collectionId is supplied", () => {
    const withoutCollection = StampRepository.buildFeedFragment({});
    assertEquals(/JOIN collection_stamps/i.test(withoutCollection.subquery), false);

    const withCollection = StampRepository.buildFeedFragment({
      collectionId: "abc123",
    });
    assertMatch(withCollection.subquery, /JOIN collection_stamps cs1 ON st\.stamp = cs1\.stamp/i);
  });

  it("applies a custom stamp-number range and pushes rangeMin/rangeMax as params", () => {
    // Mirrors filtersToServicePayload: rangeMin/rangeMax alone are only
    // wired into the query when `range` is set to "custom".
    const { subquery, params } = StampRepository.buildFeedFragment({
      range: "custom",
      rangeMin: "100",
      rangeMax: "500",
    });

    assertMatch(subquery, /WHERE/i);
    assertMatch(subquery, /st\.stamp\s+BETWEEN\s+\?\s+AND\s+\?/i);
    assertEquals(params, ["100", "500"]);
  });

  it("ignores rangeMin/rangeMax when `range` isn't set (matches buildRangeFilterConditions' early-exit)", () => {
    const { subquery, params } = StampRepository.buildFeedFragment({
      rangeMin: "100",
      rangeMax: "500",
    });

    assertEquals(/WHERE/i.test(subquery), false);
    assertEquals(params.length, 0);
  });
});

describe("SRC20Repository.buildFeedFragment", () => {
  it("selects the ordering-only columns tagged as 'src20' with no filters", () => {
    const { subquery, params } = SRC20Repository.buildFeedFragment({});

    assertMatch(subquery, /FROM\s+SRC20Valid\s+src20/i);
    assertMatch(subquery, /'src20'\s+AS\s+kind/i);
    assertEquals(/JOIN/i.test(subquery), false);
    assertEquals(params.length, 0);
  });

  it("filters by op and escapes/pushes the op param", () => {
    const { subquery, params } = SRC20Repository.buildFeedFragment({
      op: "MINT",
    });

    assertMatch(subquery, /src20\.op\s*=\s*\?/i);
    assertEquals(params, ["MINT"]);
  });

  it("joins StampTableV4 only when stampMin/stampMax (token range) filters are present", () => {
    const withoutRange = SRC20Repository.buildFeedFragment({});
    assertEquals(/LEFT JOIN StampTableV4/i.test(withoutRange.subquery), false);

    const withRange = SRC20Repository.buildFeedFragment({
      stampMin: 10,
      stampMax: 500,
    });
    assertMatch(withRange.subquery, /LEFT JOIN StampTableV4 st ON st\.tx_hash = src20\.tx_hash/i);
    assertMatch(withRange.subquery, /st\.stamp\s*<\s*\?/i);
    assertMatch(withRange.subquery, /st\.stamp\s*>=\s*\?/i);
    assertEquals(withRange.params, [500, 10]);
  });

  it("filters by amtMax without requiring the stamp join", () => {
    const { subquery, params } = SRC20Repository.buildFeedFragment({
      amtMax: "1000",
    });

    assertMatch(subquery, /CAST\(src20\.amt AS DECIMAL\)\s*<=\s*\?/i);
    assertEquals(/LEFT JOIN StampTableV4/i.test(subquery), false);
    assertEquals(params, ["1000"]);
  });
});

describe("ExplorerFeedRepository.getFeedPage", () => {
  let originalDb: typeof dbManager;
  let capturedQueries: Array<{ query: string; params: unknown[] }>;

  beforeEach(() => {
    originalDb = dbManager;
    capturedQueries = [];
  });

  afterEach(() => {
    ExplorerFeedRepository.setDatabase(originalDb);
  });

  /**
   * Minimal fake DB: this repository's queries are synthetic (they union
   * two other repositories' pure fragment builders), so there's no
   * meaningful fixture to route through — instead we distinguish the two
   * queries issued per call (count vs. paginated data) by shape and hand
   * back canned rows, then assert on the captured SQL/params.
   */
  function installFakeDb(options: {
    dataRows: { tx_hash: string; block_index: number; tx_index: number; kind: "stamp" | "src20" }[];
    stampTotal: number;
    tokenTotal: number;
  }) {
    const fakeDb = {
      executeQuery: (query: string, params: unknown[]) => {
        capturedQueries.push({ query, params });
        if (/stamp_total/i.test(query)) {
          return Promise.resolve({
            rows: [{ stamp_total: options.stampTotal, token_total: options.tokenTotal }],
          });
        }
        return Promise.resolve({ rows: options.dataRows });
      },
    };
    ExplorerFeedRepository.setDatabase(fakeDb as unknown as typeof dbManager);
  }

  it("issues a single UNION ALL query ordered by block_index/tx_index DESC with LIMIT/OFFSET", async () => {
    installFakeDb({ dataRows: [], stampTotal: 0, tokenTotal: 0 });

    await ExplorerFeedRepository.getFeedPage({ page: 2, limit: 60 });

    const dataQuery = capturedQueries.find((q) => !/stamp_total/i.test(q.query));
    assertMatch(dataQuery!.query, /UNION ALL/i);
    assertMatch(dataQuery!.query, /ORDER BY\s+block_index\s+DESC,\s*tx_index\s+DESC/i);
    assertMatch(dataQuery!.query, /LIMIT\s+\?\s+OFFSET\s+\?/i);

    // page 2, limit 60 -> offset 60, as the last two bound params.
    const boundParams = dataQuery!.params as number[];
    assertEquals(boundParams.slice(-2), [60, 60]);
  });

  it("interweaves stamp and token rows purely based on what the DB returns (order is a DB-level guarantee)", async () => {
    const dataRows = [
      { tx_hash: "tokenA", block_index: 900002, tx_index: 50, kind: "src20" as const },
      { tx_hash: "stampA", block_index: 900001, tx_index: 40, kind: "stamp" as const },
      { tx_hash: "tokenB", block_index: 900000, tx_index: 30, kind: "src20" as const },
    ];
    installFakeDb({ dataRows, stampTotal: 1, tokenTotal: 2 });

    const feed = await ExplorerFeedRepository.getFeedPage({ page: 1, limit: 60 });

    assertEquals(feed.data.map((r) => r.kind), ["src20", "stamp", "src20"]);
    assertEquals(feed.data.map((r) => r.tx_hash), ["tokenA", "stampA", "tokenB"]);
  });

  it("combines the per-table counts into total/totalPages", async () => {
    installFakeDb({ dataRows: [], stampTotal: 37, tokenTotal: 148 });

    const feed = await ExplorerFeedRepository.getFeedPage({ page: 1, limit: 60 });

    assertEquals(feed.totalStamps, 37);
    assertEquals(feed.totalTokens, 148);
    assertEquals(feed.total, 185);
    assertEquals(feed.totalPages, Math.ceil(185 / 60));
  });

  it("always returns at least 1 total page even when both sources are empty", async () => {
    installFakeDb({ dataRows: [], stampTotal: 0, tokenTotal: 0 });

    const feed = await ExplorerFeedRepository.getFeedPage({ page: 1, limit: 60 });

    assertEquals(feed.total, 0);
    assertEquals(feed.totalPages, 1);
  });

  it("computes offset from page/limit and forwards stamp+token filter params ahead of limit/offset", async () => {
    installFakeDb({ dataRows: [], stampTotal: 0, tokenTotal: 0 });

    await ExplorerFeedRepository.getFeedPage({
      page: 3,
      limit: 20,
      ident: ["STAMP"],
      tokenOp: "MINT",
    });

    const dataQuery = capturedQueries.find((q) => !/stamp_total/i.test(q.query));
    // ident param, then op param, then limit(20) + offset((3-1)*20=40)
    assertEquals(dataQuery!.params, ["STAMP", "MINT", 20, 40]);
  });
});
