/**
 * HTTP access to Counterparty nodes, with per-node limits.
 *
 * Each node in XCP_V2_NODES gets its own concurrency cap and its own
 * rate-limit cooldown, so a 429 from the public node never slows calls to our
 * own node. Request failures are rethrown as XcpNodeRequestError, whose message
 * names the node but never its URL: some routes return error messages to
 * clients, and a private node's address must not leak that way.
 */
import { XCP_V2_NODES, type XcpNode } from "$constants";
import {
  FetchHttpClient,
  type HttpResponse,
} from "$server/interfaces/httpClient.ts";

const rawHttpClient = new FetchHttpClient(
  30000, // default timeout; nodes may set a shorter one
  2, // default retries (always overridden to 0 below)
  1000,
);

const env = (key: string): string | undefined =>
  typeof Deno !== "undefined" ? Deno.env.get(key) : undefined;

/**
 * Default concurrency cap. Crawlers walking stamp pages used to fan out
 * hundreds of simultaneous asset lookups at the public node, which answered
 * with 429s (~150/hour). Requests beyond the cap wait in FIFO order.
 */
const DEFAULT_MAX_CONCURRENCY = Math.max(
  1,
  Number(env("XCP_MAX_CONCURRENCY") ?? 4) || 4,
);

/**
 * Back-off. A node that rate-limits this deployment's egress IP means "every
 * caller wait", not "this request should retry": client-side 429 retries held
 * slots for 10s+ and stacked page loads to 30s. So client retries are off; on
 * 429/503 every caller of that node pauses for Retry-After (default 2s) and
 * the request is tried once more.
 */
const DEFAULT_COOLDOWN_MS = 2000;
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
/**
 * Longest any single request sleeps on a cooldown. The public node's 503
 * body asks for 10s+; honouring that inside a user-facing compose call made
 * attach/mint take 16-20s and still fail. A caller waits at most this long,
 * and skips its retry when the node asked for longer.
 */
const MAX_COOLDOWN_WAIT_MS = 2000;

interface NodeState {
  node: XcpNode;
  max: number;
  inFlight: number;
  waiters: Array<() => void>;
  cooldownUntil: number;
}

const states: NodeState[] = XCP_V2_NODES.map((node) => ({
  node,
  max: Math.max(1, node.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY),
  inFlight: 0,
  waiters: [],
  cooldownUntil: 0,
}));

/** Requests to a URL outside the node list share one fallback state. */
const otherState: NodeState = {
  node: { name: "counterparty", url: "" },
  max: DEFAULT_MAX_CONCURRENCY,
  inFlight: 0,
  waiters: [],
  cooldownUntil: 0,
};

function stateFor(url: string): NodeState {
  return states.find((s) => url.startsWith(s.node.url)) ?? otherState;
}

/** The node's configured name for a URL, safe to show to clients. */
export function xcpNodeName(url: string): string {
  return stateFor(url).node.name;
}

function cooldownRemaining(state: NodeState): number {
  return Math.max(0, state.cooldownUntil - Date.now());
}

async function waitForCooldown(state: NodeState): Promise<void> {
  const wait = Math.min(cooldownRemaining(state), MAX_COOLDOWN_WAIT_MS);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

function noteRateLimit(state: NodeState, retryAfter: string | undefined): void {
  const seconds = Number.parseInt(retryAfter ?? "", 10);
  const ms = Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : DEFAULT_COOLDOWN_MS;
  state.cooldownUntil = Math.max(state.cooldownUntil, Date.now() + ms);
}

async function withSlot<T>(state: NodeState, fn: () => Promise<T>): Promise<T> {
  if (state.inFlight >= state.max) {
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }
  state.inFlight++;
  try {
    return await fn();
  } finally {
    state.inFlight--;
    state.waiters.shift()?.();
  }
}

/** The retry hint in a node's 503 body, capped at 60s. */
export function retryAfterFromBody(data: unknown): string | undefined {
  try {
    const body = typeof data === "string" ? JSON.parse(data) : data;
    const seconds = (body as { retry_after_seconds?: unknown } | null)
      ?.retry_after_seconds;
    return typeof seconds === "number" && seconds > 0
      ? String(Math.min(seconds, 60))
      : undefined;
  } catch {
    return undefined;
  }
}

/** A request to a node failed before it answered. The message has no URL. */
export class XcpNodeRequestError extends Error {
  constructor(readonly node: string, cause: unknown) {
    const kind = cause instanceof Error ? cause.name : typeof cause;
    super(`Counterparty node "${node}" request failed (${kind})`, { cause });
    this.name = "XcpNodeRequestError";
  }
}

/**
 * True when a node's answer settles the request: any 4xx other than 429. The
 * next node would give the same answer, so callers stop failing over.
 */
export function isDefinitiveRejection(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}

export const xcpHttpClient = {
  get: async <T = any>(
    url: string,
    config?: Parameters<FetchHttpClient["get"]>[1],
  ): Promise<HttpResponse<T>> => {
    const state = stateFor(url);
    const timeout = config?.timeout ?? state.node.timeoutMs;
    let last: HttpResponse<T> | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1 && cooldownRemaining(state) > MAX_COOLDOWN_WAIT_MS) break;
      await waitForCooldown(state);
      try {
        last = await withSlot(
          state,
          () =>
            rawHttpClient.get<T>(url, {
              ...config,
              retries: 0,
              ...(timeout ? { timeout } : {}),
            }),
        );
      } catch (error) {
        lastError = error;
        continue;
      }
      if (!RETRYABLE_STATUSES.has(last.status)) return last;
      if (last.status === 429 || last.status === 503) {
        // A 503 is "counterparty_temporarily_unavailable" with a retry hint
        // in the body; treat it like a rate limit so every caller of this
        // node backs off instead of each retrying on its own.
        noteRateLimit(
          state,
          last.headers?.["retry-after"] ?? retryAfterFromBody(last.data),
        );
      }
    }
    if (last) return last;
    throw new XcpNodeRequestError(state.node.name, lastError);
  },
};

/** Test hook: limiter state summed over nodes (cooldown = the longest). */
export function _xcpLimiterState() {
  const all = [...states, otherState];
  return {
    inFlight: all.reduce((n, s) => n + s.inFlight, 0),
    waiting: all.reduce((n, s) => n + s.waiters.length, 0),
    max: states[0]?.max ?? DEFAULT_MAX_CONCURRENCY,
    cooldownMs: Math.max(...all.map(cooldownRemaining)),
  };
}

/** Test hook: clear every node's cooldown. */
export function _resetXcpCooldown(): void {
  for (const s of [...states, otherState]) s.cooldownUntil = 0;
}
