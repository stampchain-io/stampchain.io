/**
 * POST /api/v2/ecx/broadcast  { txHex } -> { txid }
 *
 * The one way an ECX transaction leaves stampchain. On ECX pages wallets only
 * sign; the browser hands the signed hex here, the broadcast gate checks it
 * (ECX_BROADCAST_ENABLED, replay marker) and our ECX node receives it.
 *
 * CHAIN=bitcoin: 404 for every method, so Bitcoin deployments are unchanged.
 * CHAIN=ecx:
 *   400  body is not { txHex } with the hex of a parseable transaction,
 *        the replay marker is missing, or the node rejected the transaction
 *        (its reason is passed through, e.g. -26 non-final, -25 missing inputs)
 *   403  ECX_BROADCAST_ENABLED is not "true"
 *   503  the node could not be reached (Retry-After)
 * Rate limiting comes from the /api/v2 tier in server/middleware/rateLimiter.ts.
 */
import type { Handler } from "$fresh/server.ts";
import * as bitcoin from "bitcoinjs-lib";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  assertBroadcastAllowed,
  BroadcastRefusedError,
  chainEnv,
  getChainId,
} from "$server/services/chain/chainProfile.ts";
import {
  EcxNodeRpcError,
  sendEcxRawTransaction,
} from "$server/services/chain/ecxNodeRpc.ts";

type Env = Pick<typeof Deno.env, "get">;

/** A standard transaction is at most 400k weight units, so < 400 kB. */
export const MAX_TX_HEX_LENGTH = 800_000;
/** Seconds a client should wait before retrying when the node is down. */
export const ECX_NODE_RETRY_AFTER_SECONDS = 30;
/** bitcoind RPC_IN_WARMUP: the node is up but not ready, so retry later. */
const RPC_IN_WARMUP = -28;

const noCache = { forceNoCache: true };

function badRequest(message: string): Response {
  return ApiResponseUtil.badRequest(message, undefined, noCache);
}

function nodeUnavailable(): Response {
  return ApiResponseUtil.serviceUnavailable(
    "ECX node unavailable, try again shortly",
    undefined,
    {
      ...noCache,
      headers: { "Retry-After": String(ECX_NODE_RETRY_AFTER_SECONDS) },
    },
  );
}

/** Parse and check the request body; returns the hex or a 400 response. */
async function readTxHex(req: Request): Promise<string | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be JSON: { txHex }");
  }
  const txHex = (body as { txHex?: unknown } | null)?.txHex;
  if (typeof txHex !== "string" || txHex.length === 0) {
    return badRequest("txHex is required");
  }
  if (txHex.length > MAX_TX_HEX_LENGTH) {
    return badRequest("txHex is too large");
  }
  if (txHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(txHex)) {
    return badRequest("txHex must be an even-length hex string");
  }
  if (txHex.slice(0, 10).toLowerCase() === "70736274ff") {
    return badRequest("txHex is a PSBT; finalize it and send the transaction");
  }
  try {
    bitcoin.Transaction.fromHex(txHex);
  } catch (error) {
    return badRequest(
      `txHex is not a valid transaction (${
        error instanceof Error ? error.message : String(error)
      })`,
    );
  }
  return txHex;
}

/**
 * The route, with its env and fetch injectable so tests never touch Deno.env
 * or the network. Production reads chainEnv() (the chainProfile env seam).
 */
export async function handleEcxBroadcast(
  req: Request,
  env: Env = chainEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (getChainId(env) !== "ecx") {
    return ApiResponseUtil.notFound(undefined, undefined, noCache);
  }
  if (req.method !== "POST") {
    return ApiResponseUtil.methodNotAllowed(undefined, undefined, {
      ...noCache,
      headers: { Allow: "POST" },
    });
  }

  const txHex = await readTxHex(req);
  if (txHex instanceof Response) return txHex;

  try {
    assertBroadcastAllowed(txHex, env);
  } catch (error) {
    if (error instanceof BroadcastRefusedError) {
      logger.warn("api", {
        message: "ECX broadcast refused by chain broadcast gate",
        reason: error.reason,
      });
      return error.status === 403
        ? ApiResponseUtil.forbidden(error.message, undefined, noCache)
        : badRequest(error.message);
    }
    throw error;
  }

  try {
    const txid = await sendEcxRawTransaction(txHex, env, fetchImpl);
    logger.info("api", { message: "ECX transaction broadcast", txid });
    return ApiResponseUtil.success({ txid }, noCache);
  } catch (error) {
    if (error instanceof EcxNodeRpcError) {
      // A code means the node answered: it rejected this transaction.
      // No code means we never got an RPC answer (down, timeout, unset URL).
      if (error.code !== undefined && error.code !== RPC_IN_WARMUP) {
        logger.warn("api", {
          message: "ECX node rejected transaction",
          code: error.code,
          error: error.message,
        });
        return ApiResponseUtil.badRequest(
          error.message,
          { code: error.code },
          noCache,
        );
      }
      logger.error("api", {
        message: "ECX node unavailable for broadcast",
        code: error.code,
        error: error.message,
      });
      return nodeUnavailable();
    }
    logger.error("api", {
      message: "ECX broadcast failed",
      errorType: error instanceof Error ? error.name : typeof error,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponseUtil.internalError(
      error,
      "ECX broadcast failed",
      noCache,
    );
  }
}

/** Every method, so CHAIN=bitcoin answers 404 rather than 405. */
export const handler: Handler = (req) => handleEcxBroadcast(req);
