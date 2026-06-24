/* ===== APP ROUTE BACKGROUND TOPOLOGY TESTS ===== */
/*
 * Tests for routes/_app.tsx.
 *
 * The topology engine is now embedded directly in the BackgroundTopology
 * island. The app route no longer loads external scripts or dispatches
 * custom events; it simply renders the island component.
 *
 * Tests verify source-level contracts without requiring a DOM environment.
 */

import { assertEquals } from "@std/assert";

/* ===== PATH HELPERS ===== */
const resolve = (rel: string) => new URL(rel, import.meta.url).pathname;
const APP_ROUTE = resolve("../../../routes/_app.tsx");

/* ===== EXTERNAL SCRIPT REMOVAL TESTS ===== */

Deno.test({
  name: "Background - no external topology script loaded from _app.tsx",
  fn: () => {
    const source = Deno.readTextFileSync(APP_ROUTE);

    assertEquals(
      source.includes("/background-topology.js"),
      false,
      "Must not load topology script externally (engine lives in the island)",
    );

    assertEquals(
      source.includes("vanta-scripts-ready"),
      false,
      "Must not use the vanta-scripts-ready custom event",
    );

    assertEquals(
      source.includes("window.VANTA") || source.includes("globalThis.VANTA"),
      false,
      "Must not reference the window.VANTA global",
    );
  },
});

/* ===== ISLAND USAGE TESTS ===== */

Deno.test({
  name: "Background - BackgroundTopology island is imported and rendered",
  fn: () => {
    const source = Deno.readTextFileSync(APP_ROUTE);

    assertEquals(
      source.includes("BackgroundTopology"),
      true,
      "Must import and render the BackgroundTopology island",
    );
  },
});

/* ===== DEPENDENCY REMOVAL VERIFICATION ===== */

Deno.test({
  name: "Background - no three.js or p5.js loaded",
  fn: () => {
    const source = Deno.readTextFileSync(APP_ROUTE);

    assertEquals(
      source.includes("three.min.js") || source.includes("libs/three.js"),
      false,
      "Must not load three.js (effect is self-contained)",
    );

    assertEquals(
      source.includes("p5.min.js") || source.includes("libs/p5.js"),
      false,
      "Must not load p5.js (effect is self-contained)",
    );

    assertEquals(
      source.includes("__vantaScripts"),
      false,
      "Must not keep the legacy multi-script coordinator state",
    );
  },
});
