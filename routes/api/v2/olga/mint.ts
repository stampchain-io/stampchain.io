import { FreshContext, Handlers } from "$fresh/server.ts";
// MintStampInputData import removed as RawRequestBody is now explicitly defined
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { SATOSHIS_PER_BTC } from "$constants"; // For XCP decimal handling if values are not base units
import { logger } from "$lib/utils/logger.ts"; // Import logger
import { serverConfig } from "$server/config/config.ts";
import {
  StampCreationService,
  StampValidationService,
} from "$server/services/stamp/index.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { getProductionFeeService } from "$server/services/fee/feeServiceFactory.ts";
import type {
  CreateStampIssuanceParams,
  NormalizedMintResponse,
  RawRequestBody,
  TransactionInput,
} from "$types/api.d.ts";

export const handler: Handlers<NormalizedMintResponse | { error: string }> = {
  async POST(req: Request, _ctx: FreshContext) {
    // Dynamic import of bitcoinjs-lib to exclude from build-time static analysis
    const bitcoin = await import("bitcoinjs-lib");
    let body: RawRequestBody;
    try {
      body = await req.json();
    } catch (_error) {
      return ApiResponseUtil.badRequest("Invalid JSON format in request body");
    }

    // Check dryRun status early to handle dummy address logic
    const isDryRun = body.dryRun === true;

    logger.info("api", {
      message: "Olga mint request received",
      bodyDryRun: body.dryRun,
      isDryRun,
      bodyDryRunType: typeof body.dryRun,
      hasSourceWallet: !!body.sourceWallet,
    });

    // For dryRun, use dummy address if sourceWallet is not provided
    // This allows fee estimation without wallet connection (Phase 1 estimation)
    const effectiveSourceWallet = isDryRun && !body.sourceWallet
      ? "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4" // Valid P2WPKH dummy address for estimation
      : body.sourceWallet;

    // Validate essential fields that StampCreationService will require
    // Use effectiveSourceWallet instead of body.sourceWallet for validation
    if (
      !effectiveSourceWallet || !body.filename || !body.file ||
      body.qty === undefined || body.locked === undefined ||
      body.divisible === undefined
    ) {
      return ApiResponseUtil.badRequest(
        "Missing required fields: sourceWallet, filename, file, qty, locked, or divisible.",
      );
    }

    // MARA mode detection - activated when outputValue is provided and < 330
    const outputValueNum = body.outputValue !== undefined
      ? (typeof body.outputValue === "string"
        ? parseInt(body.outputValue, 10)
        : body.outputValue)
      : undefined;

    const isMaraMode = outputValueNum !== undefined &&
      outputValueNum >= 1 &&
      outputValueNum < 330; // 330+ uses standard wallet broadcast

    let normalizedFees;
    try {
      const feeInputArgs: { satsPerKB?: number; satsPerVB?: number } = {};
      if (body.satsPerKB !== undefined) {
        feeInputArgs.satsPerKB = typeof body.satsPerKB === "string"
          ? parseFloat(body.satsPerKB)
          : body.satsPerKB;
      }
      if (body.satsPerVB !== undefined) {
        feeInputArgs.satsPerVB = typeof body.satsPerVB === "string"
          ? parseFloat(body.satsPerVB)
          : body.satsPerVB;
      }

      if (
        body.feeRate !== undefined && feeInputArgs.satsPerKB === undefined &&
        feeInputArgs.satsPerVB === undefined
      ) {
        feeInputArgs.satsPerKB = typeof body.feeRate === "string"
          ? parseFloat(body.feeRate)
          : body.feeRate;
      }

      // No fee rate supplied by the caller — fetch the live mempool recommended
      // rate as a dynamic default. The website always sends an explicit rate
      // (from its own fee selection), so this only affects direct API callers,
      // who previously got a 400 here. FeeService has its own static fallbacks,
      // so this rarely throws; if it does, normalizeFeeRate below still raises a
      // clear 400.
      if (
        feeInputArgs.satsPerKB === undefined &&
        feeInputArgs.satsPerVB === undefined
      ) {
        try {
          const feeData = await getProductionFeeService().getFeeData();
          if (feeData?.recommendedFee && feeData.recommendedFee > 0) {
            feeInputArgs.satsPerVB = feeData.recommendedFee;
            logger.info("api", {
              message: "olga/mint: applied dynamic mempool fee default",
              recommendedFee: feeData.recommendedFee,
              source: feeData.source,
            });
          }
        } catch (feeErr) {
          logger.warn("api", {
            message: "olga/mint: dynamic mempool fee default unavailable",
            error: feeErr instanceof Error ? feeErr.message : String(feeErr),
          });
        }
      }

      normalizedFees = normalizeFeeRate(feeInputArgs);

      // Override with MARA fee rate if in MARA mode and rate provided
      if (isMaraMode && body.maraFeeRate) {
        const maraFeeRateNum = typeof body.maraFeeRate === "string"
          ? parseFloat(body.maraFeeRate)
          : body.maraFeeRate;

        // MARA provides fee rate in sats/vB
        normalizedFees.normalizedSatsPerVB = maraFeeRateNum;
        normalizedFees.normalizedSatsPerKB = maraFeeRateNum * 1000;

        logger.info("api", {
          message: "Using MARA fee rate override",
          maraFeeRate: maraFeeRateNum,
          normalizedSatsPerVB: normalizedFees.normalizedSatsPerVB,
          normalizedSatsPerKB: normalizedFees.normalizedSatsPerKB,
        });
      }

      // Log fee rate for debugging
      console.log("🔧 /api/v2/olga/mint: Processing with fee rate", {
        rawFeeRate: body.feeRate,
        rawSatsPerVB: body.satsPerVB,
        rawSatsPerKB: body.satsPerKB,
        maraFeeRate: body.maraFeeRate,
        isMaraMode,
        normalizedFees,
        isDryRun: body.dryRun,
      });
    } catch (error) {
      return ApiResponseUtil.badRequest(
        error instanceof Error ? error.message : "Invalid fee rate",
      );
    }

    // Log the dryRun mode for clarity
    logger.debug("api", {
      message: "Processing olga mint request",
      isDryRun,
      dryRunMode: isDryRun
        ? "estimation_with_dummy_utxos"
        : "execution_with_real_utxos",
      originalSourceWallet: body.sourceWallet,
      effectiveSourceWallet: effectiveSourceWallet,
      filename: body.filename,
    });

    let validatedAssetName;
    try {
      validatedAssetName = await StampValidationService
        .validateAndPrepareAssetName(body.assetName);
    } catch (error: unknown) {
      return ApiResponseUtil.badRequest(
        error instanceof Error
          ? error.message
          : "Invalid asset name (ensure it is a string)",
      );
    }

    // XCP Check for POSH stamps - Only required for actual execution (dryRun: false)
    if (
      body.isPoshStamp && validatedAssetName && effectiveSourceWallet &&
      !isDryRun
    ) {
      try {
        logger.info("api", {
          message: "Performing XCP balance check for POSH stamp",
          assetName: validatedAssetName,
          wallet: effectiveSourceWallet,
        });
        const balancesResult = await CounterpartyApiManager
          .getXcpBalancesByAddress(
            effectiveSourceWallet,
            "XCP",
          ); // Fetch specific XCP balance

        const xcpAsset = balancesResult.balances.find((b) => b.cpid === "XCP");
        const xcpBalance = xcpAsset ? xcpAsset.quantity : 0;

        // Standard cost for issuing a named asset in Counterparty is 0.5 XCP.
        // XCP has 8 decimal places, so 0.5 XCP = 50,000,000 base units.
        const requiredXcpBaseUnits = 50000000;

        logger.debug("api", {
          message: "XCP Balance Check Details",
          assetName: validatedAssetName,
          wallet: effectiveSourceWallet,
          xcpBalanceBaseUnits: xcpBalance,
          requiredXcpBaseUnits,
          xcpAssetFound: !!xcpAsset,
        });

        if (xcpBalance < requiredXcpBaseUnits) {
          const xcpBalanceDecimal = xcpBalance / SATOSHIS_PER_BTC; // Display as decimal XCP
          const requiredXcpDecimal = requiredXcpBaseUnits / SATOSHIS_PER_BTC;
          return ApiResponseUtil.badRequest(
            `Insufficient XCP for POSH stamp issuance. Required: ${requiredXcpDecimal} XCP, Available: ${xcpBalanceDecimal} XCP.`,
          );
        }
        logger.info("api", {
          message: "XCP balance sufficient for POSH stamp",
          assetName: validatedAssetName,
        });
      } catch (xcpError) {
        logger.error("api", {
          message: "Error during XCP balance check",
          assetName: validatedAssetName,
          error: xcpError instanceof Error
            ? xcpError.message
            : String(xcpError),
          stack: xcpError instanceof Error ? xcpError.stack : undefined,
        });
        return ApiResponseUtil.internalError(
          "Error checking XCP balance for POSH stamp issuance.",
        );
      }
    }

    // Validate outputValue range if provided
    if (
      outputValueNum !== undefined &&
      (outputValueNum < 1 || outputValueNum > 1000) // Allow higher values for standard mode
    ) {
      return ApiResponseUtil.badRequest(
        "Invalid outputValue: must be between 1 and 5000",
      );
    }

    // Service fee override logic for MARA mode
    const serviceFeeNum = isMaraMode
      ? 42000 // MARA pool access fee (42k sats)
      : (body.service_fee !== undefined
        ? (typeof body.service_fee === "string"
          ? parseInt(body.service_fee, 10)
          : body.service_fee)
        : parseInt(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, 10));

    const serviceFeeAddr = isMaraMode
      ? "bc1qhhv6rmxvq5mj2fc3zne2gpjqduy45urapje64m" // MARA service fee address
      : (body.service_fee_address !== undefined
        ? body.service_fee_address
        : serverConfig.MINTING_SERVICE_FEE_ADDRESS || ""); // Provide ultimate fallback for string

    // Log MARA mode status
    if (isMaraMode) {
      logger.info("api", {
        message: "MARA mode activated",
        outputValue: outputValueNum,
        serviceFee: serviceFeeNum,
        serviceFeeAddress: serviceFeeAddr,
        maraFeeRate: body.maraFeeRate,
      });
    }

    const createIssuanceParams: CreateStampIssuanceParams = {
      sourceWallet: effectiveSourceWallet,
      assetName: validatedAssetName || "",
      qty: typeof body.qty === "string" ? body.qty : String(body.qty),
      locked: body.locked,
      divisible: body.divisible,
      filename: body.filename,
      file: body.file,
      satsPerKB: normalizedFees.normalizedSatsPerKB,
      satsPerVB: normalizedFees.normalizedSatsPerVB,
      description: body.description || "stamp:",
      prefix: body.prefix || "stamp",
      isDryRun: isDryRun,
      service_fee: serviceFeeNum,
      service_fee_address: serviceFeeAddr,
      ...(outputValueNum !== undefined && { outputValue: outputValueNum }),
    };

    try {
      const mint_tx_details = await StampCreationService.createStampIssuance(
        createIssuanceParams,
      );

      // dryRun: true = Estimation mode (return fee estimates without PSBT hex)
      if (isDryRun) {
        logger.debug("api", {
          message: "Returning fee estimation (dryRun: true)",
          est_tx_size: mint_tx_details.est_tx_size,
          est_miner_fee: mint_tx_details.est_miner_fee,
          total_dust_value: mint_tx_details.total_dust_value,
          total_output_value: mint_tx_details.total_output_value,
        });

        return ApiResponseUtil.success({
          hex: "", // No PSBT hex for estimation
          cpid: validatedAssetName || "",
          est_tx_size: Number(mint_tx_details.est_tx_size),
          input_value: Number(mint_tx_details.input_value),
          total_dust_value: Number(mint_tx_details.total_dust_value),
          est_miner_fee: Number(mint_tx_details.est_miner_fee),
          change_value: Number(mint_tx_details.change_value),
          total_output_value: Number(mint_tx_details.total_output_value),
          txDetails: [], // No transaction details for estimation
          is_estimate: true,
          estimation_method: "service_with_dummy_utxos",
        } as NormalizedMintResponse, { forceNoCache: true });
      }

      // dryRun: false = Execution mode (return full PSBT hex for signing)
      if (!mint_tx_details || !mint_tx_details.hex) {
        logger.error("api", {
          message: "Invalid mint_tx_details structure (missing hex for PSBT)",
          mint_tx_details,
        });
        return ApiResponseUtil.badRequest(
          "Error generating mint transaction: PSBT hex missing",
        );
      }

      const psbt = bitcoin.Psbt.fromHex(mint_tx_details.hex);
      const txDetails: TransactionInput[] = psbt.txInputs.map(
        (input, index) => {
          if (!input.hash) {
            throw new Error(`Input hash missing for input at index ${index}`);
          }
          const hashAsUint8Array = new Uint8Array(input.hash);
          const inputTxid = Array.from(hashAsUint8Array).reverse().map((b) =>
            (b as number).toString(16).padStart(2, "0")
          ).join("");
          return {
            txid: inputTxid,
            vout: input.index,
            signingIndex: index,
          };
        },
      );

      logger.debug("api", {
        message: "Returning execution PSBT (dryRun: false)",
        psbtLength: mint_tx_details.hex.length,
        txDetailsCount: txDetails.length,
        est_tx_size: mint_tx_details.est_tx_size,
      });

      return ApiResponseUtil.success({
        hex: mint_tx_details.hex, // Full PSBT hex for execution
        cpid: validatedAssetName || "",
        est_tx_size: Number(mint_tx_details.est_tx_size),
        input_value: Number(mint_tx_details.input_value),
        total_dust_value: Number(mint_tx_details.total_dust_value),
        est_miner_fee: Number(mint_tx_details.est_miner_fee),
        change_value: Number(mint_tx_details.change_value),
        total_output_value: Number(mint_tx_details.total_output_value),
        txDetails: txDetails, // Full transaction details for execution
        is_estimate: false,
        estimation_method: "exact_with_real_utxos",
      } as NormalizedMintResponse, { forceNoCache: true });
    } catch (error: unknown) {
      logger.error("api", {
        message: "Minting error in API route",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage = error instanceof Error
        ? error.message
        : "An unexpected error occurred during minting";
      if (
        errorMessage.toLowerCase().includes("insufficient funds") ||
        errorMessage.includes("UTXO selection failed")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }
      return ApiResponseUtil.internalError(errorMessage);
    }
  },
};
