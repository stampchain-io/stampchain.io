/* ===== EXPLORER HEADER COMPONENT ===== */
import { SortButton } from "$islands/button/SortButton.tsx";
import { container1 } from "$layout";
import { titlePrimary } from "$text";

/* ===== COMPONENT ===== */
export const ExplorerHeader = () => {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-row justify-between items-start w-full">
      {/* Title Section */}
      <h1 class={`${titlePrimary} ml-1.5`}>EXPLORER</h1>

      {/* Controls Section */}
      <div class="flex flex-col">
        <div
          class={`flex relative ${container1} !rounded-full
             items-start justify-between
             gap-7 py-1.5 px-5
             tablet:gap-5 tablet:py-1 tablet:px-4`}
        >
          <SortButton />
        </div>
      </div>
    </div>
  );
};
