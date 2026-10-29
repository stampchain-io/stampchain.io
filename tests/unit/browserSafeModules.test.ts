/**
 * chainProfile.ts is reachable from the browser bundle: server/config/config.ts
 * imports it, and shared lib/ code that islands use imports config.ts. A
 * module-level `Deno.env` read there threw "Deno is not defined" on every
 * page (#1303), which killed every island in production.
 *
 * In a child process, preload the npm dependencies with the real Deno, then
 * make any `Deno.env` / `Deno.cwd` access throw, and import the module. Reading
 * the env inside a function (when called on the server) stays allowed.
 * (Deleting Deno outright is not possible here: Deno's npm loader needs it.)
 */
import { assertEquals } from "@std/assert";

async function loadsWithoutEnvAtImport(mod: string, preload: string[]) {
  const code = `${
    preload.map((p) => `await import(${JSON.stringify(p)});`).join("")
  }
const real = globalThis.Deno;
Object.defineProperty(globalThis, "Deno", { configurable: true, value: new Proxy(real, { get(t, p) {
  if (p === "env" || p === "cwd") throw new ReferenceError("Deno is not defined (browser)");
  return Reflect.get(t, p);
} }) });
try { await import(${JSON.stringify(mod)}); console.log("LOADED"); }
catch (e) { console.log("FAILED " + (e && e.name) + ": " + (e && e.message)); }`;
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", code],
    cwd: new URL("../..", import.meta.url).pathname,
    env: { HOME: Deno.env.get("HOME") ?? "", NO_COLOR: "1" },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr);
  return text.split("\n").find((l) =>
    l.startsWith("LOADED") || l.startsWith("FAILED")
  ) ?? text.slice(-400);
}

Deno.test("chainProfile.ts does not read Deno.env at module load (browser-safe)", async () => {
  assertEquals(
    await loadsWithoutEnvAtImport("./server/services/chain/chainProfile.ts", [
      "bitcoinjs-lib",
    ]),
    "LOADED",
  );
});

Deno.test("getChainId() in a browser (no Deno) reads as bitcoin, not a crash", async () => {
  const out = await new Deno.Command(Deno.execPath(), {
    args: [
      "eval",
      "--no-check",
      'await import("bitcoinjs-lib"); const m = await import("./server/services/chain/chainProfile.ts"); delete globalThis.Deno; console.log("CHAIN=" + m.getChainId());',
    ],
    cwd: new URL("../..", import.meta.url).pathname,
    env: { HOME: Deno.env.get("HOME") ?? "", NO_COLOR: "1", CHAIN: "ecx" },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr);
  assertEquals(
    text.split("\n").find((l) => l.startsWith("CHAIN=")),
    "CHAIN=bitcoin",
    text.slice(-300),
  );
});
