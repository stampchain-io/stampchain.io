import tailwind from "$fresh/plugins/tailwind.ts";
import { defineConfig } from "$fresh/server.ts";
import { LOCAL_HTTPS } from "$lib/utils/dataPlaceholderProd.ts";

function localHttpsServer(): { cert?: string; key?: string } {
  if (!LOCAL_HTTPS) return {};
  try {
    return {
      cert: Deno.readTextFileSync("./localhost-cert.pem"),
      key: Deno.readTextFileSync("./localhost-key.pem"),
    };
  } catch {
    throw new Error(
      "LOCAL_HTTPS is true but localhost-cert.pem / localhost-key.pem are missing.",
    );
  }
}

export default defineConfig({
  plugins: [tailwind()],
  server: localHttpsServer(),
});
