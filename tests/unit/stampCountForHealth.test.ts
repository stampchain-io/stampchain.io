/**
 * The health check's stamp count is served from a background-refreshed
 * in-process value: one query on first use, then none until the refresh
 * interval passes, and a failed refresh never replaces a good value.
 */
import { assertEquals } from "@std/assert";
import { StampRepository } from "$server/database/stampRepository.ts";

Deno.test({
  name: "countTotalStampsForHealth: queries once, then answers from memory",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const queries: string[] = [];
    StampRepository.setDatabase({
      executeQuery: (q: string) => {
        queries.push(q);
        return Promise.resolve({ rows: [{ total: 1507940n }] });
      },
    } as any);
    const first = await StampRepository.countTotalStampsForHealth();
    const second = await StampRepository.countTotalStampsForHealth();
    assertEquals(first, { isValid: true, count: 1507940 });
    assertEquals(second, { isValid: true, count: 1507940 });
    assertEquals(queries.length, 1);
    assertEquals(/JOIN/i.test(queries[0]), false, "the health count needs no join");
  },
});
