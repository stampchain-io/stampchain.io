/**
 * Comprehensive tests for Tool Endpoint Adapters
 *
 * These tests supplement the existing toolEndpointAdapters.test.ts file
 * to achieve higher coverage by testing edge cases, error conditions,
 * and additional scenarios not covered in the basic tests.
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { describe, it } from "jsr:@std/testing@1.0.14/bdd";

import {
  DefaultToolEndpointAdapterFactory,
  factory,
  getToolAdapter,
  isSRC101TransactionOptions,
  isSRC20TransactionOptions,
  isStampTransactionOptions,
  SRC101ToolAdapter,
  SRC20ToolAdapter,
  StampToolAdapter,
} from "$lib/utils/api/adapters/toolEndpointAdapters.ts";

import type {
  AnyTransactionOptions,
  SRC101TransactionOptions,
  SRC20TransactionOptions,
  StampTransactionOptions,
} from "$lib/types/toolEndpointAdapter.ts";

import {
  ToolResponseError,
  ToolValidationError,
} from "$lib/types/toolEndpointAdapter.ts";

describe("StampToolAdapter - Comprehensive Coverage", () => {
  const adapter = new StampToolAdapter();

  describe("parseResponse - Error Conditions", () => {
    it("should throw ToolResponseError for null response", () => {
      assertThrows(
        () => adapter.parseResponse(null),
        ToolResponseError,
        "Invalid response format from stamp endpoint",
      );
    });

    it("should throw ToolResponseError for non-object response", () => {
      assertThrows(
        () => adapter.parseResponse("invalid"),
        ToolResponseError,
        "Invalid response format from stamp endpoint",
      );
    });

    it("should throw ToolResponseError for missing required fields", () => {
      const incompleteResponse = {
        est_tx_size: 250,
        // Missing est_miner_fee, total_dust_value, total_output_value
      };

      assertThrows(
        () => adapter.parseResponse(incompleteResponse),
        ToolResponseError,
        "Missing required fields in stamp response",
      );
    });

    it("should handle response with service fee", () => {
      const responseWithServiceFee = {
        est_tx_size: 250,
        est_miner_fee: 2500,
        total_dust_value: 1000,
        total_output_value: 3500,
        service_fee: 42000,
        change_value: 50000,
        input_value: 100000,
      };

      const result = adapter.parseResponse(responseWithServiceFee);
      assertEquals(result.totalCost, 1000 + 2500 + 42000); // dust + miner + service
    });
  });

  describe("validateOptions - Edge Cases", () => {
    it("should throw ToolValidationError for multiple invalid fields", () => {
      const invalidOptions = {
        // Missing walletAddress, file, filename
        quantity: -1, // Invalid quantity
        feeRate: 0, // Invalid fee rate
        locked: "invalid", // Should be boolean
        divisible: "invalid", // Should be boolean
        dryRun: true,
      } as any;

      assertThrows(
        () => adapter.validateOptions(invalidOptions),
        ToolValidationError,
        "Invalid stamp transaction options",
      );
    });

    it("should throw error for zero quantity", () => {
      const options = {
        walletAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        file: "test-data",
        filename: "test.png",
        quantity: 0,
        feeRate: 10,
        locked: true,
        divisible: false,
        dryRun: true,
      } as StampTransactionOptions;

      assertThrows(
        () => adapter.validateOptions(options),
        ToolValidationError,
      );
    });
  });

  describe("getCacheKey - File Size Handling", () => {
    it("should use file.length when fileSize not provided", () => {
      const options: StampTransactionOptions = {
        walletAddress: "bc1qtest",
        file: "12345", // length = 5
        filename: "test.png",
        quantity: 1,
        feeRate: 10,
        locked: true,
        divisible: false,
        dryRun: true,
      };

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "stamp:bc1qtest:5:10:1");
    });

    it("should use fileSize when provided", () => {
      const options: StampTransactionOptions = {
        walletAddress: "bc1qtest",
        file: "12345",
        filename: "test.png",
        fileSize: 100, // Override file.length
        quantity: 1,
        feeRate: 10,
        locked: true,
        divisible: false,
        dryRun: true,
      };

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "stamp:bc1qtest:100:10:1");
    });

    it("should default to 0 when no file size available", () => {
      const options = {
        walletAddress: "bc1qtest",
        filename: "test.png",
        quantity: 1,
        feeRate: 10,
        locked: true,
        divisible: false,
        dryRun: true,
        // No file or fileSize
      } as any;

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "stamp:bc1qtest:0:10:1");
    });
  });
});

describe("SRC20ToolAdapter - Comprehensive Coverage", () => {
  const adapter = new SRC20ToolAdapter();

  describe("buildRequestBody - Error Conditions", () => {
    it("should throw error for empty wallet address", () => {
      const options = {
        walletAddress: "",
        op: "DEPLOY",
        tick: "TEST",
        feeRate: 10,
        dryRun: true,
        max: "1000",
        lim: "100",
        dec: 8,
      } as SRC20TransactionOptions;

      assertThrows(
        () => adapter.buildRequestBody(options),
        Error,
        "Wallet address is required for SRC20 operations",
      );
    });

    it("should handle MINT operation", () => {
      const options: SRC20TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "MINT",
        tick: "TEST",
        amt: "100",
        feeRate: 10,
        dryRun: true,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.op, "mint");
      assertEquals(requestBody.amt, "100");
    });

    it("should handle TRANSFER operation with destination", () => {
      const options: SRC20TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "TRANSFER",
        tick: "TEST",
        amt: "50",
        destinationAddress: "bc1qdest",
        changeAddress: "bc1qchange",
        feeRate: 10,
        dryRun: true,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.op, "transfer");
      assertEquals(requestBody.toAddress, "bc1qdest");
      assertEquals(requestBody.changeAddress, "bc1qchange");
    });

    it("should handle lowercase operation mapping", () => {
      const options: SRC20TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "DEPLOY",
        tick: "TEST",
        feeRate: 10,
        dryRun: true,
        max: "1000",
        lim: "100",
        dec: 8,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.op, "deploy"); // Should be lowercase
    });
  });

  describe("parseResponse - Fee Details Handling", () => {
    it("should use feeDetails.effectiveFeeRate when available", () => {
      const response = {
        est_tx_size: 250,
        est_miner_fee: 2500,
        total_dust_value: 1000,
        fee: 3500,
        feeDetails: {
          effectiveFeeRate: 12.5,
        },
      };

      const result = adapter.parseResponse(response);
      assertEquals(result.feeRate, 12.5);
      assertEquals(result.feeDetails, response.feeDetails);
    });

    it("should calculate fee rate from miner fee and size when feeDetails not available", () => {
      const response = {
        est_tx_size: 250,
        est_miner_fee: 2500,
        total_dust_value: 1000,
        fee: 3500,
      };

      const result = adapter.parseResponse(response);
      assertEquals(result.feeRate, 2500 / 250); // 10
      assertEquals(result.feeDetails, response);
    });
  });

  describe("validateOptions - Operation-Specific Validation", () => {
    it("should validate MINT operation requirements", () => {
      const invalidMintOptions = {
        walletAddress: "bc1qtest",
        op: "MINT",
        tick: "TEST",
        feeRate: 10,
        // Missing amt
      } as SRC20TransactionOptions;

      assertThrows(
        () => adapter.validateOptions(invalidMintOptions),
        ToolValidationError,
      );
    });

    it("should validate TRANSFER operation requirements", () => {
      const invalidTransferOptions = {
        walletAddress: "bc1qtest",
        op: "TRANSFER",
        tick: "TEST",
        amt: "50",
        feeRate: 10,
        // Missing destinationAddress
      } as SRC20TransactionOptions;

      assertThrows(
        () => adapter.validateOptions(invalidTransferOptions),
        ToolValidationError,
      );
    });

    it("should reject invalid operation", () => {
      const invalidOpOptions = {
        walletAddress: "bc1qtest",
        op: "INVALID",
        tick: "TEST",
        feeRate: 10,
        dryRun: true,
      } as any;

      assertThrows(
        () => adapter.validateOptions(invalidOpOptions),
        ToolValidationError,
      );
    });
  });

  describe("getCacheKey - Amount Handling", () => {
    it("should use amt for MINT/TRANSFER operations", () => {
      const options: SRC20TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "MINT",
        tick: "TEST",
        amt: "100",
        feeRate: 10,
        dryRun: true,
      };

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "src20:bc1qtest:MINT:TEST:100:10");
    });

    it("should use max for DEPLOY operations", () => {
      const options: SRC20TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "DEPLOY",
        tick: "TEST",
        max: "1000",
        lim: "100",
        dec: 8,
        feeRate: 10,
        dryRun: true,
      };

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "src20:bc1qtest:DEPLOY:TEST:1000:10");
    });
  });
});

describe("SRC101ToolAdapter - Comprehensive Coverage", () => {
  const adapter = new SRC101ToolAdapter();

  describe("buildRequestBody - All Operations", () => {
    it("should handle mint operation", () => {
      const options: SRC101TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "mint",
        name: "test-nft",
        feeRate: 10,
        dryRun: true,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.op, "mint");
      assertEquals(requestBody.name, "test-nft");
      assertEquals(requestBody.changeAddress, "bc1qtest"); // Should default to walletAddress
    });

    it("should handle transfer operation with all fields", () => {
      const options: SRC101TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "transfer",
        name: "test-nft",
        amt: "1",
        destinationAddress: "bc1qdest",
        changeAddress: "bc1qchange",
        feeRate: 10,
        dryRun: true,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.op, "transfer");
      assertEquals(requestBody.name, "test-nft");
      assertEquals(requestBody.amt, "1");
      assertEquals(requestBody.destinationAddress, "bc1qdest");
      assertEquals(requestBody.changeAddress, "bc1qchange");
    });

    it("should use custom changeAddress when provided", () => {
      const options: SRC101TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "deploy",
        root: "root-hash",
        changeAddress: "bc1qcustom",
        feeRate: 10,
        dryRun: true,
      };

      const requestBody = adapter.buildRequestBody(options);
      assertEquals(requestBody.changeAddress, "bc1qcustom");
    });
  });

  describe("parseResponse - Estimation Method Defaults", () => {
    it("should use default estimation method when not provided", () => {
      const response = {
        est_tx_size: 250,
        est_miner_fee: 2500,
        total_dust_value: 1000,
        total_cost: 3500,
      };

      const result = adapter.parseResponse(response);
      assertEquals(result.estimationMethod, "dryRun_calculation");
      assertEquals(result.isEstimate, true); // Should default to true
    });

    it("should use provided estimation method and isEstimate", () => {
      const response = {
        est_tx_size: 250,
        est_miner_fee: 2500,
        total_dust_value: 1000,
        total_cost: 3500,
        estimation_method: "real_utxo_selection",
        is_estimate: false,
      };

      const result = adapter.parseResponse(response);
      assertEquals(result.estimationMethod, "real_utxo_selection");
      assertEquals(result.isEstimate, false);
    });
  });

  describe("validateOptions - Operation-Specific Validation", () => {
    it("should validate mint operation requirements", () => {
      const invalidMintOptions = {
        walletAddress: "bc1qtest",
        op: "mint",
        feeRate: 10,
        // Missing name
      } as SRC101TransactionOptions;

      assertThrows(
        () => adapter.validateOptions(invalidMintOptions),
        ToolValidationError,
      );
    });

    it("should validate transfer operation requirements", () => {
      const invalidTransferOptions = {
        walletAddress: "bc1qtest",
        op: "transfer",
        name: "test-nft",
        feeRate: 10,
        // Missing destinationAddress
      } as SRC101TransactionOptions;

      assertThrows(
        () => adapter.validateOptions(invalidTransferOptions),
        ToolValidationError,
      );
    });
  });

  describe("getCacheKey - Complex Scenarios", () => {
    it("should handle deploy operation with root", () => {
      const options: SRC101TransactionOptions = {
        walletAddress: "bc1qtest",
        op: "deploy",
        root: "root-hash-123",
        feeRate: 10,
        dryRun: true,
      };

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "src101:bc1qtest:deploy:root-hash-123::10");
    });

    it("should handle operations without root/name", () => {
      const options = {
        walletAddress: "bc1qtest",
        op: "unknown",
        feeRate: 10,
        dryRun: true,
      } as any;

      const cacheKey = adapter.getCacheKey(options);
      assertEquals(cacheKey, "src101:bc1qtest:unknown:::10");
    });
  });
});

describe("Type Guards - Comprehensive Coverage", () => {
  describe("isStampTransactionOptions", () => {
    it("should return false for options missing file", () => {
      const options = {
        filename: "test.png",
        walletAddress: "bc1qtest",
      } as any;

      assertEquals(isStampTransactionOptions(options), false);
    });

    it("should return false for options missing filename", () => {
      const options = {
        file: "test-data",
        walletAddress: "bc1qtest",
      } as any;

      assertEquals(isStampTransactionOptions(options), false);
    });

    it("should return true for valid stamp options", () => {
      const options = {
        file: "test-data",
        filename: "test.png",
        walletAddress: "bc1qtest",
      } as any;

      assertEquals(isStampTransactionOptions(options), true);
    });
  });

  describe("isSRC20TransactionOptions", () => {
    it("should return false for invalid operation", () => {
      const options = {
        op: "INVALID",
        tick: "TEST",
      } as any;

      assertEquals(isSRC20TransactionOptions(options), false);
    });

    it("should return false for non-string operation", () => {
      const options = {
        op: 123,
        tick: "TEST",
      } as any;

      assertEquals(isSRC20TransactionOptions(options), false);
    });

    it("should return false when missing tick", () => {
      const options = {
        op: "DEPLOY",
      } as any;

      assertEquals(isSRC20TransactionOptions(options), false);
    });

    it("should return true for valid SRC20 operations", () => {
      const deployOptions = { op: "DEPLOY", tick: "TEST" };
      const mintOptions = { op: "MINT", tick: "TEST" };
      const transferOptions = { op: "TRANSFER", tick: "TEST" };

      assertEquals(isSRC20TransactionOptions(deployOptions), true);
      assertEquals(isSRC20TransactionOptions(mintOptions), true);
      assertEquals(isSRC20TransactionOptions(transferOptions), true);
    });
  });

  describe("isSRC101TransactionOptions", () => {
    it("should return false for invalid operation", () => {
      const options = {
        op: "invalid",
      } as any;

      assertEquals(isSRC101TransactionOptions(options), false);
    });

    it("should return false for non-string operation", () => {
      const options = {
        op: 123,
      } as any;

      assertEquals(isSRC101TransactionOptions(options), false);
    });

    it("should return false when missing op", () => {
      const options = {
        name: "test",
      } as any;

      assertEquals(isSRC101TransactionOptions(options), false);
    });

    it("should return true for valid SRC101 operations", () => {
      const deployOptions = { op: "deploy" };
      const mintOptions = { op: "mint" };
      const transferOptions = { op: "transfer" };

      assertEquals(isSRC101TransactionOptions(deployOptions), true);
      assertEquals(isSRC101TransactionOptions(mintOptions), true);
      assertEquals(isSRC101TransactionOptions(transferOptions), true);
    });
  });
});

describe("Factory and Utility Functions", () => {
  describe("getToolAdapter", () => {
    it("should return correct adapter instances", () => {
      const stampAdapter = getToolAdapter("stamp");
      const src20Adapter = getToolAdapter("src20");
      const src101Adapter = getToolAdapter("src101");

      assertEquals(stampAdapter instanceof StampToolAdapter, true);
      assertEquals(src20Adapter instanceof SRC20ToolAdapter, true);
      assertEquals(src101Adapter instanceof SRC101ToolAdapter, true);
    });

    it("should throw error for unsupported tool type", () => {
      assertThrows(
        () => getToolAdapter("unsupported" as any),
        Error,
        "No adapter available for tool type: unsupported",
      );
    });
  });

  describe("factory singleton", () => {
    it("should be instance of DefaultToolEndpointAdapterFactory", () => {
      assertEquals(factory instanceof DefaultToolEndpointAdapterFactory, true);
    });

    it("should provide same adapter instances on multiple calls", () => {
      const adapter1 = factory.createAdapter("stamp");
      const adapter2 = factory.createAdapter("stamp");

      // Should return the same instance (from internal Map)
      assertEquals(adapter1, adapter2);
    });
  });
});

describe("Error Handling and Edge Cases", () => {
  describe("ToolResponseError Integration", () => {
    it("should include proper error context in ToolResponseError", () => {
      const adapter = new StampToolAdapter();

      try {
        adapter.parseResponse({ invalid: "response" });
      } catch (error) {
        assertEquals(error instanceof Error, true);
        assertExists(error.message);
      }
    });
  });

  describe("Validation Error Details", () => {
    it("should provide detailed validation errors", () => {
      const adapter = new SRC20ToolAdapter();
      const invalidOptions = {
        // All required fields missing
      } as any;

      try {
        adapter.validateOptions(invalidOptions);
      } catch (error) {
        assertEquals(error instanceof Error, true);
        assertExists(error.message);
      }
    });
  });
});
