import { assertEquals } from "@std/assert";
import { getCdnUrl, getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";

const stamp = { stamp_url: "https://x/stamps/" + "ab".repeat(32) + ".gif", stamp_mimetype: "image/gif" } as never;

Deno.test("Bitcoin: stamp images stay on stampchain.io", () => {
  const prev = Deno.env.get("CHAIN");
  Deno.env.delete("CHAIN");
  try {
    assertEquals(getCdnUrl(), "https://stampchain.io");
    assertEquals(getStampImageSrc(stamp), "https://stampchain.io/stamps/" + "ab".repeat(32) + ".gif");
  } finally {
    if (prev !== undefined) Deno.env.set("CHAIN", prev);
  }
});

Deno.test("ECX (server): stamp images use APP_DOMAIN", () => {
  const prev = [Deno.env.get("CHAIN"), Deno.env.get("APP_DOMAIN")];
  Deno.env.set("CHAIN", "ecx");
  Deno.env.set("APP_DOMAIN", "ecx.stampchain.io");
  try {
    assertEquals(getCdnUrl(), "https://ecx.stampchain.io");
    assertEquals(getStampImageSrc(stamp), "https://ecx.stampchain.io/stamps/" + "ab".repeat(32) + ".gif");
  } finally {
    prev[0] === undefined ? Deno.env.delete("CHAIN") : Deno.env.set("CHAIN", prev[0]);
    prev[1] === undefined ? Deno.env.delete("APP_DOMAIN") : Deno.env.set("APP_DOMAIN", prev[1]);
  }
});
