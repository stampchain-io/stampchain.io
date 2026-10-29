import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "jsr:@std/testing@1.0.14/bdd";
import { returnsNext, Stub, stub } from "@std/testing@1.0.14/mock";

import { TX_CONSTANTS } from "$constants";
import { StampCreationService } from "$server/services/stamp/stampCreationService.ts";
import {
  createMockServices,
  createRealisticStampScenario,
  edgeCases,
  errorScenarios,
  mockCIP33Addresses,
  mockCounterpartyResponses,
  mockFileData,
  mockPSBTResults,
  mockStampParams,
  mockUTXOs,
  mockWalletAddresses,
  performanceTestCases,
  validateStampResult,
  validationTestCases,
} from "../fixtures/stampCreationServiceFixtures.ts";

describe("StampCreationService", () => {
  describe("createStampIssuance", () => {
    it("uses the standard dust size", () => {
      assertEquals(TX_CONSTANTS.DUST_SIZE, 333);
    });

    describe("Input validation", () => {
      for (const testCase of validationTestCases) {
        it(`should ${testCase.shouldPass ? "accept" : "reject"} ${testCase.name}`, async () => {
          if (testCase.shouldPass) {
            // Mock dependencies for successful case
            const createIssuanceStub = stub(
              StampCreationService as any,
              "createIssuanceTransaction",
              returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
            );
            const generatePSBTStub = stub(
              StampCreationService as any,
              "generatePSBT",
              returnsNext([Promise.resolve(mockPSBTResults.successful)]),
            );

            try {
              const result = await StampCreationService.createStampIssuance(
                testCase.params,
              );
              assertExists(result);
              validateStampResult(result);
            } finally {
              createIssuanceStub.restore();
              generatePSBTStub.restore();
            }
          } else {
            await assertRejects(
              () => StampCreationService.createStampIssuance(testCase.params),
              Error,
              testCase.expectedError,
            );
          }
        });
      }
    });

    describe("Wallet address validation", () => {
      it("should accept valid P2WPKH addresses", async () => {
        const params = {
          ...mockStampParams.basic,
          sourceWallet: mockWalletAddresses.valid.p2wpkh,
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should accept valid P2PKH addresses", async () => {
        const params = {
          ...mockStampParams.basic,
          sourceWallet: mockWalletAddresses.valid.p2pkh,
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should reject invalid wallet addresses", async () => {
        const params = {
          ...mockStampParams.basic,
          sourceWallet: mockWalletAddresses.invalid.malformed,
        };

        await assertRejects(
          () => StampCreationService.createStampIssuance(params),
          Error,
          "Invalid source wallet",
        );
      });

      it("should validate service fee addresses when service fee is provided", async () => {
        const params = {
          ...mockStampParams.basic,
          service_fee: 50000,
          service_fee_address: mockWalletAddresses.invalid.malformed,
        };

        await assertRejects(
          () => StampCreationService.createStampIssuance(params),
          Error,
          "Invalid service fee address",
        );
      });

      it("should skip service fee address validation when service fee is zero", async () => {
        const params = {
          ...mockStampParams.basic,
          service_fee: 0,
          service_fee_address: mockWalletAddresses.invalid.malformed, // Should be ignored
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });

    describe("Quantity handling", () => {
      it("should handle string quantities", async () => {
        const params = { ...mockStampParams.basic, qty: "42" };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Verify createIssuanceTransaction was called with parsed integer
          assertEquals(createIssuanceStub.calls[0].args[0].qty, 42);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should handle numeric quantities", async () => {
        const params = { ...mockStampParams.basic, qty: 100 as any };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          assertEquals(createIssuanceStub.calls[0].args[0].qty, 100);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should handle zero quantity", async () => {
        const params = { ...mockStampParams.basic, qty: "0" };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          assertEquals(createIssuanceStub.calls[0].args[0].qty, 0);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });

    describe("Fee rate normalization", () => {
      it("should normalize fee rates correctly", async () => {
        const params = { ...mockStampParams.basic, satsPerVB: 25.5 };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Verify fee rate was converted properly (should be ~25500 sats/kB)
          const callArgs = createIssuanceStub.calls[0].args[0];
          assert(callArgs.satsPerKB >= 25000 && callArgs.satsPerKB <= 26000);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should handle undefined fee rates", async () => {
        const params = { ...mockStampParams.basic };
        delete (params as any).satsPerVB;

        // Should throw error when no fee rate is provided
        try {
          await StampCreationService.createStampIssuance(params);
          assert(false, "Should have thrown an error");
        } catch (error) {
          // The service rejects with a string, not an Error object
          assertEquals(error, "Either satsPerKB or satsPerVB must be provided");
        }
      });
    });

    describe("Dry run mode", () => {
      it("should return estimation data without hex for dry runs", async () => {
        const params = { ...mockStampParams.basic, isDryRun: true };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);

          // Should not include hex field in dry run
          assert(!("hex" in result));

          // Should include estimation fields
          assertExists(result.est_tx_size);
          assertExists(result.input_value);
          assertExists(result.total_dust_value);
          assertExists(result.est_miner_fee);
          assertExists(result.change_value);
          assertExists(result.total_output_value);

          validateStampResult(result, true);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should return hex for non-dry runs", async () => {
        const params = { ...mockStampParams.basic, isDryRun: false };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);

          assertExists(result.hex);
          assertEquals(typeof result.hex, "string");
          assert(result.hex.length > 0);

          validateStampResult(result, false);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });

    describe("Asset name handling", () => {
      it("should handle defined asset names", async () => {
        const params = { ...mockStampParams.basic, assetName: "MYASSET" };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          assertEquals(
            createIssuanceStub.calls[0].args[0].assetName,
            "MYASSET",
          );
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should handle undefined asset names", async () => {
        const params = { ...mockStampParams.basic };
        delete (params as any).assetName;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          assertEquals(createIssuanceStub.calls[0].args[0].assetName, "");
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });

    describe("Error handling", () => {
      it("should handle transaction creation failures", async () => {
        const params = mockStampParams.basic;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "" })]), // Empty tx_hex
        );

        try {
          await assertRejects(
            () => StampCreationService.createStampIssuance(params),
            Error,
            "Transaction creation failed: No transaction hex returned",
          );
        } finally {
          createIssuanceStub.restore();
        }
      });

      it("should handle missing transaction hex", async () => {
        const params = mockStampParams.basic;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({})]), // No tx_hex field
        );

        try {
          await assertRejects(
            () => StampCreationService.createStampIssuance(params),
            Error,
            "Transaction creation failed: No transaction hex returned",
          );
        } finally {
          createIssuanceStub.restore();
        }
      });

      it("should enhance error messages for base58 errors", async () => {
        const params = mockStampParams.basic;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.reject(new Error("invalid base58 address"))]),
        );

        try {
          await assertRejects(
            () => StampCreationService.createStampIssuance(params),
            Error,
            "Invalid address format. Please use a supported Bitcoin address format",
          );
        } finally {
          createIssuanceStub.restore();
        }
      });

      it("should propagate other errors unchanged", async () => {
        const params = mockStampParams.basic;
        const originalError = new Error("Network connection failed");

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.reject(originalError)]),
        );

        try {
          await assertRejects(
            () => StampCreationService.createStampIssuance(params),
            Error,
            "Network connection failed",
          );
        } finally {
          createIssuanceStub.restore();
        }
      });
    });

    describe("File processing", () => {
      it("should process small files correctly", async () => {
        const params = {
          ...mockStampParams.basic,
          file: mockFileData.small.base64,
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should process large files correctly", async () => {
        const params = {
          ...mockStampParams.basic,
          file: mockFileData.large.base64,
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Large files should result in higher estimated sizes
          assert(result.est_tx_size > 200);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should calculate file sizes correctly", async () => {
        const params = {
          ...mockStampParams.basic,
          file: mockFileData.medium.base64,
        };

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Verify file size was calculated and passed correctly
          const generatePSBTCall = generatePSBTStub.calls[0];
          const fileSize = generatePSBTCall.args[6]; // fileSize parameter
          assert(fileSize > 0);
          assert(typeof fileSize === "number");
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });

    describe("Service integration", () => {
      it("should integrate with createIssuanceTransaction correctly", async () => {
        const params = mockStampParams.basic;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex123" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Verify createIssuanceTransaction was called with correct parameters
          assertEquals(createIssuanceStub.calls.length, 1);
          const callArgs = createIssuanceStub.calls[0].args[0];

          assertEquals(callArgs.sourceWallet, params.sourceWallet);
          assertEquals(callArgs.qty, parseInt(params.qty));
          assertEquals(callArgs.locked, params.locked);
          assertEquals(callArgs.divisible, params.divisible);
          assertExists(callArgs.satsPerKB);
          assertEquals(callArgs.isDryRun, false);
          assertEquals(callArgs.file, params.file);
          assertEquals(callArgs.service_fee, params.service_fee);
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });

      it("should integrate with generatePSBT correctly", async () => {
        const params = mockStampParams.basic;

        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex456" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const result = await StampCreationService.createStampIssuance(params);
          assertExists(result);

          // Verify generatePSBT was called with correct parameters
          assertEquals(generatePSBTStub.calls.length, 1);
          const callArgs = generatePSBTStub.calls[0].args;

          assertEquals(callArgs[0], "mockTxHex456"); // tx hex
          assertEquals(callArgs[1], params.sourceWallet); // address
          assert(typeof callArgs[2] === "number"); // satsPerVB
          assertEquals(callArgs[3], params.service_fee); // service_fee
          assertEquals(callArgs[4], params.service_fee_address); // recipient_fee
          assert(Array.isArray(callArgs[5])); // cip33Addresses
          assert(typeof callArgs[6] === "number"); // fileSize
          assertEquals(callArgs[7], false); // isDryRun
          assertEquals(callArgs[8], undefined); // no preselected inputs from the stub
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    });
  });

  describe("Performance tests", () => {
    for (const testCase of performanceTestCases) {
      it(`should complete ${testCase.name} within ${testCase.maxExecutionTime}ms`, async () => {
        const createIssuanceStub = stub(
          StampCreationService as any,
          "createIssuanceTransaction",
          returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
        );
        const generatePSBTStub = stub(
          StampCreationService as any,
          "generatePSBT",
          returnsNext([Promise.resolve(mockPSBTResults.successful)]),
        );

        try {
          const startTime = Date.now();
          const result = await StampCreationService.createStampIssuance(
            testCase.params,
          );
          const endTime = Date.now();

          assertExists(result);
          assert(
            endTime - startTime < testCase.maxExecutionTime,
            `Execution took ${
              endTime - startTime
            }ms, expected < ${testCase.maxExecutionTime}ms`,
          );
        } finally {
          createIssuanceStub.restore();
          generatePSBTStub.restore();
        }
      });
    }
  });

  describe("Edge cases", () => {
    it("should handle empty files gracefully", async () => {
      const params = edgeCases.emptyFile;

      const createIssuanceStub = stub(
        StampCreationService as any,
        "createIssuanceTransaction",
        returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
      );
      const generatePSBTStub = stub(
        StampCreationService as any,
        "generatePSBT",
        returnsNext([Promise.resolve(mockPSBTResults.successful)]),
      );

      try {
        const result = await StampCreationService.createStampIssuance(params);
        assertExists(result);
      } finally {
        createIssuanceStub.restore();
        generatePSBTStub.restore();
      }
    });

    it("should handle very high fee rates", async () => {
      const params = edgeCases.veryHighFeeRate;

      const createIssuanceStub = stub(
        StampCreationService as any,
        "createIssuanceTransaction",
        returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
      );

      // Create a dynamic PSBT result based on the high fee rate (1000 sats/vB)
      const highFeeResult = {
        ...mockPSBTResults.successful,
        estMinerFee: 250 * 1000, // 250 bytes * 1000 sats/vB = 250,000
      };

      const generatePSBTStub = stub(
        StampCreationService as any,
        "generatePSBT",
        returnsNext([Promise.resolve(highFeeResult)]),
      );

      try {
        const result = await StampCreationService.createStampIssuance(params);
        assertExists(result);

        // High fee rates should result in high estimated fees
        assert(result.est_miner_fee > 50000); // Should be substantial
      } finally {
        createIssuanceStub.restore();
        generatePSBTStub.restore();
      }
    });

    it("should handle very low fee rates", async () => {
      const params = edgeCases.veryLowFeeRate;

      const createIssuanceStub = stub(
        StampCreationService as any,
        "createIssuanceTransaction",
        returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
      );

      // Create a dynamic PSBT result based on the low fee rate (1 sat/vB)
      const lowFeeResult = {
        ...mockPSBTResults.successful,
        estMinerFee: 250 * 1, // 250 bytes * 1 sat/vB = 250
      };

      const generatePSBTStub = stub(
        StampCreationService as any,
        "generatePSBT",
        returnsNext([Promise.resolve(lowFeeResult)]),
      );

      try {
        const result = await StampCreationService.createStampIssuance(params);
        assertExists(result);

        // Low fee rates should result in low estimated fees
        assert(result.est_miner_fee < 1000);
      } finally {
        createIssuanceStub.restore();
        generatePSBTStub.restore();
      }
    });

    it("should handle maximum service fees", async () => {
      const params = edgeCases.maxServiceFee;

      const createIssuanceStub = stub(
        StampCreationService as any,
        "createIssuanceTransaction",
        returnsNext([Promise.resolve({ tx_hex: "mockTxHex" })]),
      );
      const generatePSBTStub = stub(
        StampCreationService as any,
        "generatePSBT",
        returnsNext([Promise.resolve({
          ...mockPSBTResults.successful,
          totalOutputValue: mockPSBTResults.successful.totalOutputValue +
            950000, // Add high service fee
        })]),
      );

      try {
        const result = await StampCreationService.createStampIssuance(params);
        assertExists(result);

        // Should handle large service fees without issues
        assert(result.total_output_value > 1000000);
      } finally {
        createIssuanceStub.restore();
        generatePSBTStub.restore();
      }
    });
  });
});
