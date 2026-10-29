/**
 * JSON-RPC client for our ECX node (CHAIN=ecx).
 *
 * The node is the only place ECX transactions leave this server, and the
 * only ECX fee source. Settings are read on every call, so they can change
 * without a restart:
 *   ECX_NODE_RPC_URL       e.g. http://<ecx-node-host>:8332
 *   ECX_NODE_RPC_USER / ECX_NODE_RPC_PASSWORD   (basic auth)
 *   ECX_NODE_RPC_TIMEOUT_MS                     (default 10000)
 * Errors never carry the URL or credentials: some callers return messages
 * to clients.
 */

type Env = Pick<typeof Deno.env, "get">;

/** Fee floor for ECX: 1 sat/vB, whatever the node estimates. */
export const ECX_MIN_FEE_SAT_PER_VB = 1;

export class EcxNodeRpcError extends Error {
  constructor(readonly method: string, message: string, readonly code?: number) {
    super(`ECX node ${method} failed: ${message}`);
    this.name = "EcxNodeRpcError";
  }
}

export async function ecxNodeRpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  env: Env = Deno.env,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const url = env.get("ECX_NODE_RPC_URL");
  if (!url) throw new EcxNodeRpcError(method, "ECX_NODE_RPC_URL is not set");
  const user = env.get("ECX_NODE_RPC_USER") ?? "";
  const pass = env.get("ECX_NODE_RPC_PASSWORD") ?? "";
  const timeout = Number(env.get("ECX_NODE_RPC_TIMEOUT_MS")) || 10_000;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user || pass ? { Authorization: `Basic ${btoa(`${user}:${pass}`)}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "1.0", id: "stampchain", method, params }),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    const kind = error instanceof Error ? error.name : typeof error;
    throw new EcxNodeRpcError(method, `request failed (${kind})`);
  }

  // bitcoind answers RPC errors with HTTP 500 and a JSON body.
  let body: { result?: T; error?: { code: number; message: string } | null } | null = null;
  try {
    body = await res.json();
  } catch {
    throw new EcxNodeRpcError(method, `HTTP ${res.status} without a JSON body`);
  }
  if (body?.error) throw new EcxNodeRpcError(method, body.error.message, body.error.code);
  if (!res.ok) throw new EcxNodeRpcError(method, `HTTP ${res.status}`);
  return body?.result as T;
}

/**
 * estimatesmartfee as sat/vB, floored at 1 sat/vB. Returns the floor when the
 * node has no estimate yet (estimatesmartfee answers `errors` instead of
 * `feerate` until it has seen enough blocks, as after the fork). Throws only
 * when the node cannot be reached.
 */
export async function estimateEcxFeeSatPerVb(
  confTarget: number,
  env: Env = Deno.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ satPerVb: number; fromNode: boolean }> {
  const r = await ecxNodeRpc<{ feerate?: number; errors?: string[] }>(
    "estimatesmartfee",
    [confTarget],
    env,
    fetchImpl,
  );
  if (typeof r?.feerate !== "number" || !(r.feerate > 0)) {
    return { satPerVb: ECX_MIN_FEE_SAT_PER_VB, fromNode: false };
  }
  // feerate is BTC per kvB: x 1e8 sat / 1000 vB.
  const satPerVb = Math.ceil(r.feerate * 1e5);
  return { satPerVb: Math.max(ECX_MIN_FEE_SAT_PER_VB, satPerVb), fromNode: true };
}

/** sendrawtransaction; returns the txid. Callers must gate first. */
export function sendEcxRawTransaction(
  txHex: string,
  env: Env = Deno.env,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return ecxNodeRpc<string>("sendrawtransaction", [txHex], env, fetchImpl);
}
