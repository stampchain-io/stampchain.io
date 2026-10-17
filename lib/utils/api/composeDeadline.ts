/**
 * Overall time limit for transaction-compose routes.
 *
 * A compose route chains several upstream calls (Counterparty, UTXO
 * providers, the cache). Each call has its own timeout, but their sum could
 * still keep a user waiting 30 s or more before failing (#1287). This
 * wrapper answers 503 + Retry-After once the route's budget is spent, so the
 * caller learns quickly that it should retry.
 *
 * The handler is not cancelled: it keeps running in the background and its
 * result is discarded, the same trade-off as the health route's timedCheck.
 * Its upstream calls are each bounded, so the leftover work ends on its own.
 */
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { envInt } from "$lib/utils/bitcoin/utxo/providerBudgets.ts";
import { logger } from "$lib/utils/logger.ts";

export interface ComposeDeadlineOptions {
  /** Overrides COMPOSE_DEADLINE_MS (default 20000). */
  deadlineMs?: number;
  /** Overrides COMPOSE_RETRY_AFTER_SECONDS (default 10). */
  retryAfterSeconds?: number;
}

const DEADLINE_HIT = Symbol("compose-deadline");

export function composeDeadlineMs(): number {
  return envInt("COMPOSE_DEADLINE_MS", 20000);
}

export function composeRetryAfterSeconds(): number {
  return envInt("COMPOSE_RETRY_AFTER_SECONDS", 10);
}

/** Wrap a compose route handler with the overall deadline. */
export function withComposeDeadline<A extends unknown[]>(
  route: string,
  handler: (req: Request, ...rest: A) => Response | Promise<Response>,
  options: ComposeDeadlineOptions = {},
): (req: Request, ...rest: A) => Promise<Response> {
  return async (req: Request, ...rest: A): Promise<Response> => {
    const deadlineMs = options.deadlineMs ?? composeDeadlineMs();
    if (deadlineMs <= 0) return await handler(req, ...rest);

    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<typeof DEADLINE_HIT>((resolve) => {
      timer = setTimeout(() => resolve(DEADLINE_HIT), deadlineMs);
    });
    const work = Promise.resolve().then(() => handler(req, ...rest));
    // The route may still settle after we answered; never leave that
    // rejection unhandled.
    work.catch(() => {});

    try {
      const outcome = await Promise.race([work, deadline]);
      if (outcome !== DEADLINE_HIT) return outcome;

      const retryAfter = options.retryAfterSeconds ??
        composeRetryAfterSeconds();
      logger.warn("api", {
        message: "Compose route exceeded its deadline; answering 503",
        route,
        deadlineMs,
        elapsedMs: Math.round(performance.now() - started),
      });
      return ApiResponseUtil.serviceUnavailable(
        `Upstream services are slow right now; please retry in ${retryAfter}s.`,
        undefined,
        {
          forceNoCache: true,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    } finally {
      clearTimeout(timer);
    }
  };
}
