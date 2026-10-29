/**
 * Writes bitcoinAmountsBaseline.json from ./amountCases.tsx. Run it against
 * the code BEFORE an amount or market-data change, from tests/, with CHAIN
 * unset:
 *
 *   cd tests && TZ=UTC DENO_ENV=test SKIP_REDIS_CONNECTION=true \
 *     deno run --allow-all --no-check fixtures/chain/captureBitcoinAmounts.ts
 *
 * The committed fixture came from main at 37d0d9ab7 (after #1306) with this file and
 * amountCases.tsx copied in unchanged.
 */
import "./chainCases.tsx"; // installs the DB stub before components load
import { formatAmounts, renderAmountComponents } from "./amountCases.tsx";

if (Deno.env.get("CHAIN") !== undefined) {
  throw new Error("capture with CHAIN unset");
}
const out = {
  helpers: await formatAmounts(),
  components: await renderAmountComponents(),
};
await Deno.writeTextFile(
  new URL("./bitcoinAmountsBaseline.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  `wrote ${Object.keys(out.helpers).length} helper and ${
    Object.keys(out.components).length
  } component cases`,
);
