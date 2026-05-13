/* ===== STAMP LISTINGS ALL TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import {
  cellCenterL2Detail,
  cellLeftL2Detail,
  cellRightL2Detail,
  container2,
} from "$layout";
import {
  abbreviateAddress,
  formatSatoshisToBTC,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXs, textSm, valueDarkSm, valueSmLink } from "$text";
import type { Dispenser } from "$types/stamp.d.ts";
import type { StampListingsAllProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function StampListingsAllTable(
  { listings, isLoading = false }: StampListingsAllProps,
) {
  /* ===== CONSTANTS ===== */
  const headers = [
    "PRICE",
    "ESCROW",
    "GIVE",
    "REMAIN",
    "SOURCE",
    "ADDRESS",
    "STATUS",
  ];

  /* ===== RENDER ===== */
  return (
    <div class="-mt-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-2 ${textSm}`}
      >
        {/* ===== TABLE STRUCTURE ===== */}
        <colgroup>
          {colGroup([
            { width: "min-w-[120px] w-auto" }, // PRICE
            { width: "min-w-[80px] w-auto" }, // ESCROW
            { width: "min-w-[80px] w-auto" }, // GIVE
            { width: "min-w-[80px] w-auto" }, // REMAIN
            { width: "min-w-[120px] w-auto" }, // SOURCE
            { width: "min-w-[120px] w-auto" }, // ADDRESS
            { width: "min-w-[100px] w-auto" }, // STATUS
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
          {(listings?.length ?? 0) > 0
            ? listings?.map((dispenser: Dispenser, index: number) => {
              const isEmpty = dispenser.give_remaining === 0;

              return (
                <tr
                  key={`${dispenser.tx_hash}-${index}`}
                  class={`${container2} group ${
                    isEmpty ? "text-color-grey-semidark" : ""
                  }`}
                >
                  {/* PRICE */}
                  <td
                    class={`${
                      cellAlign(0, headers?.length ?? 0)
                    } ${cellLeftL2Detail}`}
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
                    {dispenser.escrow_quantity.toLocaleString()}
                  </td>
                  {/* GIVE */}
                  <td
                    class={`${
                      cellAlign(2, headers?.length ?? 0)
                    } ${cellCenterL2Detail}`}
                  >
                    {dispenser.give_quantity.toLocaleString()}
                  </td>
                  {/* REMAIN */}
                  <td
                    class={`${
                      cellAlign(3, headers?.length ?? 0)
                    } ${cellCenterL2Detail}`}
                  >
                    {dispenser.give_remaining.toLocaleString()}
                  </td>
                  {/* SOURCE */}
                  <td
                    class={`${
                      cellAlign(4, headers?.length ?? 0)
                    } ${cellCenterL2Detail}`}
                  >
                    DISPENSER
                  </td>
                  {/* ADDRESS */}
                  <td
                    class={`${
                      cellAlign(5, headers?.length ?? 0)
                    } ${cellCenterL2Detail}`}
                  >
                    <a
                      href={`/wallet/${dispenser.source}`}
                      className={`${valueSmLink} ${
                        isEmpty
                          ? "!text-color-grey-semidark hover:!text-color-purple-light"
                          : ""
                      }`}
                    >
                      <span class="tablet:hidden">
                        {abbreviateAddress(dispenser.source, 4)}
                      </span>
                      <span class="hidden tablet:inline">
                        {abbreviateAddress(dispenser.source, 8)}
                      </span>
                    </a>
                  </td>
                  {/* STATUS */}
                  <td
                    class={`${
                      cellAlign(6, headers?.length ?? 0)
                    } ${cellRightL2Detail}`}
                  >
                    {!dispenser.close_block_index ||
                        dispenser.close_block_index <= 0
                      ? (
                        "OPEN"
                      )
                      : (
                        <a
                          href={`https://www.blockchain.com/explorer/transactions/btc/${dispenser.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="hover:text-color-purple-light"
                        >
                          CLOSED
                        </a>
                      )}
                  </td>
                </tr>
              );
            })
            : !isLoading && (
              <tr>
                <td
                  colSpan={headers?.length ?? 0}
                  class={`w-full h-[34px] ${container2}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO LISTINGS AT THE MOMENT
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
