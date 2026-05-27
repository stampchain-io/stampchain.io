/* ===== STAMPING TOOL PAGE ===== */
/*@baba-71-81*/

import { Handlers, PageProps } from "$fresh/server.ts";
import { body, containerBackground, containerGap } from "$layout";
import { StampGallery, StampingHowto } from "$section";
import { StampController } from "$server/controller/stampController.ts";
import { StampingToolLazy } from "$islands/tool/stamp/StampingToolLazy.tsx";
import type { StampRow } from "$types/stamp.d.ts";

/* ===== TYPES ===== */
interface StampPageData {
  latestStamps: StampRow[];
}

/* ===== SERVER HANDLER ===== */
export const handler: Handlers<StampPageData> = {
  async GET(_, ctx) {
    try {
      const stampResult = await StampController.getStamps({
        limit: 16,
        sortBy: "DESC",
        type: "stamps",
        page: 1,
      });

      return ctx.render({
        latestStamps: stampResult.data,
      });
    } catch (error) {
      console.error("Error fetching stamps:", error);
      return ctx.render({
        latestStamps: [],
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function ToolStampingPage({ data }: PageProps<StampPageData>) {
  /* ===== SECTION CONFIGURATION ===== */
  const latestStampsSection = {
    title: "LATEST STAMPS",
    subTitle: "ON-CHAIN MARVELS",
    type: "classic",
    stamps: data.latestStamps,
    layout: "grid" as const,
    variant: "image" as const,
    alignRight: true,
    gridClass: `
      grid w-full
      gap-3 mobileMd:gap-5
      grid-cols-2
      mobileSm:grid-cols-3
      mobileLg:grid-cols-4
      tablet:grid-cols-3
      desktop:grid-cols-4
      auto-rows-fr
    `,
    displayCounts: {
      "mobileSm": 6, // 3 columns x 2 rows
      "mobileLg": 8, // 4 columns x 2 rows
      "tablet": 9, // 3 columns x 3 rows
      "desktop": 12, // 4 columns x 3 rows
    },
  };

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      <div class={`flex w-full`}>
        <StampingToolLazy />
      </div>
      <div
        class={`flex flex-col tablet:flex-row justify-between ${containerGap}`}
      >
        <div class="flex w-full tablet:w-1/2">
          <StampingHowto />
        </div>
        <div
          class={`${containerBackground} h-fit tablet:w-1/2 items-start tablet:items-end`}
        >
          <StampGallery {...latestStampsSection} />
        </div>
      </div>
    </div>
  );
}
