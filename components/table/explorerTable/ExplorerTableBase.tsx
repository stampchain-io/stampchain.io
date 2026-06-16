/* ===== UNIFIED EXPLORER TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  container2,
} from "$layout";
import { labelXxs, textXs } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";

import { SRC20OverviewRow } from "./SRC20Overview.tsx";
import { StampOverviewRow } from "./StampOverview.tsx";

/* ===== TYPES ===== */
export type MixedItem =
  | { kind: "stamp"; item: StampRow }
  | { kind: "src20"; item: SRC20Row };

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "TYPE",
  "TICK / CPID",
  "ADDRESS",
  "AMOUNT",
  "TX HASH",
  "BLOCK",
  "DATE",
];

/* ===== COMPONENT ===== */
interface ExplorerTableBaseProps {
  items: MixedItem[];
}

export function ExplorerTableBase({ items }: ExplorerTableBaseProps) {
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-12" }, // IMAGE
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[110px] w-auto" }, // TYPE
            { width: "min-w-[100px] w-auto" }, // TICK / CPID
            { width: "min-w-[110px] w-auto" }, // ADDRESS
            { width: "min-w-[90px] w-auto" }, // AMOUNT / SUPPLY
            { width: "min-w-[110px] w-auto" }, // TX HASH
            { width: "min-w-[90px] w-auto" }, // BLOCK
            { width: "min-w-[100px] w-auto" }, // DATE
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {HEADERS.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === HEADERS.length - 1;
              const rowClass = isFirst
                ? cellLeftL2Card
                : isLast
                ? cellRightL2Card
                : cellCenterL2Card;
              return (
                <th
                  key={header}
                  class={`${labelXxs} ${
                    cellAlign(i, HEADERS.length)
                  } py-1.5 !px-3 ${rowClass} text-color-neutral-500`}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.length
            ? items.map((entry) =>
              entry.kind === "stamp"
                ? (
                  <StampOverviewRow
                    key={entry.item.tx_hash}
                    stamp={entry.item}
                  />
                )
                : (
                  <SRC20OverviewRow
                    key={entry.item.tx_hash}
                    src20={entry.item}
                  />
                )
            )
            : (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  class={`w-full h-[46px] ${container2}`}
                >
                  <p class="text-center text-color-neutral-500 text-xs">
                    NO ITEMS TO DISPLAY
                  </p>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
