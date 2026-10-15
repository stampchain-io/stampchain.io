import { Handlers } from "$fresh/server.ts";
import {
  serverTiming,
  type Timed,
  timedCheck,
} from "$lib/utils/api/timedCheck.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getCurrentBlock } from "$lib/utils/mempool.ts";
import type { HealthStatus } from "$types/src20.d.ts";
import { circuitBreakerDbManager } from "$server/database/circuitBreakerDatabaseManager.ts";
import { NodeVersionRepository } from "$server/database/nodeVersionRepository.ts";
import { SRC20Repository } from "$server/database/src20Repository.ts";
import { BlockService } from "$server/services/core/blockService.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { StampService } from "$server/services/stampService.ts";

/** Per-check budget for the full health scan. */
const CHECK_BUDGET_MS = 2000;
/** mempool.space retries sleep 1 s each; starting at 2 leaves one retry. */
const MAX_RETRIES_IN_HEALTH = 2;
const timed = <T>(name: string, fn: () => Promise<T>) =>
  timedCheck(name, fn, CHECK_BUDGET_MS);

export const handler: Handlers = {
  /**
   * Simple health check for load balancer
   * Returns 200 without checking any services
   */
  async GET(_req, ctx) {
    // Simple health check for ALB — verifies API + DB connectivity
    // without the expensive full health scan (XCP, mempool, node versions).
    // Returns 503 if DB is unreachable so ALB stops routing to this task.
    const url = new URL(ctx.url);
    if (url.searchParams.has("simple")) {
      try {
        const dbCheck = await SRC20Repository.checkSrc20Deployments();
        if (dbCheck.isValid) {
          return ApiResponseUtil.success({ status: "OK", database: true }, {
            forceNoCache: true,
          });
        }
        return ApiResponseUtil.serviceUnavailable(
          "Database connection failed",
          undefined,
          { forceNoCache: true },
        );
      } catch {
        return ApiResponseUtil.serviceUnavailable(
          "Database connection failed",
          undefined,
          { forceNoCache: true },
        );
      }
    }

    // Continue with full health check if not simple
    const timings: Timed<unknown>[] = [];
    const health: HealthStatus = {
      status: "OK",
      services: {
        api: true,
        indexer: false,
        mempool: false,
        database: false,
        xcp: false,
      },
    };

    try {
      // Every sub-check runs in parallel under its own time budget. The full
      // check used to take 4-6 s from production, failing the daily
      // regression run's 5 s threshold; one slow dependency must not hold the
      // whole response. A check that runs out of budget reports as degraded,
      // and Server-Timing exposes each check's duration.
      const [
        lastIndexedBlockResult,
        currentBlockHeightResult,
        stampCountResult,
        src20DeploymentsResult,
        xcpHealthResult,
        nodeVersionsResult,
      ] = await Promise.all([
        timed("indexer", () => BlockService.getLastBlock()),
        timed("mempool", () => getCurrentBlock(MAX_RETRIES_IN_HEALTH)),
        timed("stamps", () => StampService.countTotalStampsForHealth()),
        timed("src20", () => SRC20Repository.checkSrc20Deployments()),
        timed("xcp", () => CounterpartyApiManager.checkHealth(30)),
        timed("versions", () => NodeVersionRepository.getCurrentVersions()),
      ]);
      timings.push(
        lastIndexedBlockResult,
        currentBlockHeightResult,
        stampCountResult,
        src20DeploymentsResult,
        xcpHealthResult,
        nodeVersionsResult,
      );

      const lastIndexedBlock = lastIndexedBlockResult.value ?? null;
      const currentBlockHeight = currentBlockHeightResult.value ?? null;
      const stampCount = stampCountResult.value ?? { isValid: false, count: 0 };
      const src20Deployments = src20DeploymentsResult.value ??
        { isValid: false, count: 0 };
      const xcpHealth = xcpHealthResult.value ?? false;
      const nodeVersions = nodeVersionsResult.value ?? [];

      // Update service statuses
      health.services.indexer = !!lastIndexedBlock;
      health.services.mempool = !!currentBlockHeight;
      health.services.database = stampCount.isValid;
      health.services.xcp = xcpHealth;

      // Add block sync information
      if (lastIndexedBlock && currentBlockHeight) {
        health.services.blockSync = {
          indexed: lastIndexedBlock,
          network: currentBlockHeight,
          isSynced: lastIndexedBlock >= currentBlockHeight - 1,
        };
      }

      // Add stats information
      health.services.stats = {
        src20Deployments: src20Deployments.count,
        totalStamps: stampCount.count,
      };

      // Database health reuses the SRC-20 count fetched above; this used to
      // run the same query a second time, sequentially.
      health.services.database = src20Deployments.isValid &&
        src20Deployments.count > 0;

      // Check circuit breaker status
      try {
        const cbState = circuitBreakerDbManager.getCircuitBreakerState();
        health.services.circuitBreaker = {
          state: cbState.state,
          isHealthy: cbState.state === "CLOSED",
        };
      } catch (error) {
        console.error("Circuit breaker check failed:", error);
        health.services.circuitBreaker = {
          state: "UNKNOWN",
          isHealthy: false,
        };
      }

      // Add node version information (non-essential, graceful if table missing)
      if (nodeVersions.length > 0) {
        health.services.nodeVersions = nodeVersions;
      }

      // Update overall status
      // Make the health check more resilient - only require database and API to be healthy
      // This is to fix ELB health check failures
      const essentialServices = {
        api: health.services.api,
        database: health.services.database,
      };

      // Non-essential services can be down without failing the health check
      const isError = !Object.values(essentialServices).every(Boolean);

      health.status = isError ? "ERROR" : "OK";
    } catch (error) {
      console.error("Health check failed:", error);
      health.status = "ERROR";
    }

    return ApiResponseUtil.success(health, {
      forceNoCache: true,
      headers: { "Server-Timing": serverTiming(timings) },
    });
  },
};
