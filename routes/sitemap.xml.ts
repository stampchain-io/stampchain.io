import { Handlers } from "$fresh/server.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";

const SITE_URL = "https://stampchain.io";

// Sitemap is regenerated on every request (lastmod = today), so cap all
// cache layers at one hour instead of the 1-year immutable default.
const SITEMAP_CACHE_SECONDS = 3600;
const SITEMAP_CACHE_CONTROL = `public, max-age=${SITEMAP_CACHE_SECONDS}`;

// Static pages with their priorities and change frequencies
const STATIC_PAGES: Array<{
  path: string;
  priority: string;
  changefreq: string;
}> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/marketplace", priority: "0.9", changefreq: "daily" },
  { path: "/src20", priority: "0.9", changefreq: "hourly" },
  { path: "/collection", priority: "0.8", changefreq: "daily" },
  { path: "/explorer", priority: "0.8", changefreq: "hourly" },
  // Block explorer page is still WIP (not linked in nav) — deprioritized
  // until it's fully wired up.
  { path: "/block", priority: "0.3", changefreq: "yearly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/docs", priority: "0.6", changefreq: "weekly" },
  { path: "/howto", priority: "0.6", changefreq: "monthly" },
  { path: "/howto/stamp", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/sendstamp", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/deploytoken", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/minttoken", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/transfertoken", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/leatherconnect", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/leathercreate", priority: "0.5", changefreq: "monthly" },
  { path: "/howto/transferbitname", priority: "0.5", changefreq: "monthly" },
  { path: "/tool/stamp/create", priority: "0.6", changefreq: "monthly" },
  { path: "/tool/fairmint", priority: "0.5", changefreq: "monthly" },
  { path: "/media", priority: "0.4", changefreq: "monthly" },
  { path: "/presskit", priority: "0.4", changefreq: "monthly" },
  { path: "/upload", priority: "0.4", changefreq: "monthly" },
  { path: "/termsofservice", priority: "0.3", changefreq: "yearly" },
];

function generateSitemapXml(): string {
  const today = new Date().toISOString().split("T")[0];

  const urls = STATIC_PAGES.map(
    (page) =>
      `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export const handler: Handlers = {
  GET(_req, _ctx) {
    const xml = generateSitemapXml();
    return WebResponseUtil.xmlResponse(xml, {
      headers: {
        "Cache-Control": SITEMAP_CACHE_CONTROL,
        "CDN-Cache-Control": SITEMAP_CACHE_CONTROL,
        "Cloudflare-CDN-Cache-Control": SITEMAP_CACHE_CONTROL,
        "Surrogate-Control": `max-age=${SITEMAP_CACHE_SECONDS}`,
        "Edge-Control": `cache-maxage=${SITEMAP_CACHE_SECONDS}`,
      },
    });
  },
};
