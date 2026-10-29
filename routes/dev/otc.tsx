/* ===== OTC TRADE PAGE ===== */
import type { PageProps } from "$fresh/server.ts";
import { StampTradeTool } from "$islands/dev/TradeTool.tsx";

/* ===== PAGE COMPONENT ===== */
export default function OtcPage(_props: PageProps) {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col items-center">
      <StampTradeTool />
    </div>
  );
}
