import { assert, assertEquals } from "@std/assert";
import {
  buildXcpBalanceRow,
  XCP_SUPPLY_FALLBACK,
  xcpQuantityFromBalances,
  xcpSupplyFromAsset,
} from "$lib/utils/xcp/xcpWalletBalance.ts";

Deno.test("xcpQuantityFromBalances sums XCP base units and converts to XCP", () => {
  assertEquals(
    xcpQuantityFromBalances([
      { cpid: "XCP", quantity: 50_000_000 },
      { cpid: "XCP", quantity: "25000000" },
      { cpid: "PEPE", quantity: 100_000_000 },
    ]),
    0.75,
  );
});

Deno.test("xcpQuantityFromBalances is zero when XCP is missing or empty", () => {
  assertEquals(xcpQuantityFromBalances([]), 0);
  assertEquals(xcpQuantityFromBalances([{ cpid: "XCP", quantity: 0 }]), 0);
  assertEquals(
    xcpQuantityFromBalances([{ cpid: "A123", quantity: 50_000_000 }]),
    0,
  );
});

Deno.test("xcpSupplyFromAsset divides divisible supply and falls back", () => {
  assertEquals(xcpSupplyFromAsset(null), XCP_SUPPLY_FALLBACK);
  assertEquals(xcpSupplyFromAsset(undefined), XCP_SUPPLY_FALLBACK);
  assertEquals(
    xcpSupplyFromAsset({ supply: 150_000_000, divisible: true }),
    1.5,
  );
  assertEquals(
    xcpSupplyFromAsset({ divisible: false, supply: 10 }),
    XCP_SUPPLY_FALLBACK,
  );
  assertEquals(
    xcpSupplyFromAsset({
      divisible: false,
      supply_normalized: "2648755.63000000",
    }),
    2648755.63,
  );
});

Deno.test("buildXcpBalanceRow omits a zero balance", () => {
  assertEquals(
    buildXcpBalanceRow({
      quantity: 0,
      supply: XCP_SUPPLY_FALLBACK,
      price: { priceBtc: 0.00002, change24hPercent: 1 },
    }),
    null,
  );
});

Deno.test("buildXcpBalanceRow maps price onto both market fields", () => {
  const supply = 100;
  const priceBtc = 0.00002;
  const row = buildXcpBalanceRow({
    quantity: 1.5,
    supply,
    price: { priceBtc, change24hPercent: -2.5 },
  });

  assert(row);
  assertEquals(row.tick, "XCP");
  assertEquals(row.p, "counterparty");
  assertEquals(row.tx_hash, "xcp");
  assertEquals(row.amt, "1.5");
  assertEquals(row.max, "100");
  assertEquals(row.market_data?.price_btc, priceBtc);
  assertEquals(row.market_data?.floor_price_btc, priceBtc);
  assertEquals(row.market_data?.change_24h_percent, -2.5);
  assertEquals(row.market_data?.market_cap_btc, supply * priceBtc);
  assertEquals(row.holders, undefined);
});

Deno.test("buildXcpBalanceRow keeps the balance when price is missing", () => {
  const row = buildXcpBalanceRow({
    quantity: 2,
    supply: Number.NaN,
    price: null,
  });

  assert(row);
  assertEquals(row.amt, "2");
  assertEquals(row.max, "2648755.63");
  assertEquals(row.market_data, undefined);
});
