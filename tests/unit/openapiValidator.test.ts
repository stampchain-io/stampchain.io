import { assertEquals, assertExists } from "@std/assert";
import {
  getValidator,
  validateAgainstSchema,
} from "../../server/middleware/openapiValidator.ts";

Deno.test("OpenAPI Validator", async (t) => {
  await t.step("should load OpenAPI spec successfully", async () => {
    const validator = await getValidator();
    assertExists(validator);
  });

  await t.step("should validate successful stamp response", async () => {
    const mockResponse = {
      data: {
        stamp_id: 123,
        tx_hash: "abc123",
        block_index: 100,
        cpid: "A123",
        creator: "bc1qtest",
      },
    };

    const result = await validateAgainstSchema(
      "GET",
      "/api/v2/stamps/123",
      200,
      mockResponse,
    );

    assertEquals(result.valid, true);
  });

  await t.step(
    "should validate SRC-20 response with v2.3 nested structure",
    async () => {
      // /api/v2/src20/{op} (schema.yml) returns PaginatedSrc20ResponseBody:
      // pagination fields + data[] of Src20Detail with the v2.3 nested
      // mint_progress / market_data objects. Before that path was documented
      // this step matched no schema and passed vacuously.
      const mockResponse = {
        page: 1,
        limit: 50,
        totalPages: 1,
        total: 1,
        last_block: 965984,
        data: [
          {
            tx_hash: "abc123",
            block_index: 100,
            tick: "STAMP",
            p: "SRC-20",
            op: "DEPLOY",
            max: "1000000",
            lim: "1000",
            deci: 18,
            market_data: {
              price_usd: "0.5",
              price_btc: "0.00001",
              market_cap_usd: "500000",
            },
            mint_progress: {
              progress: "75.00",
              current: "750000",
              max: "1000000",
              total_mints: 750,
            },
          },
        ],
      };

      const result = await validateAgainstSchema(
        "GET",
        "/api/v2/src20/deploy",
        200,
        mockResponse,
      );

      assertEquals(result.valid, true);
    },
  );

  await t.step("should validate error response structure", async () => {
    const mockErrorResponse = {
      error: "Not found",
      details: {
        message: "Stamp not found",
        code: "STAMP_NOT_FOUND",
      },
    };

    const result = await validateAgainstSchema(
      "GET",
      "/api/v2/stamp/999999",
      404,
      mockErrorResponse,
    );

    assertEquals(result.valid, true);
  });

  await t.step("should detect invalid response structure", async () => {
    const invalidResponse = {
      // Missing required 'data' field for successful response
      stamp_id: 123,
      tx_hash: "abc123",
    };

    const result = await validateAgainstSchema(
      "GET",
      "/api/v2/stamps/123",
      200,
      invalidResponse,
    );

    // This should fail validation as it doesn't match expected structure
    assertEquals(result.valid, false);
    if (result.errors) {
      assertEquals(result.errors.length > 0, true);
    }
  });
});
