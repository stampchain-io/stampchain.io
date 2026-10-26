/* ===== STAMP TOOLS PAGE ===== */
/*@baba-71-82*/
import { Handlers, PageProps } from "$fresh/server.ts";
import { body, containerGap } from "$layout";
import { StampSendHowTo } from "$section";
import { StampSendTool } from "$tool";
import type { ToolStampPageProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  GET(_req, ctx) {
    // Skip handling for the stamping path - let the dedicated redirect handle it
    if (ctx.params.action === "stamping") {
      return ctx.next();
    }

    console.log("Handler called for [action] route");
    const data = {
      selectedTab: "transfer", // Example data
      trxType: "olga", // Example data
    };
    console.log("Data prepared:", data);
    return ctx.render(data);
  },
};

/* ===== PAGE COMPONENT ===== */
export default function ToolStampPage(
  { data }: PageProps<ToolStampPageProps>,
) {
  console.log("ToolStampPage component rendered");

  /* ===== DATA EXTRACTION ===== */
  const {
    selectedTab = "defaultTab",
    trxType = "defaultType",
  } = data || {};

  console.log("Data received:", data);
  console.log("Selected Tab:", selectedTab);
  console.log("Transaction Type:", trxType);

  /* ===== CONTENT RENDERING HELPERS ===== */
  const renderContent = () => {
    console.log("Rendering Content for Tab:", selectedTab);
    switch (selectedTab) {
      case "transfer":
        return <StampSendTool />;
      default:
        return <div>No content available for this tab.</div>;
    }
  };

  const renderLeftSidebar = () => {
    console.log("Rendering Left Sidebar for Tab:", selectedTab);
    switch (selectedTab) {
      case "transfer":
        return <StampSendHowTo />;
      default:
        return <div>No sidebar content available for this tab.</div>;
    }
  };

  // Note: Right sidebar rendering removed as it's not currently used in the UI

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      <div class={`flex w-full`}>
        {renderContent()}
      </div>
      <div class="flex w-full">
        {renderLeftSidebar()}
      </div>
      {
        /*
        <div class="flex w-full tablet:w-1/2">
          {renderRightSidebar()}
        </div>
        */
      }
    </div>
  );
}
