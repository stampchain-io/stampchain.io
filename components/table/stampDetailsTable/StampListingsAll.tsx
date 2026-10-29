/* ===== STAMP LISTINGS ALL TABLE COMPONENT ===== */
import { ExplorerLink } from "$components/layout/ExplorerLink.tsx";
import { txExplorerUrl } from "$lib/utils/chain/clientChain.ts";
import { colGroup } from "$components/layout/types.ts";
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
import { labelXxs, textXs, valueDarkSm } from "$text";
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
    <div class="overflow-x-auto overflow-y-clip tablet:overflow-x-clip flow-root scrollbar-hide">
      <table
        class={`w-full -my-2 border-separate border-spacing-y-2 ${textXs}`}
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
          {(listings?.length ?? 0) > 0
            ? listings?.map((dispenser: Dispenser, index: number) => {
              const isEmpty = dispenser.give_remaining === 0;
              const isOpen = !dispenser.close_block_index ||
                dispenser.close_block_index <= 0;
              const isActive = isOpen && !isEmpty;

              return (
                <tr
                  key={`${dispenser.tx_hash}-${index}`}
                  class={`${container2} group ${
                    isEmpty ? "text-color-neutral-500" : ""
                  }`}
                >
                  {/* PRICE */}
                  <td
                    class={`${cellLeftL2Detail} ${
                      isActive ? "text-color-orange-400" : ""
                    }`}
                  >
                    {formatSatoshisToBTC(dispenser.satoshirate, {
                      includeSymbol: true,
                      decimals: 8,
                      stripZeros: true,
                    })}
                  </td>
                  {/* ESCROW */}
                  <td
                    class={cellCenterL2Detail}
                  >
                    {dispenser.escrow_quantity.toLocaleString()}
                  </td>
                  {/* GIVE */}
                  <td
                    class={cellCenterL2Detail}
                  >
                    {dispenser.give_quantity.toLocaleString()}
                  </td>
                  {/* REMAIN */}
                  <td
                    class={`${cellCenterL2Detail} ${
                      isActive ? "text-color-primary-400" : ""
                    }`}
                  >
                    {dispenser.give_remaining.toLocaleString()}
                  </td>
                  {/* SOURCE */}
                  <td
                    class={cellCenterL2Detail}
                  >
                    DISPENSER
                  </td>
                  {/* ADDRESS */}
                  <td
                    class={cellCenterL2Detail}
                  >
                    <a
                      href={`/wallet/${dispenser.source}`}
                      className={`${
                        isEmpty
                          ? "!text-color-neutral-500 link-neutral-500 hover:text-color-hover"
                          : "link-neutral-200"
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
                    class={cellRightL2Detail}
                  >
                    {!dispenser.close_block_index ||
                        dispenser.close_block_index <= 0
                      ? (
                        "OPEN"
                      )
                      : (
                        <ExplorerLink
                          href={txExplorerUrl(
                            dispenser.tx_hash,
                            "blockchain.com",
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link-neutral-500"
                        >
                          CLOSED
                        </ExplorerLink>
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
