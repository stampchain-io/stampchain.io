import { assertEquals } from "@std/assert";
import { isUserFundsError } from "$server/services/src20/userFundsError.ts";

Deno.test("isUserFundsError: wallet funding messages are user errors", () => {
  for (
    const m of [
      "No spendable UTXOs available for this address (insufficient funds)",
      "Insufficient funds: need 12000 sats",
      "No UTXOs available",
      "UTXO selection failed: not enough value",
    ]
  ) {
    assertEquals(isUserFundsError(m), true, m);
  }
});

Deno.test("isUserFundsError: server faults are not", () => {
  for (const m of ["DB timeout", "Invalid operation parameters", "fetch failed"]) {
    assertEquals(isUserFundsError(m), false, m);
  }
});
