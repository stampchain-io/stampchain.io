import { verifySignature } from "$lib/utils/security/cryptoUtils.ts";
import type { CreatorSearchResult } from "$lib/types/creator.ts";
import { CreatorRepository } from "$server/database/creatorRepository.ts";
import { SecurityService } from "$server/services/security/securityService.ts";
import { SRC101Service } from "$server/services/src101/index.ts";
import { StampService } from "$server/services/stampService.ts";

const CREATOR_NAME_MAX_LENGTH = 25;
const CREATOR_NAME_MIN_LENGTH = 1;
const CREATOR_NAME_PATTERN = /^[a-zA-Z0-9 .\-_']+$/;

export class CreatorService {
  static async searchCreators(query: string): Promise<CreatorSearchResult[]> {
    return await CreatorRepository.searchCreators(query);
  }

  static validateCreatorName(
    name: string,
  ): { valid: boolean; sanitized?: string; message?: string } {
    if (typeof name !== "string") {
      return { valid: false, message: "Creator name must be a string" };
    }

    const trimmed = name.trim();

    if (trimmed.length < CREATOR_NAME_MIN_LENGTH) {
      return { valid: false, message: "Creator name cannot be empty" };
    }

    if (trimmed.length > CREATOR_NAME_MAX_LENGTH) {
      return {
        valid: false,
        message:
          `Creator name must be ${CREATOR_NAME_MAX_LENGTH} characters or fewer (got ${trimmed.length})`,
      };
    }

    if (!CREATOR_NAME_PATTERN.test(trimmed)) {
      return {
        valid: false,
        message:
          "Creator name can only contain letters, numbers, spaces, periods, hyphens, underscores, and apostrophes",
      };
    }

    return { valid: true, sanitized: trimmed };
  }

  static async getCreatorNameByAddress(address: string): Promise<string | null> {
    try {
      // 1. First check the creators table
      const creatorName = await StampService.getCreatorNameByAddress(address);
      if (creatorName) {
        return creatorName;
      }

      // 2. If not found in creators table, check for PRI bitname domain
      const primaryDomain = await SRC101Service.QueryService.getPrimaryDomainForAddress(address);
      if (primaryDomain) {
        return `${primaryDomain}.btc`;
      }

      // 3. Fall back to null (which will display as ANONYMOUS)
      return null;
    } catch (error) {
      console.error("Error getting creator name by address:", error);
      return null;
    }
  }

  /**
   * Enriches stamp data with enhanced creator names using 3-tier fallback
   * @param stamps - Array of stamp objects with creator and creator_name fields
   * @returns Promise<Array> - Stamps with enhanced creator_name fields
   */
  static async enrichStampsWithCreatorNames(stamps: any[]): Promise<any[]> {
    if (!stamps || stamps.length === 0) {
      return stamps;
    }

    // Get unique creator addresses that don't have creator_name
    const creatorsNeedingEnhancement = new Set<string>();

    for (const stamp of stamps) {
      if (stamp.creator && !stamp.creator_name) {
        creatorsNeedingEnhancement.add(stamp.creator);
      }
    }

    // If no creators need enhancement, return original stamps
    if (creatorsNeedingEnhancement.size === 0) {
      return stamps;
    }

    // Get enhanced creator names for all addresses that need it.
    // Run lookups with bounded concurrency instead of one-at-a-time —
    // sequential awaits here turn into O(n) round trips and can blow past
    // route-level timeouts when many unique creators are on a page. The
    // concurrency limit is kept well under the DB pool's max connections
    // (see DatabaseManager) so this doesn't starve other concurrent requests.
    const enhancedCreatorNames = new Map<string, string>();
    const addresses = Array.from(creatorsNeedingEnhancement);
    const CONCURRENCY_LIMIT = 3;

    for (let i = 0; i < addresses.length; i += CONCURRENCY_LIMIT) {
      const batch = addresses.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(
        batch.map(async (creatorAddress) => {
          try {
            const enhancedName = await this.getCreatorNameByAddress(creatorAddress);
            if (enhancedName) {
              enhancedCreatorNames.set(creatorAddress, enhancedName);
            }
          } catch (error) {
            console.error(`Error getting enhanced creator name for ${creatorAddress}:`, error);
          }
        }),
      );
    }

    // Enrich the stamps with enhanced creator names
    return stamps.map(stamp => {
      if (stamp.creator && !stamp.creator_name) {
        const enhancedName = enhancedCreatorNames.get(stamp.creator);
        if (enhancedName) {
          return {
            ...stamp,
            creator_name: enhancedName
          };
        }
      }
      return stamp;
    });
  }

  static async updateCreatorName(params: {
    address: string;
    newName: string;
    signature: string;
    timestamp: string;
    csrfToken: string;
  }): Promise<{ success: boolean; creatorName?: string; message?: string }> {
    try {
      // Validate name before any crypto operations (fail fast)
      const validation = CreatorService.validateCreatorName(params.newName);
      if (!validation.valid) {
        return { success: false, message: validation.message ?? "Invalid creator name" };
      }
      const sanitizedName = validation.sanitized!;

      // Verify CSRF token first
      const isValidCSRF = await SecurityService.validateCSRFToken(params.csrfToken);
      if (!isValidCSRF) {
        return { success: false, message: "Invalid CSRF token" };
      }

      // Verify signature (uses original newName since that's what was signed)
      const message = `Update creator name to ${params.newName} at ${params.timestamp}`;
      const isValidSignature = verifySignature(message, params.signature, params.address);
      if (!isValidSignature) {
        return { success: false, message: "Invalid signature" };
      }

      // Check timestamp (5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (parseInt(params.timestamp) < fiveMinutesAgo) {
        return { success: false, message: "Signature expired" };
      }

      // Update with sanitized (trimmed) name. Call StampService directly
      // (not StampController) — the controller is HTTP-route-shaped and
      // always resolves to a truthy Response object, which would silently
      // mask a `false` (failed) result from the underlying DB write.
      const updated = await StampService.updateCreatorName(
        params.address,
        sanitizedName,
      );
      if (!updated) {
        return { success: false, message: "Failed to update creator name" };
      }

      return { success: true, creatorName: sanitizedName };
    } catch (error) {
      console.error("Error in CreatorService.updateCreatorName:", error);
      return { success: false, message: "Failed to update creator name" };
    }
  }
}
