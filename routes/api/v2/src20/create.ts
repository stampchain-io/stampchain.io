import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import { normalizeFeeRate } from "$server/services/counterpartyApiService.ts";
import type { SRC20CreateResponse } from "$types/api.d.ts";
import type { InputData } from "$types/src20.d.ts";
import type { TXError } from "$types/transaction.d.ts";
import type { AncestorInfo } from "$types/wallet.d.ts";

type TrxType = "multisig" | "olga";

interface ExtendedInputData
  extends Omit<InputData, "feeRate" | "satsPerKB" | "satsPerVB"> {
  feeRate?: number | string;
  satsPerVB?: number | string;
  satsPerKB?: number | string;
  utxoAncestors?: AncestorInfo[];
  service_fee?: number | string;
  service_fee_address?: string;
  dryRun?: boolean;
  trxType?: TrxType;
  tg?: string;
  description?: string;
  desc?: string;
  img?: string; // Simple protocol:hash format (max 32 chars)
  icon?: string; // Simple protocol:hash format (max 32 chars)
}

export const handler: Handlers<SRC20CreateResponse | TXError> = {
  async POST(req: Request) {
    try {
      const rawBody = await req.text();
      if (!rawBody) {
        return ApiResponseUtil.badRequest("Empty request body");
      }

      let body: ExtendedInputData;
      try {
        body = JSON.parse(rawBody);
      } catch (_e) {
        return ApiResponseUtil.badRequest("Invalid JSON in request body");
      }

      // Debug logging to see what's being received
      logger.debug("api-src20-create", {
        message: "Received SRC20 create request",
        body: {
          op: body.op,
          tick: body.tick,
          sourceAddress: body.sourceAddress,
          fromAddress: body.fromAddress,
          changeAddress: body.changeAddress,
          hasOp: !!body.op,
          hasTick: !!body.tick,
          hasAnyAddress:
            !!(body.sourceAddress || body.fromAddress || body.changeAddress),
        },
      });

      if (
        !body.op || !body.tick ||
        !(body.sourceAddress || body.fromAddress || body.changeAddress)
      ) {
        logger.error("api-src20-create", {
          message: "Missing required fields",
          missingOp: !body.op,
          missingTick: !body.tick,
          missingAddress:
            !(body.sourceAddress || body.fromAddress || body.changeAddress),
          addresses: {
            sourceAddress: body.sourceAddress || "not provided",
            fromAddress: body.fromAddress || "not provided",
            changeAddress: body.changeAddress || "not provided",
          },
        });

        const missingFields = [];
        if (!body.op) missingFields.push("op");
        if (!body.tick) missingFields.push("tick");
        if (!(body.sourceAddress || body.fromAddress || body.changeAddress)) {
          missingFields.push(
            "address (sourceAddress, fromAddress, or changeAddress)",
          );
        }

        return ApiResponseUtil.badRequest(
          `Missing required SRC20 fields: ${
            missingFields.join(", ")
          }. Please ensure your wallet is connected.`,
        );
      }

      const isEffectivelyDryRun = body.dryRun === true;

      const feeInput: { satsPerKB?: number; satsPerVB?: number } = {};
      if (body.satsPerKB !== undefined) {
        feeInput.satsPerKB = typeof body.satsPerKB === "string"
          ? parseFloat(body.satsPerKB)
          : body.satsPerKB;
      }
      if (body.satsPerVB !== undefined) {
        feeInput.satsPerVB = typeof body.satsPerVB === "string"
          ? parseFloat(body.satsPerVB)
          : body.satsPerVB;
      }
      if (
        body.feeRate !== undefined && feeInput.satsPerKB === undefined &&
        feeInput.satsPerVB === undefined
      ) {
        feeInput.satsPerKB = typeof body.feeRate === "string"
          ? parseFloat(body.feeRate)
          : body.feeRate;
      }
      const normalizedFees = normalizeFeeRate(feeInput);

      const effectiveSourceAddress = body.sourceAddress || body.fromAddress ||
        body.changeAddress!;
      const effectiveChangeAddress = body.changeAddress || body.sourceAddress ||
        "";

      const opForValidation = body.op.toLowerCase() as
        | "deploy"
        | "transfer"
        | "mint";
      const validationError = await SRC20Service.UtilityService
        .validateOperation(
          opForValidation,
          {
            sourceAddress: effectiveSourceAddress,
            changeAddress: effectiveChangeAddress || "",
            tick: body.tick,
            max: body.max?.toString(),
            lim: body.lim?.toString(),
            dec: body.dec !== undefined ? Number(body.dec) : undefined,
            amt: body.amt?.toString(),
            toAddress: body.toAddress,
            x: body.x,
            web: body.web,
            email: body.email,
            tg: body.tg,
            description: body.description || body.desc,
            img: body.img,
            icon: body.icon,
            isEstimate: isEffectivelyDryRun,
          } as InputData,
        );
      if (validationError) return validationError as Response;
      if (body.trxType === "multisig") {
        return ApiResponseUtil.badRequest(
          "Multisig transactions should use dedicated endpoint",
        );
      }

      // Simple image validation
      if (body.img) {
        const { validateImageReference, normalizeImageReference } =
          await import(
            "$lib/utils/data/protocols/imageProtocolUtils.ts"
          );
        // Normalize first (truncates st: hashes to 20 chars if needed)
        body.img = normalizeImageReference(body.img);

        if (!validateImageReference(body.img)) {
          return ApiResponseUtil.badRequest(
            "Invalid img format. Use protocol:hash format (max 32 chars). Supported protocols: ar, ipfs, fc, ord, st",
          );
        }
      }

      if (body.icon) {
        const { validateImageReference } = await import(
          "$lib/utils/data/protocols/imageProtocolUtils.ts"
        );
        if (!validateImageReference(body.icon)) {
          return ApiResponseUtil.badRequest(
            "Invalid icon format. Use protocol:hash format (max 32 chars). Supported protocols: ar, ipfs, fc, ord, st",
          );
        }
      }

      const psbtResult = await SRC20Service.PSBTService.preparePSBT({
        sourceAddress: effectiveSourceAddress,
        toAddress: body.toAddress || effectiveSourceAddress,
        src20Action: {
          p: "SRC-20",
          op: body.op.toUpperCase(),
          tick: body.tick,
          ...(body.max && { max: body.max.toString() }),
          ...(body.lim && { lim: body.lim.toString() }),
          ...(body.dec !== undefined && { dec: Number(body.dec) }),
          ...(body.amt && { amt: body.amt.toString() }),
          ...(body.x && { x: body.x }),
          ...(body.web && { web: body.web }),
          ...(body.email && { email: body.email }),
          ...(body.tg && { tg: body.tg }),
          ...((body.description || body.desc) &&
            { description: body.description || body.desc }),
          ...(body.img && { img: body.img }),
          ...(body.icon && { icon: body.icon }),
        },
        satsPerVB: normalizedFees.normalizedSatsPerVB,
        service_fee: body.service_fee !== undefined
          ? (typeof body.service_fee === "string"
            ? parseInt(body.service_fee)
            : body.service_fee)
          : 0,
        service_fee_address: body.service_fee_address || "",
        changeAddress: effectiveChangeAddress || "",
        trxType: body.trxType || "olga",
        isDryRun: isEffectivelyDryRun,
      });

      const responsePayload: SRC20CreateResponse = {
        hex: psbtResult.psbt?.toHex(),
        est_tx_size: psbtResult.estimatedTxSize,
        input_value: psbtResult.totalInputValue,
        total_dust_value: psbtResult.totalDustValue,
        est_miner_fee: psbtResult.estMinerFee,
        fee: psbtResult.feeDetails?.totalValue,
        change_value: psbtResult.totalChangeOutput,
        inputsToSign: psbtResult.inputs,
        sourceAddress: effectiveSourceAddress,
        changeAddress: psbtResult.changeAddress,
        feeDetails: psbtResult.feeDetails,
        cpid: body.tick,
      };

      if (isEffectivelyDryRun) {
        delete responsePayload.hex;
        delete responsePayload.inputsToSign;
      }
      return ApiResponseUtil.success(responsePayload, { forceNoCache: true });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error("api-src20-create", {
        message: "Error processing SRC20 create request",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (
        errorMessage.toLowerCase().includes("insufficient funds") ||
        errorMessage.toLowerCase().includes("no utxos available") ||
        errorMessage.includes("UTXO selection failed")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }

      if (
        errorMessage.includes("Invalid address") ||
        errorMessage.includes("Invalid operation parameters")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }

      return ApiResponseUtil.internalError(
        error as Error,
        "Failed to process SRC20 request",
      );
    }
  },
};
