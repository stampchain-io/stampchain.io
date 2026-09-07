/**
 * Logger utility with namespace-based filtering and JSON output
 * Supports DEBUG environment variable for selective logging
 * Handles both server-side (Deno) and client-side (browser) environments
 */

import {
  LOG_CONFIG,
  type LogNamespace,
} from "$lib/constants/loggingConstants.ts";

// Re-export LogNamespace for convenience
export type { LogNamespace };

export interface LogData {
  level: string;
  namespace: string;
  timestamp: string;
  [key: string]: any;
}

// Client-side debug configuration interface
interface ClientDebugConfig {
  namespaces: string;
  enabled: boolean;
}

class Logger {
  private enabledNamespaces: Set<string> = new Set();
  private enableFileLogging = false;
  private logFilePath: string = LOG_CONFIG.DEFAULT_LOG_PATH;

  constructor() {
    this.updateEnabledNamespaces();
    this.setupFileLogging();
  }

  private get isServerSide(): boolean {
    return typeof globalThis.Deno !== "undefined";
  }

  private setupFileLogging(): void {
    if (this.isServerSide) {
      const env = globalThis.Deno?.env.get("DENO_ENV") || "production";
      // Enable file logging in development and production, but not in test by default
      this.enableFileLogging = env === "development" || env === "production";
    }
  }

  // Decided once at construction (setupFileLogging) or explicitly via
  // setConfig(). It deliberately does NOT re-read DENO_ENV per call: real
  // processes never flip DENO_ENV at runtime, but unit tests do (to exercise
  // production branches of other modules), and re-reading it here made every
  // logger.warn/error in those tests start an un-awaited real file write that
  // then leaked into unrelated test files sharing the worker.
  private shouldWriteToFile(): boolean {
    if (!this.isServerSide || !globalThis.Deno) {
      return false;
    }
    return this.enableFileLogging;
  }

  private updateEnabledNamespaces(): void {
    this.enabledNamespaces.clear();

    if (this.isServerSide) {
      // Server-side: use DEBUG environment variable
      const debugEnv = globalThis.Deno?.env.get("DEBUG") || "";
      if (debugEnv === "*" || debugEnv === "all") {
        this.enabledNamespaces.add("all");
      } else if (debugEnv) {
        debugEnv.split(",").forEach((ns) => {
          const trimmed = ns.trim().toLowerCase();
          this.enabledNamespaces.add(trimmed);
        });
      }
    } else {
      // Client-side: use __DEBUG global or set defaults
      const clientDebug = (globalThis as any).__DEBUG as
        | ClientDebugConfig
        | undefined;
      if (!clientDebug) {
        // Initialize with default namespaces for client-side
        (globalThis as any).__DEBUG = {
          namespaces: "stamps,ui,error",
          enabled: true,
        };
      }

      const config = (globalThis as any).__DEBUG as ClientDebugConfig;
      if (config.enabled && config.namespaces) {
        config.namespaces.split(",").forEach((ns) => {
          const trimmed = ns.trim().toLowerCase();
          this.enabledNamespaces.add(trimmed);
        });
      }
    }
  }

  private isNamespaceEnabled(namespace: string): boolean {
    if (this.enabledNamespaces.has("all")) return true;
    return this.enabledNamespaces.has(namespace.toLowerCase());
  }

  private formatLogData(level: string, namespace: string, data: any): LogData {
    const logData: LogData = {
      level,
      namespace,
      timestamp: new Date().toISOString(),
      ...data,
    };

    return logData;
  }

  private formatForConsole(logData: LogData): string {
    // Handle BigInt serialization for JSON string output
    return JSON.stringify(logData, (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
  }

  // In-flight file writes. Log calls are synchronous for callers, so the
  // writes are fire-and-forget; tracking them lets flush() await completion
  // (tests, graceful shutdown) instead of guessing with timers.
  private pendingWrites: Set<Promise<void>> = new Set();

  private queueFileWrite(logEntry: string): void {
    const write = this.writeToFile(logEntry);
    this.pendingWrites.add(write);
    write.finally(() => this.pendingWrites.delete(write));
  }

  /** Resolves once every file write issued so far has settled. */
  async flush(): Promise<void> {
    while (this.pendingWrites.size > 0) {
      await Promise.allSettled([...this.pendingWrites]);
    }
  }

  private async writeToFile(logEntry: string): Promise<void> {
    if (!this.shouldWriteToFile()) {
      return;
    }

    try {
      const logDir = this.logFilePath.substring(
        0,
        this.logFilePath.lastIndexOf("/"),
      );

      // Try to create directory, but continue if it already exists
      try {
        await Deno.mkdir(logDir, { recursive: true });
      } catch (mkdirError) {
        // Continue if directory already exists, otherwise rethrow
        if (
          mkdirError instanceof Error && mkdirError.name !== "AlreadyExists"
        ) {
          throw mkdirError;
        }
      }

      // Write the log entry
      await Deno.writeTextFile(this.logFilePath, logEntry + "\n", {
        append: true,
      });
    } catch (error) {
      // Only log file write errors to console, don't throw
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Failed to write to log file: ${errorMessage}`);
    }
  }

  debug(namespace: LogNamespace, data: any): void {
    this.updateEnabledNamespaces();
    if (this.isNamespaceEnabled(namespace)) {
      const logData = this.formatLogData("debug", namespace, data);

      if (this.isServerSide) {
        const logEntry = this.formatForConsole(logData);
        console.debug(logEntry);
        this.queueFileWrite(logEntry);
      } else {
        // Client-side: log the object directly
        console.debug(logData);
      }
    }
  }

  info(namespace: LogNamespace, data: any): void {
    this.updateEnabledNamespaces();
    if (this.isNamespaceEnabled(namespace)) {
      const logData = this.formatLogData("info", namespace, data);

      if (this.isServerSide) {
        const logEntry = this.formatForConsole(logData);
        console.info(logEntry);
        this.queueFileWrite(logEntry);
      } else {
        // Client-side: log the object directly
        console.info(logData);
      }
    }
  }

  warn(namespace: LogNamespace, data: any): void {
    // Warn always logs regardless of namespace
    const logData = this.formatLogData("warn", namespace, data);

    if (this.isServerSide) {
      const logEntry = this.formatForConsole(logData);
      console.warn(logEntry);
      this.queueFileWrite(logEntry);
    } else {
      // Client-side: log the object directly
      console.warn(logData);
    }
  }

  error(namespace: LogNamespace, data: any): void {
    // Error always logs regardless of namespace
    const logData = this.formatLogData("error", namespace, data);

    if (this.isServerSide) {
      const logEntry = this.formatForConsole(logData);
      console.error(logEntry);
      this.queueFileWrite(logEntry);
    } else {
      // Client-side: log the object directly
      console.error(logData);
    }
  }

  setConfig(
    config: { enableFileLogging?: boolean; logFilePath?: string },
  ): void {
    if (config.enableFileLogging !== undefined) {
      this.enableFileLogging = config.enableFileLogging;
    }
    if (config.logFilePath !== undefined) {
      this.logFilePath = config.logFilePath;
    }
  }

  getConfig(): { enableFileLogging: boolean; logFilePath: string } {
    return {
      enableFileLogging: this.enableFileLogging,
      logFilePath: this.logFilePath,
    };
  }
}

// Export a singleton instance
export const logger = new Logger();

// Also export the class for testing purposes
export { Logger };
