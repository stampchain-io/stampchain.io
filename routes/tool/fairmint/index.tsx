/* ===== FAIRMINT TOOL PAGE ===== */
import { Handlers, PageProps } from "$fresh/server.ts";
import type { ToolFairmintPageProps } from "$types/ui.d.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { FairmintTool } from "$tool";

/* ===== TYPES ===== */

/* ===== SERVER HANDLER ===== */
export const handler: Handlers<ToolFairmintPageProps> = {
  async GET(_req, ctx) {
    try {
      const fairminters = await CounterpartyApiManager.getFairminters();
      return ctx.render({ fairminters });
    } catch (error) {
      console.error("Error fetching fairminters:", error);
      return ctx.render({ fairminters: [] });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function ToolFairmintPage(
  { data }: PageProps<ToolFairmintPageProps>,
) {
  /* ===== RENDER ===== */
  /* Title and description come from $lib/utils/pageMetadata.ts via _app.tsx.
    A route-level <title> here rendered BEFORE _app's, so the page shipped two
    of them. */
  return <FairmintTool fairminters={data.fairminters} />;
}
