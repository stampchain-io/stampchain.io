import { formatSupply } from "./formatUtils.ts";

/**
 * Edition count as shown on the stamp detail page, the homepage carousel and
 * the wallet dispenser view: divisible supplies render as whole units to two
 * decimals, indivisible supplies above 100000 collapse to "+100000".
 *
 * Each of those three views previously inlined its own
 * `(supply / 100000000).toFixed(2)`, which is the expression that throws on a
 * bigint supply. They share this one implementation instead.
 */
export function formatEditionCount(
  supply: number | string | bigint | undefined,
  divisible: boolean,
): string {
  if (supply === undefined) return "0";
  if (divisible) return formatSupply(supply, true);

  const exceedsCap = typeof supply === "bigint"
    ? supply > 100000n
    : Number(supply) > 100000;

  return exceedsCap ? "+100000" : formatSupply(supply, false);
}
