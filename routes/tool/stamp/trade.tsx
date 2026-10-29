/* ===== TRADE PAGE ===== */
import type { PageProps } from "$fresh/server.ts";
import { StampTradeTool } from "$tool";

/* ===== PAGE COMPONENT ===== */
export default function ToolTradePage(_props: PageProps) {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col items-center">
      <StampTradeTool />
    </div>
  );
}
