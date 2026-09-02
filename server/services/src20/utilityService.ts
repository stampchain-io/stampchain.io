import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import type { Src20Detail } from "$types/src20.d.ts";
import { crypto } from "@std/crypto";
import { isValidBitcoinAddress } from "$lib/utils/typeGuards.ts";
import { SRC20QueryService } from "$server/services/src20/queryService.ts";
import { BigFloat } from "bigfloat/mod.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import type { InputData } from "$types/src20.d.ts";
import { logger } from "$lib/utils/logger.ts";
import { validateImageReference } from "$lib/utils/data/protocols/imageProtocolUtils.ts";
import { buildSrc20StampUrl } from "$server/utils/src20ImageUrl.ts";

export class SRC20UtilityService {
  static formatSRC20Row(row: Src20Detail) {
    // deno-lint-ignore no-explicit-any
    const formatted: any = {
      ...row,
      tick: unicodeEscapeToEmoji(row.tick),
      max: row.max ? row.max.toString() : null,
      lim: row.lim ? row.lim.toString() : null,
      amt: row.amt ? row.amt.toString() : null,
    };

    // Attach ready-to-render image URLs whenever the underlying query
    // already surfaced a tx_hash/deploy_tx but didn't build the URL itself
    // (e.g. `getValidSrc20TxFromDb`, which powers `fetchBasicSrc20Data`).
    // This is the single place every SRC20Row-producing query path routes
    // through (`mapTransactionData`), so every consumer — Explorer, the
    // Wallet "Created" tab, and the basic `/api/v2/src20/*` endpoints —
    // ends up with a consistent `stamp_url`/`deploy_img`, matching what
    // `fetchEnhancedSrc20Data` already provides for `/src20`.
    if (!formatted.stamp_url && formatted.tx_hash) {
      formatted.stamp_url = buildSrc20StampUrl(formatted.tx_hash);
    }
    if (!formatted.deploy_img && formatted.deploy_tx) {
      formatted.deploy_img = buildSrc20StampUrl(formatted.deploy_tx);
    }

    return formatted;
  }

  static calculateTickHash(tick: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(tick.toLowerCase());
    const hashBuffer = crypto.subtle.digestSync("SHA3-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async checkDeployedTick(tick: string) {
    const mintInfo = await SRC20QueryService.fetchSrc20MintProgress(tick);
    return { deployed: !!mintInfo };
  }

  static async checkMintedOut(tick: string, amount: string) {
    const mintInfo = await SRC20QueryService.checkMintedOut(tick, amount);
    if (!mintInfo) {
      throw new Error("Error: Token not found");
    }
    return mintInfo;
  }

  static async checkEnoughBalance(address: string, tick: string, amount: string) {
    try {
      const params = {
        address,
        tick,
        limit: 1,
        page: 1,
      };

      const balanceData = await SRC20QueryService.fetchSrc20Balance(params);

      if (!balanceData || !(balanceData as any).amt) {
        console.error("No SRC-20 token balance found");
        throw new Error("No SRC-20 token balance found");
      }

      if (new BigFloat(amount).gt((balanceData as any).amt)) {
        throw new Error("Error: Not enough SRC-20 token balance");
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  static async validateOperation(
    operation: "deploy" | "mint" | "transfer",
    data: InputData,
  ): Promise<Response | null> {
    logger.debug("stamps", {
      message: "Validating operation",
      data: {
        operation,
        ...data,
        isEstimate: data.isEstimate,
      },
    });

    // Basic validation for all operations
    if (!data.sourceAddress) {
      return ApiResponseUtil.badRequest("Source address is required");
    }

    if (!data.tick) {
      return ApiResponseUtil.badRequest("Tick is required");
    }

    // Operation-specific validation
    switch (operation) {
      case "deploy":
        return await this.validateDeploy(data);
      case "mint":
        return await this.validateMint(data);
      case "transfer":
        return await this.validateTransfer(data);
      default:
        return ApiResponseUtil.badRequest("Invalid operation");
    }
  }

  private static async validateDeploy(data: InputData): Promise<Response | null> {
    // Optional field validations - apply to both estimation and non-estimation
    if (data.x && (typeof data.x !== 'string' || data.x.length > 32 || !/^[a-zA-Z0-9_]{1,32}$/.test(data.x))) {
      return ApiResponseUtil.badRequest("Invalid x username (max 32 chars, alphanumeric and underscore only)");
    }
    if (data.web) {
      if (typeof data.web !== 'string') {
        return ApiResponseUtil.badRequest("Invalid website URL (must be string)");
      }
      if (data.web.length > 255) {
        return ApiResponseUtil.badRequest("Invalid website URL (max 255 chars)");
      }
      if (!/^https?:\/\/.+/.test(data.web)) {
        return ApiResponseUtil.badRequest("Invalid website URL (must start with http:// or https://)");
      }
    }
    if (data.email && (typeof data.email !== 'string' || data.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) {
      return ApiResponseUtil.badRequest("Invalid email address (max 255 chars)");
    }
    if (data.tg && (typeof data.tg !== 'string' || data.tg.length > 32 || !/^[a-zA-Z0-9_]{1,32}$/.test(data.tg))) {
      return ApiResponseUtil.badRequest("Invalid telegram username (max 32 chars, alphanumeric and underscore only)");
    }
    if ((data.description || data.desc) && (typeof (data.description || data.desc) !== 'string' || (data.description || data.desc)!.length > 255)) {
      return ApiResponseUtil.badRequest("Invalid description (max 255 chars)");
    }

    // Skip deployed check for estimation only
    if (!data.isEstimate) {
      const { deployed } = await this.checkDeployedTick(data.tick);
      if (deployed) {
        return ApiResponseUtil.badRequest(`Token ${data.tick} already deployed`);
      }
    }

    // Required field validations
    if (!data.max) {
      return ApiResponseUtil.badRequest("Max supply is required for deploy");
    }
    if (!data.lim) {
      return ApiResponseUtil.badRequest("Limit per mint is required for deploy");
    }
    if (data.dec === undefined) {
      return ApiResponseUtil.badRequest("Decimals is required for deploy");
    }

    // Validate numeric values
    try {
      const maxValue = BigInt(data.max);
      const limValue = BigInt(data.lim);
      const decValue = typeof data.dec === 'number' ? data.dec : parseInt(String(data.dec));

      if (maxValue <= 0n) {
        return ApiResponseUtil.badRequest("Max supply must be greater than 0");
      }
      if (limValue <= 0n) {
        return ApiResponseUtil.badRequest("Limit per mint must be greater than 0");
      }
      if (limValue > maxValue) {
        return ApiResponseUtil.badRequest("Limit per mint cannot exceed max supply");
      }
      if (decValue < 0 || decValue > 18) {
        return ApiResponseUtil.badRequest("Decimals must be between 0 and 18");
      }
    } catch (error) {
      logger.error("src20-utility", { 
        message: "Failed to parse numeric values for deploy validation", 
        error: error instanceof Error ? error.message : String(error) 
      });
      return ApiResponseUtil.badRequest("Invalid numeric values provided");
    }

    return null;
  }

  private static async validateMint(data: InputData): Promise<Response | null> {
    if (!data.amt) {
      return ApiResponseUtil.badRequest("Amount is required for mint");
    }

    // Skip minted out check for estimation
    if (!data.isEstimate) {
      const mintInfo = await this.checkMintedOut(data.tick, data.amt);
      if (mintInfo.minted_out) {
        return ApiResponseUtil.badRequest(`Token ${data.tick} already minted out`);
      }
    }

    return null;
  }

  private static async validateTransfer(data: InputData): Promise<Response | null> {
    if (!data.toAddress || !isValidBitcoinAddress(data.toAddress)) {
      return ApiResponseUtil.badRequest("Invalid or missing recipient address");
    }
    if (!data.amt) {
      return ApiResponseUtil.badRequest("Amount is required for transfer");
    }

    // Skip balance check for estimation
    if (!data.isEstimate) {
      const hasBalance = await this.checkEnoughBalance(
        data.sourceAddress,
        data.tick,
        data.amt,
      );
      if (!hasBalance) {
        return ApiResponseUtil.badRequest("Insufficient balance");
      }
    }

    return null;
  }

  static validateSRC20Deployment(data: {
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
    isEstimate?: boolean;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Core field validation (existing logic)
    if (!data.tick || typeof data.tick !== "string") {
      errors.push("tick is required and must be a string");
    } else if (data.tick.length > 32) {
      errors.push("tick must be 32 characters or less");
    }

    if (!data.max || typeof data.max !== "string") {
      errors.push("max is required and must be a string");
    }

    if (!data.lim || typeof data.lim !== "string") {
      errors.push("lim is required and must be a string");
    }

    if (data.dec !== undefined) {
      if (typeof data.dec !== "number" || data.dec < 0 || data.dec > 18) {
        errors.push("dec must be a number between 0 and 18");
      }
    }

    // Metadata validation (moved outside isEstimate check for consistent validation)
    if (data.x !== undefined) {
      if (typeof data.x !== "string") {
        errors.push("x must be a string");
      } else if (data.x.length > 32) {
        errors.push("x must be 32 characters or less");
      } else if (!/^[a-zA-Z0-9_]+$/.test(data.x)) {
        errors.push("x must contain only alphanumeric characters and underscores");
      }
    }

    if (data.tg !== undefined) {
      if (typeof data.tg !== "string") {
        errors.push("tg must be a string");
      } else if (data.tg.length > 32) {
        errors.push("tg must be 32 characters or less");
      } else if (!/^[a-zA-Z0-9_]+$/.test(data.tg)) {
        errors.push("tg must contain only alphanumeric characters and underscores");
      }
    }

    if (data.web !== undefined) {
      if (typeof data.web !== "string") {
        errors.push("web must be a string");
      } else if (data.web.length > 255) {
        errors.push("web must be 255 characters or less");
      } else if (!/^https?:\/\/.+/.test(data.web)) {
        errors.push("web must be a valid HTTP/HTTPS URL");
      }
    }

    if (data.email !== undefined) {
      if (typeof data.email !== "string") {
        errors.push("email must be a string");
      } else if (data.email.length > 255) {
        errors.push("email must be 255 characters or less");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push("email must be a valid email address");
      }
    }

    // Handle description/desc fallback logic
    const description = data.description || data.desc;
    if (description !== undefined) {
      if (typeof description !== "string") {
        errors.push("description must be a string");
      } else if (description.length > 255) {
        errors.push("description must be 255 characters or less");
      }
    }

    // Image field validation using protocol prefix system
    if (data.img !== undefined) {
      if (typeof data.img !== "string") {
        errors.push("img must be a string");
      } else if (data.img.length > 32) {
        errors.push("img must be 32 characters or less");
      } else if (!validateImageReference(data.img)) {
        errors.push("img must be a valid image reference with protocol prefix (e.g., 'ar:hash', 'ipfs:hash', 'fc:hash')");
      }
    }

    if (data.icon !== undefined) {
      if (typeof data.icon !== "string") {
        errors.push("icon must be a string");
      } else if (data.icon.length > 32) {
        errors.push("icon must be 32 characters or less");
      } else if (!validateImageReference(data.icon)) {
        errors.push("icon must be a valid image reference with protocol prefix (e.g., 'ar:hash', 'ipfs:hash', 'fc:hash')");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
