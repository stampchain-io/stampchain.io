/* ===== STAMP SALES TABLE COMPONENT ===== */
import { colGroup } from "$components/layout/types.ts";
import {
  cellCenterL2Detail,
  cellLeftL2Detail,
  cellRightL2Detail,
  container2,
} from "$layout";
import {
  abbreviateAddress,
  formatBTCAmount,
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXxs, textXs, valueDarkSm } from "$text";
import type { StampSalesProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function StampSalesTable(
  { dispenses, isLoading = false }: StampSalesProps,
) {
  /* ===== CONSTANTS ===== */
  const headers = ["FROM", "TO", "AMOUNT", "PRICE", "DATE"];

  /* ===== RENDER ===== */
  return (
    <div class="overflow-x-auto overflow-y-clip tablet:overflow-x-clip flow-root scrollbar-hide">
      <table
        class={`w-full -my-2 border-separate border-spacing-y-2 ${textXs}`}
      >
        {/* ===== TABLE STRUCTURE ===== */}
        <colgroup>
          {colGroup([
            { width: "min-w-[150px] w-auto" }, // FROM
            { width: "min-w-[150px] w-auto" }, // TO
            { width: "min-w-[100px] w-auto" }, // AMOUNT
            { width: "min-w-[150px] w-auto" }, // PRICE
            { width: "min-w-[150px] w-auto" }, // DATE
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        {/* ===== TABLE HEADER ===== */}
        <thead>
          <tr class={container2}>
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
                  class={`sticky top-0 z-10 !py-1.5 ${rowClass} ${labelXxs}`}
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
                  class={cellLeftL2Detail}
                >
                  <a
                    href={`/wallet/${dispense.source}`}
                    className="link-neutral-200"
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
                  class={cellCenterL2Detail}
                >
                  <a
                    href={`/wallet/${dispense.destination}`}
                    className="link-neutral-200"
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(dispense.destination, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(dispense.destination, 6)}
                    </span>
                  </a>
                </td>
                {/* AMOUNT */}
                <td
                  class={`${cellCenterL2Detail} text-color-primary-400`}
                >
                  {Number(dispense.dispense_quantity).toLocaleString()}
                </td>
                {/* PRICE */}
                <td
                  class={`${cellCenterL2Detail} text-color-orange-400`}
                >
                  {formatBTCAmount(Number(dispense.btc_amount) || 0, {
                    includeSymbol: true,
                    decimals: 8,
                    stripZeros: true,
                  })}
                </td>
                {/* DATE */}
                <td
                  class={`${cellRightL2Detail} text-color-neutral-400`}
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
