import { assertStringIncludes } from "@std/assert";
import {
  buildHostedSwapPageHtml,
  HOSTED_SWAP_ASSETS,
  HOSTED_SWAP_PAGE_CONFIG,
} from "$server/services/hostedSwapPageService.ts";

Deno.test("buildHostedSwapPageHtml renders the hosted swap shell", () => {
  const html = buildHostedSwapPageHtml();

  assertStringIncludes(html, "<div id=\"root\"");
  assertStringIncludes(
    html,
    `data-co-brand-label="${HOSTED_SWAP_PAGE_CONFIG.coBrandLabel}"`,
  );
  assertStringIncludes(
    html,
    `data-route-base="${HOSTED_SWAP_PAGE_CONFIG.routeBase}"`,
  );
  assertStringIncludes(
    html,
    `href="${HOSTED_SWAP_ASSETS.stylesheetHref}"`,
  );
  assertStringIncludes(
    html,
    `src="${HOSTED_SWAP_ASSETS.moduleScriptHref}"`,
  );
});
