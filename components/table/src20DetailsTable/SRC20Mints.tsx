/* ===== SRC20 MINTS TABLE COMPONENT ===== */
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
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXxs, textXs, valueDarkSm } from "$text";
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
    <div class="overflow-x-auto overflow-y-clip tablet:overflow-x-clip flow-root scrollbar-hide">
      <table
        class={`w-full -my-2 border-separate border-spacing-y-2 ${textXs}`}
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
          {(mints?.length ?? 0) > 0
            ? mints?.map((mint: SRC20Row, index: number) => (
              <tr
                key={`${mint.tx_hash}-${index}`}
                class={`${container2} group`}
              >
                {/* AMOUNT */}
                <td
                  class={`${cellLeftL2Detail} text-color-primary-400`}
                >
                  {Number(mint.amt).toLocaleString()}
                </td>
                {/* ADDRESS */}
                <td
                  class={cellCenterL2Detail}
                >
                  <a
                    href={`/wallet/${mint.destination}`}
                    className="link-neutral-200"
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
                  class={cellCenterL2Detail}
                >
                  {formatDate(new Date(mint.block_time), {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  }).toUpperCase()}
                </td>
                {/* TX HASH */}
                <td
                  class={cellCenterL2Detail}
                >
                  <ExplorerLink
                    href={txExplorerUrl(mint.tx_hash, "blockchain.com")}
                    target="_blank"
                    onClick={(e) => {
                      e.preventDefault();
                      globalThis.open(e.currentTarget.href, "_blank");
                    }}
                    className="link-neutral-200"
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(mint.tx_hash, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(mint.tx_hash, 6)}
                    </span>
                  </ExplorerLink>
                </td>
                {/* BLOCK */}
                <td
                  class={`${cellRightL2Detail} text-color-neutral-400`}
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
