/* ===== LAZY LOADING ISLANDS TESTS ===== */
/*
 * Tests for lazy loading wrapper components that defer heavy island hydration
 * to improve Time to Interactive (TTI) and Total Blocking Time (TBT).
 *
 * Tests verify the lazy loading pattern and requestIdleCallback usage
 * without requiring a DOM environment (compatible with Deno server runtime).
 *
 * Tested Components:
 * - TradeToolLazy
 */

import { assertEquals, assertExists } from "@std/assert";
import { renderToString } from "preact-render-to-string";
import { TradeToolLazy } from "../../../islands/tool/stamp/TradeToolLazy.tsx";

/* ===== PATH HELPERS ===== */
// Resolve paths relative to this test file so they work regardless of CWD
const resolve = (rel: string) =>
  new URL(rel, import.meta.url).pathname;

const TRADE_TOOL_LAZY = resolve(
  "../../../islands/tool/stamp/TradeToolLazy.tsx",
);

/* ===== TESTS ===== */

Deno.test({
  name: "TradeToolLazy - renders skeleton on SSR (before hydration)",
  fn: () => {
    const html = renderToString(<TradeToolLazy />);

    assertExists(html);
    assertEquals(typeof html, "string");
    assertEquals(html.length > 0, true);
  },
});

Deno.test({
  name: "TradeToolLazy - uses requestIdleCallback pattern",
  fn: () => {
    const componentSource = Deno.readTextFileSync(TRADE_TOOL_LAZY);

    assertEquals(
      componentSource.includes("requestIdleCallback"),
      true,
      "TradeToolLazy must use requestIdleCallback for deferred loading",
    );

    assertEquals(
      componentSource.includes("setTimeout"),
      true,
      "TradeToolLazy must fall back to setTimeout",
    );

    assertEquals(
      componentSource.includes("lazy("),
      true,
      "TradeToolLazy must use lazy() for code splitting",
    );

    assertEquals(
      componentSource.includes("Suspense"),
      true,
      "TradeToolLazy must use Suspense boundary",
    );
  },
});

Deno.test({
  name: "TradeToolLazy - cleanup cancels idle callback",
  fn: () => {
    const componentSource = Deno.readTextFileSync(TRADE_TOOL_LAZY);

    assertEquals(
      componentSource.includes("cancelIdleCallback") ||
        componentSource.includes("clearTimeout"),
      true,
      "TradeToolLazy must clean up idle callback on unmount",
    );
  },
});
