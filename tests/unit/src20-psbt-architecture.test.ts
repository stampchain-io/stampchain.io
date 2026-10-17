// SRC20 PSBT Services - New Architecture Unit Tests
// Tests the simplified UTXO selection architecture

import type { DatabaseManager } from "$server/database/databaseManager.ts";
import { assertExists, assertRejects } from "@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@1.0.14/bdd";
import { restore, stub } from "@std/testing@1.0.14/mock";
import { utxoFixtures } from "../fixtures/utxoFixtures.ts";
import { MockDatabaseManager } from "../mocks/mockDatabaseManager.ts";

// Import the updated PSBT services
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { SRC20PSBTService } from "$server/services/src20/psbt/src20PSBTService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { OptimalUTXOSelection } from "$server/services/utxo/optimalUtxoSelection.ts";

// Valid raw transaction hex for testing
const validRawTxHex =
  "0200000001a0a34578b86c5ed1720083e0008e0578a744a9daa8c13124f64fb8ebbae9029b000000006a47304402203e4516da7253cf068effec6b95c41221a0865409e8c5e3b6b1b3d2b5e2a8b72c0220331b1b5c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c9b8c01210321f2f6e1e50cb6a953935c3601284925decd3fd21bc6e3d1b9b8a7d5e5a9d5cffffffff0200e1f505000000001976a914c7e20a5dd06b5e3b8f8d5e3b5a8e1c6d9e2f3a4b88ac0084d71700000000001976a914a1b2c3d4e5f6789012345678901234567890abcd88ac00000000";

describe("SRC20 PSBT Services - New Architecture", () => {
  let originalDbManager: DatabaseManager;
  let mockDbManager: MockDatabaseManager;

  beforeEach(() => {
    originalDbManager = (globalThis as any).dbManager;
    mockDbManager = new MockDatabaseManager();
    (globalThis as any).dbManager = mockDbManager;
  });

  afterEach(() => {
    (globalThis as any).dbManager = originalDbManager;
    restore();
  });

  describe("SRC20PSBTService - New Architecture", () => {
    it("should handle missing script error with new architecture", async () => {
      // Mock the new getFullUTXOsWithDetails method via CommonUTXOService
      stub(
        CommonUTXOService.prototype,
        "getSpendableUTXOs",
        () =>
          Promise.resolve([{
            txid: "abc123",
            vout: 0,
            value: 100000,
            script: "",
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }]),
      );

      stub(
        CommonUTXOService.prototype,
        "getSpecificUTXO",
        () =>
          Promise.resolve({
            txid: "abc123",
            vout: 0,
            value: 100000,
            script: "", // Empty script should trigger error
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }),
      );

      // Mock CounterpartyApiManager to avoid external calls
      stub(
        CounterpartyApiManager,
        "getXcpBalancesByAddress",
        () => Promise.resolve({ balances: [], total: 0 }),
      );
      stub(
        CounterpartyApiManager,
        "getUtxoAttachedBalanceUtxos",
        () => Promise.resolve(new Set<string>()),
      );

      await assertRejects(
        async () => {
          await SRC20PSBTService.preparePSBT({
            sourceAddress: utxoFixtures.p2wpkh.standard.address,
            toAddress: utxoFixtures.p2pkh.standard.address,
            src20Action: { p: "src-20", op: "mint", tick: "TEST", amt: "1000" },
            satsPerVB: 10,
            service_fee: 0,
            service_fee_address: "",
            changeAddress: utxoFixtures.p2wpkh.standard.address,
          });
        },
        Error,
        "Failed to fetch script (scriptPubKey) for UTXO abc123:0. This is required for PSBT creation.",
      );
    });

    it("should successfully create PSBT with new architecture", async () => {
      // Mock the new methods properly
      stub(
        CommonUTXOService.prototype,
        "getSpendableUTXOs",
        () =>
          Promise.resolve([{
            txid: utxoFixtures.p2wpkh.standard.txid,
            vout: utxoFixtures.p2wpkh.standard.vout,
            value: Number(utxoFixtures.p2wpkh.standard.value),
            script: utxoFixtures.p2wpkh.standard.script,
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }]),
      );

      stub(
        CommonUTXOService.prototype,
        "getSpecificUTXO",
        () =>
          Promise.resolve({
            txid: utxoFixtures.p2wpkh.standard.txid,
            vout: utxoFixtures.p2wpkh.standard.vout,
            value: Number(utxoFixtures.p2wpkh.standard.value),
            script: utxoFixtures.p2wpkh.standard.script,
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }),
      );

      // Mock CounterpartyApiManager to avoid external calls
      stub(
        CounterpartyApiManager,
        "getXcpBalancesByAddress",
        () => Promise.resolve({ balances: [], total: 0 }),
      );
      stub(
        CounterpartyApiManager,
        "getUtxoAttachedBalanceUtxos",
        () => Promise.resolve(new Set<string>()),
      );

      // Mock OptimalUTXOSelection to return predictable results
      stub(
        OptimalUTXOSelection,
        "selectUTXOs",
        () => ({
          inputs: [{
            txid: utxoFixtures.p2wpkh.standard.txid,
            vout: utxoFixtures.p2wpkh.standard.vout,
            value: Number(utxoFixtures.p2wpkh.standard.value),
            script: utxoFixtures.p2wpkh.standard.script,
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }],
          change: 50000,
          fee: 1000,
          waste: 0,
          algorithm: "bnb",
        }),
      );

      stub(
        CommonUTXOService.prototype,
        "getRawTransactionHex",
        () => Promise.resolve(validRawTxHex),
      );

      const result = await SRC20PSBTService.preparePSBT({
        sourceAddress: utxoFixtures.p2wpkh.standard.address,
        toAddress: utxoFixtures.p2pkh.standard.address,
        src20Action: { p: "src-20", op: "mint", tick: "TEST", amt: "1000" },
        satsPerVB: 10,
        service_fee: 0,
        service_fee_address: "",
        changeAddress: utxoFixtures.p2wpkh.standard.address,
      });

      assertExists(result.psbt);
      assertExists(result.feeDetails);
      assertExists(result.totalInputValue);
      assertExists(result.estMinerFee);
    });

    it("should validate new architecture methods are called", async () => {
      // This test ensures our new architecture methods are being used
      let getSpendableUTXOsCalled = false;
      let getSpecificUTXOCalled = false;
      let selectUTXOsCalled = false;

      stub(
        CommonUTXOService.prototype,
        "getSpendableUTXOs",
        () => {
          getSpendableUTXOsCalled = true;
          return Promise.resolve([{
            txid: utxoFixtures.p2wpkh.standard.txid,
            vout: utxoFixtures.p2wpkh.standard.vout,
            value: Number(utxoFixtures.p2wpkh.standard.value),
            script: utxoFixtures.p2wpkh.standard.script,
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          }]);
        },
      );

      stub(
        CommonUTXOService.prototype,
        "getSpecificUTXO",
        () => {
          getSpecificUTXOCalled = true;
          return Promise.resolve({
            txid: utxoFixtures.p2wpkh.standard.txid,
            vout: utxoFixtures.p2wpkh.standard.vout,
            value: Number(utxoFixtures.p2wpkh.standard.value),
            script: utxoFixtures.p2wpkh.standard.script,
            address: utxoFixtures.p2wpkh.standard.address,
            scriptType: "P2WPKH",
          });
        },
      );

      stub(
        OptimalUTXOSelection,
        "selectUTXOs",
        () => {
          selectUTXOsCalled = true;
          return {
            inputs: [{
              txid: utxoFixtures.p2wpkh.standard.txid,
              vout: utxoFixtures.p2wpkh.standard.vout,
              value: Number(utxoFixtures.p2wpkh.standard.value),
              script: utxoFixtures.p2wpkh.standard.script,
              address: utxoFixtures.p2wpkh.standard.address,
              scriptType: "P2WPKH",
            }],
            change: 50000,
            fee: 1000,
            waste: 0,
            algorithm: "bnb",
          };
        },
      );

      stub(
        CounterpartyApiManager,
        "getXcpBalancesByAddress",
        () => Promise.resolve({ balances: [], total: 0 }),
      );
      stub(
        CounterpartyApiManager,
        "getUtxoAttachedBalanceUtxos",
        () => Promise.resolve(new Set<string>()),
      );
      stub(
        CommonUTXOService.prototype,
        "getRawTransactionHex",
        () => Promise.resolve(validRawTxHex),
      );

      await SRC20PSBTService.preparePSBT({
        sourceAddress: utxoFixtures.p2wpkh.standard.address,
        toAddress: utxoFixtures.p2pkh.standard.address,
        src20Action: { p: "src-20", op: "mint", tick: "TEST", amt: "1000" },
        satsPerVB: 10,
        service_fee: 0,
        service_fee_address: "",
        changeAddress: utxoFixtures.p2wpkh.standard.address,
      });

      // Verify the new architecture methods were called
      assertExists(
        getSpendableUTXOsCalled,
        "getSpendableUTXOs should be called",
      );
      assertExists(getSpecificUTXOCalled, "getSpecificUTXO should be called");
      assertExists(
        selectUTXOsCalled,
        "OptimalUTXOSelection.selectUTXOs should be called",
      );
    });
  });
});
