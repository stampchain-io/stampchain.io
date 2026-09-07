import type {
  AddressFormat,
  SignatureType,
  WalletProviderKey,
} from "$constants";
import type { PaginationQueryParams } from "$types/pagination.d.ts";
import type { WalletSortKey } from "$types/sorting.d.ts";
import type { WalletConnectionState } from "$types/ui.d.ts";
import type { ProgressiveFeeEstimationResult } from "$types/utils.d.ts";

// Re-export runtime constants from $constants
export { AddressFormat, SignatureType } from "$constants";

// ===== PSBT SIGNING TYPES =====

/**
 * Input to sign for PSBT (Partially Signed Bitcoin Transaction)
 * Used across all wallet providers for transaction signing
 */
export interface PSBTInputToSign {
  /** The index of the input in the transaction */
  index: number;
  /** Optional address that should sign this input */
  address?: string;
  /** Optional sighash types for this input */
  sighashTypes?: number[];
}

// ===== HORIZON WALLET SPECIFIC TYPES =====

export interface HorizonAddress {
  address: string;
  type: "p2wpkh" | "p2sh" | "p2tr" | "p2pkh";
  publicKey: string;
}

export interface HorizonGetAddressesResponse {
  addresses: HorizonAddress[];
}

export interface HorizonSignMessageParams {
  message: string;
  address: string;
}

export interface HorizonSignPsbtParams {
  hex: string;
  signInputs: Record<string, number[]>; // address -> input indices mapping
}

export interface HorizonWalletAPI {
  request: (method: string, params: any) => Promise<any>;
}

// Global window interface extension
declare global {
  interface Window {
    HorizonWalletProvider?: HorizonWalletAPI;
  }
}

// Re-export for convenience
export type { WalletSortKey } from "./sorting.d.ts";

// Re-export AncestorInfo from base types
export type { AncestorInfo } from "$types/base.d.ts";

// ===== CORE WALLET INTERFACE =====

/**
 * Core Wallet interface representing the minimal wallet state
 * Used throughout the application for wallet management
 */
export interface Wallet {
  accounts: string[];
  address: string;
  /**
   * Secondary ordinals/inscriptions address (P2TR, bc1p...) for wallets that
   * expose separate payment and ordinals accounts (e.g. Xverse).
   *
   * - wallet.address     = payment (P2WPKH) — used for BTC transfers and stamps
   * - wallet.ordinalsAddress = ordinals (P2TR) — used for inscriptions/ordinals
   *
   * Undefined for wallets that only expose a single address (Unisat, OKX, etc.).
   */
  ordinalsAddress?: string;
  btcBalance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  stampBalance: StampBalance[];
  // Additional properties required by wallet providers
  publicKey: string;
  addressType: "p2pkh" | "p2sh" | "p2wpkh" | "p2tr";
  network: "mainnet" | "testnet";
  provider: WalletProviderKey;
}

export interface StampBalance {
  cpid?: string;
  tick?: string;
  type: "STAMP" | "SRC-20" | "SRC-721";
  quantity: number;
  decimals?: number;
  divisible?: boolean;
  stamp?: number;
  info?: any;
}

// UTXO information for wallet stamps
export interface UTXOInfo {
  quantity: number;
  utxo: string;
}

// Enhanced stamp interface for wallet display with value and UTXO information
export interface WalletStampWithValue extends StampBalance {
  balance?: number; // Total balance of this stamp owned by the wallet
  unbound_quantity?: number; // Quantity NOT attached to UTXOs (unbound/detached)
  utxos?: UTXOInfo[]; // UTXO attachment information (detailed)

  // Additional StampRow fields for wallet display
  stamp?: number;
  tx_hash?: string;
  stamp_url?: string;
  stamp_mimetype?: string;
  supply?: number;
  creator?: string;
  creator_name?: string;
  divisible?: boolean;
  locked?: number;
  cpid?: string;
  marketData?: any;
}

// Utility type for checking UTXO attachment status
export interface UTXOAttachmentInfo {
  hasUTXOAttachment: boolean;
  attachedQuantity: number;
  unattachedQuantity: number;
  totalBalance: number;
}

// Base interface for chain and mempool stats from Mempool API
interface BTCStatsDetail {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

// Full Mempool API response type
export interface MempoolAddressResponse {
  address: string;
  chain_stats: BTCStatsDetail;
  mempool_stats: BTCStatsDetail;
}

export interface BlockCypherAddressBalanceResponse {
  address: string;
  total_received: number;
  total_sent: number;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
  unconfirmed_n_tx: number;
  final_n_tx: number;
}

// Basic balance interface used across the application
export interface BTCBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
  txCount?: number;
  unconfirmedTxCount?: number;
}

// Extended balance info with USD values and additional data
export interface BTCBalanceInfo {
  address: string;
  balance: number;
  txCount: number;
  unconfirmedBalance: number;
  unconfirmedTxCount: number;
  btcPrice?: number;
  usdValue?: number;
}

// Wallet provider types
export interface WalletInfo {
  address?: string;
  balance?: BTCBalance;
  provider?: WalletProviderKey;
  connected?: boolean;
  network?: "mainnet" | "testnet";
  // Legacy properties for backward compatibility
  accounts?: string[];
  publicKey?: string;
  btcBalance?: BTCBalance;
  addressType?: "p2wpkh" | "p2tr";
  stampBalance?: StampBalance[];
}

// Wallet connection state

// Wallet connection methods
export interface WalletConnectionMethods {
  connect: (provider: WalletProviderKey) => Promise<void>;
  disconnect: () => Promise<void>;
  getBalance: () => Promise<BTCBalance>;
  signTransaction: (tx: any) => Promise<string>;
  broadcastTransaction: (signedTx: string) => Promise<string>;
}

// Combined wallet context
export interface WalletContext
  extends WalletConnectionState, WalletConnectionMethods {
  refreshBalance: () => Promise<void>;
  isRefreshing: boolean;
}

// Wallet display preferences
export interface WalletDisplayPreferences {
  showUSDValues: boolean;
  showQuantityDetails: boolean;
  showRecentActivity: boolean;
  defaultSortBy: WalletSortKey;
  itemsPerPage: number;
}

// Wallet stats aggregation
export interface WalletStats {
  totalStamps: number;
  totalValue: number;
  totalUSDValue?: number;
  uniqueStamps: number;
  recentActivity: {
    lastTransaction?: Date;
    transactionCount24h: number;
    volumeChange24h: number;
  };
}

// Wallet activity item
export interface WalletActivityItem {
  type: "purchase" | "sale" | "transfer" | "mint";
  stamp: number;
  quantity: number;
  price?: number;
  timestamp: Date;
  txHash: string;
  counterparty?: string;
}

// Wallet activity response
export interface WalletActivityResponse {
  data: WalletActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: WalletStats;
}

// Dispenser aggregation for wallet display
export interface WalletDispenserInfo {
  stamp: number;
  quantity: number;
  pricePerStamp: number;
  totalValue: number;
  isActive: boolean;
  createdAt: Date;
  lastActivity?: Date;
  satoshirate?: number; // Added missing satoshirate property
}

// Wallet page data structure
export interface WalletPageData {
  address: string;
  balance: BTCBalance;
  stamps: WalletStampWithValue[];
  dispensers: WalletDispenserInfo[];
  activity: WalletActivityItem[];
  stats: WalletStats;
  preferences: WalletDisplayPreferences;
  lastUpdated: Date;
}

// Wallet filter options
export interface WalletFilterOptions {
  priceRange?: {
    min: number;
    max: number;
  };
  quantityRange?: {
    min: number;
    max: number;
  };
  hasUTXOAttachment?: boolean;
  hasMarketData?: boolean;
  stampTypes?: ("STAMP" | "SRC-20" | "SRC-721")[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Wallet search and filter state

// Wallet navigation state for complex wallet interfaces

// Wallet page query parameters
export interface WalletPageParams {
  address: string;
  anchor: string;
  tab?: "stamps" | "activity" | "dispensers" | "stats";
  view?: "grid" | "list" | "table";
  search?: string;
  filters?: {
    priceMin?: number;
    priceMax?: number;
    quantityMin?: number;
    quantityMax?: number;
    hasUTXO?: boolean;
    hasMarketData?: boolean;
    types?: string;
    dateStart?: string;
    dateEnd?: string;
  };
  stamps?: {
    page?: number;
    limit?: number;
    sortBy?: WalletSortKey;
  };
  activity?: {
    page?: number;
    limit?: number;
    sortBy?: "date_desc" | "date_asc" | "value_desc" | "value_asc";
  };
  dispensers?: {
    page?: number;
    limit?: number;
    sortBy?: "date_desc" | "date_asc" | "price_desc" | "price_asc";
  };
  stampsSortBy?: "ASC" | "DESC";
  src20SortBy?: "ASC" | "DESC";
  dispensersSortBy?: "ASC" | "DESC";
}

export interface WalletStampsQueryParams extends PaginationQueryParams {
  sortBy?: WalletSortKey;
}

export interface WalletStampsApiResponse {
  data: WalletStampWithValue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stampValues: {
    stampValues: Record<string, number>;
    totalValue: number;
  };
  metadata: {
    marketDataCacheStatus: string;
    enhancedWithMarketData: number;
    sortBy?: WalletSortKey;
  };
}

/* ===== WALLET CONTENT PROPS ===== */

/**
 * WalletContentProps - Props for WalletDashboardContent component
 */
export interface WalletContentProps {
  stamps: any;
  src20: any;
  dispensers: any;
  address: string;
  anchor: string;
  stampsSortBy?: "ASC" | "DESC";
  src20SortBy?: "ASC" | "DESC";
  dispensersSortBy?: "ASC" | "DESC";
}

export interface WalletOverviewInfo {
  totalStamps: number;
  totalValue: number;
  totalSRC20: number;
  totalDispensers: number;
  lastActivity?: Date;
  // Core wallet properties
  address: string;
  balance: number;
  usdValue: number;
  fee?: number;
  btcPrice: number; // Required for calculations
  // Dispensers data - matching component interface
  dispensers?: {
    open: number;
    closed: number;
    total: number;
  };
  // Value breakdowns
  stampValue?: number;
  src20Value?: number;
  // SRC-101 data
  src101?: {
    names: string[];
  };
  // Creator information
  creatorName?: string;
}

// ============================================================================
// 🏠 Bitcoin Address Format Types & Discriminated Unions
// ============================================================================

// AddressFormat is now imported from $constants

/**
 * Base address interface for all Bitcoin address types
 */
export interface BaseAddress {
  address: string;
  format: AddressFormat;
  network: "mainnet" | "testnet";
  isValid: boolean;
}

/**
 * P2PKH (Pay to Public Key Hash) address - Legacy format (1...)
 */
export interface P2PKHAddress extends BaseAddress {
  format: AddressFormat.P2PKH;
  type: "p2pkh";
  publicKeyHash: string;
}

/**
 * P2SH (Pay to Script Hash) address - Script hash format (3...)
 */
export interface P2SHAddress extends BaseAddress {
  format: AddressFormat.P2SH;
  type: "p2sh";
  scriptHash: string;
  redeemScript?: string;
}

/**
 * P2WPKH (Pay to Witness Public Key Hash) - Native SegWit (bc1q...)
 */
export interface P2WPKHAddress extends BaseAddress {
  format: AddressFormat.P2WPKH;
  type: "p2wpkh";
  witnessVersion: 0;
  publicKeyHash: string;
}

/**
 * P2TR (Pay to Taproot) - Taproot addresses (bc1p...)
 */
export interface P2TRAddress extends BaseAddress {
  format: AddressFormat.P2TR;
  type: "p2tr";
  witnessVersion: 1;
  taprootOutputKey: string;
}

/**
 * Discriminated union of all Bitcoin address types
 */
export type BitcoinAddress =
  | P2PKHAddress
  | P2SHAddress
  | P2WPKHAddress
  | P2TRAddress;

// ============================================================================
// 🔍 Address Type Guards
// ============================================================================

/**
 * Type guard for P2PKH addresses
 */
export declare function isP2PKHAddress(
  address: BitcoinAddress | BaseAddress,
): address is P2PKHAddress;

/**
 * Type guard for P2SH addresses
 */
export declare function isP2SHAddress(
  address: BitcoinAddress | BaseAddress,
): address is P2SHAddress;

/**
 * Type guard for P2WPKH addresses
 */
export declare function isP2WPKHAddress(
  address: BitcoinAddress | BaseAddress,
): address is P2WPKHAddress;

/**
 * Type guard for P2TR addresses
 */
export declare function isP2TRAddress(
  address: BitcoinAddress | BaseAddress,
): address is P2TRAddress;

// ADDRESS_PATTERNS constant is available from $constants/walletConstants.ts

// ============================================================================
// 🔗 Enhanced Wallet Provider Types
// ============================================================================

/**
 * Standard wallet provider identifiers
 */
export type StandardWalletProvider =
  | "unisat"
  | "xverse"
  | "hiro"
  | "leather"
  | "phantom"
  | "wonder";

/**
 * Base wallet provider interface that all providers must implement
 */
export interface BaseWalletProvider {
  readonly name: StandardWalletProvider;
  readonly version?: string;
  readonly icon?: string;
  isInstalled(): boolean;
  connect(): Promise<WalletConnectionResult>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<string[]>;
  getNetwork(): Promise<"mainnet" | "testnet">;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<BTCBalance>;
  signMessage(
    messageOrParams: string | { message: string; address: string },
    address?: string,
  ): Promise<string | { signature: string; messageSignature: string }>;
  signPsbt(
    psbt: string | { hex: string; broadcast?: boolean; inputsToSign?: any[] },
  ): Promise<string | { psbtHex: string; hex?: string; txId?: string }>;
  sendBitcoin(toAddress: string, satoshis: number): Promise<string>;
}

/**
 * Wallet connection result
 */
export interface WalletConnectionResult {
  success: boolean;
  address?: string;
  publicKey?: string;
  network?: "mainnet" | "testnet";
  error?: WalletError;
}

/**
 * Enhanced wallet error with provider context
 */
export interface WalletError {
  code: string;
  message: string;
  provider?: StandardWalletProvider;
  timestamp: Date;
  recoverable?: boolean;
  userAction?: string;
}

// ============================================================================
// 🔌 Provider-Specific Wallet Interfaces
// ============================================================================

/**
 * Unisat Wallet API interface
 */
export interface UnisatWalletAPI extends BaseWalletProvider {
  name: "unisat";
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getNetwork(): Promise<"mainnet" | "testnet">;
  getPublicKey(): Promise<string>;
  getBalance(): Promise<
    { confirmed: number; unconfirmed: number; total: number }
  >;
  getInscriptions(cursor?: number, size?: number): Promise<{
    total: number;
    list: Array<{
      inscriptionId: string;
      inscriptionNumber: number;
      address: string;
      outputValue: number;
      content: string;
      contentLength: number;
      contentType: string;
      timestamp: number;
    }>;
  }>;
  sendBitcoin(
    toAddress: string,
    satoshis: number,
    options?: { feeRate?: number },
  ): Promise<string>;
  signMessage(
    message: string,
    type?: "ecdsa" | "bip322-simple",
  ): Promise<string>;
  signPsbt(
    psbt: string,
    options?: {
      autoFinalized?: boolean;
      toSignInputs?: Array<{ index: number; address?: string }>;
    },
  ): Promise<string>;
  pushPsbt(psbt: string): Promise<string>;
  on(event: string, handler: (data: any) => void): void;
  removeListener(event: string, handler: (data: any) => void): void;
}

/**
 * Xverse address purpose types (sats-connect v2 AddressPurpose)
 */
export type XverseAddressPurpose = "payment" | "ordinals" | "stacks";

/**
 * Xverse Wallet API interface (sats-connect v2 compatible)
 */
export interface XverseWalletAPI extends BaseWalletProvider {
  name: "xverse";
  request(method: string, params?: any): Promise<any>;
  getAddresses(params?: {
    purposes?: XverseAddressPurpose[];
    message?: string;
  }): Promise<{
    addresses: Array<{
      address: string;
      publicKey: string;
      purpose: XverseAddressPurpose;
      addressType: "p2wpkh" | "p2tr" | "p2sh" | "p2pkh";
    }>;
  }>;
  signMessage(params: {
    address: string;
    message: string;
    protocol?: "ECDSA" | "BIP322";
  }): Promise<string | { signature: string; messageSignature: string }>;
  signPsbt(params: {
    hex: string;
    allowedSignHash?: number;
    broadcast?: boolean;
    inputsToSign: Array<{
      address: string;
      signingIndexes: number[];
      sigHash?: number;
    }>;
  }): Promise<{ psbtHex: string; txId?: string }>;
  sendBtc(params: {
    recipients: Array<{
      address: string;
      amountSats: number;
    }>;
  }): Promise<{ txId: string }>;
  getCapabilities(): Promise<{
    addresses: boolean;
    signMessage: boolean;
    signPsbt: boolean;
    sendBtc: boolean;
  }>;
}

/**
 * Hiro Wallet API interface
 */
export interface HiroWalletAPI extends BaseWalletProvider {
  name: "hiro";
  request(method: string, params?: any): Promise<any>;
  getAddresses(): Promise<{
    addresses: Array<{
      address: string;
      type: "p2wpkh" | "p2tr";
      publicKey: string;
    }>;
  }>;
  signMessage(params: {
    message: string;
    address: string;
  }): Promise<string>;
  signPsbt(params: {
    hex: string;
    signAtIndex?: number[];
    broadcast?: boolean;
  }): Promise<string>;
  sendTransfer(params: {
    recipients: Array<{
      address: string;
      amount: number;
    }>;
  }): Promise<{ txid: string }>;
}

/**
 * Leather Wallet API interface
 */
export interface LeatherWalletAPI extends BaseWalletProvider {
  name: "leather";
  request(method: string, params?: any): Promise<any>;
  getAddresses(): Promise<{
    addresses: Array<{
      address: string;
      type: "p2wpkh" | "p2tr" | "p2sh";
      publicKey: string;
    }>;
  }>;
  signMessage(params: {
    message: string;
    address: string;
  }): Promise<string>;
  signPsbt(params: {
    hex: string;
    account?: number;
    allowedSighash?: number[];
  }): Promise<string>;
}

/**
 * Union type of all specific wallet APIs
 */
/**
 * Wonder Wallet injected provider (window.wonderWallet)
 *
 * requestAccounts resolves { accounts, proof } on a first-time grant and a
 * bare string[] on a repeat connect. broadcastTransaction resolves { txid }.
 * signPsbt returns { txhex, txid } when autoFinalized, else { psbt } (base64).
 */
export interface WonderWalletAPI {
  isWonderWallet?: boolean;
  requestAccounts(): Promise<
    string[] | { accounts?: string[]; proof?: unknown }
  >;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string | null>;
  getBalances(): Promise<
    { confirmed?: number; unconfirmed?: number; total?: number }
  >;
  signMessage(message: string, address?: string): Promise<string>;
  signPsbt(
    psbtHex: string,
    options?: any,
  ): Promise<{ txhex?: string; txid?: string; psbt?: string }>;
  broadcastTransaction(
    hex: string,
  ): Promise<string | { txid?: string }>;
  on(event: string, handler: (payload?: unknown) => void): void;
  removeListener?(event: string, handler: (payload?: unknown) => void): void;
}

export type WalletAPI =
  | UnisatWalletAPI
  | XverseWalletAPI
  | HiroWalletAPI
  | LeatherWalletAPI
  | WonderWalletAPI;

/**
 * Wallet provider factory interface
 */
export interface WalletProviderFactory {
  createProvider(type: StandardWalletProvider): BaseWalletProvider | null;
  getSupportedProviders(): StandardWalletProvider[];
  isProviderAvailable(type: StandardWalletProvider): boolean;
}

// ============================================================================
// 🌐 Global Window Extensions for Wallet Providers
// ============================================================================

declare global {
  interface Window {
    // Unisat
    unisat?: UnisatWalletAPI;

    // Xverse
    XverseProviders?: {
      BitcoinProvider: XverseWalletAPI;
    };

    // Hiro/Leather
    HiroWalletProvider?: HiroWalletAPI;
    LeatherProvider?: LeatherWalletAPI;

    // Phantom (Bitcoin support)
    phantom?: {
      bitcoin?: BaseWalletProvider;
    };

    // Existing Horizon wallet (already defined above)
    HorizonWalletProvider?: HorizonWalletAPI;

    // Wonder Wallet
    wonderWallet?: WonderWalletAPI;
  }
}

// ============================================================================
// 🔐 Key Management and Security Types
// ============================================================================

/**
 * Key derivation path for hierarchical deterministic wallets
 */
export interface KeyDerivationPath {
  purpose: number; // BIP-44 purpose (44, 49, 84, 86)
  coinType: number; // 0 for Bitcoin, 1 for testnet
  account: number; // Account index
  change: number; // 0 for external, 1 for internal
  addressIndex: number; // Address index
}

// DERIVATION_PATHS constant is available from $constants/walletConstants.ts

/**
 * Public key information with derivation details
 */
export interface PublicKeyInfo {
  publicKey: string; // Hex encoded public key
  compressed: boolean; // Whether key is compressed
  derivationPath?: KeyDerivationPath;
  fingerprint?: string; // Key fingerprint for identification
}

// SignatureType is now imported from $constants

/**
 * Message signing request parameters
 */
export interface MessageSigningRequest {
  message: string;
  address: string;
  signatureType?: SignatureType;
  derivationPath?: KeyDerivationPath;
}

/**
 * Message signature result
 */
export interface MessageSignature {
  signature: string;
  signatureType: SignatureType;
  address: string;
  publicKey: string;
  message: string;
  timestamp: Date;
}

/**
 * PSBT (Partially Signed Bitcoin Transaction) signing parameters
 */
export interface PSBTSigningRequest {
  psbt: string; // Base64 encoded PSBT
  signInputs?: Array<{ // Specific inputs to sign
    index: number;
    address?: string;
    derivationPath?: KeyDerivationPath;
    sigHash?: number; // Signature hash type
  }>;
  autoFinalize?: boolean; // Auto-finalize after signing
  broadcast?: boolean; // Auto-broadcast after finalizing
}

/**
 * PSBT signing result
 */
export interface PSBTSigningResult {
  psbt: string; // Signed PSBT (base64)
  txId?: string; // Transaction ID if broadcast
  finalized: boolean; // Whether PSBT was finalized
  broadcasted: boolean; // Whether transaction was broadcast
  inputsSigned: number[]; // Indices of inputs that were signed
}

/**
 * Wallet security features
 */
export interface WalletSecurityFeatures {
  supportsHardwareWallet: boolean;
  supportsMultisig: boolean;
  supportsBip322: boolean;
  supportsSchnorr: boolean;
  supportsTaproot: boolean;
  requiresUserConfirmation: boolean;
  hasTimelock: boolean;
  supportsRecoveryPhrase: boolean;
}

/**
 * Wallet authentication state
 */

/**
 * Encryption parameters for sensitive data
 */
export interface EncryptionParameters {
  algorithm: "AES-256-GCM" | "ChaCha20-Poly1305";
  keyDerivation: "PBKDF2" | "scrypt" | "Argon2";
  iterations?: number;
  salt: string;
  iv: string;
}

/**
 * Encrypted data container
 */
export interface EncryptedData {
  data: string; // Encrypted data (base64)
  encryption: EncryptionParameters;
  timestamp: Date;
  version: number;
}

// ============================================================================
// 📋 Migrated Types from globals.d.ts Inventory
// ============================================================================

/**
 * Wallet filter types for content display (migrated from globals)
 */
export type WALLET_FILTER_TYPES =
  | "all"
  | "stamps"
  | "collections"
  | "dispensers"
  | "tokens";

export type COLLECTION_FILTER_TYPES =
  | "all"
  | "posh"
  | "recursive"
  | "artists";

export type LISTING_FILTER_TYPES =
  | "all"
  | "psbt"
  | "dispensers";

/**
 * Holder information for wallet display (migrated from globals)
 */
export interface HolderRow {
  address: string;
  quantity: number;
  divisible: boolean;
  amt?: number;
  percentage?: number;
}

/**
 * Processed holder data with percentage calculation (migrated from globals)
 */
export interface ProcessedHolder {
  address: string;
  amt: number;
  percentage: number;
}

/**
 * Wallet data types interface (migrated from globals)
 */
export interface WalletDataTypes {
  accounts: string[];
  address: string;
  publicKey: string;
  btcBalance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  network: "mainnet" | "testnet";
  provider: string;
}

/**
 * Address handler context for routing (migrated from globals)
 */
export interface AddressHandlerContext {
  params: {
    address: string;
  };
}

/**
 * Address and tick handler context for routing (migrated from globals)
 */
export interface AddressTickHandlerContext {
  params: {
    address: string;
    tick: string | number;
  };
}

/**
 * Mint stamp input data interface (migrated from globals)
 */
export interface MintStampInputData {
  sourceWallet: string;
  assetName?: string;
  qty: number;
  locked: boolean;
  divisible: boolean;
  filename: string;
  file: string;
  satsPerKB: number;
  service_fee: number;
  service_fee_address: string;
}

/**
 * BTC info interface from mempool/external APIs (migrated from globals)
 */

/**
 * WalletProviders - Migrated from wallet.ts
 */
// Re-export WalletProviderKey from constants for backward compatibility
export type { WalletProviderKey as WalletProviders } from "$constants";

/**
 * ProgressiveFeeEstimationOptions - Migrated from fee-estimation.ts
 */
export interface ProgressiveFeeEstimationOptions {
  /** Phase 1: Instant estimation timeout (default: 100ms) */
  instantTimeout: number;
  /** Phase 2: Smart estimation timeout (default: 2000ms) */
  smartTimeout: number;
  /** Phase 3: Exact estimation timeout (default: 10000ms) */
  exactTimeout: number;

  /** Whether to enable Phase 2 caching */
  enableCaching: boolean;
  /** Cache TTL in milliseconds (default: 30000ms) */
  cacheTtl: number;
  /** Maximum cache size per wallet (default: 1000 UTXOs) */
  maxCacheSize: number;

  /** Whether to pre-fetch Phase 2 data in background */
  enablePreFetch: boolean;
  /** Debounce delay for pre-fetching (default: 2000ms) */
  preFetchDebounce: number;

  /** Callback functions for phase completion */
  onPhaseComplete?: (
    phase: "instant" | "smart" | "exact",
    result: ProgressiveFeeEstimationResult,
  ) => void;
  /** Error callback */
  onError?: (error: Error, phase?: "instant" | "smart" | "exact") => void;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * CacheStats - Migrated from fee-estimation.ts
 */
export interface CacheStats {
  /** Total number of cache entries */
  totalEntries: number;
  /** Total number of cached UTXOs across all wallets */
  totalUtxos: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Average cache age in milliseconds */
  averageAge: number;
  /** Memory usage estimate in bytes */
  estimatedMemoryUsage: number;
  /** Number of cache evictions due to TTL */
  ttlEvictions: number;
  /** Number of cache evictions due to LRU */
  lruEvictions: number;
}

/**
 * CacheManagerConfig - Migrated from fee-estimation.ts
 */
export interface CacheManagerConfig {
  /** Maximum number of wallet caches to maintain */
  maxWallets: number;
  /** Maximum UTXOs per wallet cache */
  maxUtxosPerWallet: number;
  /** Default TTL for cache entries */
  defaultTtl: number;
  /** Cleanup interval for expired entries */
  cleanupInterval: number;
  /** Enable LRU eviction when limits are reached */
  enableLruEviction: boolean;
  /** Enable automatic cleanup of expired entries */
  enableAutoCleanup: boolean;
}

/**
 * WalletStep - Migrated from data.ts
 */
export interface WalletStep {
  title: string;
  image: string;
  description: string | string[];
  number: number;
}

export interface BtcInfo {
  address: string;
  balance: number;
  txCount: number;
  unconfirmedBalance: number;
  unconfirmedTxCount: number;
}

/* ===== EXISTING WALLET TYPES ===== */

// TransactionOptions interface is now imported from base.d.ts
