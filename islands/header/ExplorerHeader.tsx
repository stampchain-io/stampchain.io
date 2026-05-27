/* ===== EXPLORER HEADER COMPONENT ===== */
import { SelectorButtons } from "$button";
import { SortButton } from "$islands/button/SortButton.tsx";
import { container2 } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titlePrimary } from "$text";
import type { ExplorerHeaderProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export const ExplorerHeader = (
  { currentSection = "all" }: ExplorerHeaderProps,
) => {
  /* ===== EVENT HANDLERS ===== */
  const handleSectionChange = (section: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (section === "all") {
      params.delete("section");
    } else {
      params.set("section", section);
    }
    const query = params.toString();
    safeNavigate(getCurrentPathname() + (query ? `?${query}` : ""));
  };

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* Title Section */}
        <h1 class={`${titlePrimary} ml-1.5`}>EXPLORER</h1>
      </div>

      {/* Section Selector + Controls */}
      <div class="flex flex-col mobileMd:flex-row justify-between w-full">
        {/* Section Selector - Left */}
        <div class="flex gap-3 w-full mobileMd:w-auto">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "stamps", label: "STAMPS" },
              { value: "tokens", label: "TOKENS" },
            ]}
            value={currentSection}
            onChange={handleSectionChange}
            size="xsR"
            color="purple"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* Sort Controls - Right */}
        <div class="flex justify-start mobileMd:justify-end pt-3 mobileMd:pt-0">
          <div
            class={`flex relative ${container2} rounded-full
               items-start justify-between
               p-1 gap-1.5 tablet:gap-1`}
          >
            <SortButton />
          </div>
        </div>
      </div>
    </div>
  );
};
