/**
 * Internal API endpoint for submitting signed transactions to MARA pool
 * This endpoint is for internal use only and should not be exposed publicly
 *
 * POST /api/internal/mara-submit
 */

import { FreshContext, Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { MaraSlipstreamService } from "$/server/services/mara/maraSlipstreamService.ts";
import { logger } from "$lib/utils/logger.ts";
import { InternalRouteGuard } from "$server/services/security/internalRouteGuard.ts";

interface MaraSubmitRequest {
  /** Signed transaction hex string */
  hex: string;
  /** Optional stamp ID for logging and tracking */
  txid?: string;
  /** Transaction priority level */
  priority?: "high" | "medium" | "low";
}

interface MaraSubmitResponse {
  /** Transaction ID from MARA */
  txid: string;
  /** Submission status */
  status: "accepted" | "pending" | "rejected";
  /** Pool identifier */
  pool: "mara";
  /** Human-readable message */
  message: string;
  /** Estimated blocks until confirmation (optional) */
  estimatedConfirmation?: number;
  /** Pool priority level (optional) */
  poolPriority?: number;
}

export const handler: Handlers = {
  async POST(req: Request, _ctx: FreshContext) {
    // Security check for internal endpoints
    const accessError = InternalRouteGuard.requireAPIKey(req);
    if (accessError) return accessError;

    try {
      // MARA is always available - activation depends on user providing outputValue

      // Check if MARA service is available
      if (!MaraSlipstreamService.isAvailable()) {
        logger.warn("api", {
          message: "MARA service circuit breaker is open",
        });
        return ApiResponseUtil.serviceUnavailable(
          "MARA service temporarily unavailable",
        );
      }

      // Parse request body
      const body: MaraSubmitRequest = await req.json();

      // Validate request
      if (!body.hex || typeof body.hex !== "string" || body.hex.length === 0) {
        return ApiResponseUtil.badRequest("Missing or invalid transaction hex");
      }

      // Validate hex format (basic check)
      if (!/^[0-9a-fA-F]+$/.test(body.hex)) {
        return ApiResponseUtil.badRequest("Invalid hex format");
      }

      const priority = body.priority || "high";

      logger.info("api", {
        message: "Submitting transaction to MARA pool",
        stampTxid: body.txid,
        hexLength: body.hex.length,
        hexPreview: body.hex.substring(0, 20) + "...",
        priority,
        contentType: req.headers.get("content-type"),
      });

      // Submit to MARA
      const result = await MaraSlipstreamService.submitTransaction(
        body.hex,
        priority,
      );

      // Format successful response
      const response: MaraSubmitResponse = {
        txid: result.txid,
        status: result.status,
        pool: "mara",
        message: `Transaction ${result.status} by MARA pool`,
        ...(result.estimated_confirmation !== undefined && {
          estimatedConfirmation: result.estimated_confirmation,
        }),
        ...(result.pool_priority !== undefined && {
          poolPriority: result.pool_priority,
        }),
      };

      logger.info("api", {
        message: "Successfully submitted transaction to MARA pool",
        txid: result.txid,
        status: result.status,
        stampTxid: body.txid,
        estimatedConfirmation: result.estimated_confirmation,
      });

      return ApiResponseUtil.success(response, {
        forceNoCache: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to submit transaction to MARA";

      logger.error("api", {
        message: "MARA submission failed",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Check for specific error types
      if (
        errorMessage.includes("circuit breaker") ||
        errorMessage.includes("temporarily unavailable")
      ) {
        return ApiResponseUtil.serviceUnavailable(
          "MARA service temporarily unavailable. Please try again later.",
        );
      }

      if (
        errorMessage.includes("Invalid transaction") ||
        errorMessage.includes("Invalid hex")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }

      // Log full error for debugging
      logger.error("api", {
        message: "MARA submission error details",
        errorType: (error as any).constructor?.name ?? "unknown",
        errorMessage,
        hasStack: !!(error as any).stack,
      });

      return ApiResponseUtil.internalError(
        `MARA submission failed: ${errorMessage}`,
      );
    }
  },
};
