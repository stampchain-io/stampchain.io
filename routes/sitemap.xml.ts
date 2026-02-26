import { Handlers } from "$fresh/server.ts";

const SITE_URL = "https://stampchain.io";

// Static pages with their priorities and change frequencies
const STATIC_PAGES: Array<{
  path: string;
  priority: string;
  changefreq: string;
}> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/stamp", priority: "0.9", changefreq: "hourly" },
  { path: "/src20", priority: "0.9", changefreq: "hourly" },
  { path: "/collection", priority: "0.8", changefreq: "daily" },
  { path: "/explorer", priority: "0.8", changefreq: "hourly" },
  { path: "/block", priority: "0.7", changefreq: "hourly" },
  { path: "/stamp/art", priority: "0.7", changefreq: "daily" },
  { path: "/stamp/posh", priority: "0.7", changefreq: "daily" },
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
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
};
