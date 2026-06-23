export interface HostedSwapPageConfig {
  appName: string;
  coBrandLabel: string;
  hostName: string;
  hostHomeHref: string;
  routeBase: string;
  routeLabel: string;
  hostSubtitle: string;
  pageDescription: string;
  showHostBadge: boolean;
}

export interface HostedSwapAssetManifest {
  stylesheetHref: string;
  moduleScriptHref: string;
}

export const HOSTED_SWAP_PAGE_CONFIG: HostedSwapPageConfig = {
  appName: "STAMPYSWAP",
  coBrandLabel: "Stampchain x STAMPYSWAP",
  hostName: "Stampchain",
  hostHomeHref: "https://stampchain.io",
  routeBase: "/swap",
  routeLabel: "Swap",
  hostSubtitle:
    "Counterparty DEX route hosted on Stampchain with wallet and QR signing.",
  pageDescription:
    "Stampchain x STAMPYSWAP: non-custodial Counterparty DEX trading with wallet signing, QR signing, portfolio tools, and transaction tracking.",
  showHostBadge: true,
};

export const HOSTED_SWAP_ASSETS: HostedSwapAssetManifest = {
  stylesheetHref: "/swap-assets/stampyswap-Bx3jizHT.css",
  moduleScriptHref: "/swap-assets/stampyswap-CVc6wmfI.js",
};

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderRootDataAttributes(config: HostedSwapPageConfig): string {
  const attributes: Array<[string, string]> = [
    ["data-app-name", config.appName],
    ["data-co-brand-label", config.coBrandLabel],
    ["data-host-name", config.hostName],
    ["data-host-home-href", config.hostHomeHref],
    ["data-route-base", config.routeBase],
    ["data-route-label", config.routeLabel],
    ["data-host-subtitle", config.hostSubtitle],
    ["data-page-description", config.pageDescription],
    ["data-show-host-badge", String(config.showHostBadge)],
  ];

  return attributes.map(([key, value]) =>
    `${key}="${escapeHtmlAttribute(value)}"`
  ).join(" ");
}

export function buildHostedSwapPageHtml(
  config: HostedSwapPageConfig = HOSTED_SWAP_PAGE_CONFIG,
  assets: HostedSwapAssetManifest = HOSTED_SWAP_ASSETS,
): string {
  const rootAttributes = renderRootDataAttributes(config);
  const title = escapeHtmlAttribute(`${config.coBrandLabel} | Counterparty DEX`);
  const description = escapeHtmlAttribute(config.pageDescription);
  const canonicalHref = escapeHtmlAttribute(
    `${config.hostHomeHref.replace(/\/+$/, "")}${config.routeBase}`,
  );
  const stylesheetHref = escapeHtmlAttribute(assets.stylesheetHref);
  const moduleScriptHref = escapeHtmlAttribute(assets.moduleScriptHref);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <title>${title}</title>
    <link rel="canonical" href="${canonicalHref}" />
    <link rel="stylesheet" href="${stylesheetHref}" />
  </head>
  <body data-swap-host="stampchain" data-swap-hosted-route="true">
    <div id="root" ${rootAttributes}></div>
    <noscript>
      Stampchain x STAMPYSWAP requires JavaScript to load the trading workspace.
    </noscript>
    <script type="module" src="${moduleScriptHref}"></script>
  </body>
</html>`;
}
