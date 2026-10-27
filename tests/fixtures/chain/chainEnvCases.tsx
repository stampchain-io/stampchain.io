/**
 * Env-dependent chain labelling cases: routes/_middleware.ts and
 * routes/_app.tsx read CHAIN from the process environment, so these run in a
 * child `deno test` started by tests/unit/chainLabelling.test.tsx with a
 * clean env. Never run this file inside the parallel unit suite, and never
 * set CHAIN in-process: parallel test files share one environment.
 */
import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import {
  baseline,
  db,
  opts,
  renderApp,
  renderLinks,
  TIP,
} from "./chainCases.tsx";

const { default: App } = await import("../../../routes/_app.tsx");
const { handler: rootMiddleware } = await import(
  "../../../routes/_middleware.ts"
);
const { MetaTags } = await import("$components/layout/MetaTags.tsx");
const { getPageMetadata } = await import("$lib/utils/pageMetadata.ts");
const { brandPageMetadata } = await import("$lib/utils/chain/brand.ts");
const clientChain = await import("$lib/utils/chain/clientChain.ts");
const { ApiResponseUtil } = await import(
  "$lib/utils/api/responses/apiResponseUtil.ts"
);
const label = await import("$server/services/chain/chainLabel.ts");

const CHAIN = Deno.env.get("CHAIN");
const isEcx = CHAIN === "ecx";
const mode = `CHAIN ${CHAIN ?? "unset"}`;

if (!isEcx) {
  Deno.test({
    ...opts,
    name:
      `${mode}: metadata, MetaTags, _app and explorer links match pre-ECX bytes`,
    async fn() {
      const metadata: Record<string, unknown> = {};
      for (const p of Object.keys(baseline.metadata)) {
        metadata[p] = brandPageMetadata(getPageMetadata(p), p, "bitcoin");
      }
      assertEquals(metadata, baseline.metadata);
      assertEquals({
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
      }, baseline.metaTags);
      for (const p of Object.keys(baseline.app)) {
        assertEquals(renderApp(App, p), baseline.app[p], `_app ${p}`);
      }
      assertEquals(await renderLinks(), baseline.links);
      assertEquals(clientChain.getClientChain(), null);
    },
  });

  Deno.test({
    ...opts,
    name: `${mode}: /api responses pass through the middleware untouched`,
    async fn() {
      const before = db.queries;
      for (
        const res of [
          ApiResponseUtil.success({ ok: true }),
          ApiResponseUtil.badRequest("nope"),
          ApiResponseUtil.notFound("missing"),
        ]
      ) {
        const headersBefore = [...res.headers.entries()];
        for (const path of ["/api/v2/stamps", "/api/v2/no-such-route"]) {
          const out = await rootMiddleware(
            new Request(`http://localhost${path}`),
            { state: {}, next: () => Promise.resolve(res) } as any,
          );
          assertStrictEquals(out, res);
        }
        assertEquals([...res.headers.entries()], headersBefore);
      }
      assertEquals(db.queries, before, "no tip lookup on Bitcoin");
    },
  });

  Deno.test({
    ...opts,
    name: `${mode}: page middleware sets no chain state`,
    async fn() {
      const ctx: any = {
        state: {},
        next: () => Promise.resolve(new Response("x")),
      };
      await rootMiddleware(new Request("http://localhost/explorer"), ctx);
      assert(!("chainLabel" in ctx.state));
      assertEquals(clientChain.getClientChain(), null);
    },
  });
} else {
  Deno.test({
    ...opts,
    name: `${mode}: root middleware labels /api responses, matched or not`,
    async fn() {
      for (const path of ["/api/v2/stamps", "/api/v2/no-such-route"]) {
        const res = await rootMiddleware(
          new Request(`http://localhost${path}`),
          {
            state: {},
            next: () => Promise.resolve(ApiResponseUtil.success({ ok: 1 })),
          } as any,
        );
        assertEquals(res.headers.get("X-Chain"), "ecx");
        assertEquals(res.headers.get("X-Chain-Height"), "973800");
        assertEquals(res.headers.get("X-Chain-Block-Hash"), TIP.block_hash);
      }
      // /s/ and /content/ serve stamp content, not API responses
      const raw = new Response("x");
      const content = await rootMiddleware(
        new Request("http://localhost/content/abc"),
        { state: {}, next: () => Promise.resolve(raw) } as any,
      );
      assertStrictEquals(content, raw);
    },
  });

  Deno.test({
    ...opts,
    name:
      `${mode}: page middleware hands _app the label and publishes the client chain`,
    async fn() {
      const ctx: any = {
        state: {},
        next: () => Promise.resolve(new Response("x")),
      };
      await rootMiddleware(new Request("http://localhost/explorer"), ctx);
      assertEquals(ctx.state.chainLabel, {
        chain: "ecx",
        label: "ECX",
        height: 973_800,
        blockHash: TIP.block_hash,
      });
      assertEquals(clientChain.getClientChain(), {
        CHAIN: "ecx",
        EXPLORER_BASE_URL: "https://ecx.example/",
      });
      // skipAppLayout routes render no header, so no lookup is needed
      const direct: any = {
        state: {},
        next: () => Promise.resolve(new Response("x")),
      };
      await rootMiddleware(new Request("http://localhost/s/abc"), direct);
      assert(!("chainLabel" in direct.state));
      clientChain.setClientChain(null);
    },
  });

  Deno.test({
    ...opts,
    name:
      `${mode}: every page header shows ECX, height and hash; brand is ECX Stamps`,
    async fn() {
      const chainLabel = await label.getChainLabel();
      clientChain.setClientChain(null);
      const html = renderApp(App, "/explorer", { chainLabel });
      assert(html.includes('data-chain="ecx"'));
      assert(html.includes('data-chain-height="973800"'));
      assert(html.includes(`data-chain-block-hash="${TIP.block_hash}"`));
      assert(html.includes(">ECX</span>"));
      assert(html.includes("973,800"));
      assert(html.includes(`>${TIP.block_hash}</span>`));
      assert(html.includes("ECX</span> STAMPS"));
      assert(!html.includes("STAMP</span>CHAIN"));
      // _app passed the chain to the Header island as a prop (Fresh
      // serialises it for the browser); Header published it while rendering.
      assertEquals(clientChain.getClientChain(), {
        CHAIN: "ecx",
        EXPLORER_BASE_URL: "https://ecx.example/",
      });
      clientChain.setClientChain(null);
    },
  });
}
