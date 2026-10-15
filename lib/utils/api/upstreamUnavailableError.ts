/**
 * A dependency we cannot answer without (today: the public Counterparty node)
 * said it is temporarily unavailable or rate-limiting us. That is not a fault
 * in our code, so API routes answer it with 503 + Retry-After instead of 500;
 * ApiResponseUtil.internalError does this for every route that rethrows it.
 */
export class UpstreamUnavailableError extends Error {
  constructor(
    readonly upstream: string,
    readonly retryAfterSeconds: number,
  ) {
    super(
      `${upstream} is temporarily unavailable; retry in ${retryAfterSeconds}s`,
    );
    this.name = "UpstreamUnavailableError";
  }
}
