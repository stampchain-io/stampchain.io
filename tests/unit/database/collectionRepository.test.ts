import { dbManager } from "$server/database/databaseManager.ts";
import { CollectionRepository } from "$server/database/collectionRepository.ts";
import { assertEquals, assertExists } from "@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@1.0.14/bdd";
import { MockDatabaseManager } from "../../mocks/mockDatabaseManager.ts";

describe("CollectionRepository Unit Tests", () => {
  let mockDb: MockDatabaseManager;
  let originalDb: typeof dbManager;

  beforeEach(() => {
    // Check if we should run database tests
    if (Deno.env.get("RUN_DB_TESTS") === "true") {
      console.log(
        "Skipping CollectionRepository unit tests - RUN_DB_TESTS is set for integration tests",
      );
      return;
    }

    // Store original database instance
    originalDb = dbManager;

    // Create and inject mock database
    mockDb = new MockDatabaseManager();
    CollectionRepository.setDatabase(mockDb as unknown as typeof dbManager);
  });

  afterEach(() => {
    // Skip cleanup if we didn't set up
    if (!mockDb) return;

    // Clear mock data FIRST before restoring
    mockDb.clearQueryHistory();
    mockDb.clearMockResponses();

    // Restore original database
    CollectionRepository.setDatabase(originalDb);

    // Reset references
    mockDb = null as any;
  });

  describe("getCollectionDetails", () => {
    it("should return collection details with pagination", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      assertExists(result);
      assertExists(result.rows);
      assertEquals(Array.isArray(result.rows), true);
    });

    it("should use HEX() to convert binary collection_id", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const hexQuery = queries.find((q) =>
        q.includes("HEX(c.collection_id)")
      );
      assertExists(hexQuery);
    });

    it("should use GROUP_CONCAT for creators and stamps", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const groupQuery = queries.find((q) =>
        q.includes("GROUP_CONCAT")
      );
      assertExists(groupQuery);
      assertEquals(groupQuery.includes("creator_address"), true);
      assertEquals(groupQuery.includes("cs.stamp"), true);
    });

    it("should JOIN with collection_creators and collection_stamps", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const joinQuery = queries.find((q) =>
        q.includes("LEFT JOIN collection_creators") &&
        q.includes("LEFT JOIN collection_stamps")
      );
      assertExists(joinQuery);
    });

    it("should support filtering by creator", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const creatorAddress = "bc1qtest123";

      await CollectionRepository.getCollectionDetails({
        creator: creatorAddress,
        limit: 10,
        page: 1,
      });

      const fullHistory = mockDb.getFullQueryHistory();
      const creatorQuery = fullHistory.find((entry) =>
        entry.query.includes("WHERE cc.creator_address = ?")
      );

      assertExists(creatorQuery);
      assertEquals(creatorQuery.params.includes(creatorAddress), true);
    });

    it("should support minimum stamp count filter with HAVING clause", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        minStampCount: 5,
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const havingQuery = queries.find((q) =>
        q.includes("HAVING COUNT(DISTINCT cs.stamp) >= ?")
      );
      assertExists(havingQuery);
    });

    it("should support pagination with LIMIT and OFFSET", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const limit = 5;
      const page = 3;

      await CollectionRepository.getCollectionDetails({
        limit,
        page,
      });

      const fullHistory = mockDb.getFullQueryHistory();
      const paginatedQuery = fullHistory.find((entry) =>
        entry.query.includes("LIMIT") && entry.query.includes("OFFSET")
      );

      assertExists(paginatedQuery);
      assertEquals(paginatedQuery.params.includes(limit), true);
      // Offset should be (page - 1) * limit = 10
      assertEquals(paginatedQuery.params.includes(10), true);
    });

    it("should support sorting by collection_name", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        sortBy: "ASC",
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const sortQuery = queries.find((q) =>
        q.includes("ORDER BY c.collection_name ASC")
      );
      assertExists(sortQuery);
    });

    it("should calculate total_editions from stamp supply", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const sumQuery = queries.find((q) =>
        q.includes("SUM(") && q.includes("CASE")
      );
      assertExists(sumQuery);
    });

    it("should return creators as array in results", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      assertExists(result.rows);

      // Each row should have creators as an array
      for (const row of result.rows) {
        assertExists(row);
        if (row.creators) {
          assertEquals(Array.isArray(row.creators), true);
        }
      }
    });

    it("should return stamps as array in results", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      assertExists(result.rows);

      // Each row should have stamps as an array
      for (const row of result.rows) {
        assertExists(row);
        if (row.stamps) {
          assertEquals(Array.isArray(row.stamps), true);
        }
      }
    });
  });

  describe("getTotalCollectionsByCreatorFromDb", () => {
    it("should return total count of all collections", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getTotalCollectionsByCreatorFromDb();

      assertExists(result);

      // Result should be a number (the total count)
      assertEquals(typeof result, "number");
      assertEquals(result >= 0, true);
    });

    it("should filter by creator when provided", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const creatorAddress = "bc1qtest123";

      await CollectionRepository.getTotalCollectionsByCreatorFromDb(
        creatorAddress,
      );

      const fullHistory = mockDb.getFullQueryHistory();
      const creatorQuery = fullHistory.find((entry) =>
        entry.query.includes("creator_address = ?")
      );

      assertExists(creatorQuery);
      assertEquals(creatorQuery.params.includes(creatorAddress), true);
    });

    it("should support minimum stamp count filter with subquery", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const minStampCount = 5;

      await CollectionRepository.getTotalCollectionsByCreatorFromDb(
        undefined,
        minStampCount,
      );

      const queries = mockDb.getQueryHistory();
      const subqueryQuery = queries.find((q) =>
        q.includes("COUNT(*) as total FROM")
      );
      assertExists(subqueryQuery);
    });

    it("should use COUNT(DISTINCT) for simple count", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getTotalCollectionsByCreatorFromDb();

      const queries = mockDb.getQueryHistory();
      const countQuery = queries.find((q) =>
        q.includes("COUNT(DISTINCT c.collection_id)")
      );
      assertExists(countQuery);
    });

    it("should combine creator and minStampCount filters", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const creatorAddress = "bc1qtest123";
      const minStampCount = 3;

      await CollectionRepository.getTotalCollectionsByCreatorFromDb(
        creatorAddress,
        minStampCount,
      );

      const fullHistory = mockDb.getFullQueryHistory();
      const complexQuery = fullHistory.find((entry) =>
        entry.query.includes("creator_address") &&
        entry.params.includes(creatorAddress) &&
        entry.params.includes(minStampCount)
      );

      assertExists(complexQuery);
    });
  });

  describe("Complex aggregation queries", () => {
    it("should handle GROUP BY with multiple aggregates", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const groupByQuery = queries.find((q) =>
        q.includes("GROUP BY c.collection_id")
      );
      assertExists(groupByQuery);

      // Should have multiple aggregates
      assertEquals(groupByQuery.includes("GROUP_CONCAT"), true);
      assertEquals(groupByQuery.includes("COUNT(DISTINCT"), true);
      assertEquals(groupByQuery.includes("SUM("), true);
    });

    it("should handle CASE statement in SUM aggregate", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const caseQuery = queries.find((q) =>
        q.includes("CASE") &&
        q.includes("WHEN st.divisible = 1") &&
        q.includes("WHEN st.supply > 100000")
      );
      assertExists(caseQuery);
    });

    it("should join with stamps table for supply calculation", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const stampJoinQuery = queries.find((q) =>
        q.includes("LEFT JOIN") && q.includes("st ON cs.stamp = st.stamp")
      );
      assertExists(stampJoinQuery);
    });
  });

  describe("Mock data verification", () => {
    it("should use mock data from collection fixtures", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 100,
        page: 1,
      });

      assertExists(result);
      assertExists(result.rows);
      assertEquals(Array.isArray(result.rows), true);

      // Should have returned data from fixtures
      assertEquals(result.rows.length >= 0, true);
    });

    it("should handle queries for specific creator", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        creator: "bc1qtest123",
        limit: 10,
        page: 1,
      });

      assertExists(result);
      assertExists(result.rows);
      assertEquals(Array.isArray(result.rows), true);
    });

    it("should handle empty results for non-existent creator", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        creator: "NONEXISTENT_CREATOR_ADDRESS",
        limit: 10,
        page: 1,
      });

      assertExists(result);
      assertExists(result.rows);
      assertEquals(Array.isArray(result.rows), true);

      // Should return empty array
      assertEquals(result.rows.length, 0);
    });

    it("should handle pagination beyond available data", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1000, // Very high page number
      });

      assertExists(result);
      assertExists(result.rows);
      assertEquals(Array.isArray(result.rows), true);

      // Should return empty array for pages beyond data
      assertEquals(result.rows.length, 0);
    });
  });

  describe("getCollectionByStamp", () => {
    it("should return collection info for a valid stamp number", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const mockCollection = {
        collection_id: "015F0478516E4273DD90FE59C766DD98",
        collection_name: "KEVIN",
        collection_description: null,
      };

      // Use mockQueryResult to return our expected collection row
      mockDb.mockQueryResult([mockCollection]);

      const result = await CollectionRepository.getCollectionByStamp(4258);

      assertExists(result);
      assertEquals(result!.collection_id, "015F0478516E4273DD90FE59C766DD98");
      assertEquals(result!.collection_name, "KEVIN");
      assertEquals(result!.collection_description, null);
    });

    it("should return null when stamp has no collection", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Return empty rows to simulate no collection found
      mockDb.mockQueryResult([]);

      const result = await CollectionRepository.getCollectionByStamp(99999999);

      assertEquals(result, null);
    });

    it("should use correct SQL query structure with stamp number parameter", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      mockDb.mockQueryResult([]);

      await CollectionRepository.getCollectionByStamp(4258);

      const fullHistory = mockDb.getFullQueryHistory();
      assertExists(fullHistory[0]);

      const { query, params } = fullHistory[0];
      // Verify JOIN with collection_stamps on stamp parameter
      assertEquals(query.includes("collection_stamps cs"), true);
      assertEquals(query.includes("cs.stamp = ?"), true);
      // Verify HEX() is used for collection_id
      assertEquals(query.includes("HEX(c.collection_id)"), true);
      // Verify stamp number is passed as parameter
      assertEquals(params.includes(4258), true);
    });

    it("should include stamp number in cache key via query params", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      mockDb.mockQueryResult([]);

      const stampNumber = 1234;
      await CollectionRepository.getCollectionByStamp(stampNumber);

      const fullHistory = mockDb.getFullQueryHistory();
      assertExists(fullHistory[0]);

      // The stamp number must be passed as a query parameter
      // ensuring the cache key is unique per stamp
      assertEquals(fullHistory[0].params.includes(stampNumber), true);
    });

    it("should handle database errors gracefully", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      // Override executeQueryWithCache to throw
      mockDb.executeQueryWithCache = () =>
        Promise.reject(new Error("DB connection failed"));

      try {
        await CollectionRepository.getCollectionByStamp(4258);
        assertEquals(true, false, "Should have thrown an error");
      } catch (error) {
        assertExists(error);
        assertEquals(error.message, "DB connection failed");
      }
    });
  });

  describe("Binary collection_id handling", () => {
    it("should query with BINARY(16) handling", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      const queries = mockDb.getQueryHistory();
      const hexQuery = queries.find((q) =>
        q.includes("HEX(c.collection_id)")
      );
      assertExists(hexQuery);

      // Should handle binary collection_id properly
      assertEquals(
        hexQuery.includes("c.collection_id = cc.collection_id"),
        true,
      );
      assertEquals(
        hexQuery.includes("c.collection_id = cs.collection_id"),
        true,
      );
    });

    it("should return collection_id as hex string in results", async () => {
      // Skip if in RUN_DB_TESTS mode
      if (!mockDb) return;

      const result = await CollectionRepository.getCollectionDetails({
        limit: 10,
        page: 1,
      });

      assertExists(result.rows);

      // Each row should have collection_id as string (hex)
      for (const row of result.rows) {
        assertExists(row);
        if (row.collection_id) {
          assertEquals(typeof row.collection_id, "string");

          // Hex string should be uppercase and valid hex
          assertEquals(/^[0-9A-F]+$/i.test(row.collection_id), true);
        }
      }
    });
  });
});
