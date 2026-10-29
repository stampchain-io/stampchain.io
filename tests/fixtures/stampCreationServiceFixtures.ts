/**
 * Stamp Creation Service Test Fixtures
 * Provides mock data and utilities for stamp creation testing
 */

import type { ScriptType, UTXO } from "$types/index.d.ts";

// Mock stamp creation parameters
export const mockStampParams = {
  basic: {
    sourceWallet: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    assetName: "TESTSTAMP",
    qty: "100",
    locked: true,
    divisible: false,
    filename: "test.png",
    file:
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEElEQVQ4jWNgYGBgGAWjgAEAAJQAAf//",
    satsPerVB: 25,
    service_fee: 42000,
    service_fee_address: "bc1qservicefeetest123456789abcdefghij0vlvk",
    prefix: "stamp" as const,
    isDryRun: false,
  },

  minimal: {
    sourceWallet: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    qty: "1",
    filename: "test.png",
    file:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWzrQTgAAAABJRU5ErkJggg==",
  },

  withServiceFee: {
    sourceWallet: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    assetName: "STAMPWITHFEE",
    qty: "50",
    filename: "test-with-fee.png",
    file:
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEElEQVQ4jWNgYGBgGAWjgAEAAJQAAf//",
    service_fee: 50000,
    service_fee_address: "bc1qservicefeetest123456789abcdefghij0vlvk",
    satsPerVB: 30,
  },

  largeFile: {
    sourceWallet: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    assetName: "LARGESTAMP",
    qty: "1",
    filename: "large-image.png",
    file:
      "iVBORw0KGgoAAAANSUhEUgAAAMAAAADAAMAAABlApw1AAAAB3RJTUUH1QEMFiUSN4UQhQAAAAlwSFlzAAALEgAACxIB0t1+/AAAAFVQTFRFAAAAAIDU/wAA1P8A/9QA///U1NTU/wAA1P8A/9QA///U1NTU",
    satsPerVB: 20,
  },
};

// Mock wallet addresses for validation testing
export const mockWalletAddresses = {
  valid: {
    p2wpkh: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    p2pkh: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    p2sh: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
  },
  invalid: {
    empty: "",
    malformed: "invalid-address-123",
    wrongNetwork: "tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // testnet
    tooShort: "bc1q",
    invalidChecksum: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wli", // invalid checksum
  },
};

// Mock UTXOs for testing
export const mockUTXOs: UTXO[] = [
  {
    txid: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
    vout: 0,
    value: 100000,
    confirmations: 10,
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    scriptPubKey: "0014c2b7a8b8f5d6e0a1b2c3d4e5f6789012345678",
    amount: 0.001,
  },
  {
    txid: "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
    vout: 1,
    value: 50000,
    confirmations: 5,
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    scriptPubKey: "0014c2b7a8b8f5d6e0a1b2c3d4e5f6789012345678",
    amount: 0.0005,
  },
  {
    txid: "c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2",
    vout: 2,
    value: 25000,
    confirmations: 3,
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh0vlvk",
    scriptPubKey: "0014c2b7a8b8f5d6e0a1b2c3d4e5f6789012345678",
    amount: 0.00025,
  },
];

// Mock counterparty API responses
export const mockCounterpartyResponses = {
  createIssuance: {
    tx_hex:
      "020000000001010000000000000000000000000000000000000000000000000000000000000000000000000000ffffffff0150c30000000000001976a914c2b7a8b8f5d6e0a1b2c3d4e5f678901234567890ac00000000",
    tx_hash:
      "abc123def456789012345678901234567890123456789012345678901234567890",
    btc_in: 100000,
    btc_out: 95000,
    btc_change: 95000,
    fee: 5000,
  },
  error: {
    code: -32000,
    message: "Insufficient funds",
    data: { details: "Not enough BTC to create issuance" },
  },
};

// Mock file data
export const mockFileData = {
  small: {
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWzrQTgAAAABJRU5ErkJggg==",
    hex:
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da636460f800028401805b3ad04e0000000049454e44ae426082",
    size: 95, // bytes
    filename: "1x1.png",
  },
  medium: {
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEElEQVQ4jWNgYGBgGAWjgAEAAJQAAf//",
    hex:
      "89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff61000000104944415478da636460601805a3802000900201ff",
    size: 70, // bytes
    filename: "16x16.png",
  },
  large: {
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAMAAAADAAMAAABlApw1AAAAB3RJTUUH1QEMFiUSN4UQhQAAAAlwSFlzAAALEgAACxIB0t1+/AAAAFVQTFRFAAAAAIDU/wAA1P8A/9QA///U1NTU/wAA1P8A/9QA///U1NTU",
    hex:
      "89504e470d0a1a0a0000000d49484452000000c0000000c008060000006505c935000000074944415478da636460601805a38020000900201ff0000000049454e44ae426082",
    size: 5000, // bytes (estimated for large file)
    filename: "large-192x192.png",
  },
};

// Mock PSBT generation results
export const mockPSBTResults = {
  successful: {
    psbt: {
      toHex: () => "70736274ff0100...", // Mock PSBT hex
    },
    estimatedTxSize: 250,
    totalInputValue: 100000,
    totalDustValue: 5000,
    estMinerFee: 6250, // 250 * 25 sats/vB
    totalChangeOutput: 36750, // 100000 - 5000 - 42000 - 6250
    totalOutputValue: 53250, // 5000 + 42000 + 6250
  },
  dryRun: {
    est_tx_size: 280,
    input_value: 120000,
    total_dust_value: 6600,
    est_miner_fee: 7000,
    change_value: 40400,
    total_output_value: 54000,
  },
};

// Mock CIP33 addresses
export const mockCIP33Addresses = [
  "bc1qcip33addr1",
  "bc1qcip33addr2",
  "bc1qcip33addr3",
];

// Validation test cases
export const validationTestCases = [
  {
    name: "Valid basic parameters",
    params: mockStampParams.basic,
    shouldPass: true,
  },
  {
    name: "Invalid source wallet",
    params: { ...mockStampParams.basic, sourceWallet: "invalid-wallet" },
    shouldPass: false,
    expectedError: "Invalid source wallet",
  },
  {
    name: "Invalid service fee address",
    params: {
      ...mockStampParams.basic,
      service_fee: 50000,
      service_fee_address: "invalid-fee-address",
    },
    shouldPass: false,
    expectedError: "Invalid service fee address",
  },
];

// Edge cases for testing
export const edgeCases = {
  emptyFile: {
    ...mockStampParams.basic,
    file: "",
    filename: "empty.txt",
  },
  zeroQuantity: {
    ...mockStampParams.basic,
    qty: "0",
  },
  veryHighFeeRate: {
    ...mockStampParams.basic,
    satsPerVB: 1000,
  },
  veryLowFeeRate: {
    ...mockStampParams.basic,
    satsPerVB: 1,
  },
  maxServiceFee: {
    ...mockStampParams.basic,
    service_fee: 1000000, // 1 million sats
  },
};

// Mock service dependencies
export const createMockServices = () => ({
  counterpartyApiManager: {
    createIssuance: async () => mockCounterpartyResponses.createIssuance,
  },
  commonUtxoService: {
    getOptimalUTXOs: async () => ({
      utxos: mockUTXOs,
      totalValue: mockUTXOs.reduce((sum, utxo) => sum + utxo.value, 0),
    }),
  },
  bitcoinUtxoManager: {
    selectOptimalUTXOs: async () => ({
      selectedUTXOs: mockUTXOs,
      totalInputValue: mockUTXOs.reduce((sum, utxo) => sum + utxo.value, 0),
    }),
  },
  fileToAddressUtils: {
    fileToAddresses: () => mockCIP33Addresses,
  },
});

// Performance test scenarios
export const performanceTestCases = [
  {
    name: "Small stamp creation",
    params: { ...mockStampParams.basic, file: mockFileData.small.base64 },
    maxExecutionTime: 100, // ms
  },
  {
    name: "Medium stamp creation",
    params: { ...mockStampParams.basic, file: mockFileData.medium.base64 },
    maxExecutionTime: 200, // ms
  },
  {
    name: "Large stamp creation",
    params: { ...mockStampParams.basic, file: mockFileData.large.base64 },
    maxExecutionTime: 500, // ms
  },
  {
    name: "Dry run execution",
    params: { ...mockStampParams.basic, isDryRun: true },
    maxExecutionTime: 50, // ms - should be faster
  },
];

// Helper functions
export function createMockLogger() {
  return {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
  };
}

export function validateStampResult(result: any, isDryRun: boolean = false) {
  const requiredFields = [
    "est_tx_size",
    "input_value",
    "total_dust_value",
    "est_miner_fee",
    "change_value",
    "total_output_value",
  ];

  if (!isDryRun) {
    requiredFields.push("hex");
  }

  const missingFields = requiredFields.filter((field) => !(field in result));
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // Validate field types
  if (typeof result.est_tx_size !== "number" || result.est_tx_size <= 0) {
    throw new Error("est_tx_size must be a positive number");
  }

  if (typeof result.input_value !== "number" || result.input_value < 0) {
    throw new Error("input_value must be a non-negative number");
  }

  if (
    !isDryRun && (typeof result.hex !== "string" || result.hex.length === 0)
  ) {
    throw new Error("hex must be a non-empty string for non-dry-run results");
  }

  return true;
}

export function createRealisticStampScenario(overrides: any = {}) {
  return {
    ...mockStampParams.basic,
    ...overrides,
  };
}

// Error simulation utilities
export const errorScenarios = {
  insufficientFunds: {
    params: mockStampParams.basic,
    mockError: new Error("Insufficient funds"),
  },
  networkError: {
    params: mockStampParams.basic,
    mockError: new Error("Network connection failed"),
  },
  invalidTransaction: {
    params: mockStampParams.basic,
    mockError: new Error(
      "Transaction creation failed: No transaction hex returned",
    ),
  },
};
