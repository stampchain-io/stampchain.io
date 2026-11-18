import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { generateRandomNumber } from "$lib/utils/data/numbers/numberUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { XCP_BASE_UNITS } from "$lib/utils/xcp/xcpWalletBalance.ts";
import { isCpid } from "$lib/utils/typeGuards.ts";

/** Named (B-Z) Counterparty issuance costs 0.5 XCP. */
const NAMED_ASSET_ISSUANCE_XCP_BASE_UNITS = 50_000_000;
const NAMED_ASSET_PATTERN = /^[B-Z][A-Z]{0,12}$/;

/** Wallet cannot pay the 0.5 XCP fee for a named stamp. */
export class InsufficientXcpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientXcpError";
  }
}

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

  /**
   * Named assets cost 0.5 XCP. Numeric A-CPIDs return without a balance
   * lookup. Throws InsufficientXcpError when the spendable send balance is
   * short. Balance-lookup failures propagate unchanged.
   */
  static async assertSpendableXcpForNamedAsset(
    address: string,
    assetName: string,
  ): Promise<void> {
    const upperCaseAssetName = assetName.toUpperCase();
    if (!NAMED_ASSET_PATTERN.test(upperCaseAssetName)) return;

    logger.info("api", {
      message: "Performing XCP balance check for POSH stamp",
      assetName: upperCaseAssetName,
      wallet: address,
    });

    const balancesResult = await CounterpartyApiManager
      .getXcpBalancesByAddress(
        address,
        "XCP",
        false,
        { type: "send" },
      );

    const availableBaseUnits = balancesResult.balances.reduce(
      (sum, row) => {
        if (row.cpid !== "XCP") return sum;
        const quantity = Number(row.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return sum;
        return sum + quantity;
      },
      0,
    );
    if (availableBaseUnits < NAMED_ASSET_ISSUANCE_XCP_BASE_UNITS) {
      const required = NAMED_ASSET_ISSUANCE_XCP_BASE_UNITS / XCP_BASE_UNITS;
      const available = availableBaseUnits / XCP_BASE_UNITS;
      throw new InsufficientXcpError(
        "Insufficient XCP for POSH stamp issuance. " +
          `Required: ${required} XCP, Available: ${available} XCP.`,
      );
    }

    logger.info("api", {
      message: "XCP balance sufficient for POSH stamp",
      assetName: upperCaseAssetName,
      wallet: address,
      xcpBalanceBaseUnits: availableBaseUnits,
    });
  }
}
