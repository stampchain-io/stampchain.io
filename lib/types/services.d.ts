import {
  CollectionValidationErrorCode,
  ProtocolComplianceLevel,
  RouteType,
  SortDirection,
} from "$constants";
import { estimateFee } from "$lib/utils/bitcoin/minting/feeCalculations.ts";
import { getUTXOForAddress as getUTXOForAddressFromUtils } from "$lib/utils/bitcoin/utxo/utxoUtils.ts";
import type { LogNamespace } from "$lib/utils/logger.ts";
import type {
  HttpRequestConfig,
  HttpResponse,
  QuicknodeRPCResponse,
} from "$types/api.d.ts";
import type {
  AncestorInfo,
  BasicUTXO as BaseBasicUTXO,
  ScriptType,
  UTXO,
} from "$types/base.d.ts";
import type { ValidationResult } from "$types/errors.d.ts";
import type { MarketListingAggregated } from "$types/marketData.d.ts";
import type { SRC20Balance, SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type { SendRow } from "$types/transaction.d.ts";
import * as bitcoin from "bitcoinjs-lib";
import type {
  CollectionRow,
  CollectionWithOptionalMarketData,
} from "../../server/types/collection.d.ts";

// Re-export for use by other modules
export { RouteType };

// Re-export collection types for other modules
export type { CollectionRow, CollectionWithOptionalMarketData };

// Orchestration System Types for Type Domain Migration
export type TaskStatus =
  | "pending"
  | "in-progress"
  | "done"
  | "deferred"
  | "cancelled"
  | "review";
export type TaskPriority = "high" | "medium" | "low";

export interface MigrationMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  elapsedDays?: number;
}

export interface VelocityMetrics {
  tasksPerDay: number;
  trend: "increasing" | "stable" | "decreasing";
  projectedCompletion: string;
}

export interface CompletionBlocker {
  id: string;
  type:
    | "dependency-cycle"
    | "resource-constraint"
    | "external-dependency"
    | "complexity-overload";
  severity: "high" | "medium" | "low";
  description: string;
  estimatedDelay: string;
  mitigationStrategy: string;
  detectedAt?: number;
  riskLevel?: string;
}

export interface MomentumIndicator {
  timestamp: number;
  status: string;
  velocity: number;
  momentum: number;
}

export interface TaskMasterUpdate {
  type: string;
  data?: any;
  priority?: "high" | "medium" | "low";
  urgent?: boolean;
  timestamp?: number;
  integrationId?: string;
}

export interface OrchestrationEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface TypeModuleStatus {
  name: string;
  migrationStatus: "pending" | "in-progress" | "completed" | "validated";
  productionReady: boolean;
  validationErrors: string[];
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    metadata?: Record<string, any>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;
  }>;
}

export interface ModuleValidationResult {
  moduleId: string;
  valid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

export interface ParallelMigrationConfig {
  maxConcurrent: number;
  batchSize: number;
  timeoutMs: number;
}

export type DispenserFilter = "open" | "closed" | "all";

export interface Dispenser {
  tx_hash: string;
  block_index: number;
  source: string;
  cpid: string;
  give_quantity: number;
  give_remaining: number;
  escrow_quantity: number;
  satoshirate: number;
  btcrate: number;
  origin: string;
  confirmed: boolean;
  close_block_index: number | null;
  status: "open" | "closed" | "unknown";
  asset_info?: any;
  dispenser_info?: any;
  stamp?: StampRow | null;
}

export interface Dispense {
  tx_hash: string;
  block_index: number;
  cpid: string;
  source: string;
  destination: string;
  dispenser_tx_hash: string;
  dispense_quantity: number;
  confirmed: boolean;
  btc_amount: number | undefined;
  close_block_index: number | null;
  dispenser_details: any | null;
}

export interface DispenseEvent {
  event_index: number;
  event: "DISPENSE";
  params: {
    asset: string;
    block_index: number;
    btc_amount: number;
    destination: string;
    dispense_index: number;
    dispense_quantity: number;
    dispenser_tx_hash: string;
    source: string;
    tx_hash: string;
    tx_index: number;
  };
  tx_hash: string;
  block_index: number;
  timestamp: string | null;
}

export interface Fairminter {
  tx_hash: string;
  tx_index: number;
  block_index: number;
  source: string;
  asset: string;
  asset_parent: string;
  asset_longname: string;
  description: string;
  price: number;
  quantity_by_price: number;
  hard_cap: number;
  burn_payment: boolean;
  max_mint_per_tx: number;
  premint_quantity: number;
  start_block: number;
  end_block: number;
  minted_asset_commission_int: number;
  soft_cap: number;
  soft_cap_deadline_block: number;
  lock_description: boolean;
  lock_quantity: boolean;
  divisible: boolean;
  pre_minted: boolean;
  status: string;
  paid_quantity: number | null;
  confirmed: boolean;
}

export interface XcpBalance {
  address: string | null;
  cpid: string;
  quantity: number;
  utxo: string;
  utxo_address: string;
  divisible: boolean;
}

export interface DispenserStats {
  open: number;
  closed: number;
  total: number;
  items: Dispenser[];
}

// ============================================================================
// Base Service Interface Structure
// ============================================================================

/**
 * Service health status information
 */
export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  details?: string;
  timestamp: string;
  checks?: Record<string, boolean>;
}

/**
 * Base interface for all services in the system
 */
export interface IService {
  /** Service identifier */
  name: string;
  /** Service version */
  version: string;
  /** Initialize the service and its dependencies */
  initialize(): Promise<void>;
  /** Gracefully shutdown the service */
  shutdown(): Promise<void>;
  /** Check service health and readiness */
  healthCheck(): Promise<ServiceHealth>;
}

/**
 * Service container for dependency injection and service management
 */
export interface IServiceContainer {
  /** Register a service instance */
  register<T extends IService>(name: string, service: T): void;
  /** Get a registered service instance */
  get<T extends IService>(name: string): T;
  /** Get all registered services */
  getAll(): Map<string, IService>;
  /** Check if a service is registered */
  has(name: string): boolean;
  /** Unregister a service */
  unregister(name: string): boolean;
}

/**
 * Dependency injection configuration
 */
export interface ServiceDependency {
  name: string;
  required: boolean;
  version?: string;
}

/**
 * Service metadata and configuration
 */
export interface ServiceDescriptor {
  name: string;
  version: string;
  dependencies: ServiceDependency[];
  singleton: boolean;
  factory?: () => Promise<IService>;
}

// ============================================================================
// Promise-Based Service Interfaces
// ============================================================================

/**
 * Service operation result wrapper
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, unknown>;
}

/**
 * Service error information
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  service: string;
  retryable: boolean;
}

/**
 * Async operation configuration
 */
export interface AsyncOperationConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
  retryBackoff: "linear" | "exponential";
  circuit?: CircuitBreakerConfig;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  enabled: boolean;
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Base async service interface with error handling
 */
export interface IAsyncService extends IService {
  /** Execute operation with retry and timeout handling */
  executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<AsyncOperationConfig>,
  ): Promise<ServiceResult<T>>;

  /** Execute operation with circuit breaker protection */
  executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitName: string,
  ): Promise<ServiceResult<T>>;
}

// ============================================================================
// Service Configuration and Composition Types
// ============================================================================

/**
 * Base service configuration
 */
export interface ServiceConfig {
  name: string;
  enabled: boolean;
  environment: "development" | "staging" | "production";
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  [key: string]: unknown;
}

/**
 * Logging configuration for services
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  format: "json" | "text";
  outputs: ("console" | "file" | "remote")[];
  contextFields: string[];
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  healthCheckInterval: number;
  performanceTracking: boolean;
}

/**
 * Service factory interface
 */
export interface IServiceFactory<T extends IService> {
  create(config: ServiceConfig): Promise<T>;
  createSingleton(config: ServiceConfig): Promise<T>;
  supports(serviceType: string): boolean;
}

/**
 * Service middleware interface
 */
export interface IServiceMiddleware {
  name: string;
  order: number;
  before?<T>(context: ServiceContext, input: T): Promise<T>;
  after?<T>(
    context: ServiceContext,
    result: ServiceResult<T>,
  ): Promise<ServiceResult<T>>;
  onError?(context: ServiceContext, error: ServiceError): Promise<void>;
}

/**
 * Service execution context
 */
export interface ServiceContext {
  serviceName: string;
  operationName: string;
  requestId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Service composition pipeline
 */
export interface IServicePipeline {
  addService<T extends IService>(service: T): IServicePipeline;
  addMiddleware(middleware: IServiceMiddleware): IServicePipeline;
  execute<TInput, TOutput>(
    input: TInput,
    context: ServiceContext,
  ): Promise<ServiceResult<TOutput>>;
}

// ============================================================================
// Repository Pattern Interfaces
// ============================================================================

/**
 * Generic repository interface for data access
 */
export interface IRepository<T, ID> {
  /** Find entity by ID */
  findById(id: ID): Promise<T | null>;
  /** Find all entities */
  findAll(): Promise<T[]>;
  /** Find entities with pagination */
  findPaginated(offset: number, limit: number): Promise<PaginatedResult<T>>;
  /** Save entity (create or update) */
  save(entity: T): Promise<T>;
  /** Delete entity by ID */
  delete(id: ID): Promise<boolean>;
  /** Count total entities */
  count(): Promise<number>;
  /** Check if entity exists */
  exists(id: ID): Promise<boolean>;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Query criteria for repository operations
 */
export interface QueryCriteria {
  filters?: Record<string, unknown>;
  sorting?: SortCriteria[];
  pagination?: PaginationCriteria;
}

/**
 * Sorting criteria
 */
export interface SortCriteria {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Pagination criteria
 */
export interface PaginationCriteria {
  offset: number;
  limit: number;
}

/**
 * Advanced repository with query capabilities
 */
export interface IQueryableRepository<T, ID> extends IRepository<T, ID> {
  /** Find entities matching criteria */
  findByCriteria(criteria: QueryCriteria): Promise<PaginatedResult<T>>;
  /** Find single entity by criteria */
  findOneByCriteria(
    criteria: Omit<QueryCriteria, "pagination">,
  ): Promise<T | null>;
  /** Update entities matching criteria */
  updateByCriteria(
    criteria: QueryCriteria,
    updates: Partial<T>,
  ): Promise<number>;
  /** Delete entities matching criteria */
  deleteByCriteria(criteria: QueryCriteria): Promise<number>;
}

// ============================================================================
// Event-Driven Service Types
// ============================================================================

/**
 * Service event data
 */
export interface ServiceEvent<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: T;
  metadata?: Record<string, unknown>;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (
  event: ServiceEvent<T>,
) => Promise<void>;

/**
 * Event emitter interface for services
 */
export interface IEventEmitter {
  /** Emit an event */
  emit<T>(
    eventType: string,
    data: T,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  /** Subscribe to events */
  on<T>(eventType: string, handler: EventHandler<T>): void;
  /** Unsubscribe from events */
  off<T>(eventType: string, handler: EventHandler<T>): void;
  /** Subscribe to events once */
  once<T>(eventType: string, handler: EventHandler<T>): void;
  /** Get event listener count */
  listenerCount(eventType: string): number;
}

/**
 * Message queue interface
 */
export interface IMessageQueue {
  /** Send message to queue */
  send<T>(
    queueName: string,
    message: T,
    options?: MessageOptions,
  ): Promise<void>;
  /** Subscribe to queue messages */
  subscribe<T>(queueName: string, handler: MessageHandler<T>): Promise<void>;
  /** Unsubscribe from queue */
  unsubscribe(queueName: string): Promise<void>;
  /** Get queue statistics */
  getQueueStats(queueName: string): Promise<QueueStats>;
}

/**
 * Message options for queue operations
 */
export interface MessageOptions {
  delay?: number;
  ttl?: number;
  priority?: number;
  retries?: number;
}

/**
 * Message handler function type
 */
export type MessageHandler<T = unknown> = (
  message: QueueMessage<T>,
) => Promise<void>;

/**
 * Queue message wrapper
 */
export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: string;
  deliveryCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  name: string;
  size: number;
  processing: number;
  failed: number;
  completed: number;
}

/**
 * Pub/Sub interface
 */
export interface IPubSub {
  /** Publish message to topic */
  publish<T>(topic: string, message: T): Promise<void>;
  /** Subscribe to topic */
  subscribe<T>(topic: string, handler: MessageHandler<T>): Promise<string>;
  /** Unsubscribe from topic */
  unsubscribe(subscriptionId: string): Promise<void>;
  /** Get topic subscribers count */
  getSubscriberCount(topic: string): Promise<number>;
}

// ============================================================================
// Service Monitoring Types
// ============================================================================

/**
 * Performance metrics for services
 */
export interface ServiceMetrics {
  serviceName: string;
  timestamp: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  customMetrics?: Record<string, number>;
}

/**
 * Service statistics aggregation
 */
export interface ServiceStatistics {
  serviceName: string;
  period: {
    start: string;
    end: string;
  };
  metrics: ServiceMetrics[];
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    availability: number;
  };
}

/**
 * Service logging interface
 */
export interface IServiceLogger {
  /** Log debug message */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Log info message */
  info(message: string, context?: Record<string, unknown>): void;
  /** Log warning message */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Log error message */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void;
  /** Create child logger with additional context */
  child(context: Record<string, unknown>): IServiceLogger;
}

/**
 * Service tracing interface
 */
export interface IServiceTracer {
  /** Start a new trace span */
  startSpan(operationName: string, parentSpan?: TraceSpan): TraceSpan;
  /** Finish a trace span */
  finishSpan(span: TraceSpan): void;
  /** Add tags to span */
  addTags(span: TraceSpan, tags: Record<string, unknown>): void;
  /** Log event to span */
  logEvent(
    span: TraceSpan,
    event: string,
    data?: Record<string, unknown>,
  ): void;
}

/**
 * Trace span representation
 */
export interface TraceSpan {
  id: string;
  traceId: string;
  operationName: string;
  startTime: string;
  duration?: number;
  tags: Record<string, unknown>;
  events: TraceEvent[];
}

/**
 * Trace event
 */
export interface TraceEvent {
  timestamp: string;
  event: string;
  data?: Record<string, unknown>;
}

/**
 * Service monitoring interface
 */
export interface IServiceMonitor {
  /** Record service metrics */
  recordMetrics(metrics: ServiceMetrics): Promise<void>;
  /** Get service statistics */
  getStatistics(
    serviceName: string,
    period: TimePeriod,
  ): Promise<ServiceStatistics>;
  /** Get current health status */
  getHealthStatus(serviceName: string): Promise<ServiceHealth>;
  /** Register health check */
  registerHealthCheck(
    serviceName: string,
    check: () => Promise<ServiceHealth>,
  ): void;
  /** Start monitoring */
  startMonitoring(): Promise<void>;
  /** Stop monitoring */
  stopMonitoring(): Promise<void>;
}

/**
 * Time period specification
 */
export interface TimePeriod {
  start: string;
  end: string;
}

// ============================================================================
// Service Lifecycle and Management
// ============================================================================

/**
 * Service lifecycle hooks
 */
export interface IServiceLifecycle {
  /** Called before service initialization */
  onBeforeInit?(): Promise<void>;
  /** Called after service initialization */
  onAfterInit?(): Promise<void>;
  /** Called before service shutdown */
  onBeforeShutdown?(): Promise<void>;
  /** Called after service shutdown */
  onAfterShutdown?(): Promise<void>;
  /** Called on service error */
  onError?(error: ServiceError): Promise<void>;
}

/**
 * Service manager for orchestrating multiple services
 */
export interface IServiceManager {
  /** Register service with dependencies */
  register(descriptor: ServiceDescriptor): Promise<void>;
  /** Start all services in dependency order */
  startAll(): Promise<void>;
  /** Stop all services in reverse dependency order */
  stopAll(): Promise<void>;
  /** Get service status */
  getServiceStatus(serviceName: string): Promise<ServiceStatus>;
  /** Get all service statuses */
  getAllServiceStatuses(): Promise<Map<string, ServiceStatus>>;
}

/**
 * Service status information

/**
 * FeeEstimationService - Migrated from useProgressiveFeeEstimation.ts
 */
export interface FeeEstimationService {
  estimateFees(endpoint: string, payload: any): Promise<any>;
}

/**
 * LoggerService - Migrated from useProgressiveFeeEstimation.ts
 */
export interface LoggerService {
  debug(category: LogNamespace, data: any): void;
  warn(category: LogNamespace, data: any): void;
  error(category: LogNamespace, data: any): void;
}

/**
 * ServerEnvConfig - Migrated from config.ts
 */
export type ServerEnvConfig = {
  readonly APP_ROOT: string;
  readonly IMAGES_SRC_PATH?: string;
  readonly MINTING_SERVICE_FEE?: string;
  readonly MINTING_SERVICE_FEE_ADDRESS?: string;
  readonly CSRF_SECRET_KEY?: string;
  readonly MINTING_SERVICE_FEE_ENABLED: string;
  readonly MINTING_SERVICE_FEE_FIXED_SATS: string;
  readonly OPENSTAMP_API_KEY: string;
  readonly API_KEY?: string;
  readonly QUICKNODE_ENDPOINT?: string;
  readonly QUICKNODE_API_KEY?: string;
  readonly DEBUG_NAMESPACES: string;
  readonly IS_DEBUG_ENABLED: boolean;
  readonly APP_DOMAIN: string | undefined;
  readonly ALLOWED_DOMAINS: string | undefined;
  [key: string]: string | boolean | undefined;
};

/**
 * DatabaseConfig - Migrated from database.config.ts
 */
export interface DatabaseConfig {
  // Connection Pool Settings
  maxConnections: number;
  minConnections: number;
  maxWaitingForConnection: number;
  connectionTimeout: number;
  acquireTimeout: number;
  validationTimeout: number;

  // Connection Options
  enableCompression: boolean;
  enableConnectionLogging: boolean;

  // Retry Strategy
  maxRetries: number;
  retryDelay: number;

  // Health Check
  healthCheckInterval: number;

  // Environment Info
  environment: "development" | "production" | "test";
  isRemoteDatabase: boolean;
}

/**
 * DatabaseConfig - Migrated from databaseManager.ts
 */
export interface DatabaseConfig {
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_MAX_RETRIES: number;
  ELASTICACHE_ENDPOINT: string;
  DENO_ENV: string;
  CACHE?: string;
  REDIS_LOG_LEVEL?: string;
}

/**
 * DbManager - Migrated from cacheService.ts
 */
export interface DbManager {
  handleCache<T>(
    key: string,
    factory: () => Promise<T>,
    duration: number,
  ): Promise<T>;
  getFromCache<T>(key: string): Promise<T | null>;
}

/**
 * CacheService - Migrated from cacheService.ts
 */
export interface CacheService {
  /**
   * Get a value from cache or compute it using the factory function
   */
  get<T>(
    key: string,
    factory: () => Promise<T>,
    config: CacheConfig,
  ): Promise<T>;

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Get a value from cache without fallback
   */
  getOnly<T>(key: string): Promise<T | null>;

  /**
   * Delete a key from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    hits: number;
    misses: number;
    entries: number;
  }>;
}

/**
 * FeeEstimate - Migrated from feeProvider.ts
 */
export interface FeeEstimate {
  recommendedFee: number;
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
  minimumFee?: number;
  confidence: "high" | "medium" | "low";
  source: string;
  timestamp: number;
  debug_feesResponse?: any;
}

/**
 * FeeProvider - Migrated from feeProvider.ts
 */
export interface FeeProvider {
  /**
   * Get fee estimates from this provider
   */
  getFeeEstimate(): Promise<FeeEstimate>;

  /**
   * Get the name of this fee provider
   */
  getName(): string;

  /**
   * Check if this provider is currently available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the confidence level of this provider
   */
  getConfidenceLevel(): "high" | "medium" | "low";
}

/**
 * FeeService - Migrated from feeProvider.ts
 */
export interface FeeService {
  /**
   * Get fee estimates with fallback logic
   */
  getFeeEstimate(): Promise<FeeEstimate>;

  /**
   * Add a fee provider to the service
   */
  addProvider(provider: FeeProvider): void;

  /**
   * Remove a fee provider from the service
   */
  removeProvider(providerName: string): void;

  /**
   * Get list of all providers
   */
  getProviders(): FeeProvider[];

  /**
   * Get health status of all providers
   */
  getProviderHealth(): Promise<
    Array<{
      name: string;
      available: boolean;
      lastEstimate?: FeeEstimate;
    }>
  >;
}

/**
 * HttpClient - Migrated from httpClient.ts
 */
/**
 * Notification service for managing application notifications
 */
export interface NotificationService {
  sendNotification(type: string, message: string): void;
  markNotificationAsRead(id: string): Promise<void>;
  getUnreadNotifications(): Promise<any[]>;
}

/**
 * Database service for managing database connections and operations
 */
export interface DatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export interface HttpClient {
  /**
   * Perform an HTTP request
   */
  request<T = any>(
    url: string,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>;

  /**
   * GET request
   */
  get<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, "method">,
  ): Promise<HttpResponse<T>>;

  /**
   * POST request
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, "method" | "body">,
  ): Promise<HttpResponse<T>>;

  /**
   * PUT request
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, "method" | "body">,
  ): Promise<HttpResponse<T>>;

  /**
   * DELETE request
   */
  delete<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, "method">,
  ): Promise<HttpResponse<T>>;

  /**
   * PATCH request
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, "method" | "body">,
  ): Promise<HttpResponse<T>>;

  /**
   * Get metrics about the HTTP client performance
   */
  getMetrics?(): {
    poolSize: number;
    activeRequests: number;
    totalRequests: number;
    totalErrors: number;
  };

  /**
   * Clear the internal pool of resources
   */
  clearPool?(): void;
}

/**
 * PriceProvider - Migrated from priceService.ts
 */
export interface PriceProvider {
  /**
   * Get the current BTC price from this provider
   */
  getPrice(): Promise<BTCPriceData>;

  /**
   * Get the name of this price provider
   */
  getName(): string;

  /**
   * Check if this provider is currently available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * PriceService - Migrated from priceService.ts
 */
export interface PriceService {
  /**
   * Get the current BTC price with fallback logic
   */
  getPrice(): Promise<BTCPriceData>;

  /**
   * Add a price provider to the service
   */
  addProvider(provider: PriceProvider): void;

  /**
   * Remove a price provider from the service
   */
  removeProvider(providerName: string): void;

  /**
   * Get list of all providers
   */
  getProviders(): PriceProvider[];

  /**
   * Get health status of all providers
   */
  getProviderHealth(): Promise<
    Array<{
      name: string;
      available: boolean;
      lastPrice?: BTCPriceData;
    }>
  >;
}

/**
 * VersionConfig - Migrated from apiVersionMiddleware.ts
 */
export interface VersionConfig {
  supportedVersions: string[];
  defaultVersion: string;
  deprecatedVersions: string[];
  versionEndOfLife: Record<string, string>; // version -> EOL date
}

/**
 * VersionContext - Migrated from apiVersionMiddleware.ts
 */
export interface VersionContext {
  version: string;
  isDeprecated: boolean;
  endOfLife?: string;
  enhancedFields: string[];
}

/**
 * Context - Migrated from apiVersionMiddleware.ts
 */
export type Context = any;

/**
 * Next - Migrated from apiVersionMiddleware.ts
 */
export type Next = any;

/**
 * RateLimitEntry - Migrated from rateLimitMiddleware.ts
 */
export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * TransformationRule - Migrated from schemaTransformer.ts
 */
export interface TransformationRule {
  sourceField: string;
  targetField?: string;
  transform?: (value: any, data?: any) => any;
  condition?: (data: any) => boolean;
  remove?: boolean;
}

/**
 * VersionTransformationConfig - Migrated from schemaTransformer.ts
 */
export interface VersionTransformationConfig {
  version: string;
  rules: TransformationRule[];
  globalTransforms?: ((data: any) => any)[];
}

/**
 * XcpBalanceOptions - Migrated from counterpartyApiService.ts
 */
export interface XcpBalanceOptions {
  type?: "all" | "send" | "dispenser" | "issuance"; // Types of balances
  cursor?: string; // Last index for cursor-based pagination
  limit?: number; // Max results per request
  offset?: number; // Skip count (overrides cursor)
  sort?: string; // Sort order (overrides cursor)
  verbose?: boolean; // Include additional info
  showUnconfirmed?: boolean; // Include mempool results
}

/**
 * ComposeAttachOptions - Migrated from counterpartyApiService.ts
 */
export interface ComposeAttachOptions {
  // Fee parameters
  fee_per_kb?: number; // Optional - can be provided by caller or handled by API

  // Optional parameters
  destination_vout?: number;
  inputs_set?: string; // txid:vout format for specifying UTXO
  encoding?: string; // default: 'auto'
  regular_dust_size?: number; // default: 546
  multisig_dust_size?: number; // default: 1000
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean; // default: false
  exact_fee?: number;
  fee_provided?: number; // default: 0
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean; // default: false
  p2sh_pretx_txid?: string;
  segwit?: boolean; // default: false
  confirmation_target?: number; // default: 3
  exclude_utxos?: string;
  return_psbt?: boolean; // default: false (API v2 only)
  return_only_data?: boolean; // default: false (API v2 only)
  extended_tx_info?: boolean; // default: false (API v1 only)
  old_style_api?: boolean; // default: false (API v1 only)
  use_utxos_with_balances?: boolean; // default: false
  exclude_utxos_with_balances?: boolean; // default: false
  validate?: boolean; // default: true
  verbose?: boolean; // default: false
  show_unconfirmed?: boolean; // default: false
}

/**
 * ComposeDetachOptions - Migrated from counterpartyApiService.ts
 */
export interface ComposeDetachOptions {
  // Fee parameters
  fee_per_kb?: number;

  // Optional parameters
  destination?: string;
  encoding?: string;
  regular_dust_size?: number;
  multisig_dust_size?: number;
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean;
  exact_fee?: number;
  fee_provided?: number;
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean;
  p2sh_pretx_txid?: string;
  segwit?: boolean;
  confirmation_target?: number;
  exclude_utxos?: string;
  inputs_set?: string;
  return_psbt?: boolean;
  return_only_data?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  use_utxos_with_balances?: boolean;
  exclude_utxos_with_balances?: boolean;
  validate?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
}

/**
 * IssuanceOptions - Migrated from counterpartyApiService.ts
 */
export interface IssuanceOptions {
  divisible?: boolean;
  source?: string;
  allow_unconfirmed_inputs?: boolean;
  fee_per_kb?: number;
  fee?: number;
  encoding?: string;
  pubkeys?: string;
  return_psbt?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
  lock?: boolean;
  description?: string;
}

/**
 * StampServiceOptions - Migrated from stampService.ts
 */
export interface StampServiceOptions {
  cacheType: RouteType;
}

/**
 * StampFileResult - Migrated from stampService.ts
 */
export interface StampFileResult {
  status: number;
  body: string;
  stamp_url: string;
  tx_hash: string;
  headers: {
    "Content-Type": string;
    [key: string]: string;
  };
}

/**
 * CollectionQueryParams - Migrated from collection.d.ts
 */
export interface CollectionQueryParams {
  limit?: number;
  page?: number;
  creator?: string;
  sortBy?: string;
  minStampCount?: number;
  includeMarketData?: boolean; // New optional parameter
}

/**
 * CollectionProcessor - Migrated from collection.d.ts
 */
export interface CollectionProcessor {
  /**
   * Process raw collection data from database
   */
  processRawCollection(raw: any): CollectionRow;

  /**
   * Enrich collection with additional data
   */
  enrichCollection(
    collection: CollectionRow,
  ): Promise<CollectionWithOptionalMarketData>;

  /**
   * Process multiple collections in batch
   */
  processBatch(
    collections: CollectionRow[],
  ): Promise<CollectionWithOptionalMarketData[]>;

  /**
   * Transform collection for API response
   */
  transformForApi(collection: CollectionWithOptionalMarketData): any;
}

/**
 * CollectionProcessingOptions - Migrated from collection.d.ts
 */
export interface CollectionProcessingOptions {
  includeMarketData?: boolean;
  includeStampImages?: boolean;
  enrichCreatorNames?: boolean;
  calculateMetrics?: boolean;
  maxStampImages?: number;
}

/**
 * CollectionProcessingResult - Migrated from collection.d.ts
 */
export interface CollectionProcessingResult {
  processed: CollectionWithOptionalMarketData[];
  errors: CollectionProcessingError[];
  metrics: CollectionProcessingMetrics;
}

/**
 * CollectionProcessingError - Migrated from collection.d.ts
 */
export interface CollectionProcessingError {
  collectionId: string;
  error: Error;
  phase: "parsing" | "enrichment" | "transformation";
}

/**
 * CollectionProcessingMetrics - Migrated from collection.d.ts
 */
export interface CollectionProcessingMetrics {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  processingTimeMs: number;
  enrichmentTimeMs: number;
}

/**
 * CollectionAggregator - Migrated from collection.d.ts
 */
export interface CollectionAggregator {
  /**
   * Aggregate market data for collections
   */
  aggregateMarketData(
    collectionIds: string[],
  ): Promise<CollectionMarketDataAggregation>;

  /**
   * Calculate collection metrics
   */
  calculateMetrics(collection: CollectionRow): CollectionMetrics;

  /**
   * Aggregate creator statistics
   */
  aggregateCreatorStats(creatorAddress: string): Promise<CreatorStatistics>;

  /**
   * Generate collection rankings
   */
  generateRankings(options: RankingOptions): Promise<CollectionRanking[]>;
}

/**
 * CollectionMarketDataAggregation - Migrated from collection.d.ts
 */
export interface CollectionMarketDataAggregation {
  collectionId: string;
  floorPrice: {
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
  };
  volume: {
    total24h: number;
    total7d: number;
    total30d: number;
  };
  holders: {
    unique: number;
    distribution: number[];
  };
  lastUpdated: Date;
}

/**
 * CollectionMetrics - Migrated from collection.d.ts
 */
export interface CollectionMetrics {
  collectionId: string;
  stampCount: number;
  editionCount: number;
  uniqueCreators: number;
  averageEditionsPerStamp: number;
  distributionScore: number;
  activityScore: number;
  popularityScore: number;
}

/**
 * CreatorStatistics - Migrated from collection.d.ts
 */
export interface CreatorStatistics {
  creatorAddress: string;
  totalCollections: number;
  totalStamps: number;
  totalEditions: number;
  averageCollectionSize: number;
  topCollections: CollectionSummary[];
  createdDateRange: {
    first: Date;
    last: Date;
  };
}

/**
 * CollectionSummary - Migrated from collection.d.ts
 */
export interface CollectionSummary {
  collectionId: string;
  collectionName: string;
  stampCount: number;
  floorPrice: number | null;
}

/**
 * RankingOptions - Migrated from collection.d.ts
 */
export interface RankingOptions {
  metric: "volume" | "holders" | "activity" | "growth";
  period: "24h" | "7d" | "30d" | "all";
  limit: number;
  includeMetadata?: boolean;
}

/**
 * CollectionRanking - Migrated from collection.d.ts
 */
export interface CollectionRanking {
  rank: number;
  collection: CollectionWithOptionalMarketData;
  score: number;
  change24h: number;
  metadata?: {
    previousRank: number;
    trend: "up" | "down" | "stable";
  };
}

/**
 * CollectionIndex - Migrated from collection.d.ts
 */
export interface CollectionIndex {
  /**
   * Index by collection ID
   */
  byId: Map<string, CollectionRow>;

  /**
   * Index by creator address
   */
  byCreator: Map<string, string[]>;

  /**
   * Index by stamp ID
   */
  byStamp: Map<number, string>;

  /**
   * Index by name (normalized)
   */
  byName: Map<string, string>;

  /**
   * Build indices from collections
   */
  build(collections: CollectionRow[]): void;

  /**
   * Update index with new collection
   */
  update(collection: CollectionRow): void;

  /**
   * Remove collection from index
   */
  remove(collectionId: string): void;

  /**
   * Search collections
   */
  search(query: CollectionSearchQuery): CollectionRow[];
}

/**
 * CollectionSearchQuery - Migrated from collection.d.ts
 */
export interface CollectionSearchQuery {
  text?: string;
  creator?: string;
  stampIds?: number[];
  minStampCount?: number;
  maxStampCount?: number;
  sortBy?: CollectionSortField;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * CollectionValidator - Migrated from collection.d.ts
 */
export interface CollectionValidator {
  /**
   * Validate collection data
   */
  validate(collection: Partial<CollectionRow>): ValidationResult<CollectionRow>;

  /**
   * Validate collection ID format
   */
  validateId(id: string): boolean;

  /**
   * Validate collection name
   */
  validateName(name: string): ValidationResult<string>;

  /**
   * Validate stamp array
   */
  validateStamps(stamps: number[]): ValidationResult<number[]>;

  /**
   * Validate creator addresses
   */
  validateCreators(creators: string[]): ValidationResult<string[]>;
}

/**
 * CollectionValidationRules - Migrated from collection.d.ts
 */
export interface CollectionValidationRules {
  idPattern: RegExp;
  nameMinLength: number;
  nameMaxLength: number;
  descriptionMaxLength: number;
  minStampCount: number;
  maxStampCount: number;
  maxCreators: number;
}

/**
 * CollectionValidationError - Migrated from collection.d.ts
 */
export interface CollectionValidationError {
  field: keyof CollectionRow;
  code: CollectionValidationErrorCode;
  message: string;
  value?: any;
}

/**
 * CollectionServiceConfig - Migrated from collection.d.ts
 */
export interface CollectionServiceConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  enrichmentEnabled: boolean;
  marketDataEnabled: boolean;
  batchSize: number;
  maxConcurrentRequests: number;
}

/**
 * CollectionServiceOptions - Migrated from collection.d.ts
 */
export interface CollectionServiceOptions extends CollectionQueryParams {
  includeDeleted?: boolean;
  forceRefresh?: boolean;
  timeout?: number;
}

/**
 * CollectionCreateParams - Migrated from collection.d.ts
 */
export interface CollectionCreateParams {
  collection_name: string;
  collection_description: string;
  creators: string[];
  stamps: number[];
  img?: string;
}

/**
 * CollectionUpdateParams - Migrated from collection.d.ts
 */
export interface CollectionUpdateParams {
  collection_name?: string;
  collection_description?: string;
  stamps?: number[];
  img?: string;
}

/**
 * CollectionServiceResult - Migrated from collection.d.ts
 */
export interface CollectionServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: {
    cached: boolean;
    processingTimeMs: number;
    source: "cache" | "database" | "computed";
  };
}

/**
 * CollectionCacheEntry - Migrated from collection.d.ts
 */
export interface CollectionCacheEntry {
  collection: CollectionWithOptionalMarketData;
  cachedAt: Date;
  expiresAt: Date;
  hits: number;
  source: "database" | "computed" | "external";
}

/**
 * CollectionCacheStats - Migrated from collection.d.ts
 */
export interface CollectionCacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  averageAge: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  totalHits: number;
  totalMisses: number;
}

/**
 * CollectionCacheOptions - Migrated from collection.d.ts
 */
export interface CollectionCacheOptions {
  maxSize: number;
  ttl: number;
  evictionPolicy: "lru" | "lfu" | "ttl";
  preload?: string[];
  warmupOnStart?: boolean;
}

/**
 * CollectionSortField - Migrated from collection.d.ts
 */
export type CollectionSortField =
  | "name"
  | "created_at"
  | "updated_at"
  | "creator"
  | "stamps_count";

// CollectionValidationErrorCode is now imported from $constants above

/**
 * DatabaseSchema - Migrated from database.d.ts
 */
export interface DatabaseSchema {
  tables: TableDefinitions;
  indexes: IndexDefinitions;
  constraints: ConstraintDefinitions;
  version: string;
}

/**
 * TableDefinitions - Migrated from database.d.ts
 */
export interface TableDefinitions {
  [tableName: string]: TableDefinition;
}

/**
 * TableDefinition - Migrated from database.d.ts
 */
export interface TableDefinition {
  name: string;
  columns: ColumnDefinitions;
  primaryKey: string[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
  engine?: DatabaseEngine;
  charset?: string;
  collation?: string;
}

/**
 * ColumnDefinitions - Migrated from database.d.ts
 */
export interface ColumnDefinitions {
  [columnName: string]: ColumnDefinition;
}

/**
 * ColumnDefinition - Migrated from database.d.ts
 */
export interface ColumnDefinition {
  type: ColumnType;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  default?: unknown;
  length?: number;
  precision?: number;
  scale?: number;
  comment?: string;
  collation?: string;
}

/**
 * IndexDefinitions - Migrated from database.d.ts
 */
export interface IndexDefinitions {
  [indexName: string]: IndexDefinition;
}

/**
 * IndexDefinition - Migrated from database.d.ts
 */
export interface IndexDefinition {
  name: string;
  table: string;
  columns: IndexColumn[];
  type?: IndexType;
  unique?: boolean;
  algorithm?: IndexAlgorithm;
}

/**
 * IndexColumn - Migrated from database.d.ts
 */
export interface IndexColumn {
  column: string;
  length?: number;
  order?: "ASC" | "DESC";
}

/**
 * ConstraintDefinitions - Migrated from database.d.ts
 */
export interface ConstraintDefinitions {
  [constraintName: string]: ConstraintDefinition;
}

/**
 * ConstraintDefinition - Migrated from database.d.ts
 */
export interface ConstraintDefinition {
  name: string;
  type: ConstraintType;
  table: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
}

/**
 * QueryBuilder - Migrated from database.d.ts
 */
export interface QueryBuilder<T = any> {
  select: SelectQueryBuilder<T>;
  insert: InsertQueryBuilder<T>;
  update: UpdateQueryBuilder<T>;
  delete: DeleteQueryBuilder<T>;
}

/**
 * SelectQueryBuilder - Migrated from database.d.ts
 */
export interface SelectQueryBuilder<T = any> {
  from(table: string): SelectQueryBuilder<T>;
  select(
    columns?: keyof T | (keyof T)[] | string | string[],
  ): SelectQueryBuilder<T>;
  where(
    condition: WhereCondition<T> | string,
    value?: any,
  ): SelectQueryBuilder<T>;
  whereIn(column: keyof T | string, values: any[]): SelectQueryBuilder<T>;
  whereNotIn(column: keyof T | string, values: any[]): SelectQueryBuilder<T>;
  whereBetween(
    column: keyof T | string,
    min: any,
    max: any,
  ): SelectQueryBuilder<T>;
  whereNull(column: keyof T | string): SelectQueryBuilder<T>;
  whereNotNull(column: keyof T | string): SelectQueryBuilder<T>;
  join(table: string, on: JoinCondition): SelectQueryBuilder<T>;
  leftJoin(table: string, on: JoinCondition): SelectQueryBuilder<T>;
  rightJoin(table: string, on: JoinCondition): SelectQueryBuilder<T>;
  innerJoin(table: string, on: JoinCondition): SelectQueryBuilder<T>;
  groupBy(
    columns: keyof T | (keyof T)[] | string | string[],
  ): SelectQueryBuilder<T>;
  having(condition: string): SelectQueryBuilder<T>;
  orderBy(
    column: keyof T | string,
    direction?: OrderDirection,
  ): SelectQueryBuilder<T>;
  limit(count: number): SelectQueryBuilder<T>;
  offset(count: number): SelectQueryBuilder<T>;
  distinct(): SelectQueryBuilder<T>;
  count(column?: keyof T | string): SelectQueryBuilder<T>;
  sum(column: keyof T | string): SelectQueryBuilder<T>;
  avg(column: keyof T | string): SelectQueryBuilder<T>;
  min(column: keyof T | string): SelectQueryBuilder<T>;
  max(column: keyof T | string): SelectQueryBuilder<T>;
  toSQL(): string;
  execute(): Promise<QueryResult<T>>;
}

/**
 * InsertQueryBuilder - Migrated from database.d.ts
 */
export interface InsertQueryBuilder<T = any> {
  into(table: string): InsertQueryBuilder<T>;
  values(data: Partial<T> | Partial<T>[]): InsertQueryBuilder<T>;
  onDuplicateKeyUpdate(data: Partial<T>): InsertQueryBuilder<T>;
  ignore(): InsertQueryBuilder<T>;
  toSQL(): string;
  execute(): Promise<InsertResult>;
}

/**
 * UpdateQueryBuilder - Migrated from database.d.ts
 */
export interface UpdateQueryBuilder<T = any> {
  table(table: string): UpdateQueryBuilder<T>;
  set(data: Partial<T>): UpdateQueryBuilder<T>;
  where(
    condition: WhereCondition<T> | string,
    value?: any,
  ): UpdateQueryBuilder<T>;
  whereIn(column: keyof T | string, values: any[]): UpdateQueryBuilder<T>;
  limit(count: number): UpdateQueryBuilder<T>;
  toSQL(): string;
  execute(): Promise<UpdateResult>;
}

/**
 * DeleteQueryBuilder - Migrated from database.d.ts
 */
export interface DeleteQueryBuilder<T = any> {
  from(table: string): DeleteQueryBuilder<T>;
  where(
    condition: WhereCondition<T> | string,
    value?: any,
  ): DeleteQueryBuilder<T>;
  whereIn(column: keyof T | string, values: any[]): DeleteQueryBuilder<T>;
  limit(count: number): DeleteQueryBuilder<T>;
  toSQL(): string;
  execute(): Promise<DeleteResult>;
}

/**
 * WhereOperator - Migrated from database.d.ts
 */
export interface WhereOperator<T> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $like?: string;
  $notLike?: string;
  $between?: [T, T];
  $notBetween?: [T, T];
  $isNull?: boolean;
  $isNotNull?: boolean;
}

/**
 * QueryResult - Migrated from database.d.ts
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields: FieldInfo[];
  affectedRows?: number;
  insertId?: number;
  warningCount?: number;
}

/**
 * InsertResult - Migrated from database.d.ts
 */
export interface InsertResult {
  insertId: number;
  affectedRows: number;
  warningCount?: number;
}

/**
 * UpdateResult - Migrated from database.d.ts
 */
export interface UpdateResult {
  affectedRows: number;
  changedRows: number;
  warningCount?: number;
}

/**
 * DeleteResult - Migrated from database.d.ts
 */
export interface DeleteResult {
  affectedRows: number;
  warningCount?: number;
}

/**
 * FieldInfo - Migrated from database.d.ts
 */
export interface FieldInfo {
  name: string;
  type: string;
  length: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  default: any;
}

/**
 * Model - Migrated from database.d.ts
 */
export interface Model<T = any> {
  tableName: string;
  primaryKey: keyof T | (keyof T)[];
  fillable?: (keyof T)[];
  guarded?: (keyof T)[];
  hidden?: (keyof T)[];
  casts?: ModelCasts<T>;
  timestamps?: boolean;
  createdAt?: keyof T;
  updatedAt?: keyof T;
  deletedAt?: keyof T; // For soft deletes
  relations?: ModelRelations<T>;
}

/**
 * ModelRelations - Migrated from database.d.ts
 */
export interface ModelRelations<T> {
  [relationName: string]: RelationDefinition;
}

/**
 * RelationDefinition - Migrated from database.d.ts
 */
export interface RelationDefinition {
  type: RelationType;
  model: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  pivotForeignKey?: string;
  pivotLocalKey?: string;
  through?: string;
  throughForeignKey?: string;
  throughLocalKey?: string;
}

/**
 * ModelQueryBuilder - Migrated from database.d.ts
 */
export interface ModelQueryBuilder<T = any> extends SelectQueryBuilder<T> {
  create(data: Omit<T, "id">): Promise<T>;
  find(id: number | string): Promise<T | null>;
  findOrFail(id: number | string): Promise<T>;
  first(): Promise<T | null>;
  firstOrFail(): Promise<T>;
  get(): Promise<T[]>;
  paginate(page: number, perPage: number): Promise<PaginatedResult<T>>;
  with(relations: string | string[]): ModelQueryBuilder<T>;
  withCount(relations: string | string[]): ModelQueryBuilder<T>;
  scopes(scopes: string | string[]): ModelQueryBuilder<T>;
  fresh(): ModelQueryBuilder<T>;
  trashed(): ModelQueryBuilder<T>; // For soft deletes
  withTrashed(): ModelQueryBuilder<T>; // For soft deletes
  onlyTrashed(): ModelQueryBuilder<T>; // For soft deletes
}

/**
 * ModelLifecycleHooks - Migrated from database.d.ts
 */
export interface ModelLifecycleHooks<T> {
  creating?: (model: Partial<T>) => Promise<void> | void;
  created?: (model: T) => Promise<void> | void;
  updating?: (model: Partial<T>) => Promise<void> | void;
  updated?: (model: T) => Promise<void> | void;
  saving?: (model: Partial<T>) => Promise<void> | void;
  saved?: (model: T) => Promise<void> | void;
  deleting?: (model: T) => Promise<void> | void;
  deleted?: (model: T) => Promise<void> | void;
  restoring?: (model: T) => Promise<void> | void; // For soft deletes
  restored?: (model: T) => Promise<void> | void; // For soft deletes
}

/**
 * QueryScope - Migrated from database.d.ts
 */
export interface QueryScope<T> {
  [scopeName: string]: (
    query: ModelQueryBuilder<T>,
    ...args: any[]
  ) => ModelQueryBuilder<T>;
}

/**
 * Migration - Migrated from database.d.ts
 */
export interface Migration {
  id: string;
  name: string;
  version: string;
  description?: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  dependencies?: string[];
  createdAt?: Date;
  executedAt?: Date;
}

/**
 * MigrationOperation - Migrated from database.d.ts
 */
export interface MigrationOperation {
  type: MigrationOperationType;
  table?: string;
  column?: string;
  index?: string;
  constraint?: string;
  data?: any;
}

/**
 * SchemaBuilder - Migrated from database.d.ts
 */
export interface SchemaBuilder {
  createTable(
    name: string,
    callback: (table: TableBuilder) => void,
  ): Promise<void>;
  dropTable(name: string): Promise<void>;
  renameTable(from: string, to: string): Promise<void>;
  alterTable(
    name: string,
    callback: (table: TableBuilder) => void,
  ): Promise<void>;
  hasTable(name: string): Promise<boolean>;
  hasColumn(table: string, column: string): Promise<boolean>;
  hasIndex(table: string, index: string): Promise<boolean>;
  raw(sql: string, bindings?: any[]): Promise<void>;
}

/**
 * TableBuilder - Migrated from database.d.ts
 */
export interface TableBuilder {
  // Column creation methods
  increments(name?: string): ColumnBuilder;
  integer(name: string): ColumnBuilder;
  bigInteger(name: string): ColumnBuilder;
  tinyInteger(name: string): ColumnBuilder;
  smallInteger(name: string): ColumnBuilder;
  mediumInteger(name: string): ColumnBuilder;
  decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
  float(name: string, precision?: number, scale?: number): ColumnBuilder;
  double(name: string, precision?: number, scale?: number): ColumnBuilder;
  string(name: string, length?: number): ColumnBuilder;
  char(name: string, length?: number): ColumnBuilder;
  text(name: string): ColumnBuilder;
  mediumText(name: string): ColumnBuilder;
  longText(name: string): ColumnBuilder;
  date(name: string): ColumnBuilder;
  dateTime(name: string): ColumnBuilder;
  time(name: string): ColumnBuilder;
  timestamp(name: string): ColumnBuilder;
  timestamps(): void;
  binary(name: string): ColumnBuilder;
  boolean(name: string): ColumnBuilder;
  json(name: string): ColumnBuilder;
  enum(name: string, values: string[]): ColumnBuilder;

  // Index methods
  primary(columns: string | string[]): void;
  unique(columns: string | string[], indexName?: string): void;
  index(columns: string | string[], indexName?: string): void;
  fulltext(columns: string | string[], indexName?: string): void;
  spatial(columns: string | string[], indexName?: string): void;

  // Foreign key methods
  foreign(columns: string | string[]): ForeignKeyBuilder;

  // Column modification methods
  dropColumn(name: string | string[]): void;
  renameColumn(from: string, to: string): void;
  dropPrimary(indexName?: string): void;
  dropUnique(indexName: string): void;
  dropIndex(indexName: string): void;
  dropForeign(indexName: string): void;
}

/**
 * ColumnBuilder - Migrated from database.d.ts
 */
export interface ColumnBuilder {
  nullable(): ColumnBuilder;
  notNullable(): ColumnBuilder;
  primary(): ColumnBuilder;
  unique(): ColumnBuilder;
  index(): ColumnBuilder;
  defaultTo(value: any): ColumnBuilder;
  comment(text: string): ColumnBuilder;
  collate(collation: string): ColumnBuilder;
  after(column: string): ColumnBuilder;
  first(): ColumnBuilder;
  unsigned(): ColumnBuilder;
  autoIncrement(): ColumnBuilder;
}

/**
 * ForeignKeyBuilder - Migrated from database.d.ts
 */
export interface ForeignKeyBuilder {
  references(column: string): ForeignKeyBuilder;
  inTable(table: string): ForeignKeyBuilder;
  onDelete(action: ReferentialAction): ForeignKeyBuilder;
  onUpdate(action: ReferentialAction): ForeignKeyBuilder;
}

/**
 * MigrationRunner - Migrated from database.d.ts
 */
export interface MigrationRunner {
  up(target?: string): Promise<MigrationResult[]>;
  down(target?: string): Promise<MigrationResult[]>;
  rollback(steps?: number): Promise<MigrationResult[]>;
  reset(): Promise<MigrationResult[]>;
  refresh(): Promise<MigrationResult[]>;
  status(): Promise<MigrationStatus[]>;
  make(name: string): Promise<string>;
}

/**
 * MigrationResult - Migrated from database.d.ts
 */
export interface MigrationResult {
  migration: Migration;
  success: boolean;
  error?: Error;
  executionTime?: number;
}

/**
 * MigrationStatus - Migrated from database.d.ts
 */
export interface MigrationStatus {
  migration: Migration;
  executed: boolean;
  executedAt?: Date;
  batch?: number;
}

/**
 * StampTableSchema - Migrated from database.d.ts
 */
export interface StampTableSchema {
  stamp_number: number;
  tx_hash: string;
  tx_index: number;
  block_index: number;
  creator: string;
  stamp_base64: string;
  stamp_url: string;
  stamp_mimetype: string;
  is_btc_stamp: boolean;
  supply: number;
  locked: boolean;
  divisible: boolean;
  stamp_hash: string;
  creator_name?: string;
  cpid?: string;
  keyburn?: boolean;
  ident?: string;
  is_cursed?: boolean;
  is_reissuance?: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * SRC20TokenTableSchema - Migrated from database.d.ts
 */
export interface SRC20TokenTableSchema {
  id: number;
  tick: string;
  max: string;
  lim: string;
  dec: number;
  address: string;
  tx_hash: string;
  block_index: number;
  timestamp: Date;
  total_minted: string;
  total_holders: number;
  total_transfers: number;
  status: SRC20TokenStatus;
  creator_fee?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * SRC20BalanceTableSchema - Migrated from database.d.ts
 */
export interface SRC20BalanceTableSchema {
  id: number;
  address: string;
  tick: string;
  balance: string;
  last_update_block: number;
  last_update_tx: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * SRC20TransferTableSchema - Migrated from database.d.ts
 */
export interface SRC20TransferTableSchema {
  id: number;
  tick: string;
  from_address: string;
  to_address: string;
  amount: string;
  tx_hash: string;
  block_index: number;
  timestamp: Date;
  transfer_type: SRC20TransferType;
  status: TransferStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * TransactionTableSchema - Migrated from database.d.ts
 */
export interface TransactionTableSchema {
  id: number;
  tx_hash: string;
  block_index: number;
  block_hash: string;
  timestamp: Date;
  source: string;
  destination?: string;
  btc_amount: number;
  fee: number;
  data?: string;
  supported: boolean;
  order_index: number;
  tx_index: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * BlockTableSchema - Migrated from database.d.ts
 */
export interface BlockTableSchema {
  block_index: number;
  block_hash: string;
  block_time: Date;
  previous_block_hash: string;
  difficulty: number;
  ledger_hash: string;
  txlist_hash: string;
  messages_hash: string;
  indexed_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * UTXOTableSchema - Migrated from database.d.ts
 */
export interface UTXOTableSchema {
  id: number;
  txid: string;
  vout: number;
  address: string;
  script: string;
  value: number;
  confirmations: number;
  spent: boolean;
  spent_by_txid?: string;
  spent_by_vin?: number;
  block_index?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * WalletBalanceTableSchema - Migrated from database.d.ts
 */
export interface WalletBalanceTableSchema {
  id: number;
  address: string;
  balance: number;
  unconfirmed_balance: number;
  last_update_block: number;
  last_seen_tx: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * DatabaseConnection - Migrated from database.d.ts
 */
export interface DatabaseConnection {
  type: DatabaseType;
  config: DatabaseConnectionConfig;
  client: any;
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  execute(query: string, params?: any[]): Promise<QueryResult>;
  transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * DatabaseConnectionConfig - Migrated from database.d.ts
 */
export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  charset?: string;
  timezone?: string;
  connectTimeout?: number;
  acquireTimeout?: number;
  timeout?: number;
  reconnect?: boolean;
  pool?: PoolConfig;
}

/**
 * PoolConfig - Migrated from database.d.ts
 */
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  propagateCreateError?: boolean;
}

/**
 * Transaction - Migrated from database.d.ts
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  rollbackTo(name: string): Promise<void>;
  release(name: string): Promise<void>;
  isCompleted(): boolean;
  query(sql: string, params?: any[]): Promise<QueryResult>;
}

/**
 * SQLDatabase - Migrated from database.d.ts
 */
export interface SQLDatabase extends DatabaseConnection {
  type: "mysql" | "postgresql" | "sqlite";
  schema: SchemaBuilder;
  migrate: MigrationRunner;
  seed: SeedRunner;
}

/**
 * NoSQLDatabase - Migrated from database.d.ts
 */
export interface NoSQLDatabase extends DatabaseConnection {
  type: "mongodb";
  collection(name: string): Collection;
  listCollections(): Promise<string[]>;
  createCollection(
    name: string,
    options?: CollectionOptions,
  ): Promise<Collection>;
  dropCollection(name: string): Promise<boolean>;
}

/**
 * Collection - Migrated from database.d.ts
 */
export interface Collection {
  name: string;
  find(filter?: any, options?: FindOptions): Promise<any[]>;
  findOne(filter?: any, options?: FindOptions): Promise<any | null>;
  insertOne(document: any): Promise<InsertOneResult>;
  insertMany(documents: any[]): Promise<InsertManyResult>;
  updateOne(
    filter: any,
    update: any,
    options?: UpdateOptions,
  ): Promise<UpdateOneResult>;
  updateMany(
    filter: any,
    update: any,
    options?: UpdateOptions,
  ): Promise<UpdateManyResult>;
  deleteOne(filter: any): Promise<DeleteOneResult>;
  deleteMany(filter: any): Promise<DeleteManyResult>;
  countDocuments(filter?: any): Promise<number>;
  createIndex(keys: any, options?: IndexOptions): Promise<string>;
  dropIndex(indexName: string): Promise<void>;
  aggregate(pipeline: any[]): Promise<any[]>;
}

/**
 * FindOptions - Migrated from database.d.ts
 */
export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: any;
  projection?: any;
}

/**
 * UpdateOptions - Migrated from database.d.ts
 */
export interface UpdateOptions {
  upsert?: boolean;
  multi?: boolean;
}

/**
 * IndexOptions - Migrated from database.d.ts
 */
export interface IndexOptions {
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  name?: string;
  expireAfterSeconds?: number;
}

/**
 * InsertOneResult - Migrated from database.d.ts
 */
export interface InsertOneResult {
  insertedId: any;
  acknowledged: boolean;
}

/**
 * InsertManyResult - Migrated from database.d.ts
 */
export interface InsertManyResult {
  insertedIds: any[];
  insertedCount: number;
  acknowledged: boolean;
}

/**
 * UpdateOneResult - Migrated from database.d.ts
 */
export interface UpdateOneResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: any;
  acknowledged: boolean;
}

/**
 * UpdateManyResult - Migrated from database.d.ts
 */
export interface UpdateManyResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedIds: any[];
  acknowledged: boolean;
}

/**
 * DeleteOneResult - Migrated from database.d.ts
 */
export interface DeleteOneResult {
  deletedCount: number;
  acknowledged: boolean;
}

/**
 * DeleteManyResult - Migrated from database.d.ts
 */
export interface DeleteManyResult {
  deletedCount: number;
  acknowledged: boolean;
}

/**
 * CollectionOptions - Migrated from database.d.ts
 */
export interface CollectionOptions {
  capped?: boolean;
  size?: number;
  max?: number;
  validator?: any;
  validationLevel?: "off" | "strict" | "moderate";
  validationAction?: "error" | "warn";
}

/**
 * RedisDatabase - Migrated from database.d.ts
 */
export interface RedisDatabase extends DatabaseConnection {
  type: "redis";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<string>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushdb(): Promise<string>;
  flushall(): Promise<string>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string | string[]): Promise<number>;
  sadd(key: string, member: string | string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, member: string | string[]): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrem(key: string, member: string | string[]): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string | string[]): Promise<void>;
  unsubscribe(channel?: string | string[]): Promise<void>;
}

/**
 * QueryPerformanceMetrics - Migrated from database.d.ts
 */
export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  rowsExamined: number;
  indexesUsed: string[];
  warnings: QueryWarning[];
  timestamp: Date;
  connectionId: string;
  database: string;
  user: string;
}

/**
 * QueryWarning - Migrated from database.d.ts
 */
export interface QueryWarning {
  level: "Note" | "Warning" | "Error";
  code: number;
  message: string;
}

/**
 * ConnectionPoolStatistics - Migrated from database.d.ts
 */
export interface ConnectionPoolStatistics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  maxConnections: number;
  minConnections: number;
  averageAcquireTime: number;
  peakActiveConnections: number;
  totalAcquiredConnections: number;
  totalReleasedConnections: number;
  connectionErrors: number;
  lastResetTime: Date;
}

/**
 * DatabaseHealthCheck - Migrated from database.d.ts
 */
export interface DatabaseHealthCheck {
  status: HealthStatus;
  responseTime: number;
  uptime: number;
  connections: ConnectionPoolStatistics;
  performance: PerformanceMetrics;
  storage: StorageMetrics;
  replication?: ReplicationStatus;
  lastCheck: Date;
  checks: HealthCheckResult[];
}

/**
 * HealthCheckResult - Migrated from database.d.ts
 */
export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  responseTime: number;
  timestamp: Date;
}

/**
 * PerformanceMetrics - Migrated from database.d.ts
 */
export interface PerformanceMetrics {
  queriesPerSecond: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRatio: number;
  bufferPoolUsage: number;
  indexEfficiency: number;
}

/**
 * StorageMetrics - Migrated from database.d.ts
 */
export interface StorageMetrics {
  totalSize: number;
  dataSize: number;
  indexSize: number;
  freeSpace: number;
  growthRate: number;
  fragmentation: number;
}

/**
 * ReplicationStatus - Migrated from database.d.ts
 */
export interface ReplicationStatus {
  role: "master" | "slave" | "replica";
  lag: number;
  connected: boolean;
  replicatingDatabases: string[];
  lastIOError?: string;
  lastSQLError?: string;
}

/**
 * BackupOperation - Migrated from database.d.ts
 */
export interface BackupOperation {
  id: string;
  type: BackupType;
  status: BackupStatus;
  database: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size?: number;
  location: string;
  compression?: CompressionType;
  encryption?: boolean;
  checksum?: string;
  error?: string;
}

/**
 * RestoreOperation - Migrated from database.d.ts
 */
export interface RestoreOperation {
  id: string;
  backupId: string;
  status: RestoreStatus;
  database: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pointInTime?: Date;
  options: RestoreOptions;
  error?: string;
}

/**
 * RestoreOptions - Migrated from database.d.ts
 */
export interface RestoreOptions {
  overwrite: boolean;
  verifyChecksum: boolean;
  skipData: boolean;
  skipIndexes: boolean;
  targetDatabase?: string;
  pointInTime?: Date;
}

/**
 * SeedRunner - Migrated from database.d.ts
 */
export interface SeedRunner {
  run(seedName?: string): Promise<SeedResult[]>;
  make(name: string): Promise<string>;
  rollback(): Promise<SeedResult[]>;
  status(): Promise<SeedStatus[]>;
}

/**
 * SeedResult - Migrated from database.d.ts
 */
export interface SeedResult {
  seed: string;
  success: boolean;
  error?: Error;
  executionTime?: number;
}

/**
 * SeedStatus - Migrated from database.d.ts
 */
export interface SeedStatus {
  seed: string;
  executed: boolean;
  executedAt?: Date;
}

/**
 * Repository - Migrated from database.d.ts
 */
export interface Repository<T = any> {
  find(id: string | number): Promise<T | null>;
  findAll(options?: FindAllOptions): Promise<T[]>;
  findBy(criteria: Partial<T>, options?: FindOptions): Promise<T[]>;
  findOneBy(criteria: Partial<T>): Promise<T | null>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T | null>;
  delete(id: string | number): Promise<boolean>;
  exists(criteria: Partial<T>): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
  paginate(
    page: number,
    limit: number,
    criteria?: Partial<T>,
  ): Promise<PaginatedResult<T>>;
}

/**
 * FindAllOptions - Migrated from database.d.ts
 */
export interface FindAllOptions {
  limit?: number;
  offset?: number;
  orderBy?: OrderBy[];
  include?: string[];
}

/**
 * OrderBy - Migrated from database.d.ts
 */
export interface OrderBy {
  field: string;
  direction: "ASC" | "DESC";
}

/**
 * StampRepository - Migrated from database.d.ts
 */
export interface StampRepository extends Repository<StampRow> {
  findByStampNumber(stampNumber: number): Promise<StampRow | null>;
  findByTxHash(txHash: string): Promise<StampRow[]>;
  findByCreator(creator: string, options?: FindAllOptions): Promise<StampRow[]>;
  findCursedStamps(options?: FindAllOptions): Promise<StampRow[]>;
  findRecentStamps(limit?: number): Promise<StampRow[]>;
  getStampStats(): Promise<StampStatistics>;
}

/**
 * SRC20Repository - Migrated from database.d.ts
 */
export interface SRC20Repository extends Repository<SRC20Row> {
  findByTick(tick: string): Promise<SRC20Row | null>;
  findByAddress(address: string, options?: FindAllOptions): Promise<SRC20Row[]>;
  findBalances(address: string): Promise<SRC20Balance[]>;
  getTokenHolders(tick: string): Promise<number>;
  getTotalSupply(tick: string): Promise<string>;
  getTokenStats(tick: string): Promise<SRC20TokenStats>;
}

/**
 * TransactionRepository - Migrated from database.d.ts
 */
export interface TransactionRepository extends Repository<SendRow> {
  findByHash(hash: string): Promise<SendRow | null>;
  findByBlock(blockIndex: number, options?: FindAllOptions): Promise<SendRow[]>;
  findByAddress(address: string, options?: FindAllOptions): Promise<SendRow[]>;
  findPending(options?: FindAllOptions): Promise<SendRow[]>;
  getTransactionFees(limit?: number): Promise<FeeStatistics>;
}

/**
 * StampStatistics - Migrated from database.d.ts
 */
export interface StampStatistics {
  totalStamps: number;
  cursedStamps: number;
  uniqueCreators: number;
  totalVolume: number;
  averageSize: number;
  latestStamp: number;
}

/**
 * SRC20TokenStats - Migrated from database.d.ts
 */
export interface SRC20TokenStats {
  totalSupply: string;
  circulatingSupply: string;
  holders: number;
  transfers: number;
  mintProgress: number;
  isCompleted: boolean;
}

/**
 * FeeStatistics - Migrated from database.d.ts
 */
export interface FeeStatistics {
  averageFee: number;
  medianFee: number;
  minFee: number;
  maxFee: number;
  totalFees: number;
  samples: number;
  timestamp: Date;
}

/**
 * ColumnType - Migrated from database.d.ts
 */
export type ColumnType =
  | "VARCHAR"
  | "INT"
  | "BIGINT"
  | "DECIMAL"
  | "TEXT"
  | "DATETIME"
  | "TIMESTAMP"
  | "BOOLEAN"
  | "JSON";

/**
 * DatabaseEngine - Migrated from database.d.ts
 */
export type DatabaseEngine = "InnoDB" | "MyISAM" | "Memory" | "Archive";

/**
 * IndexType - Migrated from database.d.ts
 */
export type IndexType = "BTREE" | "HASH" | "FULLTEXT" | "SPATIAL";

/**
 * IndexAlgorithm - Migrated from database.d.ts
 */
export type IndexAlgorithm = "DEFAULT" | "INPLACE" | "COPY";

/**
 * ConstraintType - Migrated from database.d.ts
 */
export type ConstraintType = "FOREIGN_KEY" | "CHECK" | "UNIQUE" | "PRIMARY_KEY";

/**
 * ReferentialAction - Migrated from database.d.ts
 */
export type ReferentialAction =
  | "CASCADE"
  | "SET_NULL"
  | "RESTRICT"
  | "NO_ACTION"
  | "SET_DEFAULT";

/**
 * WhereCondition - Migrated from database.d.ts
 */
export type WhereCondition<T> = {
  [K in keyof T]?: T[K] | WhereOperator<T[K]>;
};

/**
 * JoinCondition - Migrated from database.d.ts
 */
export type JoinCondition = string | {
  left: string;
  operator: ComparisonOperator;
  right: string;
};

/**
 * ComparisonOperator - Migrated from database.d.ts
 */
export type ComparisonOperator =
  | "="
  | "!="
  | "<>"
  | "<"
  | "<="
  | ">"
  | ">="
  | "LIKE"
  | "NOT LIKE";

/**
 * OrderDirection - Migrated from database.d.ts
 */
export type OrderDirection = "ASC" | "DESC";

/**
 * ModelCasts - Migrated from database.d.ts
 */
export type ModelCasts<T> = {
  [K in keyof T]?: CastType;
};

/**
 * CastType - Migrated from database.d.ts
 */
export type CastType = "string" | "number" | "boolean" | "date" | "json";

/**
 * RelationType - Migrated from database.d.ts
 */
export type RelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

/**
 * MigrationOperationType - Migrated from database.d.ts
 */
export type MigrationOperationType =
  | "CREATE_TABLE"
  | "ALTER_TABLE"
  | "DROP_TABLE"
  | "CREATE_INDEX"
  | "DROP_INDEX"
  | "INSERT"
  | "UPDATE"
  | "DELETE";

/**
 * SRC20TokenStatus - Migrated from database.d.ts
 */
export type SRC20TokenStatus = "active" | "completed" | "invalid" | "cancelled";

/**
 * SRC20TransferType - Migrated from database.d.ts
 */
export type SRC20TransferType = "mint" | "transfer" | "deploy";

/**
 * TransferStatus - Migrated from database.d.ts
 */
export type TransferStatus = "confirmed" | "pending" | "failed";

/**
 * DatabaseType - Migrated from database.d.ts
 */
export type DatabaseType =
  | "mysql"
  | "postgresql"
  | "sqlite"
  | "mongodb"
  | "redis";

/**
 * HealthStatus - Migrated from database.d.ts
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/**
 * BackupType - Migrated from database.d.ts
 */
export type BackupType = "full" | "incremental" | "differential" | "log";

/**
 * BackupStatus - Migrated from database.d.ts
 */
export type BackupStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * CompressionType - Migrated from database.d.ts
 */
export type CompressionType = "none" | "gzip" | "bzip2" | "lz4" | "zstd";

/**
 * RestoreStatus - Migrated from database.d.ts
 */
export type RestoreStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * ServerEnvironment - Migrated from index.d.ts
 */
export interface ServerEnvironment {
  /** Application environment mode */
  NODE_ENV: "development" | "production" | "test" | "staging";

  /** Server port configuration */
  PORT: number;
  HOST?: string;

  /** Database configuration */
  DATABASE_URL: string;
  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_NAME?: string;
  DATABASE_USER?: string;
  DATABASE_PASSWORD?: string;

  /** Redis configuration */
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;

  /** External service URLs */
  BITCOIN_NODE_URL?: string;
  COUNTERPARTY_API_URL?: string;

  /** Security and authentication */
  JWT_SECRET?: string;
  API_KEY?: string;

  /** Monitoring and logging */
  LOG_LEVEL?: "error" | "warn" | "info" | "debug";
  ENABLE_METRICS?: boolean;
  METRICS_PORT?: number;

  /** Performance tuning */
  DATABASE_POOL_SIZE?: number;
  REQUEST_TIMEOUT?: number;
  CACHE_TTL?: number;
}

/**
 * ServerConfig - Migrated from index.d.ts
 */
export interface ServerConfig {
  environment: ServerEnvironment;
  database: DatabaseConnectionConfig;
  redis?: DatabaseConnectionConfig;
  services: ServiceConfiguration;
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
}

/**
 * ServiceConfiguration - Migrated from index.d.ts
 */
export interface ServiceConfiguration {
  bitcoinNode: {
    url: string;
    timeout: number;
    retries: number;
  };
  counterpartyApi: {
    url: string;
    timeout: number;
    retries: number;
  };
  marketData: {
    enabled: boolean;
    refreshInterval: number;
    sources: string[];
  };
}

/**
 * MonitoringConfiguration - Migrated from index.d.ts
 */
export interface MonitoringConfiguration {
  enabled: boolean;
  port: number;
  healthCheck: {
    interval: number;
    timeout: number;
  };
  metrics: {
    enabled: boolean;
    endpoint: string;
  };
  logging: {
    level: string;
    format: "json" | "text";
    destination: "console" | "file" | "both";
  };
}

/**
 * SecurityConfiguration - Migrated from index.d.ts
 */
export interface SecurityConfiguration {
  cors: {
    enabled: boolean;
    origins: string[];
    credentials: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  authentication: {
    required: boolean;
    jwtSecret?: string;
    tokenExpiry: number;
  };
}

/**
 * LegacyDatabaseConfig - Migrated from index.d.ts
 */
export interface LegacyDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * DatabaseMigrationPlan - Migrated from index.d.ts
 */
export interface DatabaseMigrationPlan {
  version: string;
  fromVersion: string;
  toVersion: string;
  migrations: Migration[];
  rollbackPlan: Migration[];
  dataTransformations: DataTransformation[];
  validationRules: ValidationRule[];
}

/**
 * DataTransformation - Migrated from index.d.ts
 */
export interface DataTransformation {
  table: string;
  operation: "rename" | "split" | "merge" | "convert";
  source: string | string[];
  target: string | string[];
  transformer: (data: any) => any;
}

/**
 * ValidationRule - Migrated from index.d.ts
 */
export interface ValidationRule {
  table: string;
  rule: string;
  description: string;
  validator: (data: any) => boolean;
}

/**
 * MockPSBTService - Migrated from psbt-utxo-fixtures.test.ts
 */
export interface MockPSBTService {
  preparePSBT(inputs: any[], outputs: any[]): Promise<any>;
  validateInputs(inputs: any[]): boolean;
}

/**
 * CloudWatchMetric - Migrated from cloudWatchMonitoring.ts
 */
export interface CloudWatchMetric {
  MetricName: string;
  Value: number;
  Unit: "Count" | "Percent" | "Bytes" | "Milliseconds" | "Seconds" | "None";
  Timestamp: Date;
  Dimensions?: Array<{ Name: string; Value: string }>;
}

/**
 * CloudWatchLogEvent - Migrated from cloudWatchMonitoring.ts
 */
export interface CloudWatchLogEvent {
  timestamp: number;
  message: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * BusinessMetrics - Migrated from cloudWatchMonitoring.ts
 */
export interface BusinessMetrics {
  btcPriceFetchSuccessRate: number;
  btcPriceFetchLatency: number;
  src20ProcessingThroughput: number;
  apiResponseTime: number;
  errorRate: number;
  circuitBreakerState: string;
}

/**
 * ECSMetadata - Migrated from ecsDetection.ts
 */
export interface ECSMetadata {
  isECS: boolean;
  taskArn?: string;
  clusterName?: string;
  serviceName?: string;
  taskDefinitionFamily?: string;
  taskDefinitionRevision?: string;
  containerName?: string;
  logGroup?: string;
  logStream?: string;
  region?: string;
  availabilityZone?: string;
}

/**
 * LoggerService - Migrated from xcpManagerDI.ts
 */
export interface LoggerService {
  info(category: string, data: any): Promise<void>;
  debug(category: string, data: any): Promise<void>;
  warn(category: string, data: any): Promise<void>;
  error(category: string, data: any): Promise<void>;
}

/**
 * XcpBalanceOptions - Migrated from xcpManagerDI.ts
 */
export interface XcpBalanceOptions {
  type?: "all" | "send" | "dispenser" | "issuance";
  cursor?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  verbose?: boolean;
  showUnconfirmed?: boolean;
}

/**
 * ComposeAttachOptions - Migrated from xcpManagerDI.ts
 */
export interface ComposeAttachOptions {
  fee_per_kb?: number;
  destination_vout?: number;
  inputs_set?: string;
  encoding?: string;
  regular_dust_size?: number;
  multisig_dust_size?: number;
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean;
  exact_fee?: number;
  fee_provided?: number;
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean;
  p2sh_pretx_txid?: string;
  segwit?: boolean;
  confirmation_target?: number;
  exclude_utxos?: string;
  return_psbt?: boolean;
  return_only_data?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  use_utxos_with_balances?: boolean;
  exclude_utxos_with_balances?: boolean;
  validate?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
}

/**
 * ComposeDetachOptions - Migrated from xcpManagerDI.ts
 */
export interface ComposeDetachOptions {
  fee_per_kb?: number;
  destination?: string;
  encoding?: string;
  regular_dust_size?: number;
  multisig_dust_size?: number;
  pubkeys?: string;
  allow_unconfirmed_inputs?: boolean;
  exact_fee?: number;
  fee_provided?: number;
  unspent_tx_hash?: string;
  dust_return_pubkey?: string | false;
  disable_utxo_locks?: boolean;
  p2sh_pretx_txid?: string;
  segwit?: boolean;
  confirmation_target?: number;
  exclude_utxos?: string;
  inputs_set?: string;
  return_psbt?: boolean;
  return_only_data?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  use_utxos_with_balances?: boolean;
  exclude_utxos_with_balances?: boolean;
  validate?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
}

/**
 * IssuanceOptions - Migrated from xcpManagerDI.ts
 */
export interface IssuanceOptions {
  divisible?: boolean;
  source?: string;
  allow_unconfirmed_inputs?: boolean;
  fee_per_kb?: number;
  fee?: number;
  encoding?: string;
  pubkeys?: string;
  return_psbt?: boolean;
  extended_tx_info?: boolean;
  old_style_api?: boolean;
  verbose?: boolean;
  show_unconfirmed?: boolean;
  lock?: boolean;
  description?: string;
}

/**
 * XcpProvider - Migrated from xcpManagerDI.ts
 */
export interface XcpProvider {
  getXcpAsset(cpid: string): Promise<any>;
  getXcpBalancesByAddress(
    address: string,
    cpid?: string,
    utxoOnly?: boolean,
    options?: XcpBalanceOptions,
  ): Promise<{ balances: XcpBalance[]; total: number; next_cursor?: string }>;
  getAllXcpBalancesByAddress(
    address: string,
    utxoOnly?: boolean,
  ): Promise<{ balances: XcpBalance[]; total: number }>;
  createDispense(
    address: string,
    dispenser: string,
    quantity: number,
    options?: any,
  ): Promise<any>;
  createSend(
    address: string,
    destination: string,
    asset: string,
    quantity: number,
    options?: any,
  ): Promise<any>;
  composeAttach(
    address: string,
    asset: string,
    quantity: number,
    options?: ComposeAttachOptions,
  ): Promise<any>;
  composeDetach(
    utxo: string,
    destination: string,
    options?: ComposeDetachOptions,
  ): Promise<any>;
  checkHealth(cacheTimeout?: number): Promise<boolean>;
}

/**
 * FeeSecurityConfig - Migrated from feeSecurityService.ts
 */
export interface FeeSecurityConfig {
  minFeeRate: number; // Minimum allowed fee rate (sats/vB)
  maxFeeRate: number; // Maximum allowed fee rate (sats/vB)
  maxCacheAge: number; // Maximum cache age in milliseconds
  suspiciousThreshold: number; // Threshold for suspicious activity
  alertCooldown: number; // Cooldown between alerts in milliseconds
}

/**
 * SecurityValidationResult - Migrated from feeSecurityService.ts
 */
export interface SecurityValidationResult {
  isValid: boolean;
  violations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  action: "allow" | "warn" | "block";
}

/**
 * SecurityEvent - Migrated from feeSecurityService.ts
 */
export interface SecurityEvent {
  type:
    | "cache_poisoning"
    | "invalid_data"
    | "suspicious_activity"
    | "rate_limit_exceeded";
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  details: Record<string, any>;
  timestamp: number;
  clientInfo?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
  } | undefined;
}

/**
 * FeeData - Migrated from feeServiceDI.ts
 */
export interface NamespaceImport {
  defaultNamespace?: string;
  namespaceMap?: Record<string, string>;
  resolveStrategy?: "first" | "last" | "merge";
}

export interface XcpBalance {
  assetName: string;
  balance: number;
  totalSupply?: number;
  percentOfTotal?: number;
}

export interface MockResponse {
  status: number;
  data: Record<string, any>;
  headers?: Record<string, string>;
}

export interface UIColumnDefinition {
  header: string;
  key: string;
  sortable?: boolean;
  filterable?: boolean;
  type: "string" | "number" | "date" | "boolean";
  format?: (value: any) => string;
}

export declare const FLAGS: Record<string, boolean>;
export interface FeeData {
  recommendedFee: number;
  btcPrice: number;
  source?: "mempool" | "quicknode" | "cached" | "default";
  confidence: "high" | "medium" | "low";
  timestamp: number;
  debug_feesResponse?: any;
  fallbackUsed?: boolean;
  errors?: string[];
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
  minimumFee?: number;
}

/**
 * CacheService - Migrated from feeServiceDI.ts
 */
export interface CacheService {
  get<T>(
    key: string,
    factory: () => Promise<T>,
    durationSeconds: number,
  ): Promise<T>;
}

/**
 * PriceService - Migrated from feeServiceDI.ts
 */
export interface PriceService {
  getPrice(): Promise<{ price: number }>;
}

/**
 * FeeProvider - Migrated from feeServiceDI.ts
 */
export interface FeeProvider {
  getName(): string;
  getFeeEstimate(): Promise<{
    recommendedFee: number;
    confidence: "high" | "medium" | "low";
    debug_feesResponse?: any;
  }>;
}

/**
 * SecurityService - Migrated from feeServiceDI.ts
 */
export interface SecurityService {
  validateFeeData(feeData: any, source: string): {
    isValid: boolean;
    violations: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
    action: "allow" | "warn" | "block";
  };
}

/**
 * FeeServiceDependencies - Migrated from feeServiceDI.ts
 */
export interface FeeServiceDependencies {
  cacheService: CacheService;
  priceService: PriceService;
  feeProviders: FeeProvider[];
  securityService?: SecurityService;
}

/**
 * FeeServiceConfig - Migrated from feeServiceDI.ts
 */
export interface FeeServiceConfig {
  cacheKey: string;
  cacheDuration: number;
  maxRetries: number;
  retryDelay: number;
  staticFallbackRates: {
    conservative: number;
    normal: number;
    minimum: number;
  };
}

/**
 * CacheConfig - Migrated from cacheService.ts
 */
export interface CacheConfig {
  duration: number; // Cache duration in seconds
  staleWhileRevalidate: number; // Allow serving stale content while fetching fresh
  staleIfError: number; // Use stale content if backend errors
  ttl?: number; // Time to live in seconds (alternative to duration)
}

// RouteType is now imported from $constants above

/**
 * CircuitBreakerOptions - Migrated from circuitBreaker.ts
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  timeoutDuration: number;
  name?: string;
}

/**
 * CircuitBreakerMetrics - Migrated from circuitBreaker.ts
 */
export interface CircuitBreakerMetrics {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  requestCount: number;
  averageResponseTime: number;
}

/**
 * CircuitBreakerOptions - Migrated from circuitBreakerService.ts
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  timeoutDuration: number;
  name?: string;
}

/**
 * UTXOData - Migrated from commonPools.ts
 */
export interface UTXOData {
  txid?: string;
  vout?: number;
  value?: bigint;
  script?: string;
  confirmations?: number;
  reset(): void;
}

/**
 * SRC20TxData - Migrated from commonPools.ts
 */
export interface SRC20TxData {
  tx_hash?: string;
  block_index?: number;
  tick?: string;
  op?: string;
  amt?: bigint;
  from_address?: string;
  to_address?: string;
  status?: string;
  reset(): void;
}

/**
 * StampData - Migrated from commonPools.ts
 */
export interface StampData {
  stamp?: number;
  block_index?: number;
  cpid?: string;
  creator?: string;
  divisible?: boolean;
  keyburn?: boolean;
  locked?: boolean;
  stamp_base64?: string;
  stamp_mimetype?: string;
  stamp_url?: string;
  supply?: bigint;
  timestamp?: number;
  tx_hash?: string;
  tx_index?: number;
  ident?: string;
  reset(): void;
}

/**
 * PoolableObject - Migrated from objectPool.ts
 */
export interface PoolableObject {
  reset?(): void; // Optional method to reset object state
}

/**
 * PoolConfig - Migrated from objectPool.ts
 */
export interface PoolConfig {
  maxSize: number; // Maximum objects to keep in pool
  createFn: () => any; // Factory function to create new objects
  resetFn?: (obj: any) => void; // Optional reset function
  validateFn?: (obj: any) => boolean; // Optional validation function
}

/**
 * PoolMetrics - Migrated from objectPool.ts
 */
export interface PoolMetrics {
  totalCreated: number;
  totalBorrowed: number;
  totalReturned: number;
  currentPoolSize: number;
  maxPoolSize: number;
  hitRate: number; // Percentage of requests served from pool
  memoryEstimate: number; // Rough memory usage estimate
}

/**
 * MemoryUsage - Migrated from memoryMonitorService.ts
 */
export interface MemoryUsage {
  rss: number; // Resident Set Size
  heapTotal: number; // Total heap size
  heapUsed: number; // Used heap size
  external: number; // External memory usage
  arrayBuffers: number; // ArrayBuffer memory usage
}

/**
 * MemoryMetrics - Migrated from memoryMonitorService.ts
 */
export interface MemoryMetrics {
  current: MemoryUsage;
  peak: MemoryUsage;
  timestamp: number;
  uptimeSeconds: number;
  memoryPressure: "low" | "medium" | "high" | "critical";
  leakDetected: boolean;
  gcInfo?: {
    lastGC: number;
    totalGCs: number;
    averageGCTime: number;
  };
}

/**
 * MemoryLimits - Migrated from memoryMonitorService.ts
 */
export interface MemoryLimits {
  heapLimit: number; // Container memory limit (bytes)
  warningThreshold: number; // 70% of limit
  criticalThreshold: number; // 85% of limit
  maxAllowedRSS: number; // 90% of container limit
}

/**
 * BlockNotification - Migrated from bitcoinNotificationService.ts
 */
export interface BlockNotification {
  type: "new_block";
  blockHeight: number;
  blockHash: string;
  timestamp: number;
}

/**
 * PriceNotification - Migrated from bitcoinNotificationService.ts
 */
export interface PriceNotification {
  type: "price_update";
  price: number;
  timestamp: number;
}

/**
 * BitcoinNotification - Migrated from bitcoinNotificationService.ts
 */
export type BitcoinNotification = BlockNotification | PriceNotification;

/**
 * BTCPriceData - Migrated from btcPriceService.ts
 */
export interface BTCPriceData {
  price: number;
  source:
    | "quicknode"
    | "coingecko"
    | "binance"
    | "kraken"
    | "coinbase"
    | "blockchain"
    | "bitstamp"
    | "cached"
    | "default";
  confidence: "high" | "medium" | "low";
  timestamp: number;
  details?: any;
  fallbackUsed?: boolean;
  errors?: string[];
  circuitBreakerMetrics?: Record<string, CircuitBreakerMetrics>;
}

/**
 * PriceProvider - Migrated from btcPriceServiceDI.ts
 */
export interface PriceProvider {
  getName(): string;
  getPrice(): Promise<{
    price: number;
    confidence: "high" | "medium" | "low";
    details?: any;
  }>;
}

/**
 * PriceServiceDependencies - Migrated from btcPriceServiceDI.ts
 */
export interface PriceServiceDependencies {
  cacheService: CacheService;
  httpClient: HttpClient;
  priceProviders: PriceProvider[];
}

/**
 * PriceServiceConfig - Migrated from btcPriceServiceDI.ts
 */
export interface PriceServiceConfig {
  cacheKey: string;
  cacheDuration: number;
  staticFallbackPrice: number;
  providerRotation: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * NormalizedFeeEstimate - Migrated from quicknodeService.ts
 */
export interface NormalizedFeeEstimate {
  feeRateSatsPerVB: number; // Converted to sats/vB
  blocks: number;
  source: "quicknode";
  confidence: "high" | "medium" | "low";
}

/**
 * QuicknodeConfig - Migrated from quicknodeServiceDI.ts
 */
export interface QuicknodeConfig {
  endpoint: string;
  apiKey: string;
  fallbackApiUrl?: string;
  maxRetries: number;
  retryDelay: number;
  requestTimeout: number;
}

/**
 * QuicknodeServiceDependencies - Migrated from quicknodeServiceDI.ts
 */
export interface QuicknodeServiceDependencies {
  httpClient: HttpClient;
  config: QuicknodeConfig;
}

/**
 * NormalizedFeeEstimate - Migrated from quicknodeServiceDI.ts
 */
export interface NormalizedFeeEstimate {
  feeRateSatsPerVB: number; // Converted to sats/vB
  blocks: number;
  source: "quicknode";
  confidence: "high" | "medium" | "low";
}

/**
 * MultipleFeeEstimates - Migrated from quicknodeServiceDI.ts
 */
export interface MultipleFeeEstimates {
  fast: NormalizedFeeEstimate | null; // 1-2 blocks
  normal: NormalizedFeeEstimate | null; // 6 blocks
  economy: NormalizedFeeEstimate | null; // 144 blocks
}

/**
 * QuicknodeProvider - Migrated from quicknodeServiceDI.ts
 */
export interface QuicknodeProvider {
  executeRPC<T = any>(
    method: string,
    params: any[],
  ): Promise<QuicknodeRPCResponse<T>>;
  getPublicKeyFromAddress(address: string): Promise<any>;
  getRawTx(txHash: string): Promise<string>;
  getDecodedTx(txHex: string): Promise<any>;
  getTransaction(txHash: string): Promise<any>;
  estimateSmartFee(
    confTarget?: number,
    estimateMode?: "economical" | "conservative",
  ): Promise<NormalizedFeeEstimate | null>;
  getMultipleFeeEstimates(): Promise<MultipleFeeEstimates>;
}

/**
 * UTXOOptions - Migrated from quicknodeUTXOService.ts
 */
export interface UTXOOptions {
  confirmedOnly?: boolean;
  includeAncestors?: boolean; // For fetching financial ancestor data and full script details
}

/**
 * QuickNodeUTXO - Migrated from quicknodeUTXOService.ts
 */
export interface QuickNodeUTXO {
  txid: string;
  vout: number;
  value: string; // Value in satoshis, as a string (per QN docs)
  confirmations: number;
  height: number; // Block height
  coinbase?: boolean;
}

/**
 * QuickNodeTxSpecific - Migrated from quicknodeUTXOService.ts
 */
export interface QuickNodeTxSpecific {
  txid: string;
  size: number;
  vsize: number;
  weight: number;
  fee?: number; // Fee in satoshis
  fee_rate?: number; // Fee rate (e.g., sats/vB)
  height?: number; // Block height of the transaction
  ancestorcount?: number;
  ancestorsize?: number;
  ancestorfees?: number;
  vin: Array<{
    txid?: string; // txid of the input transaction
    vout?: number; // vout of the input transaction
    txinwitness?: string[];
    sequence: number;
    value?: number; // Value of the input being spent (in satoshis)
    // other input fields if available and needed
  }>;
  vout: Array<{
    value: number; // Value of this output - LIKELY IN BTC from bb_getTxSpecific
    n: number; // Output index
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address?: string;
      type: string;
    };
  }>;
  confirmations: number;
  time?: number; // Block timestamp
  blocktime?: number; // Alias for block timestamp often used
  // status field was present in some versions, ensure if it's used, it's typed
}

/**
 * CSRFPayload - Migrated from securityService.ts
 */
export interface CSRFPayload {
  exp: number;
  [key: string]: unknown;
}

/**
 * EnrichmentOptions - Migrated from marketDataEnrichmentService.ts
 */
export interface EnrichmentOptions {
  /** Include extended market data fields (7d, 30d metrics) */
  includeExtendedFields?: boolean;

  /** Optimize for bulk operations (use Map-based lookups) */
  bulkOptimized?: boolean;

  /** Enable detailed error logging */
  enableLogging?: boolean;

  /** Cache duration for bulk operations in milliseconds */
  cacheDuration?: number;
}

/**
 * MarketDataFields - Migrated from marketDataEnrichmentService.ts
 */
export interface MarketDataFields {
  /** Tick symbol for the SRC20 token */
  tick: string;

  /** Floor price in BTC, null if not available */
  floor_price_btc: number | null;

  /** Market capitalization in BTC */
  market_cap_btc: number;

  /** 24-hour trading volume in BTC */
  volume_24h_btc: number;

  /** 24-hour price change percentage */
  price_change_24h_percent: number;

  /** Total holder count */
  holder_count: number;

  /** Data quality score (0-10) */
  data_quality_score: number;

  /** Last update timestamp */
  last_updated: Date;

  /** Extended fields (included when includeExtendedFields=true) */
  volume_7d_btc?: number;
  volume_30d_btc?: number;
  price_change_7d_percent?: number;
  price_change_30d_percent?: number;

  /** Market data source information */
  primary_exchange?: string | null;
  exchange_sources?: string[] | null;

  /** Confidence metrics */
  confidence_level?: number;
}

/**
 * EnrichedSRC20Item - Migrated from marketDataEnrichmentService.ts
 */
export type EnrichedSRC20Item = Omit<SRC20Row, "market_data"> & {
  /**
   * Nested market data object - SINGLE SOURCE OF TRUTH (snake_case for API consistency)
   * NO root-level fields like floor_unit_price, market_cap, volume24, change24
   */
  market_data?: MarketDataFields | null;
};

/**
 * BulkEnrichmentResult - Migrated from marketDataEnrichmentService.ts
 */
export interface BulkEnrichmentResult {
  /** Map of tick symbol to market data for successful lookups */
  marketDataMap: Map<string, MarketDataFields>;

  /** Array of tick symbols that failed to retrieve market data */
  failedTicks: string[];

  /** Performance metrics */
  metrics: {
    totalProcessed: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
  };
}

/**
 * EnrichedType - Migrated from marketDataEnrichmentService.ts
 */
export type EnrichedType<T extends SRC20Row> = T & EnrichedSRC20Item;

/**
 * PerformanceMetrics - Migrated from queryService.ts
 */
export interface PerformanceMetrics {
  duration: number;
  cacheHit: boolean;
  dataSize: number;
}

/**
 * TrendingCalculationOptions - Migrated from queryService.ts
 */
export interface TrendingCalculationOptions {
  trendingWindow?: "24h" | "7d" | "30d";
  mintVelocityMin?: number | undefined; // Allow undefined explicitly
}

/**
 * EnhancedSRC20Row - Migrated from queryService.ts
 */
export interface EnhancedSRC20Row extends SRC20Row {
  mint_velocity?: number; // Mints per hour
  trending_score?: number; // Calculated trending score
  mint_activity_24h?: number; // 24h mint count
  mint_activity_7d?: number; // 7d mint count
  mint_activity_30d?: number; // 30d mint count
  market_data?: MarketListingAggregated; // Market data for sorting
}

/**
 * BitcoinTransactionBuilderDependencies - Migrated from bitcoinTransactionBuilder.ts
 */
export interface BitcoinTransactionBuilderDependencies {
  getUTXOForAddress: typeof getUTXOForAddressFromUtils;
  estimateFee: typeof estimateFee;
  commonUtxoService: ICommonUTXOService;
  bitcoin?: typeof import("bitcoinjs-lib"); // Optional bitcoin lib injection for testing
}

/**
 * BitcoinTransactionGenerationOptions - Migrated from generalBitcoinTransactionBuilder.ts
 */
export interface BitcoinTransactionGenerationOptions {
  address: string;
  satsPerVB: number;
  serviceFee?: number;
  serviceFeeAddress?: string;
  operationType: "mint" | "fairmint" | "detach" | "dispense" | "generic";
  // For mint operations
  cip33Addresses?: string[];
  fileSize?: number;
  // For generic operations
  customOutputs?: Array<{ value: number; address: string }>;
}

/**
 * BitcoinTransactionGenerationResult - Migrated from generalBitcoinTransactionBuilder.ts
 */
export interface BitcoinTransactionGenerationResult {
  psbt: bitcoin.Psbt;
  estimatedTxSize: number;
  totalInputValue: number;
  totalOutputValue: number;
  totalChangeOutput: number;
  totalDustValue: number;
  estMinerFee: number;
  changeAddress: string;
}

/**
 * CommonUTXOFetchOptions - Migrated from commonUtxoService.ts
 */
export interface CommonUTXOFetchOptions extends UTXOFetchOptions {
  forcePublicAPI?: boolean;
}

/**
 * MempoolTransaction - Migrated from commonUtxoService.ts
 */
export interface MempoolTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout?: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address?: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness?: string[];
    is_coinbase: boolean;
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

/**
 * BasicUTXO - Migrated from optimalUtxoSelection.ts
 */
export interface BasicUTXO extends BaseBasicUTXO {
  address?: string;
  script?: string;
  scriptType?: ScriptType;
  scriptDesc?: string;
  confirmations?: number;
}

/**
 * SelectionResult - Migrated from optimalUtxoSelection.ts
 */
export interface SelectionResult {
  inputs: UTXO[];
  change: number;
  fee: number;
  waste: number; // Cost metric for this selection
  algorithm: string; // Which algorithm was used
}

/**
 * SelectionOptions - Migrated from optimalUtxoSelection.ts
 */
export interface SelectionOptions {
  targetValue: bigint;
  feeRate: number;
  longTermFeeRate?: number; // For waste calculation
  dustThreshold?: number;
  consolidationMode?: boolean; // Prefer using more inputs
  avoidChange?: boolean; // Try to find exact matches
  maxTries?: number; // For random selection
}

/**
 * AlgorithmMetrics - Migrated from optimalUtxoSelection.ts
 */
export interface AlgorithmMetrics {
  name: string;
  executionTimeMs: number;
  success: boolean;
  inputsSelected: number;
  totalInputValue: number;
  fee: number;
  change: number;
  waste: number;
  failureReason?: string | undefined;
  efficiency: number; // inputs selected / total available
  wastePercentage: number; // waste / total transaction value
}

/**
 * SelectionMetrics - Migrated from optimalUtxoSelection.ts
 */
export interface SelectionMetrics {
  sessionId: string;
  totalExecutionTimeMs: number;
  availableUTXOs: number;
  spendableUTXOs: number;
  filteredUTXOs: number;
  targetValue: number;
  feeRate: number;
  algorithms: AlgorithmMetrics[];
  selectedAlgorithm: string;
  finalResult: {
    inputs: number;
    totalValue: number;
    fee: number;
    change: number;
    waste: number;
    efficiency: number;
  };
  dustAnalysis: {
    totalFiltered: number;
    averageFilteredValue: number;
    filterRatio: number;
  };
  recommendations: string[];
}

/**
 * UTXOFetchOptions - Migrated from utxoServiceInterface.d.ts
 */
export interface UTXOFetchOptions {
  /**
   * If true, attempts to include ancestor details (fees, vsize) for each UTXO.
   * This might involve additional API calls for some UTXO sources.
   */
  includeAncestorDetails?: boolean;
  /**
   * If true, only fetches confirmed UTXOs.
   */
  confirmedOnly?: boolean;
  // Potential future options:
  // minConfirmations?: number;
  // maxUtxosToFetch?: number;
}

/**
 * ICommonUTXOService - Migrated from utxoServiceInterface.d.ts
 */
export interface ICommonUTXOService {
  /**
   * Fetches spendable UTXOs for a given address.
   * The calling service is responsible for coin selection from the returned UTXOs.
   *
   * @param address The Bitcoin address to fetch UTXOs for.
   * @param amountNeeded Optional hint for the service; it may try to fetch UTXOs collectively covering this amount,
   *                     but the primary responsibility of coin selection remains with the caller.
   * @param options Options for fetching UTXOs.
   * @returns A promise that resolves to an array of UTXO objects.
   */
  getSpendableUTXOs(
    address: string,
    amountNeeded?: number,
    options?: UTXOFetchOptions,
  ): Promise<UTXO[]>;

  /**
   * Fetches a single specific UTXO by its transaction ID and output index.
   *
   * @param txid The transaction ID of the UTXO.
   * @param vout The output index (vout) of the UTXO.
   * @param options Options for fetching the UTXO.
   * @returns A promise that resolves to a UTXO object if found, or null otherwise.
   */
  getSpecificUTXO(
    txid: string,
    vout: number,
    options?: UTXOFetchOptions,
  ): Promise<UTXO | null>;

  /**
   * Fetches the raw hexadecimal representation of a transaction.
   *
   * @param txid The transaction ID.
   * @returns A promise that resolves to the raw transaction hex string if found, or null otherwise.
   */
  getRawTransactionHex(txid: string): Promise<string | null>;

  // Example of a potential future method:
  // getTransactionDetails(txid: string): Promise<TransactionDetails | null>;
}

/**
 * FileValidationOptions - Migrated from routeValidationService.ts
 */
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  requiredFields?: string[];
}

/**
 * SortValidationOptions - Migrated from validationService.ts
 */
export interface SortValidationOptions {
  defaultDirection?: SortDirection;
  allowedDirections?: SortDirection[];
}

/**
 * IPrepareSRC101TX - Migrated from src101.d.ts
 */
export interface IPrepareSRC101TX {
  network: string;
  // fromAddress: string;
  sourceAddress: string;
  changeAddress: string;
  recAddress?: string;
  feeRate: number;
  transferString: string;
  recVault?: number;
  enableRBF?: boolean;
}

/**
 * IMintSRC101 - Migrated from src101.d.ts
 */
export interface IMintSRC101 extends Omit<IPrepareSRC101TX, "transferString"> {
  hash: string;
  toaddress: string;
  tokenid: string[];
  dua: string;
  prim: string;
  coef: string;
  sig: string;
  img: string[] | null;
  recVault?: number;
}

/**
 * IDeploySRC101 - Migrated from src101.d.ts
 */
export interface IDeploySRC101
  extends Omit<IPrepareSRC101TX, "transferString"> {
  root: string;
  name: string;
  lim: string;
  owner: string;
  rec: string[];
  tick: string;
  pri: Record<string, any>;
  desc: string;
  mintstart: string;
  mintend: string;
  wla: string;
  imglp: string;
  imgf: string;
  idua?: string;
  description?: string;
}

/**
 * ITransferSRC101 - Migrated from src101.d.ts
 */
export interface ITransferSRC101
  extends Omit<IPrepareSRC101TX, "transferString"> {
  hash: string;
  toaddress: string;
  tokenid: string;
}

/**
 * ISetrecordSRC101 - Migrated from src101.d.ts
 */
export interface ISetrecordSRC101
  extends Omit<IPrepareSRC101TX, "transferString"> {
  hash: string;
  tokenid: string;
  type: string;
  data: Record<string, any>;
  prim: string;
}

/**
 * IRenewSRC101 - Migrated from src101.d.ts
 */
export interface IRenewSRC101 extends Omit<IPrepareSRC101TX, "transferString"> {
  hash: string;
  tokenid: string;
  dua: string;
}

/**
 * IPrepareSRC101TXResult - Migrated from src101.d.ts
 */
export interface IPrepareSRC101TXResult {
  psbtHex: string;
  fee: number;
  change: number;
  inputsToSign: Array<{ index: number }>;
}

/**
 * IPrepareSRC20TX - Migrated from src20.d.ts
 */
export interface IPrepareSRC20TX {
  network: string;
  changeAddress: string;
  toAddress: string;
  feeRate: number;
  transferString: string;
  enableRBF?: boolean;
}

/**
 * IMintSRC20 - Migrated from src20.d.ts
 */
export interface IMintSRC20 extends Omit<IPrepareSRC20TX, "transferString"> {
  tick: string;
  amt: string;
}

/**
 * IDeploySRC20 - Migrated from src20.d.ts
 */
export interface IDeploySRC20 extends Omit<IPrepareSRC20TX, "transferString"> {
  tick: string;
  max: string;
  lim: string;
  dec?: number;
  x?: string;
  web?: string;
  email?: string;
  tg?: string;
  description?: string;
  desc?: string;
  img?: string;
  icon?: string;
}

/**
 * ITransferSRC20 - Migrated from src20.d.ts
 */
export interface ITransferSRC20
  extends Omit<IPrepareSRC20TX, "transferString"> {
  fromAddress: string;
  tick: string;
  amt: string;
}

/**
 * IPrepareSRC20TXResult - Migrated from src20.d.ts
 */
export interface IPrepareSRC20TXResult {
  psbtHex: string;
  fee: number;
  change: number;
  inputsToSign: Array<{ index: number }>;
}

/**
 * SRC101Operation - Migrated from src101Operations.ts
 */
export interface SRC101Operation {
  op: string;
  p: "SRC-101";
  [key: string]: unknown;
}

/**
 * SRC101OperationParams - Migrated from src101Operations.ts
 */
export type SRC101OperationParams =
  | IMintSRC101
  | IDeploySRC101
  | ITransferSRC101
  | ISetrecordSRC101
  | IRenewSRC101;

/**
 * SRC20Operation - Migrated from src20Operations.ts
 */
export interface SRC20Operation {
  op: string;
  p: "SRC-20";
  tick: string;
  [key: string]: unknown;
}

/**
 * SRC20OperationParams - Migrated from src20Operations.ts
 */
export type SRC20OperationParams = IMintSRC20 | IDeploySRC20 | ITransferSRC20;

/**
 * PSBTParams - Migrated from src20PSBTService.ts
 */
export interface PSBTParams {
  sourceAddress: string;
  toAddress: string;
  src20Action: Record<string, unknown>;
  satsPerVB: number;
  service_fee: number;
  service_fee_address: string;
  changeAddress: string;
  utxoAncestors?: AncestorInfo[];
  trxType?: "olga" | "multisig";
  utxos?: Array<{
    txid: string;
    vout: number;
    value: number;
    script: string;
    address: string;
  }>;
  isDryRun?: boolean;
}

/**
 * ServiceStatus - Migrated from service management
 */
export interface ServiceStatus {
  name: string;
  status: "stopped" | "starting" | "running" | "stopping" | "error";
  health: ServiceHealth;
  uptime: number;
  version: string;
  dependencies: ServiceDependency[];
}

// ============================================================================
// EXTERNAL API CONFIGURATION TYPES
// ============================================================================

/**
 * QuickNode API configuration
 */
export interface QuickNodeConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  network?: "mainnet" | "testnet";
}

/**
 * QuickNode API error response
 */
export interface QuickNodeError {
  code: number;
  message: string;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

/**
 * QuickNode API response wrapper
 */
export interface QuickNodeResponse<T = any> {
  result?: T;
  error?: QuickNodeError;
  id?: string | number;
  jsonrpc?: string;
}

/**
 * Generic service response wrapper
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | Error;
  message?: string;
  metadata?: {
    timestamp: string;
    duration?: number;
    source?: string;
    version?: string;
  };
}

export type PerformanceTraceEvent = {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
};

// ProtocolComplianceLevel enum moved to constants/stampConstants.ts
// Note: The constants version uses string values, not numeric values

export interface SystemPerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  traceEvents: PerformanceTraceEvent[];
  complianceLevel: ProtocolComplianceLevel;
}

/**
 * Types for stamp transaction operations
 */
export type StampTransactionType =
  | "mint"
  | "transfer"
  | "burn"
  | "update"
  | "inscribe";

/**
 * Deployment configuration for various services
 */
export interface Deployment {
  tick: string;
  type: "SRC-20" | "SRC-721" | "STAMP";
  max?: number;
  limit?: number;
  deployerAddress: string;
  deploymentDate: Date;
  status: "pending" | "confirmed" | "failed";
  block_time?: number;
  tx_hash?: string;
  creator_name?: string;
  destination?: string;
  block_index?: number;
  deci?: number;
  lim?: number;
}

/**
 * PSBT fee details for transactions
 */
export interface PSBTFees {
  minerFee: number;
  serviceFee?: number;
  totalFee: number;
  feeRate: number;
  dustValue?: number;
  totalDustValue?: number;
  estMinerFee?: number;
  hasExactFees?: boolean;
  totalValue?: number;
  effectiveFeeRate?: number;
  est_tx_size?: number;
  totalVsize?: number;
  hex?: any;
  inputsToSign?: any;
  [key: string]: any; // Allow additional properties
}

/**
 * Fee estimation result for different transaction types
 */
export interface FeeEstimationResult {
  minerFee: number;
  serviceFee?: number;
  totalFee: number;
  feeRate: number;
  estimatedSize: number;
  inputCount: number;
  outputCount: number;
}

/**
 * Stamp filter configuration for querying stamp services
 */
export interface StampServiceFilters {
  type?: "STAMP" | "SRC-20" | "SRC-721";
  minStampNumber?: number;
  maxStampNumber?: number;
  creator?: string;
  divisible?: boolean;
  locked?: boolean;
  sortBy?: "stamp_number_asc" | "stamp_number_desc" | "date_asc" | "date_desc";
}

/**
 * Mint status for various token types
 */
export interface SRC20MintStatus {
  tick: string;
  available: number;
  minted: number;
  progress: number;
  status: "active" | "completed" | "paused";
  remainingSupply?: number;
}
