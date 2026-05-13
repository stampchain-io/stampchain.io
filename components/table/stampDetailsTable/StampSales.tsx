/* ===== STAMP SALES TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import {
  cellCenterL2Detail,
  cellLeftL2Detail,
  cellRightL2Detail,
  container2,
} from "$layout";
import {
  abbreviateAddress,
  formatDate,
  formatSatoshisToBTC,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXs, textSm, valueDarkSm, valueSmLink } from "$text";
import type { StampSalesProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function StampSalesTable(
  { dispenses, isLoading = false }: StampSalesProps,
) {
  /* ===== CONSTANTS ===== */
  const headers = ["FROM", "TO", "QUANTITY", "PRICE", "DATE"];

  /* ===== RENDER ===== */
  return (
    <div class="-mt-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-2 ${textSm}`}
      >
        {/* ===== TABLE STRUCTURE ===== */}
        <colgroup>
          {colGroup([
            { width: "min-w-[150px] w-auto" }, // FROM
            { width: "min-w-[150px] w-auto" }, // TO
            { width: "min-w-[100px] w-auto" }, // QUANTITY
            { width: "min-w-[150px] w-auto" }, // PRICE
            { width: "min-w-[150px] w-auto" }, // DATE
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        {/* ===== TABLE HEADER ===== */}
        <thead class="sticky top-0 z-10">
          {/* Only sticky on desktop */}
          <tr class={`${container2}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;

              // Apply row border classes for segmented styling
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
          {(dispenses?.length ?? 0) > 0
            ? dispenses?.map((dispense, index) => (
              <tr
                key={`${dispense.tx_hash}-${index}`}
                class={`${container2} group`}
              >
                {/* FROM */}
                <td
                  class={`${
                    cellAlign(0, headers?.length ?? 0)
                  } ${cellLeftL2Detail}`}
                >
                  <a
                    href={`/wallet/${dispense.source}`}
                    className={`${valueSmLink}`}
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(dispense.source, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(dispense.source, 6)}
                    </span>
                  </a>
                </td>
                {/* TO */}
                <td
                  class={`${
                    cellAlign(1, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  <a
                    href={`/wallet/${dispense.destination}`}
                    className={`${valueSmLink}`}
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(dispense.destination, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(dispense.destination, 6)}
                    </span>
                  </a>
                </td>
                {/* QUANTITY */}
                <td
                  class={`${
                    cellAlign(2, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  {Number(dispense.dispense_quantity).toLocaleString()}
                </td>
                {/* PRICE */}
                <td
                  class={`${
                    cellAlign(3, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  {formatSatoshisToBTC(dispense.satoshirate, {
                    includeSymbol: true,
                    decimals: 8,
                    stripZeros: true,
                  })}
                </td>
                {/* DATE */}
                <td
                  class={`${
                    cellAlign(4, headers?.length ?? 0)
                  } ${cellRightL2Detail} text-color-grey`}
                >
                  {dispense.block_time
                    ? formatDate(new Date(dispense.block_time), {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    }).toUpperCase()
                    : "N/A"}
                </td>
              </tr>
            ))
            : !isLoading && (
              <tr>
                <td
                  colSpan={headers?.length ?? 0}
                  class={`w-full h-[34px] ${container2}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO SALES YET
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
