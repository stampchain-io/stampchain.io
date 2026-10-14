import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { generateRandomNumber } from "$lib/utils/data/numbers/numberUtils.ts";
import { isCpid } from "$lib/utils/typeGuards.ts";

export class StampValidationService {
  static readonly AVAILABILITY_UNKNOWN_MESSAGE =
    "Could not confirm the asset name with Counterparty right now. Please try again in a moment.";

  /**
   * True when the name is free, false when it is taken. Throws when
   * Counterparty cannot answer, so a rate-limited lookup is never read as
   * "available" (which would let a mint compose against a taken name).
   */
  static async checkAssetAvailability(assetName: string): Promise<boolean> {
    const state = await CounterpartyApiManager.checkAssetAvailability(assetName);
    if (state === "unknown") {
      throw new Error(this.AVAILABILITY_UNKNOWN_MESSAGE);
    }
    return state === "available";
  }

  static async generateAvailableAssetName(): Promise<string> {
    const max_asset_id = 2n ** 64n - 1n;
    const min_asset_id = 26n ** 12n + 1n;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      // Convert to string after subtracting BigInts
      const asset_name = "A" + (generateRandomNumber(
        Number(min_asset_id - 8008n),
        Number(max_asset_id - 8008n)
      ));
      if (await this.checkAssetAvailability(asset_name)) return asset_name;
    }

    // Previously this returned the last (taken) name after 100 misses.
    throw new Error("Could not find an available numeric asset name. Please try again.");
  }

  static async validateAndPrepareAssetName(assetName?: string): Promise<string> {
    if (!assetName) {
      return this.generateAvailableAssetName();
    }

    // FIXME: We need to check and validate the users address has XCP in the wallet for a cleaner error than 'insufficient funds'
    // FIXME: this should also likely check the qty on the issuance value

    const upperCaseAssetName = assetName.toUpperCase();

    // Use the centralized CPID validation
    if (!isCpid(upperCaseAssetName)) {
      throw new Error(
        "Invalid asset name format. Must be either an A-prefixed numeric ID or a B-Z alphabetic name up to 13 characters."
      );
    }

    const isAvailable = await this.checkAssetAvailability(upperCaseAssetName);
    if (!isAvailable) {
      throw new Error("Asset name is not available.");
    }

    return upperCaseAssetName;
  }
}
