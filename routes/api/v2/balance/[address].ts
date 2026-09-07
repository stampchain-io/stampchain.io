import { Handlers } from "$fresh/server.ts";
import type { AddressHandlerContext } from "$types/api.d.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import {
  BTC_BALANCE_LEG_CEILING_MS,
  getBTCBalanceInfoBounded,
} from "$lib/utils/data/processing/balanceUtils.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { isValidBitcoinAddress } from "$lib/utils/typeGuards.ts";
import { Src20Controller } from "$server/controller/src20Controller.ts";
import { StampController } from "$server/controller/stampController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import {
  DEFAULT_PAGINATION,
  validateRequiredParams,
} from "$server/services/validation/routeValidationService.ts";

export const handler: Handlers<AddressHandlerContext> = {
  async GET(req: Request, ctx): Promise<Response> {
    try {
      const { address } = ctx.params;
      const url = new URL(req.url);

      const paramsValidation = validateRequiredParams({ address });
      if (!paramsValidation.isValid) {
        return paramsValidation.error ??
          ApiResponseUtil.badRequest("Invalid parameters");
      }

      // Check for XSS attempts
      const xssPattern = /<script|javascript:|on\w+=/i;
      if (xssPattern.test(address)) {
        return ApiResponseUtil.badRequest(
          "Invalid input detected",
          { routeType: RouteType.BALANCE },
        );
      }

      // Validate Bitcoin address format
      if (!isValidBitcoinAddress(address)) {
        return ApiResponseUtil.badRequest(
          `Invalid Bitcoin address format: ${address}`,
          { routeType: RouteType.BALANCE },
        );
      }

      // Get pagination params
      const pagination = getPaginationParams(url);
      if (pagination instanceof Response) {
        return pagination;
      }

      const {
        limit = DEFAULT_PAGINATION.limit,
        page = DEFAULT_PAGINATION.page,
      } = pagination;

      // Call controllers directly instead of making HTTP requests to avoid DNS issues.
      //
      // The BTC leg talks to third-party providers (mempool.space / BlockCypher)
      // and is the only leg that can be slow; it is hard-capped so that a slow
      // or rate-limiting provider degrades the `btc` block instead of stalling
      // the stamps + SRC-20 data behind it (#1198). `btcLeg.status` is surfaced
      // via the `X-BTC-Balance-Status` header; the response schema is unchanged.
      const [stamps, src20, btcLeg] = await Promise.all([
        StampController.getStampBalancesByAddress(address, limit, page),
        Src20Controller.handleSrc20BalanceRequest({
          address,
          limit,
          page,
          includePagination: true,
        }),
        getBTCBalanceInfoBounded(address, BTC_BALANCE_LEG_CEILING_MS),
      ]);
      const btcInfo = btcLeg.info;

      // NOTE: deliberately NO 404 for "valid address, zero holdings".
      //
      // The address has already been validated above (malformed input returns
      // 400), so reaching here means the address is real — it simply holds no
      // stamps or SRC-20. That is an empty result, not a missing resource, and
      // 200 with empty arrays is the correct representation. It also matters
      // practically: this endpoint is the one that carries `btc`, so 404-ing
      // would throw away the BTC balance for exactly the users who most need
      // it — a freshly connected wallet holding BTC but no stamps yet.
      //
      // This is also the behaviour already shipping on dev, which only ever
      // passed the old emptiness check because the SRC-20 controller returned
      // a single wrapper object (`[{ last_block: 0, data: [] }]`) rather than
      // a genuinely empty array. Once that wrapper was cleaned up, the check
      // started firing and the endpoint began 404-ing. Making the 200 explicit
      // preserves the shipped contract instead of resting on that quirk.

      // Calculate combined totals
      const totalItems = ((stamps as any).total || 0) +
        ((src20 as any).total || 0);
      const totalPages = Math.ceil(totalItems / limit);

      // Format response to match old schema
      const response = {
        page: page,
        limit: limit,
        totalPages: totalPages,
        total: totalItems,
        last_block: Math.max(stamps.last_block || 0, src20.last_block || 0),
        btc: {
          address: address,
          balance: btcInfo?.balance ?? 0,
          txCount: btcInfo?.txCount ?? 0,
          unconfirmedBalance: btcInfo?.unconfirmedBalance ?? 0,
          unconfirmedTxCount: btcInfo?.unconfirmedTxCount ?? 0,
        },
        data: {
          stamps: stamps.data || [],
          src20: src20.data || [],
        },
      };

      // Return with proper caching and informational headers
      return ApiResponseUtil.success(response, {
        routeType: RouteType.BALANCE,
        headers: {
          "X-Preferred-Endpoints":
            "/api/v2/stamps/balance/[address], /api/v2/src20/balance/[address]",
          "X-Info":
            "Consider using dedicated endpoints for better performance and pagination control",
          // ok | unavailable | timeout — when not "ok" the btc block is zeros.
          "X-BTC-Balance-Status": btcLeg.status,
        },
      });
    } catch (error) {
      console.error("Error in balance/[address] handler:", error);
      return ApiResponseUtil.internalError(
        error instanceof Error ? error : new Error(String(error)),
        "Failed to fetch balance data",
      );
    }
  },
};
