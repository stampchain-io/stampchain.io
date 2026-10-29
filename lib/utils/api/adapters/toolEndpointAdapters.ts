/**
 * Tool Endpoint Adapter Implementations
 *
 * Concrete implementations of tool endpoint adapters that handle the specific
 * request/response formats for each tool type while providing a standardized
 * interface for the TransactionConstructionService system.
 */

import {
  AnyTransactionOptions,
  SRC101TransactionOptions,
  SRC20TransactionOptions,
  StampTransactionOptions,
  StandardFeeResponse,
  ToolEndpointAdapter,
  ToolEndpointAdapterFactory,
  ToolResponseError,
  ToolType,
  ToolValidationError,
} from "$lib/types/toolEndpointAdapter.ts";

/**
 * Stamp Tool Endpoint Adapter
 * Handles /api/v2/olga/mint endpoint with dryRun parameter
 */
export class StampToolAdapter
  implements ToolEndpointAdapter<StampTransactionOptions> {
  readonly toolType: ToolType = "stamp";
  readonly endpoint = "/api/v2/olga/mint";

  buildRequestBody(options: StampTransactionOptions): Record<string, any> {
    const requestBody: Record<string, any> = {
      sourceWallet: options.walletAddress,
      filename: options.filename,
      file: options.file,
      qty: options.quantity,
      locked: options.locked,
      divisible: options.divisible,
      dryRun: options.dryRun,
      satsPerVB: options.feeRate,
    };

    return requestBody;
  }

  parseResponse(response: any): StandardFeeResponse {
    if (!response || typeof response !== "object") {
      throw new ToolResponseError(
        "Invalid response format from stamp endpoint",
        this.toolType,
        this.endpoint,
        response,
      );
    }

    // Validate required fields from stamp endpoint
    const requiredFields = [
      "est_tx_size",
      "est_miner_fee",
      "total_dust_value",
      "total_output_value",
    ];
    const missingFields = requiredFields.filter((field) =>
      !(field in response)
    );

    if (missingFields.length > 0) {
      throw new ToolResponseError(
        `Missing required fields in stamp response: ${
          missingFields.join(", ")
        }`,
        this.toolType,
        this.endpoint,
        response,
      );
    }

    // Calculate actual cost to user (excluding change output)
    // totalCost = dust + miner fee + service fee (if any)
    const serviceFee = response.service_fee || 0;
    const actualTotalCost = response.total_dust_value + response.est_miner_fee +
      serviceFee;

    return {
      estimatedSize: response.est_tx_size,
      minerFee: response.est_miner_fee,
      dustValue: response.total_dust_value,
      totalCost: actualTotalCost,
      isEstimate: response.is_estimate ?? true,
      estimationMethod: response.estimation_method ??
        "service_with_dummy_utxos",
      feeRate: response.est_miner_fee / response.est_tx_size,
      feeDetails: response,
      changeValue: response.change_value,
      inputValue: response.input_value,
    };
  }

  validateOptions(options: StampTransactionOptions): boolean {
    const errors: string[] = [];

    if (!options.walletAddress) errors.push("walletAddress");
    if (!options.file) errors.push("file");
    if (!options.filename) errors.push("filename");
    if (typeof options.quantity !== "number" || options.quantity <= 0) {
      errors.push("quantity");
    }
    if (typeof options.feeRate !== "number" || options.feeRate <= 0) {
      errors.push("feeRate");
    }
    if (typeof options.locked !== "boolean") errors.push("locked");
    if (typeof options.divisible !== "boolean") errors.push("divisible");

    if (errors.length > 0) {
      throw new ToolValidationError(
        `Invalid stamp transaction options`,
        this.toolType,
        this.endpoint,
        errors,
      );
    }

    return true;
  }

  getCacheKey(options: StampTransactionOptions): string {
    // Include file size and fee rate in cache key for stamps
    const fileSize = options.fileSize || options.file?.length || 0;
    return `stamp:${options.walletAddress}:${fileSize}:${options.feeRate}:${options.quantity}`;
  }
}

/**
 * SRC-20 Tool Endpoint Adapter
 * Handles /api/v2/src20/create endpoint with dryRun parameter
 */
export class SRC20ToolAdapter
  implements ToolEndpointAdapter<SRC20TransactionOptions> {
  readonly toolType: ToolType = "src20";
  readonly endpoint = "/api/v2/src20/create";

  buildRequestBody(options: SRC20TransactionOptions): Record<string, any> {
    // Map uppercase operation to lowercase for API
    const opMapping: Record<string, string> = {
      "DEPLOY": "deploy",
      "MINT": "mint",
      "TRANSFER": "transfer",
    };

    const body: Record<string, any> = {
      op: opMapping[options.op] || options.op,
      tick: options.tick,
      sourceAddress: options.walletAddress,
      dryRun: options.dryRun,
      satsPerVB: options.feeRate,
    };

    // Ensure we don't send empty addresses
    if (!body.sourceAddress || body.sourceAddress === "") {
      throw new Error("Wallet address is required for SRC20 operations");
    }

    // Add operation-specific fields
    if (options.op === "DEPLOY") {
      if (options.max) body.max = options.max;
      if (options.lim) body.lim = options.lim;
      if (typeof options.dec === "number") body.dec = options.dec;
    } else if (options.op === "MINT" || options.op === "TRANSFER") {
      if (options.amt) body.amt = options.amt;
    }

    if (options.op === "TRANSFER" && options.destinationAddress) {
      body.toAddress = options.destinationAddress; // API expects toAddress, not destinationAddress
    }

    if (options.changeAddress) {
      body.changeAddress = options.changeAddress;
    }

    return body;
  }

  parseResponse(response: any): StandardFeeResponse {
    if (!response || typeof response !== "object") {
      throw new ToolResponseError(
        "Invalid response format from SRC-20 endpoint",
        this.toolType,
        this.endpoint,
        response,
      );
    }

    // Validate required fields from SRC-20 endpoint
    const requiredFields = [
      "est_tx_size",
      "est_miner_fee",
      "total_dust_value",
      "fee",
    ];
    const missingFields = requiredFields.filter((field) =>
      !(field in response)
    );

    if (missingFields.length > 0) {
      throw new ToolResponseError(
        `Missing required fields in SRC-20 response: ${
          missingFields.join(", ")
        }`,
        this.toolType,
        this.endpoint,
        response,
      );
    }

    return {
      estimatedSize: response.est_tx_size,
      minerFee: response.est_miner_fee,
      dustValue: response.total_dust_value,
      totalCost: response.fee, // SRC-20 uses 'fee' for total cost
      isEstimate: true, // Always true for dryRun
      estimationMethod: "real_utxo_selection",
      feeRate: response.feeDetails?.effectiveFeeRate ??
        (response.est_miner_fee / response.est_tx_size),
      feeDetails: response.feeDetails || response,
      changeValue: response.change_value,
      inputValue: response.input_value,
    };
  }

  validateOptions(options: SRC20TransactionOptions): boolean {
    const errors: string[] = [];

    if (!options.walletAddress) errors.push("walletAddress");
    if (!options.op || !["DEPLOY", "MINT", "TRANSFER"].includes(options.op)) {
      errors.push("op");
    }
    if (!options.tick) errors.push("tick");
    if (typeof options.feeRate !== "number" || options.feeRate <= 0) {
      errors.push("feeRate");
    }

    // Operation-specific validation
    if (options.op === "DEPLOY") {
      if (!options.max) errors.push("max");
      if (!options.lim) errors.push("lim");
      if (typeof options.dec !== "number") errors.push("dec");
    } else if (options.op === "MINT" || options.op === "TRANSFER") {
      if (!options.amt) errors.push("amt");
    }

    if (options.op === "TRANSFER" && !options.destinationAddress) {
      errors.push("destinationAddress");
    }

    if (errors.length > 0) {
      throw new ToolValidationError(
        `Invalid SRC-20 transaction options`,
        this.toolType,
        this.endpoint,
        errors,
      );
    }

    return true;
  }

  getCacheKey(options: SRC20TransactionOptions): string {
    const opKey = `${options.op}:${options.tick}`;
    const amountKey = options.amt || options.max || "";
    return `src20:${options.walletAddress}:${opKey}:${amountKey}:${options.feeRate}`;
  }
}

/**
 * SRC-101 Tool Endpoint Adapter
 * Handles /api/v2/src101/create endpoint with dryRun parameter
 */
export class SRC101ToolAdapter
  implements ToolEndpointAdapter<SRC101TransactionOptions> {
  readonly toolType: ToolType = "src101";
  readonly endpoint = "/api/v2/src101/create";

  buildRequestBody(options: SRC101TransactionOptions): Record<string, any> {
    const body: Record<string, any> = {
      op: options.op,
      sourceAddress: options.walletAddress,
      changeAddress: options.changeAddress || options.walletAddress,
      dryRun: options.dryRun,
      feeRate: options.feeRate, // Note: SRC-101 uses 'feeRate' not 'satsPerVB'
    };

    // Add operation-specific fields
    if (options.op === "deploy" && options.root) {
      body.root = options.root;
    } else if (options.op === "mint" && options.name) {
      body.name = options.name;
    } else if (options.op === "transfer") {
      if (options.name) body.name = options.name;
      if (options.amt) body.amt = options.amt;
      if (options.destinationAddress) {
        body.destinationAddress = options.destinationAddress;
      }
    }

    return body;
  }

  parseResponse(response: any): StandardFeeResponse {
    if (!response || typeof response !== "object") {
      throw new ToolResponseError(
        "Invalid response format from SRC-101 endpoint",
        this.toolType,
        this.endpoint,
        response,
      );
    }

    // Validate required fields from SRC-101 endpoint
    const requiredFields = [
      "est_miner_fee",
      "total_dust_value",
      "total_cost",
      "est_tx_size",
    ];
    const missingFields = requiredFields.filter((field) =>
      !(field in response)
    );

    if (missingFields.length > 0) {
      throw new ToolResponseError(
        `Missing required fields in SRC-101 response: ${
          missingFields.join(", ")
        }`,
        this.toolType,
        this.endpoint,
        response,
      );
    }

    return {
      estimatedSize: response.est_tx_size,
      minerFee: response.est_miner_fee,
      dustValue: response.total_dust_value,
      totalCost: response.total_cost,
      isEstimate: response.is_estimate ?? true,
      estimationMethod: response.estimation_method ?? "dryRun_calculation",
      feeRate: response.feeDetails?.effectiveFeeRate ??
        (response.est_miner_fee / response.est_tx_size),
      feeDetails: response.feeDetails || response,
      changeValue: response.change_value,
      inputValue: response.input_value,
    };
  }

  validateOptions(options: SRC101TransactionOptions): boolean {
    const errors: string[] = [];

    if (!options.walletAddress) errors.push("walletAddress");
    if (!options.op || !["deploy", "mint", "transfer"].includes(options.op)) {
      errors.push("op");
    }
    if (typeof options.feeRate !== "number" || options.feeRate <= 0) {
      errors.push("feeRate");
    }

    // Operation-specific validation
    if (options.op === "deploy" && !options.root) {
      errors.push("root");
    } else if (options.op === "mint" && !options.name) {
      errors.push("name");
    } else if (options.op === "transfer") {
      if (!options.name) errors.push("name");
      if (!options.destinationAddress) errors.push("destinationAddress");
    }

    if (errors.length > 0) {
      throw new ToolValidationError(
        `Invalid SRC-101 transaction options`,
        this.toolType,
        this.endpoint,
        errors,
      );
    }

    return true;
  }

  getCacheKey(options: SRC101TransactionOptions): string {
    const opKey = `${options.op}:${options.root || options.name || ""}`;
    const amountKey = options.amt || "";
    return `src101:${options.walletAddress}:${opKey}:${amountKey}:${options.feeRate}`;
  }
}

/**
 * Tool Endpoint Adapter Factory Implementation
 */
export class DefaultToolEndpointAdapterFactory
  implements ToolEndpointAdapterFactory {
  private adapters: Map<ToolType, ToolEndpointAdapter> = new Map();

  constructor() {
    // Initialize all adapters
    this.adapters.set("stamp", new StampToolAdapter());
    this.adapters.set("src20", new SRC20ToolAdapter());
    this.adapters.set("src101", new SRC101ToolAdapter());
  }

  createAdapter(toolType: ToolType): ToolEndpointAdapter {
    const adapter = this.adapters.get(toolType);
    if (!adapter) {
      throw new Error(`No adapter available for tool type: ${toolType}`);
    }
    return adapter;
  }

  getSupportedToolTypes(): ToolType[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Singleton factory instance for use throughout the application
 */
export const factory = new DefaultToolEndpointAdapterFactory();

/**
 * Utility function to get an adapter for a specific tool type
 */
export function getToolAdapter(toolType: ToolType): ToolEndpointAdapter {
  return factory.createAdapter(toolType);
}

/**
 * Type guard functions for transaction options
 */
export function isStampTransactionOptions(
  options: AnyTransactionOptions,
): options is StampTransactionOptions {
  return "file" in options && "filename" in options;
}

export function isSRC20TransactionOptions(
  options: AnyTransactionOptions,
): options is SRC20TransactionOptions {
  return "op" in options && "tick" in options &&
    typeof (options as any).op === "string" &&
    ["DEPLOY", "MINT", "TRANSFER"].includes((options as any).op);
}

export function isSRC101TransactionOptions(
  options: AnyTransactionOptions,
): options is SRC101TransactionOptions {
  return "op" in options && typeof (options as any).op === "string" &&
    ["deploy", "mint", "transfer"].includes((options as any).op);
}
