import { assertEquals } from "@std/assert";
import { serverTiming, timedCheck } from "$lib/utils/api/timedCheck.ts";

Deno.test("timedCheck: a fast check returns its value", async () => {
  const r = await timedCheck("db", () => Promise.resolve(42), 500);
  assertEquals([r.outcome, r.value], ["ok", 42]);
});

Deno.test("timedCheck: a slow check stops at the budget", async () => {
  let release!: () => void;
  const slow = new Promise<number>((resolve) => (release = () => resolve(1)));
  const started = Date.now();
  const r = await timedCheck("xcp", () => slow, 50);
  assertEquals(r.outcome, "timeout");
  assertEquals(r.value, undefined);
  assertEquals(Date.now() - started < 500, true);
  release();
});

Deno.test("timedCheck: a rejected check reports error and does not throw", async () => {
  const r = await timedCheck("mempool", () => Promise.reject(new Error("down")), 500);
  assertEquals(r.outcome, "error");
});

Deno.test("serverTiming: names, durations, and non-ok outcomes", () => {
  assertEquals(
    serverTiming([
      { name: "db", ms: 12, value: 1, outcome: "ok" },
      { name: "xcp", ms: 2000, value: undefined, outcome: "timeout" },
    ]),
    'db;dur=12, xcp;dur=2000;desc="timeout"',
  );
});
