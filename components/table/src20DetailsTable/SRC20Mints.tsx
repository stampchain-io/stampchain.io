/* ===== SRC20 MINTS TABLE COMPONENT ===== */
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
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXs, textSm, valueDarkSm, valueSmLink } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { SRC20MintsProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function SRC20MintsTable(
  { mints, isLoading = false }: SRC20MintsProps,
) {
  /* ===== CONSTANTS ===== */
  const headers = ["AMOUNT", "ADDRESS", "DATE", "TX HASH", "BLOCK"];

  /* ===== RENDER ===== */
  return (
    <div class="-mt-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-2 ${textSm}`}
      >
        {/* ===== TABLE STRUCTURE ===== */}
        <colgroup>
          {colGroup([
            { width: "min-w-[125px] w-auto" }, // AMOUNT
            { width: "min-w-[150px] w-auto" }, // ADDRESS
            { width: "min-w-[125px] w-auto" }, // DATE
            { width: "min-w-[150px] w-auto" }, // TX HASH
            { width: "min-w-[150px] w-auto" }, // BLOCK
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
          {(mints?.length ?? 0) > 0
            ? mints?.map((mint: SRC20Row, index: number) => (
              <tr
                key={`${mint.tx_hash}-${index}`}
                class={`${container2} group`}
              >
                {/* AMOUNT */}
                <td
                  class={`${
                    cellAlign(0, headers?.length ?? 0)
                  } ${cellLeftL2Detail}`}
                >
                  {Number(mint.amt).toLocaleString()}
                </td>
                {/* ADDRESS */}
                <td
                  class={`${
                    cellAlign(1, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  <a
                    href={`/wallet/${mint.destination}`}
                    className={valueSmLink}
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(mint.destination, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(mint.destination, 6)}
                    </span>
                  </a>
                </td>
                {/* DATE */}
                <td
                  class={`${
                    cellAlign(2, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  {formatDate(new Date(mint.block_time), {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  }).toUpperCase()}
                </td>
                {/* TX HASH */}
                <td
                  class={`${
                    cellAlign(3, headers?.length ?? 0)
                  } ${cellCenterL2Detail}`}
                >
                  <a
                    href={`https://www.blockchain.com/explorer/transactions/btc/${mint.tx_hash}`}
                    target="_blank"
                    onClick={(e) => {
                      e.preventDefault();
                      globalThis.open(
                        `https://www.blockchain.com/explorer/transactions/btc/${mint.tx_hash}`,
                        "_blank",
                      );
                    }}
                    className={valueSmLink}
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(mint.tx_hash, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(mint.tx_hash, 6)}
                    </span>
                  </a>
                </td>
                {/* BLOCK */}
                <td
                  class={`${
                    cellAlign(4, headers?.length ?? 0)
                  } ${cellRightL2Detail} text-color-grey`}
                >
                  {mint.block_index.toLocaleString()}
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
                    NO MINTS YET
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
