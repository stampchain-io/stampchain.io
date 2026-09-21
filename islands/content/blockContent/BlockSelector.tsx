/* ===== BLOCK SELECTOR COMPONENT ===== */
import { transitionAll } from "$layout";
import {
  abbreviateAddress,
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import type { BlockProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== MAIN COMPONENT ===== */
export default function BlockSelector(props: BlockProps) {
  /* ===== PROPS EXTRACTION ===== */
  const { block, selected = { value: null } } = props;

  /* ===== EVENT HANDLERS ===== */
  function handleClick() {
    if (selected) {
      selected.value = block;
    }
  }

  /* ===== COMPUTED VALUES ===== */
  const isSelected = selected.value === block;
  const displayAddress = globalThis.innerWidth >= 640
    ? abbreviateAddress(block.block_hash, 8)
    : abbreviateAddress(block.block_hash, 16);

  /* ===== RENDER ===== */
  return (
    <a
      href={`/block/${block.block_index}`}
      class={`${
        isSelected ? "bg-blue-100 text-gray-800" : "bg-gray-800 text-blue-100"
      } ${transitionAll} transform hover:shadow-xl
        rounded-2xl overflow-hidden flex flex-col justify-between p-3 mobileLg:p-4 m-2
        cursor-pointer hover:bg-gray-700 hover:text-blue-200`}
      onClick={handleClick}
    >
      {/* ===== BLOCK HEADER ===== */}
      <div class="flex items-center justify-between text-sm mobileLg:text-base">
        <h3 class="font-bold">Block {block.block_index}</h3>
        <span>
          {formatDate(new Date(block.block_time), {
            includeRelative: true,
          })}
        </span>
      </div>

      {/* ===== BLOCK HASH ===== */}
      <div class="mt-1 mb-2">
        <p class="truncate">{displayAddress}</p>
      </div>

      {/* ===== BLOCK STATS ===== */}
      <div class="flex items-center justify-between text-xs mobileLg:text-sm">
        <span>Stamps: {block.issuances}</span>
        {/* <span>Sends: {block.sends}</span> */}
      </div>
    </a>
  );
}
