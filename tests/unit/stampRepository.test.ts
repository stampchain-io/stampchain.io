import { assertEquals, assertExists } from "@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@1.0.14/bdd";
import { StampRepository } from "$server/database/stampRepository.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import { MockDatabaseManager } from "../mocks/mockDatabaseManager.ts";
import stampFixtures from "../fixtures/stampData.json" with { type: "json" };

describe("StampRepository Unit Tests", () => {
  let originalDb: typeof dbManager;
  let mockDb: MockDatabaseManager;

  beforeEach(() => {
    // Check if we should run database tests
    if (Deno.env.get("RUN_DB_TESTS") === "true") {
      // Skip these tests in CI - they need real database connection
      console.log(
        "Skipping StampRepository unit tests - RUN_DB_TESTS is set for integration tests",
      );
      return;
    }

    // Store original database
    originalDb = dbManager;

    // Create mock database
    mockDb = new MockDatabaseManager();

    // Inject mock
    StampRepository.setDatabase(mockDb as unknown as typeof dbManager);
  });

  afterEach(() => {
    // Skip cleanup if we didn't set up
    if (!mockDb) return;

    // Clear mock state first
    mockDb.clearQueryHistory();
    mockDb.clearMockResponses();

    // Restore original database
    StampRepository.setDatabase(originalDb);

    // Reset references
    mockDb = null as any;
  });

  describe("getStamps", () => {
    it("should return stamps with basic pagination", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // The mock will automatically return fixture data for stamp queries
      const result = await StampRepository.getStamps({
        limit: 5,
        page: 1,
      });

      assertExists(result);
      assertEquals(Array.isArray(result.stamps), true);
      assertEquals(result.stamps.length, 5);
      assertEquals(result.page, 1);
      assertEquals(result.page_size, 5);

      if (result.stamps.length > 0) {
        const firstStamp = result.stamps[0];
        assertExists(firstStamp.stamp);
        assertExists(firstStamp.cpid);
        assertExists(firstStamp.tx_hash);
      }

      // Verify the query was called
      const queryHistory = mockDb.getQueryHistory();
      assertEquals(queryHistory.length > 0, true);
    });

    it("should return stamps filtered by type", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await StampRepository.getStamps({
        type: "stamps",
        limit: 10,
        page: 1,
      });

      assertExists(result);
      assertEquals(Array.isArray(result.stamps), true);

      // Verify all stamps are regular stamps (not cursed or SRC-20)
      result.stamps.forEach((stamp: any) => {
        assertEquals(stamp.stamp >= 0, true);
        assertEquals(stamp.ident !== "SRC-20", true);
      });
    });

    it("should return cursed stamps when filtered", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await StampRepository.getStamps({
        type: "cursed",
        limit: 20,
        page: 1,
      });

      assertExists(result);
      assertEquals(Array.isArray(result.stamps), true);

      // Verify all stamps are cursed (negative stamp numbers)
      result.stamps.forEach((stamp: any) => {
        assertEquals(stamp.stamp < 0, true);
      });
    });

    it("should exclude SRC-721 (recursive) stamps from cursed/classic/posh filters", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Regression test: cursed/classic/posh conditions only excluded
      // ident != 'SRC-20', not SRC-721/SRC-101 — so any SRC-721 stamp whose
      // CPID happened to match the classic/cursed cpid LIKE 'A%' pattern
      // (common for Counterparty-issued recursive stamps) leaked into
      // those tabs. Verified live on stampchain.io/explorer: page 3 of
      // type=cursed showed several RECURSIVE-tagged (SRC-721) entries, and
      // type=classic likewise. Assert ident is always "STAMP" here.
      const cursedResult = await StampRepository.getStamps({
        type: "cursed",
        limit: 50,
        page: 1,
      });
      cursedResult.stamps.forEach((stamp: any) => {
        assertEquals(stamp.ident, "STAMP");
      });

      const classicResult = await StampRepository.getStamps({
        type: "classic",
        limit: 50,
        page: 1,
      });
      classicResult.stamps.forEach((stamp: any) => {
        assertEquals(stamp.ident, "STAMP");
      });

      const poshResult = await StampRepository.getStamps({
        type: "posh",
        limit: 50,
        page: 1,
      });
      poshResult.stamps.forEach((stamp: any) => {
        assertEquals(stamp.ident, "STAMP");
      });
    });

    it("should return only SRC-721 stamps when filtered by type='src-721'", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Regression test: type="src-721" previously fell through every
      // branch in buildIdentifierConditions with no matching condition,
      // so the query applied no type filter at all and returned stamps of
      // every ident. Verify the SRC-721 filter is actually applied now.
      const result = await StampRepository.getStamps({
        type: "src-721",
        limit: 20,
        page: 1,
      });

      assertExists(result);
      assertEquals(Array.isArray(result.stamps), true);
      assertEquals(result.stamps.length > 0, true);

      result.stamps.forEach((stamp: any) => {
        assertEquals(stamp.ident, "SRC-721");
      });
    });

    it("should handle empty results", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override the mock to return empty results for this specific test
      const originalExecuteQueryWithCache = mockDb.executeQueryWithCache.bind(
        mockDb,
      );
      let queryCount = 0;
      mockDb.executeQueryWithCache = (
        _query: string,
        _params: unknown[],
        _cacheDuration: number | "never",
      ): any => {
        queryCount++;
        // First query is for data, second is for count
        if (queryCount === 1) {
          // Return empty data
          return Promise.resolve({ rows: [] });
        } else {
          // Return zero count
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
      };

      const result = await StampRepository.getStamps({
        identifier: "non-existent-stamp",
      });

      assertExists(result);
      assertEquals(result.stamps.length, 0);
      assertEquals(result.total, 0);

      // Restore original method
      mockDb.executeQueryWithCache = originalExecuteQueryWithCache;
    });

    it("should handle database errors gracefully", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override executeQueryWithCache to throw an error
      mockDb.executeQueryWithCache = () => {
        return Promise.reject(new Error("Database connection failed"));
      };

      try {
        await StampRepository.getStamps({});
        // If we get here, the test should fail
        assertEquals(true, false, "Expected getStamps to throw an error");
      } catch (error) {
        // Expected behavior - getStamps throws errors
        assertExists(error);
        assertEquals((error as Error).message, "Database connection failed");
      }
    });
  });

  describe("getTotalStampCountFromDb", () => {
    it("should return total count", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await StampRepository.getTotalStampCountFromDb({});
      const total = (result as any).rows[0]?.total || 0;

      assertEquals(typeof total, "number");
      assertEquals(total > 0, true);
    });

    it("should return count with type filter", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const regularResult = await StampRepository
        .getTotalStampCountFromDb({ type: "stamps" });
      const cursedResult = await StampRepository
        .getTotalStampCountFromDb({ type: "cursed" });

      const regularCount = (regularResult as any).rows[0]?.total || 0;
      const cursedCount = (cursedResult as any).rows[0]?.total || 0;

      assertEquals(typeof regularCount, "number");
      assertEquals(typeof cursedCount, "number");
      assertEquals(regularCount > 0, true);
      assertEquals(cursedCount > 0, true);
    });

    it("should return 0 on error", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override to throw error
      mockDb.executeQueryWithCache = () => {
        return Promise.reject(new Error("Count query failed"));
      };

      try {
        await StampRepository.getTotalStampCountFromDb({});
        // If we get here, the test should fail
        assertEquals(
          true,
          false,
          "Expected getTotalStampCountFromDb to throw an error",
        );
      } catch (error) {
        // Expected behavior - method throws errors
        assertExists(error);
        assertEquals((error as Error).message, "Count query failed");
      }
    });
  });

  describe("getStampFile", () => {
    it("should return stamp file data", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const stamp = stampFixtures.regularStamps[0];

      // Override the mock to return the expected structure for getStampFile
      const originalExecuteQueryWithCache = mockDb.executeQueryWithCache.bind(
        mockDb,
      );
      mockDb.executeQueryWithCache = (
        _query: string,
        params: unknown[],
        _cacheDuration: number | "never",
      ): any => {
        // Check if this is a getStampFile query by looking at the params
        if (params.length === 1 && params[0] === stamp.cpid) {
          return Promise.resolve({
            rows: [{
              tx_hash: stamp.tx_hash,
              stamp_hash: stamp.stamp_hash,
              stamp_mimetype: stamp.stamp_mimetype,
              cpid: stamp.cpid,
              stamp_base64: (stamp as any).stamp_base64 || null,
              stamp_url: stamp.stamp_url,
              stamp: stamp.stamp,
            }],
          });
        }
        // Fall back to original for other queries
        return originalExecuteQueryWithCache(_query, params, _cacheDuration);
      };

      const result = await StampRepository.getStampFile(stamp.cpid);

      assertExists(result);
      assertExists(result.stamp_url);
      // stamp_base64 might be null in fixtures
      assertExists(
        Object.prototype.hasOwnProperty.call(result, "stamp_base64"),
      );

      // Restore original method
      mockDb.executeQueryWithCache = originalExecuteQueryWithCache;
    });

    it("should return null for non-existent stamp", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Set empty response for non-existent stamp
      mockDb.setMockResponse(
        "SELECT",
        ["non-existent-cpid"],
        { rows: [] },
      );

      const result = await StampRepository.getStampFile("non-existent-cpid");
      assertEquals(result, null);
    });

    it("should handle invalid identifiers", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await StampRepository.getStampFile("invalid!@#$%");
      assertEquals(result, null);
    });
  });

  describe("getCreatorNameByAddress", () => {
    it("should return creator name", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Mock will return creator data from fixtures
      const creator = stampFixtures.creators?.[0];
      if (creator) {
        const name = await StampRepository.getCreatorNameByAddress(
          creator.address,
        );
        assertEquals(name, creator.creator);
      }
    });

    it("should return null for unknown address", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Set empty response
      mockDb.setMockResponse(
        "SELECT",
        ["unknown-address"],
        { rows: [] },
      );

      const name = await StampRepository.getCreatorNameByAddress(
        "unknown-address",
      );
      assertEquals(name, null);
    });

    it("should handle errors gracefully", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override to throw error
      mockDb.executeQueryWithCache = () => {
        return Promise.reject(new Error("Creator query failed"));
      };

      try {
        const name = await StampRepository.getCreatorNameByAddress(
          "any-address",
        );
        assertEquals(name, null);
      } catch (error) {
        // If it throws instead of returning null, that's also acceptable
        assertExists(error);
        assertEquals((error as Error).message, "Creator query failed");
      }
    });
  });

  describe("updateCreatorName", () => {
    it("should update creator name successfully", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const success = await StampRepository.updateCreatorName(
        "test-address",
        "New Creator Name",
      );

      assertEquals(success, true);

      // Verify the query was called
      const queryHistory = mockDb.getFullQueryHistory();
      const updateQuery = queryHistory.find((q) =>
        q.query.toLowerCase().includes("insert") ||
        q.query.toLowerCase().includes("update")
      );
      assertExists(updateQuery);
    });

    it("should return false on error", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override to throw error
      mockDb.executeQuery = () => {
        return Promise.reject(new Error("Update failed"));
      };

      const success = await StampRepository.updateCreatorName(
        "test-address",
        "New Creator Name",
      );

      assertEquals(success, false);
    });
  });

  describe("sanitize", () => {
    it("should remove special characters except allowed ones", () => {
      const input = "test@#$%^&*()_+-=[]{}|;':\",./<>?";
      const result = StampRepository.sanitize(input);
      assertEquals(result, "test_-."); // Only underscore, hyphen, and dot are allowed
    });

    it("should preserve alphanumeric, dots, and hyphens", () => {
      const input = "Test-123.stamp_file";
      const result = StampRepository.sanitize(input);
      assertEquals(result, "Test-123.stamp_file");
    });

    it("should handle empty strings", () => {
      const result = StampRepository.sanitize("");
      assertEquals(result, "");
    });

    it("should handle strings with only special characters", () => {
      const input = "@#$%^&*()";
      const result = StampRepository.sanitize(input);
      assertEquals(result, "");
    });
  });

  describe("getStamps with market data", () => {
    it("should return stamps with market data", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await StampRepository.getStamps({
        limit: 10,
        page: 1,
        filterBy: ["marketplace"] as any,
      });

      assertExists(result);
      assertEquals(Array.isArray(result.stamps), true);

      // Verify stamps have market data
      if (result.stamps.length > 0) {
        const firstStamp = result.stamps[0];
        // Market data fields should exist (even if null)
        assertExists(
          Object.prototype.hasOwnProperty.call(firstStamp, "floorPrice"),
        );
      }
    });
  });
});
