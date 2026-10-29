/**
 * Writes bitcoinEstampsBaseline.json: what Bitcoin rendered and queried
 * before the eSTAMPS change, for the surfaces that change touches. Run it
 * against the code BEFORE such a change, from tests/, with CHAIN unset:
 *
 *   cd tests && TZ=UTC DENO_ENV=test SKIP_REDIS_CONNECTION=true \
 *     deno run --allow-all --no-check fixtures/chain/captureBitcoinEstampsBaseline.ts
 *
 * The committed fixture came from ecx/deploy-2 (76c8f6360) with only the
 * tests/fixtures/chain/ files added.
 */
import "./chainCases.tsx";
import {
  captureSql,
  notificationSource,
  renderSurfaces,
} from "./estampsCases.tsx";

if (Deno.env.get("CHAIN") !== undefined) {
  throw new Error("capture with CHAIN unset");
}
const out = {
  surfaces: await renderSurfaces(),
  sql: await captureSql(),
  notification: await notificationSource(),
};
await Deno.writeTextFile(
  new URL("./bitcoinEstampsBaseline.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  `wrote ${Object.keys(out.surfaces).length} renders and ${
    Object.keys(out.sql).length
  } SQL cases`,
);
Deno.exit(0);
