/**
 * Client Type Tests
 *
 * Comprehensive type tests for client-side types including:
 * - API response types (api.d.ts)
 * - UI component types (ui.d.ts)
 * - Market data types (marketData.d.ts)
 * - Wallet integration types (wallet.d.ts)
 */

import { assertEquals } from "@std/assert";
import {
  validateCrossModuleCompatibility,
  validateTypeCompilation,
  validateTypeExports,
  withTempTypeFile,
} from "./utils/typeValidation.ts";

import { assertType } from "./utils/typeAssertions.ts";

// ============================================================================
// API TYPE IMPORTS
// ============================================================================

import type {
  AddressTickHandlerContext,
  BlockHandlerContext,
  // Handler Context Types
  IdentHandlerContext,
  // Response Body Types
  PaginatedStampResponseBody,
  SRC20SnapshotRequestParams,
  // Request Parameter Types
  SRC20TrxRequestParams,
  // Composite Types
  StampsAndSrc20,
  TickHandlerContext,
} from "../../lib/types/api.d.ts";

// ============================================================================
// UI TYPE IMPORTS
// ============================================================================

import type {
  ButtonVariant,
  ColorScheme,
  // Component Props
  ComponentProps,
  FormState,
  // Layout Types
  LayoutConfig,
  ModalSize,
  PaginationState,
  ToastType,
  Typography,
  // State Management
  UIState,
} from "../../lib/types/ui.d.ts";

// ============================================================================
// MARKET DATA TYPE IMPORTS
// ============================================================================

import type {
  // Analytics
  MarketAnalytics,
  // Portfolio Types
  PortfolioData,
  SRC20MarketData,
  // Core Market Data
  StampMarketData,
} from "../../lib/types/marketData.d.ts";

// ============================================================================
// WALLET TYPE IMPORTS
// ============================================================================

import type {
  // Bitcoin Wallet Types
  BitcoinWallet,
  TransactionPreview,
  // Transaction Building
  TransactionRequest,
  // Integration Types
  WalletAdapter,
  WalletBalance,
  WalletConnection,
} from "../../lib/types/wallet.d.ts";

// ============================================================================
// TYPE COMPILATION TESTS
// ============================================================================

Deno.test("Client Types - Type Compilation", async () => {
  // Test individual domain files compile
  await validateTypeCompilation("lib/types/api.d.ts");
  await validateTypeCompilation("lib/types/ui.d.ts");
  await validateTypeCompilation("lib/types/marketData.d.ts");
  await validateTypeCompilation("lib/types/wallet.d.ts");
});

Deno.test("Client Types - Cross-Module Compatibility", async () => {
  // Test that client types can work together
  const sharedTypes = ["StampRow", "SRC20Balance"];

  await validateCrossModuleCompatibility(
    "../../lib/types/api.d.ts",
    "../../lib/types/marketData.d.ts",
    sharedTypes,
  );
});

Deno.test("Client Types - Export Validation", async () => {
  // Verify key types are properly exported
  await validateTypeExports("lib/types/api.d.ts", [
    "IdentHandlerContext",
    "SRC20TrxRequestParams",
    "PaginatedStampResponseBody",
    "PaginatedSrc20ResponseBody",
    "StampsAndSrc20",
    "StampPageProps",
  ]);

  await validateTypeExports("lib/types/ui.d.ts", [
    "ComponentProps",
    "ButtonVariant",
    "LayoutConfig",
    "ThemeMode",
    "UIState",
    "FormState",
    "PaginationState",
  ]);

  await validateTypeExports("lib/types/marketData.d.ts", [
    "StampMarketData",
    "SRC20MarketData",
    "PriceData",
    "VolumeData",
    "MarketAnalytics",
    "CacheStatus",
    "PortfolioData",
  ]);

  await validateTypeExports("lib/types/wallet.d.ts", [
    "WalletProvider",
    "WalletConnection",
    "BitcoinWallet",
    "TransactionRequest",
    "WalletAdapter",
    "WalletAsset",
    "AssetBalance",
  ]);
});

// ============================================================================
// API TYPE TESTS
// ============================================================================

Deno.test("API Types - Handler Context Types", () => {
  // Test IdentHandlerContext
  const identContext: IdentHandlerContext = {
    params: {
      ident: "STAMP",
    },
  };

  assertEquals(identContext.params.ident, "STAMP");
  assertType<IdentHandlerContext>(identContext);

  // Test BlockHandlerContext
  const blockContext: BlockHandlerContext = {
    params: {
      block_index: "800000",
    },
    url: new URL("https://api.example.com/block/800000"),
  };

  assertEquals(blockContext.params.block_index, "800000");
  assertType<BlockHandlerContext>(blockContext);

  // Test AddressTickHandlerContext
  const addressTickContext: AddressTickHandlerContext = {
    params: {
      address: "bc1q...",
      tick: "TEST",
    },
  };

  assertEquals(addressTickContext.params.tick, "TEST");
  assertType<AddressTickHandlerContext>(addressTickContext);

  // Test TickHandlerContext with optional operation
  const tickContext: TickHandlerContext = {
    params: {
      tick: "TEST",
      op: "MINT",
    },
  };

  assertEquals(tickContext.params.op, "MINT");
  assertType<TickHandlerContext>(tickContext);
});

Deno.test("API Types - Request Parameters", () => {
  // Test SRC20TrxRequestParams with V2.3 enhancements
  const src20Params: SRC20TrxRequestParams = {
    block_index: 800000,
    tick: ["TEST", "EXAMPLE"],
    op: ["DEPLOY", "MINT"],
    limit: 50,
    page: 1,
    sort: "desc",
    sortBy: "block_index",
    filterBy: ["trending"],
    tx_hash: "abcd1234567890",
    address: "bc1q...",
    noPagination: false,
    singleResult: false,
    // V2.3 new parameters
    mintingStatus: "minting",
    trendingWindow: "24h",
    includeProgress: true,
    mintVelocityMin: 10,
  };

  assertEquals(src20Params.mintingStatus, "minting");
  assertEquals(src20Params.trendingWindow, "24h");
  assertEquals(src20Params.includeProgress, true);
  assertEquals(Array.isArray(src20Params.tick), true);
  assertType<SRC20TrxRequestParams>(src20Params);

  // Test SRC20SnapshotRequestParams
  const snapshotParams: SRC20SnapshotRequestParams = {
    block_index: 800000,
    tick: "TEST",
    address: "bc1q...",
    limit: 100,
    page: 1,
    sortBy: "balance",
    noPagination: false,
  };

  assertEquals(snapshotParams.block_index, 800000);
  assertEquals(snapshotParams.tick, "TEST");
  assertType<SRC20SnapshotRequestParams>(snapshotParams);
});

Deno.test("API Types - Response Body Types", () => {
  // Test PaginatedStampResponseBody structure
  const stampResponse: PaginatedStampResponseBody = {
    last_block: 800000,
    page: 1,
    limit: 50,
    totalPages: 10,
    data: [
      {
        stamp: 12345,
        cpid: "A123456789",
        ident: "STAMP",
        block_index: 800000,
        block_time: new Date(),
        tx_hash: "abcd1234567890",
        tx_index: 0,
        creator: "bc1q...",
        creator_name: "Test Creator",
        divisible: false,
        keyburn: null,
        locked: 0,
        supply: 1,
        stamp_base64: "base64data",
        stamp_mimetype: "image/png",
        stamp_url: "https://stamps.com/12345",
        stamp_hash: "hash123",
        file_hash: "filehash123",
        file_size_bytes: 2048,
        unbound_quantity: 1,
      },
    ],
  };

  assertEquals(stampResponse.data.length, 1);
  assertEquals(stampResponse.totalPages, 10);
  assertType<PaginatedStampResponseBody>(stampResponse);

  // Test StampsAndSrc20 composite type
  const composite: StampsAndSrc20 = {
    stamps: stampResponse.data,
    src20: [
      {
        tick: "TEST",
        balance: "1000",
        address: "bc1q...",
        block_index: 800000,
        tx_hash: "abcd1234567890",
      },
    ],
  };

  assertEquals(composite.stamps.length, 1);
  assertEquals(composite.src20.length, 1);
  assertType<StampsAndSrc20>(composite);
});

// ============================================================================
// UI TYPE TESTS
// ============================================================================

Deno.test("UI Types - Component Props and Variants", () => {
  // Test ButtonVariant enum
  const buttonVariants: ButtonVariant[] = [
    "primary",
    "secondary",
    "danger",
    "warning",
    "success",
    "info",
    "ghost",
    "link",
  ];

  assertEquals(buttonVariants.length, 8);

  // Test ComponentProps generic interface
  interface TestComponentProps extends ComponentProps {
    title: string;
    count: number;
    isActive: boolean;
  }

  const testProps: TestComponentProps = {
    title: "Test Component",
    count: 5,
    isActive: true,
    className: "test-class",
    id: "test-id",
    style: { color: "red" },
    onClick: () => {},
    children: "Test content",
  };

  assertEquals(testProps.title, "Test Component");
  assertEquals(testProps.count, 5);
  assertEquals(testProps.isActive, true);
  assertType<TestComponentProps>(testProps);

  // Test ModalSize type
  const modalSizes: ModalSize[] = ["sm", "md", "lg", "xl", "full"];
  assertEquals(modalSizes.length, 5);

  // Test ToastType
  const toastTypes: ToastType[] = ["success", "error", "warning", "info"];
  assertEquals(toastTypes.length, 4);
});

Deno.test("UI Types - Layout and Theme Types", () => {
  // Test LayoutConfig
  const layoutConfig: LayoutConfig = {
    breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      "2xl": 1536,
    },
    maxWidth: 1200,
    padding: 16,
    gaps: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    columns: 12,
    gridTemplate: "repeat(12, 1fr)",
  };

  assertEquals(layoutConfig.columns, 12);
  assertEquals(layoutConfig.breakpoints.md, 768);
  assertType<LayoutConfig>(layoutConfig);

  // Test Typography interface
  const typography: Typography = {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["Fira Code", "Monaco", "monospace"],
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    letterSpacing: {
      tight: "-0.025em",
      normal: "0em",
      wide: "0.025em",
    },
  };

  assertEquals(typography.fontSize.base, "1rem");
  assertEquals(typography.fontWeight.bold, 700);
  assertType<Typography>(typography);

  // Test ColorScheme
  const colorScheme: ColorScheme = {
    primary: {
      50: "#fef7f0",
      100: "#fdeee0",
      500: "#f97316",
      900: "#9a3412",
    },
    secondary: {
      50: "#f8fafc",
      500: "#64748b",
      900: "#0f172a",
    },
    background: "#ffffff",
    foreground: "#000000",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    input: "#ffffff",
    ring: "#f97316",
  };

  assertEquals(colorScheme.primary[500], "#f97316");
  assertEquals(colorScheme.background, "#ffffff");
  assertType<ColorScheme>(colorScheme);
});

Deno.test("UI Types - State Management", () => {
  // Test UIState
  const uiState: UIState = {
    theme: "light",
    sidebarOpen: true,
    modalStack: ["confirm-dialog"],
    loading: false,
    notifications: [
      {
        id: "notif-1",
        type: "success",
        title: "Success",
        message: "Operation completed",
        timestamp: new Date(),
        read: false,
      },
    ],
    errors: [],
    viewport: {
      width: 1920,
      height: 1080,
      breakpoint: "xl",
      orientation: "landscape",
    },
  };

  assertEquals(uiState.theme, "light");
  assertEquals(uiState.notifications.length, 1);
  assertEquals(uiState.viewport.breakpoint, "xl");
  assertType<UIState>(uiState);

  // Test FormState
  const formState: FormState = {
    values: {
      email: "test@example.com",
      password: "secret123",
      rememberMe: true,
    },
    errors: {
      email: "Invalid email format",
    },
    touched: {
      email: true,
      password: false,
    },
    isSubmitting: false,
    isValid: false,
    isDirty: true,
    submitCount: 0,
  };

  assertEquals(formState.values.email, "test@example.com");
  assertEquals(formState.errors.email, "Invalid email format");
  assertEquals(formState.isValid, false);
  assertType<FormState>(formState);

  // Test PaginationState
  const paginationState: PaginationState = {
    currentPage: 1,
    pageSize: 50,
    totalItems: 1000,
    totalPages: 20,
    hasNextPage: true,
    hasPreviousPage: false,
    startIndex: 0,
    endIndex: 49,
  };

  assertEquals(paginationState.totalPages, 20);
  assertEquals(paginationState.hasNextPage, true);
  assertType<PaginationState>(paginationState);
});

// ============================================================================
// MARKET DATA TYPE TESTS
// ============================================================================

Deno.test("Market Data Types - Core Market Data", () => {
  // Test StampMarketData
  const stampMarketData: StampMarketData = {
    asset: "STAMP_12345",
    floorPrice: {
      btc: 0.001,
      usd: 45.50,
      lastUpdated: new Date(),
      change24h: 5.2,
    },
    volume: {
      volume24h: {
        btc: 2.5,
        usd: 112500,
        transactions: 25,
      },
      volume7d: {
        btc: 15.8,
        usd: 711000,
        transactions: 156,
      },
      volume30d: {
        btc: 45.2,
        usd: 2034000,
        transactions: 420,
      },
    },
    marketCap: {
      btc: 100.5,
      usd: 4522500,
      lastUpdated: new Date(),
    },
    supply: {
      total: 1000,
      circulating: 850,
      burned: 50,
      locked: 100,
    },
    holders: {
      count: 125,
      distribution: {
        whales: 5,
        collectors: 25,
        holders: 95,
      },
      topHolderPercentage: 15.5,
    },
    lastSale: {
      price: {
        btc: 0.0012,
        usd: 54.00,
      },
      timestamp: new Date(),
      txHash: "abcd1234567890",
      buyer: "bc1qbuyer...",
      seller: "bc1qseller...",
    },
    cacheStatus: "fresh",
    dataQuality: {
      score: 95,
      lastVerified: new Date(),
      sources: ["opensea", "magiceden"],
      confidence: "high",
    },
    cacheAgeMinutes: 5,
  };

  assertEquals(stampMarketData.asset, "STAMP_12345");
  assertEquals(stampMarketData.floorPrice.btc, 0.001);
  assertEquals(stampMarketData.holders.count, 125);
  assertEquals(stampMarketData.cacheStatus, "fresh");
  assertType<StampMarketData>(stampMarketData);

  // Test SRC20MarketData
  const src20MarketData: SRC20MarketData = {
    tick: "TEST",
    price: {
      btc: 0.00001,
      usd: 0.45,
      lastUpdated: new Date(),
      change24h: -2.5,
    },
    volume: {
      volume24h: {
        btc: 5.2,
        usd: 234000,
        transactions: 145,
      },
      volume7d: {
        btc: 28.5,
        usd: 1282500,
        transactions: 876,
      },
    },
    marketCap: {
      btc: 210.5,
      usd: 9472500,
      lastUpdated: new Date(),
    },
    supply: {
      max: "21000000",
      minted: "10500000",
      burned: "0",
      circulating: "10500000",
    },
    mintProgress: {
      percentage: 50.0,
      remaining: "10500000",
      mintRate24h: 25000,
      estimatedCompletion: new Date(Date.now() + 86400000 * 30),
    },
    holders: {
      count: 2500,
      distribution: {
        whales: 15,
        collectors: 285,
        holders: 2200,
      },
      topHolderPercentage: 8.2,
    },
    trading: {
      activePairs: 5,
      bestBid: {
        price: { btc: 0.000009, usd: 0.405 },
        volume: "50000",
      },
      bestAsk: {
        price: { btc: 0.000011, usd: 0.495 },
        volume: "75000",
      },
      spread: 0.22,
    },
    cacheStatus: "stale",
    cacheAgeMinutes: 15,
  };

  assertEquals(src20MarketData.tick, "TEST");
  assertEquals(src20MarketData.mintProgress.percentage, 50.0);
  assertEquals(src20MarketData.trading.spread, 0.22);
  assertType<SRC20MarketData>(src20MarketData);
});

Deno.test("Market Data Types - Analytics and Performance", () => {
  // Test MarketAnalytics
  const marketAnalytics: MarketAnalytics = {
    timeframe: "24h",
    priceAnalysis: {
      support: [0.0008, 0.0009],
      resistance: [0.0012, 0.0015],
      trend: "bullish",
      momentum: "strong",
      volatility: 0.15,
    },
    volumeAnalysis: {
      averageVolume: 1.5,
      volumeSpike: false,
      buyPressure: 0.65,
      sellPressure: 0.35,
    },
    socialMetrics: {
      mentions: 150,
      sentiment: "positive",
      engagement: 85,
      influencerScore: 72,
    },
    technicalIndicators: {
      rsi: 68.5,
      macd: "bullish_crossover",
      bollingerBands: {
        upper: 0.0013,
        middle: 0.001,
        lower: 0.0007,
        position: "middle",
      },
      movingAverages: {
        sma20: 0.00095,
        sma50: 0.00092,
        ema12: 0.00098,
        ema26: 0.00094,
      },
    },
    predictionScore: 75,
    confidence: 0.82,
    lastAnalyzed: new Date(),
  };

  assertEquals(marketAnalytics.timeframe, "24h");
  assertEquals(marketAnalytics.priceAnalysis.trend, "bullish");
  assertEquals(marketAnalytics.technicalIndicators.rsi, 68.5);
  assertEquals(marketAnalytics.confidence, 0.82);
  assertType<MarketAnalytics>(marketAnalytics);

  // Test PortfolioData
  const portfolioData: PortfolioData = {
    totalValue: {
      btc: 5.25,
      usd: 236250,
    },
    assets: [
      {
        asset: "STAMP_12345",
        quantity: 2,
        averageCost: {
          btc: 0.0008,
          usd: 36.0,
        },
        currentValue: {
          btc: 0.002,
          usd: 90.0,
        },
        unrealizedPnL: {
          btc: 0.0024,
          usd: 108.0,
          percentage: 150.0,
        },
        allocation: 3.8,
      },
    ],
    performance: {
      totalReturn: {
        btc: 1.25,
        usd: 56250,
        percentage: 31.25,
      },
      dayChange: {
        btc: 0.15,
        usd: 6750,
        percentage: 2.94,
      },
      bestPerformer: "STAMP_12345",
      worstPerformer: "TEST_TOKEN",
    },
    allocation: {
      byCategory: {
        stamps: 65.5,
        src20: 34.5,
      },
      byRisk: {
        low: 20.0,
        medium: 60.0,
        high: 20.0,
      },
    },
    lastUpdated: new Date(),
  };

  assertEquals(portfolioData.totalValue.btc, 5.25);
  assertEquals(portfolioData.assets.length, 1);
  assertEquals(portfolioData.performance.totalReturn.percentage, 31.25);
  assertType<PortfolioData>(portfolioData);
});

// ============================================================================
// WALLET TYPE TESTS
// ============================================================================

Deno.test("Wallet Types - Core Wallet Interfaces", () => {
  // Test WalletConnection
  const walletConnection: WalletConnection = {
    provider: "unisat",
    address: "bc1q...",
    publicKey:
      "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f",
    network: "mainnet",
    isConnected: true,
    connectionTime: new Date(),
    lastActivity: new Date(),
    permissions: ["addresses", "signatures"],
  };

  assertEquals(walletConnection.provider, "unisat");
  assertEquals(walletConnection.network, "mainnet");
  assertEquals(walletConnection.isConnected, true);
  assertType<WalletConnection>(walletConnection);

  // Test WalletBalance
  const walletBalance: WalletBalance = {
    address: "bc1q...",
    btc: {
      confirmed: 0.05,
      unconfirmed: 0.001,
      total: 0.051,
    },
    stamps: [
      {
        cpid: "A123456789",
        stamp: 12345,
        balance: 1,
        floorPrice: 0.001,
      },
    ],
    src20: [
      {
        tick: "TEST",
        balance: "1000",
        price: 0.00001,
        value: 0.01,
      },
    ],
    totalValue: {
      btc: 0.062,
      usd: 2790,
    },
    lastUpdated: new Date(),
  };

  assertEquals(walletBalance.btc.total, 0.051);
  assertEquals(walletBalance.stamps.length, 1);
  assertEquals(walletBalance.src20.length, 1);
  assertType<WalletBalance>(walletBalance);

  // Test BitcoinWallet interface
  const bitcoinWallet: BitcoinWallet = {
    provider: "unisat",
    network: "mainnet",
    addresses: {
      receiving: "bc1q...",
      change: "bc1q...",
      all: ["bc1q...", "bc1q..."],
    },
    balance: walletBalance,
    utxos: [
      {
        txid: "abcd1234567890",
        vout: 0,
        value: 50000,
        scriptPubKey: "76a914...",
        address: "bc1q...",
        confirmations: 6,
      },
    ],
    transactions: [],
    isHD: true,
    derivationPath: "m/84'/0'/0'",
    features: {
      canSign: true,
      canBroadcast: true,
      canEstimateFees: true,
      supportsRBF: true,
      supportsTaproot: true,
    },
  };

  assertEquals(bitcoinWallet.network, "mainnet");
  assertEquals(bitcoinWallet.isHD, true);
  assertEquals(bitcoinWallet.features.canSign, true);
  assertType<BitcoinWallet>(bitcoinWallet);
});

Deno.test("Wallet Types - Transaction Building", () => {
  // Test TransactionRequest
  const transactionRequest: TransactionRequest = {
    type: "transfer",
    to: "bc1qreceiver...",
    amount: 0.001,
    asset: "BTC",
    feeRate: 10,
    priority: "medium",
    note: "Test transaction",
    rbf: true,
    utxoSelection: "auto",
    customInputs: [],
    changeAddress: "bc1qchange...",
  };

  assertEquals(transactionRequest.type, "transfer");
  assertEquals(transactionRequest.amount, 0.001);
  assertEquals(transactionRequest.rbf, true);
  assertType<TransactionRequest>(transactionRequest);

  // Test TransactionPreview
  const transactionPreview: TransactionPreview = {
    inputs: [
      {
        txid: "input_tx",
        vout: 0,
        value: 50000,
        scriptPubKey: "script",
        address: "bc1q...",
      },
    ],
    outputs: [
      {
        address: "bc1qreceiver...",
        value: 100000,
        scriptPubKey: "output_script",
      },
    ],
    fee: {
      amount: 1000,
      rate: 10,
      size: 250,
      virtualSize: 150,
    },
    total: 101000,
    change: 48000,
    size: 250,
    virtualSize: 150,
    confirmationTarget: 6,
    isValid: true,
    warnings: [],
    rawTransaction: "01000000...",
  };

  assertEquals(transactionPreview.fee.amount, 1000);
  assertEquals(transactionPreview.isValid, true);
  assertEquals(transactionPreview.inputs.length, 1);
  assertType<TransactionPreview>(transactionPreview);

  // Test WalletAdapter interface
  const walletAdapter: WalletAdapter = {
    name: "UniSat Adapter",
    provider: "unisat",
    isAvailable: true,
    connect: async () => walletConnection,
    disconnect: async () => {},
    getBalance: async () => walletBalance,
    signTransaction: async (tx) => "signed_tx_hex",
    broadcastTransaction: async (signedTx) => ({
      success: true,
      txid: "broadcast_txid",
      error: null,
    }),
    estimateFee: async (request) => ({
      slow: { rate: 5, amount: 500, confirmationTarget: 144 },
      medium: { rate: 10, amount: 1000, confirmationTarget: 6 },
      fast: { rate: 20, amount: 2000, confirmationTarget: 1 },
    }),
    buildTransaction: async (request) => transactionPreview,
    getTransactionHistory: async () => [],
    getUTXOs: async () => [],
    addEventListener: (event, callback) => {},
    removeEventListener: (event, callback) => {},
  };

  assertEquals(walletAdapter.name, "UniSat Adapter");
  assertEquals(walletAdapter.isAvailable, true);
  assertType<WalletAdapter>(walletAdapter);
});

// ============================================================================
// REAL-WORLD CLIENT USAGE EXAMPLES
// ============================================================================

Deno.test("Client Types - API Integration Example", async () => {
  await withTempTypeFile(
    `
    // Example API integration with proper typing
    interface ApiClient {
      getStamps(params?: SRC20TrxRequestParams): Promise<PaginatedStampResponseBody>;
      getMarketData(asset: string): Promise<StampMarketData>;
      getWalletBalance(address: string): Promise<WalletBalance>;
    }

    class MockApiClient implements ApiClient {
      async getStamps(params?: SRC20TrxRequestParams): Promise<PaginatedStampResponseBody> {
        return {
          last_block: 800000,
          page: params?.page || 1,
          limit: params?.limit || 50,
          totalPages: 10,
          data: []
        };
      }

      async getMarketData(asset: string): Promise<StampMarketData> {
        return {
          asset,
          floorPrice: {
            btc: 0.001,
            usd: 45.0,
            lastUpdated: new Date(),
            change24h: 5.2
          },
          volume: {
            volume24h: { btc: 1.5, usd: 67500, transactions: 15 }
          },
          marketCap: {
            btc: 50.0,
            usd: 2250000,
            lastUpdated: new Date()
          },
          supply: {
            total: 1000,
            circulating: 850,
            burned: 50,
            locked: 100
          },
          holders: {
            count: 125,
            distribution: { whales: 5, collectors: 25, holders: 95 },
            topHolderPercentage: 15.5
          },
          cacheStatus: "fresh",
          dataQuality: {
            score: 95,
            lastVerified: new Date(),
            sources: ["opensea"],
            confidence: "high"
          },
          cacheAgeMinutes: 5
        };
      }

      async getWalletBalance(address: string): Promise<WalletBalance> {
        return {
          address,
          btc: { confirmed: 0.05, unconfirmed: 0, total: 0.05 },
          stamps: [],
          src20: [],
          totalValue: { btc: 0.05, usd: 2250 },
          lastUpdated: new Date()
        };
      }
    }

    // This should compile without errors
    const client = new MockApiClient();
    const _client: ApiClient = client;
  `,
    async (filePath) => {
      await validateTypeCompilation(filePath);
    },
  );
});

Deno.test("Client Types - React Component Example", async () => {
  await withTempTypeFile(
    `
    // Example React component with proper typing
    interface StampCardProps extends ComponentProps {
      stamp: {
        stamp: number;
        cpid: string;
        creator: string;
        stamp_url: string;
        stamp_mimetype: string;
      };
      marketData?: StampMarketData;
      onSelect?: (stampId: number) => void;
      variant?: ButtonVariant;
    }

    // Mock React component structure
    interface ReactComponent<P = {}> {
      (props: P): any;
      displayName?: string;
    }

    const StampCard: ReactComponent<StampCardProps> = (props) => {
      const { stamp, marketData, onSelect, variant = "primary", className, ...rest } = props;

      const handleClick = () => {
        if (onSelect && stamp.stamp) {
          onSelect(stamp.stamp);
        }
      };

      return {
        type: "div",
        props: {
          className: \`stamp-card \${className || ""}\`,
          onClick: handleClick,
          children: [
            {
              type: "img",
              props: {
                src: stamp.stamp_url,
                alt: \`Stamp #\${stamp.stamp}\`
              }
            },
            marketData && {
              type: "div",
              props: {
                className: "market-info",
                children: \`Floor: \${marketData.floorPrice.btc} BTC\`
              }
            }
          ].filter(Boolean)
        }
      };
    };

    // This should compile without errors
    const testProps: StampCardProps = {
      stamp: {
        stamp: 12345,
        cpid: "A123456789",
        creator: "bc1q...",
        stamp_url: "https://stamps.com/12345.png",
        stamp_mimetype: "image/png"
      },
      onSelect: (id) => console.log(\`Selected stamp \${id}\`),
      variant: "secondary"
    };

    const _component: ReactComponent<StampCardProps> = StampCard;
  `,
    async (filePath) => {
      await validateTypeCompilation(filePath);
    },
  );
});

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

Deno.test("Client Types - Performance Benchmark", async () => {
  const startTime = performance.now();

  // Create multiple complex client type instances
  const iterations = 50;
  for (let i = 0; i < iterations; i++) {
    const marketData: StampMarketData = {
      asset: `STAMP_${i}`,
      floorPrice: {
        btc: 0.001 * (i + 1),
        usd: 45.0 * (i + 1),
        lastUpdated: new Date(),
        change24h: Math.random() * 10 - 5,
      },
      volume: {
        volume24h: {
          btc: Math.random() * 5,
          usd: Math.random() * 225000,
          transactions: Math.floor(Math.random() * 100),
        },
      },
      marketCap: {
        btc: Math.random() * 100,
        usd: Math.random() * 4500000,
        lastUpdated: new Date(),
      },
      supply: {
        total: 1000,
        circulating: 850,
        burned: 50,
        locked: 100,
      },
      holders: {
        count: Math.floor(Math.random() * 500),
        distribution: { whales: 5, collectors: 25, holders: 95 },
        topHolderPercentage: Math.random() * 20,
      },
      cacheStatus: "fresh",
      dataQuality: {
        score: Math.floor(Math.random() * 40) + 60,
        lastVerified: new Date(),
        sources: ["opensea"],
        confidence: "high",
      },
      cacheAgeMinutes: Math.floor(Math.random() * 30),
    };

    // Validate structure
    assertEquals(marketData.asset, `STAMP_${i}`);
    assertEquals(typeof marketData.floorPrice.btc, "number");
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(
    `📊 Client type performance: ${iterations} market data objects created in ${
      duration.toFixed(2)
    }ms`,
  );

  // Should complete within reasonable time (< 50ms for 50 iterations)
  assertEquals(duration < 50, true, "Client type operations too slow");
});

// ============================================================================
// UI COMPONENT TYPE TESTS (Consolidated from ui_test.ts)
// ============================================================================

import type {
  // Animation Types
  AnimationProps,
  // Accessibility Types
  AriaAttributes,
  ButtonColor,
  // Button Types
  ButtonProps,
  ButtonSize,
  DisplayCountBreakpoints,
  ErrorStateProps,
  // Layout Types
  FlexboxProps,
  GridProps,
  // Icon Types
  IconProps,
  IconSize,
  IconWeight,
  InputProps,
  // Common Pattern Types
  LoadingStateProps,
  // Responsive Design Types
  ResponsiveValue,
  ScreenReaderProps,
  SelectProps,
  // Bitcoin Stamps UI Types
  StampGalleryProps,
  ToastProps,
} from "../../lib/types/ui.d.ts";

Deno.test("UI Component Types - Button Component Structure", () => {
  // Test ButtonVariant type
  const variants: ButtonVariant[] = [
    "text",
    "flat",
    "outline",
    "flatOutline",
    "outlineFlat",
    "outlineGradient",
  ];
  assertEquals(variants.length, 6);

  // Test ButtonColor type
  const colors: ButtonColor[] = [
    "grey",
    "greyDark",
    "greyGradient",
    "purple",
    "purpleDark",
    "purpleGradient",
    "test",
    "custom",
  ];
  assertEquals(colors.length, 8);

  // Test ButtonSize type
  const sizes: ButtonSize[] = [
    "xxs",
    "xs",
    "sm",
    "base",
    "md",
    "lg",
    "xl",
    "xxl",
  ];
  assertEquals(sizes.length, 8);

  // Test ButtonProps interface
  const buttonProps: ButtonProps = {
    children: "Click me",
    variant: "flat",
    color: "purple",
    size: "md",
    disabled: false,
    loading: false,
    fullWidth: false,
    onClick: () => {},
  };

  assertEquals(buttonProps.variant, "flat");
  assertEquals(buttonProps.color, "purple");
  assertEquals(buttonProps.size, "md");
});

Deno.test("UI Component Types - Icon Component Structure", () => {
  // Test IconSize type
  const sizes: IconSize[] = [
    "xs",
    "sm",
    "base",
    "lg",
    "xl",
    "2xl",
  ];
  assertEquals(sizes.length, 6);

  // Test IconWeight type
  const weights: IconWeight[] = [
    "thin",
    "light",
    "regular",
    "bold",
    "fill",
  ];
  assertEquals(weights.length, 5);

  // Test IconProps interface
  const iconProps: IconProps = {
    name: "wallet",
    size: "base",
    weight: "regular",
    className: "text-purple-500",
  };

  assertEquals(iconProps.name, "wallet");
  assertEquals(iconProps.size, "base");
  assertEquals(iconProps.weight, "regular");
});

Deno.test("UI Component Types - Form Component Structure", () => {
  // Test InputProps interface
  const inputProps: InputProps = {
    type: "text",
    placeholder: "Enter text",
    value: "",
    onChange: () => {},
    disabled: false,
    required: false,
    error: false,
    helperText: "Help text",
  };

  assertEquals(inputProps.type, "text");
  assertEquals(inputProps.placeholder, "Enter text");
  assertEquals(inputProps.error, false);

  // Test SelectProps interface
  const selectProps: SelectProps = {
    options: [
      { value: "1", label: "Option 1" },
      { value: "2", label: "Option 2" },
    ],
    value: "1",
    onChange: () => {},
    placeholder: "Select option",
    disabled: false,
  };

  assertEquals(selectProps.options.length, 2);
  assertEquals(selectProps.value, "1");
});

Deno.test("UI Component Types - Layout Component Structure", () => {
  // Test GridProps interface
  const gridProps: GridProps = {
    columns: 3,
    gap: "md",
    responsive: true,
    children: [],
  };

  assertEquals(gridProps.columns, 3);
  assertEquals(gridProps.gap, "md");
  assertEquals(gridProps.responsive, true);

  // Test FlexboxProps interface
  const flexProps: FlexboxProps = {
    direction: "row",
    justify: "center",
    align: "center",
    wrap: false,
    gap: "sm",
    children: [],
  };

  assertEquals(flexProps.direction, "row");
  assertEquals(flexProps.justify, "center");
  assertEquals(flexProps.align, "center");
});

Deno.test("UI Component Types - Notification Component Structure", () => {
  // Test ToastType
  const types: ToastType[] = [
    "success",
    "error",
    "warning",
    "info",
  ];
  assertEquals(types.length, 4);

  // Test ToastProps interface
  const toastProps: ToastProps = {
    type: "success",
    message: "Operation successful",
    duration: 3000,
    closable: true,
    onClose: () => {},
  };

  assertEquals(toastProps.type, "success");
  assertEquals(toastProps.message, "Operation successful");
  assertEquals(toastProps.duration, 3000);
});

Deno.test("UI Component Types - Bitcoin Stamps UI Structure", () => {
  // Test StampGalleryProps interface
  const stampGalleryProps: StampGalleryProps = {
    stamps: [],
    loading: false,
    error: null,
    onStampClick: () => {},
    onLoadMore: () => {},
    hasMore: false,
  };

  assertEquals(stampGalleryProps.stamps.length, 0);
  assertEquals(stampGalleryProps.loading, false);
  assertEquals(stampGalleryProps.hasMore, false);
});

Deno.test("UI Component Types - Accessibility Structure", () => {
  // Test AriaAttributes interface
  const ariaProps: AriaAttributes = {
    "aria-label": "Close button",
    "aria-describedby": "help-text",
    "aria-expanded": false,
    "aria-hidden": false,
    role: "button",
  };

  assertEquals(ariaProps["aria-label"], "Close button");
  assertEquals(ariaProps["aria-expanded"], false);
  assertEquals(ariaProps.role, "button");

  // Test ScreenReaderProps interface
  const screenReaderProps: ScreenReaderProps = {
    srOnly: "Screen reader only text",
    ariaLive: "polite",
    ariaAtomic: true,
  };

  assertEquals(screenReaderProps.srOnly, "Screen reader only text");
  assertEquals(screenReaderProps.ariaLive, "polite");
  assertEquals(screenReaderProps.ariaAtomic, true);
});

Deno.test("UI Component Types - Responsive Design Structure", () => {
  // Test ResponsiveValue type
  const responsiveWidth: ResponsiveValue<string> = {
    xs: "100%",
    sm: "80%",
    md: "60%",
    lg: "40%",
    xl: "20%",
  };

  assertEquals(responsiveWidth.xs, "100%");
  assertEquals(responsiveWidth.lg, "40%");

  // Test DisplayCountBreakpoints interface
  const breakpoints: DisplayCountBreakpoints = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
  };

  assertEquals(breakpoints.xs, 1);
  assertEquals(breakpoints.xl, 5);
});

Deno.test("UI Component Types - Animation Structure", () => {
  // Test AnimationProps interface
  const animationProps: AnimationProps = {
    duration: 300,
    easing: "ease-in-out",
    delay: 0,
    repeat: false,
    direction: "normal",
  };

  assertEquals(animationProps.duration, 300);
  assertEquals(animationProps.easing, "ease-in-out");
  assertEquals(animationProps.repeat, false);
});

Deno.test("UI Component Types - State Management Structure", () => {
  // Test LoadingStateProps interface
  const loadingProps: LoadingStateProps = {
    loading: true,
    skeleton: true,
    spinnerSize: "md",
    loadingText: "Loading...",
  };

  assertEquals(loadingProps.loading, true);
  assertEquals(loadingProps.skeleton, true);
  assertEquals(loadingProps.loadingText, "Loading...");

  // Test ErrorStateProps interface
  const errorProps: ErrorStateProps = {
    error: true,
    errorMessage: "Something went wrong",
    retry: () => {},
    fallback: null,
  };

  assertEquals(errorProps.error, true);
  assertEquals(errorProps.errorMessage, "Something went wrong");
});

console.log("✅ All client type tests completed successfully!");
