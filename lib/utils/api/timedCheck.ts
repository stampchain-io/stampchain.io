/**
 * Run one health/diagnostic check under a time budget. Never throws: a check
 * that rejects reports "error", one that outlives the budget reports
 * "timeout" (it keeps running in the background; its result is discarded).
 */
export interface Timed<T> {
  name: string;
  ms: number;
  value: T | undefined;
  outcome: "ok" | "error" | "timeout";
}

export async function timedCheck<T>(
  name: string,
  fn: () => Promise<T>,
  budgetMs: number,
): Promise<Timed<T>> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), budgetMs);
  });
  try {
    const result = await Promise.race([fn(), budget]);
    return result === TIMEOUT
      ? { name, ms: elapsed(), value: undefined, outcome: "timeout" }
      : { name, ms: elapsed(), value: result as T, outcome: "ok" };
  } catch {
    return { name, ms: elapsed(), value: undefined, outcome: "error" };
  } finally {
    clearTimeout(timer);
  }
}

const TIMEOUT = Symbol("timeout");

/** `Server-Timing` header value, e.g. `db;dur=12, xcp;dur=2000;desc="timeout"`. */
export function serverTiming(timings: Timed<unknown>[]): string {
  return timings
    .map((t) =>
      `${t.name};dur=${t.ms}${t.outcome === "ok" ? "" : `;desc="${t.outcome}"`}`
    )
    .join(", ");
}
