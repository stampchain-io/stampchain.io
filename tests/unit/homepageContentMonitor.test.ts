/**
 * Anti-vacuity proof for the homepage content monitor.
 *
 * The monitor exists because the 2026-09-11 homepage outage served an empty
 * payload with an HTTP 200 for two days and nothing alerted. A guard against
 * that failure is only worth having if it demonstrably fires on it, so these
 * tests run the real checker against two unmodified production captures:
 *
 *   tests/fixtures/homepage/broken-empty-state.html.gz  the outage response
 *   tests/fixtures/homepage/healthy.html.gz             a normal response
 *
 * The broken capture must FAIL and the healthy capture must PASS. A monitor
 * that passes a planted regression is worse than no monitor, because it
 * converts unknown risk into false confidence.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { checkHtml } from "../../scripts/monitoring/check-homepage-content.ts";

const THRESHOLDS = { minStampLinks: 4, minBytes: 200000 };

async function loadFixture(name: string): Promise<string> {
  const gz = await Deno.readFile(
    new URL(`../fixtures/homepage/${name}.gz`, import.meta.url),
  );
  const stream = new Blob([gz]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  return await new Response(stream).text();
}

Deno.test("monitor FAILS on the real broken homepage capture", async () => {
  const html = await loadFixture("broken-empty-state.html");
  const result = checkHtml(html, "broken fixture", THRESHOLDS);

  assertEquals(result.ok, false, "the outage response must not pass the monitor");
  assertEquals(result.stampLinks, 0, "the empty state renders no stamp permalinks");
  assert(
    result.failures.some((f) => f.startsWith("STAMP_LINKS:")),
    `expected a STAMP_LINKS failure, got: ${JSON.stringify(result.failures)}`,
  );
});

Deno.test("monitor PASSES on the real healthy homepage capture", async () => {
  const html = await loadFixture("healthy.html");
  const result = checkHtml(html, "healthy fixture", THRESHOLDS);

  assertEquals(
    result.ok,
    true,
    `a healthy page must pass; failures: ${JSON.stringify(result.failures)}`,
  );
  assert(
    result.stampLinks >= THRESHOLDS.minStampLinks,
    `expected >=${THRESHOLDS.minStampLinks} stamp permalinks, got ${result.stampLinks}`,
  );
});

Deno.test("the two captures are separated by the structural check, not by size alone", async () => {
  const broken = checkHtml(
    await loadFixture("broken-empty-state.html"),
    "broken",
    // Size floor disabled: the structural assertion must carry the detection on
    // its own, so that ordinary content drift can never silently disarm it.
    { minStampLinks: 4, minBytes: 0 },
  );
  const healthy = checkHtml(
    await loadFixture("healthy.html"),
    "healthy",
    { minStampLinks: 4, minBytes: 0 },
  );

  assertEquals(broken.ok, false, "stamp-link count alone must catch the outage");
  assertEquals(healthy.ok, true, "stamp-link count alone must clear a healthy page");
});

Deno.test("a loose /stamp/ substring check would NOT have caught the outage", async () => {
  // The header renders /stamp/create and /stamp/send on every page, including
  // the broken one. This test pins the reason the monitor requires the
  // /stamp/<64-hex-txid> permalink form: the obvious looser check is useless.
  const html = await loadFixture("broken-empty-state.html");

  assertStringIncludes(html, "/stamp/", "the broken page does contain '/stamp/'");
  assertEquals(
    checkHtml(html, "broken", THRESHOLDS).stampLinks,
    0,
    "but it contains no stamp permalinks",
  );
});

Deno.test("the placeholder error string is absent from BOTH captures", async () => {
  // Documents why absence of "Service temporarily unavailable" is not evidence
  // of health. routes/index.tsx declares the placeholder's `error` field in its
  // props type and never renders it, so the string is missing from a totally
  // broken page too. Asserting its absence is vacuous on today's markup; this
  // test exists so that fact stays visible rather than being rediscovered
  // during the next incident.
  const broken = checkHtml(
    await loadFixture("broken-empty-state.html"),
    "broken",
    THRESHOLDS,
  );
  const healthy = checkHtml(await loadFixture("healthy.html"), "healthy", THRESHOLDS);

  assertEquals(broken.placeholderErrorPresent, false);
  assertEquals(healthy.placeholderErrorPresent, false);
});
