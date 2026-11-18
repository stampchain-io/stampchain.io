import { assertEquals, assertRejects } from "@std/assert";
import { restore, stub } from "@std/testing/mock";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import {
  InsufficientXcpError,
  StampValidationService,
} from "$server/services/stamp/stampValidationService.ts";
import type { XcpBalance } from "$types/base.d.ts";

const WALLET = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const NUMERIC_CPID = `A${(26n ** 12n + 1n).toString()}`;

function row(cpid: string, quantity: number): XcpBalance {
  return {
    address: WALLET,
    cpid,
    quantity,
    utxo: "",
    utxo_address: "",
    divisible: true,
    assetName: cpid,
    balance: quantity,
  };
}

function stubBalances(balances: XcpBalance[]) {
  const calls: unknown[][] = [];
  stub(
    CounterpartyApiManager,
    "getXcpBalancesByAddress",
    (address, cpid, utxoOnly, options) => {
      calls.push([address, cpid, utxoOnly, options]);
      return Promise.resolve({ balances, total: balances.length });
    },
  );
  return calls;
}

Deno.test("named asset under 0.5 XCP throws the required and available amounts", async () => {
  const calls = stubBalances([
    row("XCP", 25_000_000),
    row("PEPE", 100_000_000),
  ]);
  try {
    await assertRejects(
      () =>
        StampValidationService.assertSpendableXcpForNamedAsset(WALLET, "kevin"),
      InsufficientXcpError,
      "Insufficient XCP for POSH stamp issuance. Required: 0.5 XCP, Available: 0.25 XCP.",
    );
    assertEquals(calls, [[WALLET, "XCP", false, { type: "send" }]]);
  } finally {
    restore();
  }
});

Deno.test("exactly 0.5 XCP of send balance is enough for a named asset", async () => {
  stubBalances([row("XCP", 50_000_000)]);
  try {
    await StampValidationService.assertSpendableXcpForNamedAsset(
      WALLET,
      "KEVIN",
    );
  } finally {
    restore();
  }
});

Deno.test("XCP rows are summed before the 0.5 XCP check", async () => {
  stubBalances([
    row("XCP", 10_000_000),
    row("PEPE", 100_000_000),
    row("XCP", 40_000_000),
  ]);
  try {
    await StampValidationService.assertSpendableXcpForNamedAsset(
      WALLET,
      "KEVIN",
    );
  } finally {
    restore();
  }
});

Deno.test("a numeric A CPID does not look up an XCP balance", async () => {
  const calls = stubBalances([row("XCP", 0)]);
  try {
    await StampValidationService.assertSpendableXcpForNamedAsset(
      WALLET,
      NUMERIC_CPID,
    );
    assertEquals(calls, []);
  } finally {
    restore();
  }
});

Deno.test("a balance lookup failure is rethrown unchanged", async () => {
  stub(
    CounterpartyApiManager,
    "getXcpBalancesByAddress",
    () => Promise.reject(new Error("node down")),
  );
  try {
    const error = await assertRejects(
      () =>
        StampValidationService.assertSpendableXcpForNamedAsset(WALLET, "KEVIN"),
      Error,
      "node down",
    );
    assertEquals(error instanceof InsufficientXcpError, false);
  } finally {
    restore();
  }
});
