/* ===== SRC20 TRANSFERS TABLE COMPONENT ===== */
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
import type { SRC20TransfersProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function SRC20TransfersTable(
  { sends, isLoading = false }: SRC20TransfersProps,
) {
  /* ===== CONSTANTS ===== */
  const headers = ["FROM", "TO", "AMOUNT", "DATE", "TX HASH"];

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
            { width: "min-w-[125px] w-auto" }, // AMOUNT
            { width: "min-w-[125px] w-auto" }, // DATE
            { width: "min-w-[150px] w-auto" }, // TX HASH
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
          {(sends?.length ?? 0) > 0
            ? sends?.map((send: SRC20Row, index: number) => (
              <tr
                key={`${send.tx_hash}-${index}`}
                class={`${container2} group`}
              >
                {/* FROM */}
                <td
                  class={cellLeftL2Detail}
                >
                  <a
                    href={`/wallet/${send.creator}`}
                    className="link-neutral-200"
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(send.creator, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(send.creator, 6)}
                    </span>
                  </a>
                </td>
                {/* TO */}
                <td
                  class={cellCenterL2Detail}
                >
                  <a
                    href={`/wallet/${send.destination}`}
                    className="link-neutral-200"
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(send.destination, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(send.destination, 6)}
                    </span>
                  </a>
                </td>
                {/* AMOUNT */}
                <td
                  class={`${cellCenterL2Detail} text-color-primary-400`}
                >
                  {Number(send.amt).toLocaleString()}
                </td>
                {/* DATE */}
                <td
                  class={cellCenterL2Detail}
                >
                  {formatDate(new Date(send.block_time), {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  }).toUpperCase()}
                </td>
                {/* TX HASH */}
                <td
                  class={cellRightL2Detail}
                >
                  <ExplorerLink
                    href={txExplorerUrl(send.tx_hash, "blockchain.com")}
                    target="_blank"
                    onClick={(e) => {
                      e.preventDefault();
                      globalThis.open(e.currentTarget.href, "_blank");
                    }}
                    className="link-neutral-200"
                  >
                    <span class="tablet:hidden">
                      {abbreviateAddress(send.tx_hash, 4)}
                    </span>
                    <span class="hidden tablet:inline">
                      {abbreviateAddress(send.tx_hash, 6)}
                    </span>
                  </ExplorerLink>
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
                    NO TRANSFERS
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
