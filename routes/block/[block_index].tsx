/* ===== BLOCK PAGE ROUTE ===== */

import { Handlers, PageProps } from "$fresh/server.ts";
import { BlockController } from "$server/controller/blockController.ts";
import type { BlockRow } from "$types/base.d.ts";

import { BlockSelector, BlockTransactions } from "$content";
import { BlockHeader } from "$header";
import { signal } from "@preact/signals";

/* ===== TYPES ===== */
interface BlockPageData {
  currentBlock: BlockRow;
  relatedBlocks: BlockRow[];
  error?: string;
}

import { body } from "$layout";
import { subtitleNeutral, textLg } from "$text";

/* ===== SERVER HANDLER ===== */
export const handler: Handlers<BlockPageData> = {
  async GET(_req, ctx) {
    try {
      /* ===== PARAMS EXTRACTION ===== */
      const { block_index } = ctx.params;

      /* ===== DATA FETCHING ===== */
      // Get block info and related blocks
      const blockInfo = await BlockController.getBlockInfoResponse(
        block_index,
        "all",
      );
      const relatedBlocks = await BlockController.getRelatedBlocksWithStamps(
        block_index,
      );

      /* ===== RESPONSE ===== */
      return ctx.render({
        currentBlock: blockInfo.block_info,
        relatedBlocks: Array.isArray(relatedBlocks) ? relatedBlocks : [], // Ensure it's an array
      });
    } catch (error) {
      /* ===== ERROR HANDLING ===== */
      console.error("Error in block page handler:", error);
      return ctx.render({
        currentBlock: {
          block_index: 0,
          block_hash: "",
          block_time: new Date(),
          issuances: 0,
          previous_block_hash: "",
          difficulty: 0,
          ledger_hash: "",
          txlist_hash: "",
          messages_hash: "",
          indexed: 1,
        } as BlockRow,
        relatedBlocks: [],
        error: "Failed to load block data",
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function BlockPage({ data }: PageProps<BlockPageData>) {
  /* ===== STATE ===== */
  const selectedBlock = signal(data.currentBlock);

  /* ===== RENDER ===== */
  return (
    <div class={body}>
      <BlockHeader />

      {/* ===== PAGE TITLE ===== */}
      <div class="mb-6">
        <h2 class={subtitleNeutral}>
          BLOCK{" "}
          {data.currentBlock?.block_index?.toLocaleString() || "Not Found"}
        </h2>
        <p class={textLg}>
          Block information and related transactions
        </p>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-4">
          <h3 class={subtitleNeutral}>RELATED BLOCKS</h3>
          {Array.isArray(data.relatedBlocks) && data.relatedBlocks.length > 0
            ? (
              data.relatedBlocks.map((block) => (
                <BlockSelector
                  key={block.block_index}
                  block={block}
                  selected={{
                    value:
                      selectedBlock.value?.block_index === block.block_index,
                  }}
                />
              ))
            )
            : <div class="text-gray-500">No related blocks available</div>}
        </div>

        <div>
          <BlockTransactions />
        </div>
      </div>

      {data.error && (
        <div class="mt-4 p-4 bg-red-500 text-white rounded">
          {data.error}
        </div>
      )}
    </div>
  );
}
