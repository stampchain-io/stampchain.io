import { assertEquals } from "@std/assert";
import { EcxNodeFeeProvider } from "$server/services/fee/feeServiceFactory.ts";

const fake = (rates: Record<number, number>, fromNode = true) => (target: number) =>
  Promise.resolve({ satPerVb: rates[target], fromNode });

Deno.test("ECX fee provider exposes per-target tiers in debug_feesResponse", async () => {
  const p = new EcxNodeFeeProvider(fake({ 1: 7, 3: 4, 6: 2 }) as never);
  const r = await p.getFeeEstimate();
  assertEquals(r.recommendedFee, 7);
  assertEquals(r.confidence, "medium");
  assertEquals(r.debug_feesResponse, { fastestFee: 7, halfHourFee: 4, hourFee: 2, economyFee: 2, minimumFee: 1 });
});

Deno.test("ECX fee provider reports the 1 sat/vB floor with low confidence before the node has estimates", async () => {
  const p = new EcxNodeFeeProvider(fake({ 1: 1, 3: 1, 6: 1 }, false) as never);
  const r = await p.getFeeEstimate();
  assertEquals(r.confidence, "low");
  assertEquals(r.debug_feesResponse, { fastestFee: 1, halfHourFee: 1, hourFee: 1, economyFee: 1, minimumFee: 1 });
});
