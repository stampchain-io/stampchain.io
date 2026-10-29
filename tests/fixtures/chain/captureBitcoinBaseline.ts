/**
 * Writes bitcoinBaseline.json: the renders chainEnvCases.tsx compares on
 * Bitcoin (page metadata, MetaTags, _app, explorer links). Run it against
 * the code BEFORE a chain-labelling change, from tests/, with CHAIN unset:
 *
 *   cd tests && TZ=UTC DENO_ENV=test SKIP_REDIS_CONNECTION=true \
 *     deno run --allow-all --no-check fixtures/chain/captureBitcoinBaseline.ts
 *
 * The committed fixture came from a pristine main checkout (37d0d9ab7, after
 * #1306) with only the
 * tests/fixtures/chain/ files copied in. chainCases.tsx reads the existing
 * bitcoinBaseline.json on import, so one must be present; it is overwritten.
 */
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { renderApp, renderLinks } from "./chainCases.tsx";

if (Deno.env.get("CHAIN") !== undefined) {
  throw new Error("capture with CHAIN unset");
}
const { default: App } = await import("../../../routes/_app.tsx");
const { MetaTags } = await import("$components/layout/MetaTags.tsx");
const { getPageMetadata } = await import("$lib/utils/pageMetadata.ts");

const METADATA_PATHS = [
  "/",
  "/marketplace",
  "/src20",
  "/collection",
  "/explorer",
  "/block",
  "/about",
  "/faq",
  "/docs",
  "/howto",
  "/howto/buy",
  "/howto/stamp",
  "/howto/sendstamp",
  "/howto/deploytoken",
  "/howto/minttoken",
  "/howto/transfertoken",
  "/howto/leatherconnect",
  "/howto/leathercreate",
  "/howto/transferbitname",
  "/tool/stamp/create",
  "/create/classic",
  "/create/posh",
  "/create/recursive",
  "/tool/fairmint",
  "/media",
  "/presskit",
  "/upload",
  "/termsofservice",
  "/stamp",
  "/tool/stamp/trade",
  "/tool/stamp/send",
  "/tool/src20/mint",
  "/tool/src101/register",
  "/howto/foo-bar",
  "/collection/kevin-stamps",
  "/src20/kevin",
  "/block/973800",
  "/stamp/12345",
  "/wallet/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "/dashboard/1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
  "/nope",
  "/tool/stamp/stamping",
];
const APP_PATHS = ["/", "/explorer", "/stamp/1", "/about"];

const metadata: Record<string, unknown> = {};
for (const p of METADATA_PATHS) metadata[p] = getPageMetadata(p);
const metaTags = {
  default: renderToString(h(MetaTags, {})),
  home: renderToString(
    h(MetaTags, {
      ...getPageMetadata("/"),
      canonicalUrl: "https://stampchain.io/",
      ogUrl: "https://stampchain.io/",
    }),
  ),
  stamp: renderToString(
    h(MetaTags, {
      title: "x",
      skipImage: true,
      skipTitle: true,
      skipDescription: true,
      skipOgMeta: true,
    }),
  ),
};
const app: Record<string, string> = {};
for (const p of APP_PATHS) app[p] = renderApp(App, p);
const out = { metadata, metaTags, app, links: await renderLinks() };
await Deno.writeTextFile(
  new URL("./bitcoinBaseline.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  `wrote ${METADATA_PATHS.length} metadata, 3 MetaTags, ${APP_PATHS.length} _app and ${
    Object.keys(out.links).length
  } link cases`,
);
