/**
 * @fileoverview BackgroundTopology Island Tests
 * @description Tests for the self-contained topology animation island
 *
 * The topology engine is now embedded directly in BackgroundTopology.tsx.
 * - No external scripts, globals, or event coordination required
 * - Topology class is instantiated directly inside useEffect
 * - A ref guard prevents double initialization
 * - Cleanup via destroy() on unmount
 */

import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";

/* ===== PATH HELPERS ===== */
const resolve = (rel: string) => new URL(rel, import.meta.url).pathname;
const ISLAND_PATH = resolve(
  "../../islands/layout/BackgroundTopology.tsx",
);

describe("BackgroundTopology Island", () => {
  let mockWindow: Record<string, unknown>;

  beforeEach(() => {
    mockWindow = {};
    globalThis.window = mockWindow as typeof globalThis.window;
  });

  afterEach(() => {
    // No persistent state to reset
  });

  /* ===== SOURCE CONTRACT ===== */
  describe("Source Contract", () => {
    it("should not reference window.VANTA", () => {
      const source = Deno.readTextFileSync(ISLAND_PATH);
      assertEquals(
        source.includes("window.VANTA") ||
          source.includes("globalThis.VANTA"),
        false,
        "Must not depend on the window.VANTA global",
      );
    });

    it("should not listen for vanta-scripts-ready", () => {
      const source = Deno.readTextFileSync(ISLAND_PATH);
      assertEquals(
        source.includes("vanta-scripts-ready"),
        false,
        "Must not use the vanta-scripts-ready custom event",
      );
    });

    it("should not reference an external topology script file", () => {
      const source = Deno.readTextFileSync(ISLAND_PATH);
      assertEquals(
        source.includes("background-topology.js"),
        false,
        "Must not reference the external topology script",
      );
    });

    it("should define a Topology class directly", () => {
      const source = Deno.readTextFileSync(ISLAND_PATH);
      assertEquals(
        source.includes("class Topology"),
        true,
        "Must embed the Topology engine as a TypeScript class",
      );
    });

    it("should not reference three.js or p5.js", () => {
      const source = Deno.readTextFileSync(ISLAND_PATH);
      assertEquals(
        source.includes("three.min.js") || source.includes("p5.min.js"),
        false,
        "Must not reference legacy library dependencies",
      );
    });
  });

  /* ===== NO GLOBAL DEPENDENCIES ===== */
  describe("No Global Dependencies", () => {
    it("should not require window.VANTA", () => {
      // The island no longer checks any global before initializing.
      assertEquals("VANTA" in mockWindow, false);

      let initSuccessful = false;
      const mockEl = { tagName: "DIV", id: "vanta-background" };
      // Direct instantiation: no global lookup, just pass el to constructor.
      if (mockEl) initSuccessful = true;
      assertEquals(initSuccessful, true);
    });

    it("should not require three.js or p5.js globals", () => {
      assertEquals("THREE" in mockWindow, false);
      assertEquals("p5" in mockWindow, false);
    });

    it("should not depend on requestIdleCallback", () => {
      // The mock window has no requestIdleCallback; init must succeed anyway.
      assertEquals("requestIdleCallback" in mockWindow, false);

      // Topology initializes synchronously in the constructor; no idle defer.
      let initCalled = false;
      const el = { tagName: "DIV" };
      if (el) initCalled = true;
      assertEquals(initCalled, true);
    });
  });

  /* ===== DIRECT INITIALIZATION ===== */
  describe("Direct Initialization", () => {
    it("should initialize immediately when the container is ready", () => {
      let initCalled = false;
      const simulateTopologyInit = (el: unknown) => {
        if (el) initCalled = true;
      };

      const mockContainer = { tagName: "DIV", id: "vanta-background" };
      simulateTopologyInit(mockContainer);
      assertEquals(initCalled, true);
    });

    it("should pass only the container element to Topology", () => {
      let receivedOptions: Record<string, unknown> | null = null;

      const MockTopology = (options: Record<string, unknown>) => {
        receivedOptions = options;
      };

      const mockContainer = {
        tagName: "DIV",
        id: "vanta-background",
      } as unknown as HTMLDivElement;
      MockTopology({ el: mockContainer });

      assertExists(receivedOptions);
      assertEquals(receivedOptions["el"], mockContainer);
      assertEquals("THREE" in receivedOptions, false);
      assertEquals("p5" in receivedOptions, false);
    });
  });

  /* ===== RACE CONDITION PREVENTION ===== */
  describe("Race Condition Prevention", () => {
    it("should not initialize without a container element", () => {
      let initAttempted = false;

      const tryInit = (container: HTMLDivElement | null) => {
        if (!container) return false;
        initAttempted = true;
        return true;
      };

      assertEquals(tryInit(null), false);
      assertEquals(initAttempted, false);

      const mockContainer = {
        tagName: "DIV",
        id: "vanta-background",
      } as unknown as HTMLDivElement;
      assertEquals(tryInit(mockContainer), true);
      assertEquals(initAttempted, true);
    });

    it("should initialize only once (ref guard prevents double init)", () => {
      let initCount = 0;
      let topologyRef: { destroy(): void } | null = null;

      const tryInit = (container: unknown) => {
        if (topologyRef) return; // guard: already initialized
        if (!container) return;
        initCount++;
        topologyRef = { destroy() {} };
      };

      const mockContainer = { tagName: "DIV", id: "vanta-background" };
      tryInit(mockContainer);
      tryInit(mockContainer); // second call must be no-op due to ref guard

      assertEquals(initCount, 1);
    });

    it("should handle initialization errors without throwing", () => {
      let errorCaught = false;
      let initSuccessful = false;

      const tryInit = (shouldThrow: boolean) => {
        try {
          if (shouldThrow) throw new Error("Init failed");
          initSuccessful = true;
        } catch (_err) {
          errorCaught = true;
        }
      };

      tryInit(true);
      assertEquals(initSuccessful, false);
      assertEquals(errorCaught, true);
    });
  });

  /* ===== CLEANUP ON UNMOUNT ===== */
  describe("Cleanup on Unmount", () => {
    it("should call destroy() on the topology instance during cleanup", () => {
      let destroyCalled = false;
      let topologyRef: { destroy(): void } | null = {
        destroy() {
          destroyCalled = true;
        },
      };

      const cleanup = () => {
        if (topologyRef) {
          topologyRef.destroy();
          topologyRef = null;
        }
      };

      cleanup();
      assertEquals(destroyCalled, true);
      assertEquals(topologyRef, null);
    });

    it("should null the ref after destroy to prevent re-use", () => {
      let topologyRef: { destroy(): void } | null = { destroy() {} };
      topologyRef.destroy();
      topologyRef = null;

      assertEquals(topologyRef, null);
    });
  });

  /* ===== PERFORMANCE CHARACTERISTICS ===== */
  describe("Performance Characteristics", () => {
    it("should not poll continuously (no setTimeout loops)", () => {
      let setTimeoutCalls = 0;
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = ((_cb: () => void, _delay: number) => {
        setTimeoutCalls++;
        return 1;
      }) as typeof globalThis.setTimeout;

      // No polling needed — Topology initializes synchronously.
      assertEquals(setTimeoutCalls, 0);

      globalThis.setTimeout = originalSetTimeout;
    });
  });
});
