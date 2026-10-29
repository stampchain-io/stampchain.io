import { assertEquals } from "@std/assert";
import { handler } from "$routes/api/v2/trx/create_psbt.ts";

function post(body: unknown): Request {
  return new Request("http://localhost/api/v2/trx/create_psbt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const seller = {
  utxo:
    "10f8e495a5088dd90a731f4b2657bfb4e94b1f59d3961cbc960900d4e5ba44e5:0",
  sellerAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
};

Deno.test("create_psbt rejects a sub-dust BTC price before building", async () => {
  const response = await handler.POST!(
    post({ ...seller, salePrice: 0.00000001 }),
    {} as never,
  );
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(typeof body.error, "string");
  assertEquals(String(body.error).includes("546"), true);
});

Deno.test("create_psbt rejects more than 8 decimal places", async () => {
  const response = await handler.POST!(
    post({ ...seller, salePrice: 0.123456789 }),
    {} as never,
  );
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(String(body.error).includes("8 decimal"), true);
});
