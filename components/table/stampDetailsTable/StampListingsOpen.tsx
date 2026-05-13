/* ===== STAMP LISTINGS OPEN TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import {
  cellCenterL2Detail,
  cellLeftL2Detail,
  cellRightL2Detail,
  container2,
  ScrollContainer,
} from "$layout";
import {
  formatNumber,
  formatSatoshisToBTC,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXs, textSm } from "$text";
import type { StampListingsOpenProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function StampListingsOpenTable({
  dispensers,
  floorPrice,
  onSelectDispenser,
  selectedDispenser,
}: StampListingsOpenProps) {
  /* ===== CONSTANTS ===== */
  const headers = ["PRICE", "ESCROW", "GIVE", "REMAIN", "SOURCE"];

  /* ===== DATA PROCESSING ===== */
  const sortedDispensers = [...(dispensers || [])]
    .filter((dispenser) => dispenser.give_remaining > 0)
    .sort((a, b) => b.give_remaining - a.give_remaining);

  /* ===== RENDER ===== */
  return (
    <div class="relative w-full">
      <ScrollContainer class="min-h-[76px] max-h-[244px] scrollbar-background-layer1">
        <div class="!-my-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
          <table class={`w-full border-separate border-spacing-y-2 ${textSm}`}>
            {/* ===== TABLE STRUCTURE ===== */}
            <colgroup>
              {colGroup([
                { width: "min-w-[110px] w-auto" }, // PRICE
                { width: "min-w-[55px] w-auto" }, // ESCROW
                { width: "min-w-[55px] w-auto" }, // GIVE
                { width: "min-w-[55px] w-auto" }, // REMAIN
                { width: "min-w-[95px] w-auto" }, // SOURCE
              ]).map((col) => <col key={col.key} class={col.className} />)}
            </colgroup>
            {/* ===== TABLE HEADER ===== */}
            <thead class="sticky top-0 z-10">
              {/* Only sticky on desktop */}
              <tr class={`${container2}`}>
                {headers.map((header, i) => {
                  const isFirst = i === 0;
                  const isLast = i === (headers?.length ?? 0) - 1;
                  const rowClass = isFirst
                    ? cellLeftL2Detail
                    : isLast
                    ? cellRightL2Detail
                    : cellCenterL2Detail;

                  return (
                    <th
                      key={header}
                      class={`${
                        cellAlign(i, headers?.length ?? 0)
                      } !py-1.5 ${rowClass} ${labelXs}`}
                    >
                      {header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            {/* ===== TABLE CONTENT ===== */}
            <tbody>
              {sortedDispensers.map((dispenser) => {
                const isEmpty = dispenser.give_remaining === 0;
                const isFloorPrice =
                  (dispenser.satoshirate / 100000000) === floorPrice;
                const isSelected =
                  selectedDispenser?.source === dispenser.source ||
                  (!selectedDispenser && isFloorPrice);

                return (
                  <tr
                    key={dispenser.source}
                    class={`${container2} group cursor-pointer ${
                      isEmpty ? "text-color-grey-semidark" : ""
                    } ${
                      isSelected
                        ? "text-color-grey-light"
                        : "text-color-grey-semidark"
                    }`}
                    onClick={() => onSelectDispenser?.(dispenser)}
                  >
                    {/* PRICE */}
                    <td
                      class={`${
                        cellAlign(0, headers?.length ?? 0)
                      } ${cellLeftL2Detail} group-hover:text-color-purple-light`}
                    >
                      {formatSatoshisToBTC(dispenser.satoshirate, {
                        includeSymbol: true,
                        decimals: 8,
                        stripZeros: true,
                      })}
                    </td>
                    {/* ESCROW */}
                    <td
                      class={`${
                        cellAlign(1, headers?.length ?? 0)
                      } ${cellCenterL2Detail}`}
                    >
                      {formatNumber(dispenser.escrow_quantity, 0)}
                    </td>
                    {/* GIVE */}
                    <td
                      class={`${
                        cellAlign(2, headers?.length ?? 0)
                      } ${cellCenterL2Detail}`}
                    >
                      {formatNumber(dispenser.give_quantity, 0)}
                    </td>
                    {/* REMAIN */}
                    <td
                      class={`${
                        cellAlign(3, headers?.length ?? 0)
                      } ${cellCenterL2Detail}`}
                    >
                      {formatNumber(dispenser.give_remaining, 0)}
                    </td>
                    {/* SOURCE */}
                    <td
                      class={`${
                        cellAlign(4, headers?.length ?? 0)
                      } ${cellRightL2Detail} group-hover:text-color-grey-light`}
                    >
                      DISPENSER
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollContainer>
    </div>
  );
}
