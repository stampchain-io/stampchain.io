import { FreshContext } from "$fresh/server.ts";
import { logger } from "$lib/utils/logger.ts";
import { refreshLeaderboard } from "$server/services/leaderboard/leaderboardService.ts";
import { InternalRouteGuard } from "$server/services/security/internalRouteGuard.ts";

/** Warm the 12-hour leaderboard snapshot. Guarded like the other internal routes. */
export async function handler(
  req: Request,
  _ctx: FreshContext,
): Promise<Response> {
  const accessError = InternalRouteGuard.requireAPIKey(req);
  if (accessError) {
    logger.warn("cache", {
      message: "Access denied for leaderboard refresh",
    });
    return accessError;
  }
  const snapshot = await refreshLeaderboard();
  return Response.json({
    ok: true,
    generated_at: snapshot.generated_at,
    escrow_included: snapshot.escrow_included,
    stamps: snapshot.by_stamps.length,
    valuation: snapshot.by_valuation.length,
  });
}
