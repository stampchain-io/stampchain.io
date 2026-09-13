#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
/**
 * Homepage content assertion.
 *
 * Why this exists
 * ---------------
 * On 2026-09-11 the homepage served an empty payload to every visitor for two
 * days at a 100% failure rate, and nothing alerted. `routes/index.tsx` catches
 * render errors and returns `DATA_PLACEHOLDER_PROD_HOME` with an **HTTP 200**,
 * so uptime checks and status-code monitoring both saw a healthy site
 * throughout. Status codes cannot detect this class of failure here.
 *
 * The empty state is therefore only visible in the *content*: every one of the
 * placeholder's five content arrays (`carouselStamps`, `stamps_art`,
 * `stamps_src721`, `stamps_posh`, `collectionData`) is empty, so the rendered
 * page contains no stamp links at all.
 *
 * What is asserted, and which assertion actually does the work
 * -----------------------------------------------------------
 * 1. STAMP_LINKS (load-bearing). At least `--min-stamp-links` anchors whose
 *    href is a stamp permalink, `/stamp/<64-hex-txid>`. Measured against the
 *    two saved fixtures: healthy 16, broken 0.
 *
 *    The txid form is required deliberately. The header renders `/stamp/create`
 *    and `/stamp/send` unconditionally, so a looser "contains /stamp/" check
 *    passes on the broken page. That is the exact trap this guard has to avoid.
 *
 * 2. BODY_SIZE (secondary). At least `--min-bytes`. A size floor alone is
 *    fragile because it drifts with unrelated content changes, so it is paired
 *    with the structural check above and never relied on by itself. Measured:
 *    healthy 312,725 bytes, broken 140,120 bytes.
 *
 * 3. PLACEHOLDER_ERROR (diagnostic only, NOT sufficient). The placeholder
 *    object carries `error: "Service temporarily unavailable"`, but the
 *    homepage never renders that field — it is declared in the props type and
 *    dropped. It is absent from the broken fixture as well as the healthy one,
 *    which is precisely why the outage was invisible. Asserting its absence is
 *    therefore VACUOUS on today's markup: it passes on a page that is totally
 *    broken. It is kept because its presence would still be a true positive if
 *    the render path ever starts surfacing the field, and it is reported
 *    separately so nobody mistakes it for the signal that caught a regression.
 *
 * Fetch discipline
 * ----------------
 * A cache-busting query parameter plus no-cache request headers, written to a
 * file and re-read from that file before parsing. A plain fetch has produced a
 * false all-clear on this site. Parsing uses a real HTML parser, never a regex
 * against markup, because "does the page contain stamp links" is a structural
 * question about anchors and not a string question.
 *
 * Usage
 * -----
 *   deno run -A scripts/monitoring/check-homepage-content.ts
 *   deno run -A scripts/monitoring/check-homepage-content.ts --url https://stampchain.io
 *   deno run -A scripts/monitoring/check-homepage-content.ts --fixture path/to/saved.html
 *
 * `--fixture` parses a saved response instead of fetching. The unit test uses
 * it to prove the guard fails on a planted copy of the real broken response;
 * a guard that passes a planted regression is worse than no guard, because it
 * converts unknown risk into false confidence.
 */
import { DOMParser } from "dom";

/** Anchors must point at a stamp permalink: /stamp/<64-hex txid>. */
const STAMP_PERMALINK =
  /^(?:https?:\/\/[^/]+)?\/stamp\/[0-9a-f]{64}(?:[?#].*)?$/;

/** Present in DATA_PLACEHOLDER_PROD_HOME. See the header note on why this is not sufficient. */
const PLACEHOLDER_ERROR = "Service temporarily unavailable";

interface Thresholds {
  minStampLinks: number;
  minBytes: number;
}

interface CheckResult {
  ok: boolean;
  source: string;
  bytes: number;
  stampLinks: number;
  sampleLinks: string[];
  placeholderErrorPresent: boolean;
  failures: string[];
  diagnostics: string[];
}

function parseArgs(argv: string[]): {
  url: string;
  fixture?: string | undefined;
  out: string;
  reportPath?: string | undefined;
  attempts: number;
  thresholds: Thresholds;
} {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  return {
    url: get("--url") ?? Deno.env.get("PROD_BASE_URL") ??
      "https://stampchain.io",
    fixture: get("--fixture"),
    out: get("--out") ?? "reports/homepage-monitor/homepage.html",
    reportPath: get("--report"),
    attempts: Number(get("--attempts") ?? "3"),
    thresholds: {
      minStampLinks: Number(get("--min-stamp-links") ?? "4"),
      minBytes: Number(get("--min-bytes") ?? "200000"),
    },
  };
}

/**
 * Fetch with a cache-busting parameter and no-cache headers, persist the body,
 * and return the path. Parsing always happens from the file, so what is
 * asserted is exactly what was saved for the artifact.
 */
async function fetchToFile(baseUrl: string, outPath: string): Promise<string> {
  const url = new URL(baseUrl);
  url.searchParams.set(
    "cb",
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
  );

  const response = await fetch(url, {
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Pragma": "no-cache",
      "User-Agent": "stampchain-homepage-monitor",
    },
    redirect: "follow",
  });
  const body = await response.text();

  await ensureDir(outPath);
  await Deno.writeTextFile(outPath, body);
  console.log(
    `  fetched ${url.href} -> HTTP ${response.status}, ${body.length} bytes, saved to ${outPath}`,
  );
  return outPath;
}

/** Create the parent directory of `path` if it does not already exist. */
async function ensureDir(path: string): Promise<void> {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return;
  await Deno.mkdir(path.slice(0, idx), { recursive: true }).catch(() => {});
}

/** Read a saved response from disk and assert on its content. */
export async function checkFile(
  path: string,
  thresholds: Thresholds,
): Promise<CheckResult> {
  const html = await Deno.readTextFile(path);
  return checkHtml(html, path, thresholds);
}

export function checkHtml(
  html: string,
  source: string,
  thresholds: Thresholds,
): CheckResult {
  const failures: string[] = [];
  const diagnostics: string[] = [];

  const bytes = new TextEncoder().encode(html).length;

  // Structural question -> real parser, not a regex over markup.
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    return {
      ok: false,
      source,
      bytes,
      stampLinks: 0,
      sampleLinks: [],
      placeholderErrorPresent: false,
      failures: ["HTML_PARSE: the response could not be parsed as HTML"],
      diagnostics,
    };
  }

  const hrefs: string[] = [];
  for (const anchor of doc.querySelectorAll("a[href]")) {
    const href =
      (anchor as unknown as { getAttribute(n: string): string | null })
        .getAttribute("href");
    if (href) hrefs.push(href);
  }
  const stampLinks = [...new Set(hrefs.filter((h) => STAMP_PERMALINK.test(h)))];

  // 1. Load-bearing structural assertion.
  if (stampLinks.length < thresholds.minStampLinks) {
    failures.push(
      `STAMP_LINKS: found ${stampLinks.length} stamp permalink(s) (/stamp/<64-hex>), need at least ${thresholds.minStampLinks}. ` +
        `An empty DATA_PLACEHOLDER_PROD_HOME renders zero of these while still returning HTTP 200.`,
    );
  }

  // 2. Secondary, paired with the above and never used alone.
  if (bytes < thresholds.minBytes) {
    failures.push(
      `BODY_SIZE: ${bytes} bytes, below the ${thresholds.minBytes} floor. ` +
        `The measured empty state was ~140120 bytes and a healthy page ~312725.`,
    );
  }

  // 3. Diagnostic only. Absence proves nothing; see the header note.
  const placeholderErrorPresent = html.includes(PLACEHOLDER_ERROR);
  if (placeholderErrorPresent) {
    failures.push(
      `PLACEHOLDER_ERROR: the page contains ${
        JSON.stringify(PLACEHOLDER_ERROR)
      }, ` +
        `which only appears in DATA_PLACEHOLDER_PROD_HOME.`,
    );
  } else {
    diagnostics.push(
      "PLACEHOLDER_ERROR absent — expected, and NOT evidence of health: " +
        "routes/index.tsx never renders the placeholder's error field, so this " +
        "string is absent from a totally broken page too.",
    );
  }

  return {
    ok: failures.length === 0,
    source,
    bytes,
    stampLinks: stampLinks.length,
    sampleLinks: stampLinks.slice(0, 3),
    placeholderErrorPresent,
    failures,
    diagnostics,
  };
}

function render(result: CheckResult): void {
  console.log(`  source:      ${result.source}`);
  console.log(`  bytes:       ${result.bytes}`);
  console.log(`  stamp links: ${result.stampLinks}`);
  for (const link of result.sampleLinks) console.log(`               ${link}`);
  for (const note of result.diagnostics) console.log(`  note:        ${note}`);
  for (const failure of result.failures) {
    console.log(`  FAIL         ${failure}`);
  }
}

async function main(): Promise<number> {
  const args = parseArgs(Deno.args);

  console.log("Homepage content assertion");
  console.log(
    `  thresholds: >=${args.thresholds.minStampLinks} stamp permalinks, >=${args.thresholds.minBytes} bytes`,
  );

  // Fixture mode: assert against a saved response. Used by the unit test to
  // prove this guard fails on a planted copy of the real broken response.
  if (args.fixture) {
    const result = await checkFile(args.fixture, args.thresholds);
    render(result);
    console.log(result.ok ? "PASS" : "FAIL");
    return result.ok ? 0 : 1;
  }

  // Live mode. Sample more than once so a single transient blip cannot open an
  // issue; the real outage failed 15 of 15 consecutive requests, so requiring
  // every sample to fail costs nothing in detection and removes false alarms.
  const results: CheckResult[] = [];
  for (let attempt = 1; attempt <= args.attempts; attempt++) {
    console.log(`\nSample ${attempt}/${args.attempts}`);
    try {
      const path = await fetchToFile(args.url, `${args.out}.${attempt}`);
      const result = await checkFile(path, args.thresholds);
      render(result);
      results.push(result);
      if (result.ok) break; // one healthy sample is enough
    } catch (error) {
      const message = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      console.log(`  FAIL         FETCH: ${message}`);
      results.push({
        ok: false,
        source: args.url,
        bytes: 0,
        stampLinks: 0,
        sampleLinks: [],
        placeholderErrorPresent: false,
        failures: [`FETCH: ${message}`],
        diagnostics: [],
      });
    }
    if (attempt < args.attempts) await new Promise((r) => setTimeout(r, 5000));
  }

  const passed = results.some((r) => r.ok);
  const last = results[results.length - 1];

  if (args.reportPath) {
    await ensureDir(args.reportPath);
    await Deno.writeTextFile(
      args.reportPath,
      JSON.stringify(
        {
          ok: passed,
          url: args.url,
          checkedAt: new Date().toISOString(),
          thresholds: args.thresholds,
          samples: results.map((r) => ({
            ok: r.ok,
            bytes: r.bytes,
            stampLinks: r.stampLinks,
            failures: r.failures,
          })),
        },
        null,
        2,
      ),
    );
  }

  console.log(
    `\n${passed ? "PASS" : "FAIL"} — ${results.length} sample(s), ${
      results.filter((r) => r.ok).length
    } healthy`,
  );
  if (!passed && last) {
    console.log(
      "\nThe homepage is returning HTTP 200 with no stamp content. This is the " +
        "DATA_PLACEHOLDER_PROD_HOME empty state; status-code monitoring cannot see it.",
    );
  }
  return passed ? 0 : 1;
}

if (import.meta.main) {
  Deno.exit(await main());
}
