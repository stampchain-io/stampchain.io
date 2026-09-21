/* ===== BLOCK TRANSACTIONS COMPONENT ===== */
import { useFees } from "$fees";
import { Icon } from "$icon";
import { containerBackground, transitionAll } from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { text, text2xl } from "$text";
import { useState } from "preact/hooks";

interface BlockStampRow {
  stamp: number | null;
  ident?: string;
  tx_hash: string;
  cpid?: string;
  creator?: string;
  creator_name?: string | null;
}

interface BlockSrc20Row {
  tick?: string;
  op?: string;
  amt?: string | number | null;
  tx_hash: string;
  block_index?: number;
}

interface MempoolFees {
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
  minimumFee?: number;
}

interface BlockTransactionsProps {
  stamps?: BlockStampRow[];
  src20?: BlockSrc20Row[];
  blockDifficulty?: number | null;
}

function usdForFee(
  satPerVb: number | undefined,
  btcPrice: number | null | undefined,
) {
  if (satPerVb == null || !btcPrice) return "";
  const usd = (satPerVb * 140 / 1e8) * btcPrice;
  return `$${usd.toFixed(2)}`;
}

const DEFAULT_FEE = 10;

const DEFAULT_FEES: MempoolFees = {
  fastestFee: DEFAULT_FEE,
  halfHourFee: DEFAULT_FEE,
  hourFee: DEFAULT_FEE,
  economyFee: DEFAULT_FEE,
  minimumFee: DEFAULT_FEE,
};

function feesFromHook(
  fees: ReturnType<typeof useFees>["fees"],
): MempoolFees {
  if (!fees) return DEFAULT_FEES;
  const debug = (fees.debug_feesResponse ?? {}) as MempoolFees;
  const fallback = fees.recommendedFee ?? DEFAULT_FEE;
  return {
    fastestFee: fees.fastestFee ?? debug.fastestFee ?? fallback,
    halfHourFee: fees.halfHourFee ?? debug.halfHourFee ?? fallback,
    hourFee: fees.hourFee ?? debug.hourFee ?? fallback,
    economyFee: fees.economyFee ?? debug.economyFee ?? fallback,
    minimumFee: fees.minimumFee ?? debug.minimumFee ?? debug.economyFee ??
      fallback,
  };
}

function formatDifficulty(value: number | null | undefined) {
  if (value == null || value === 0) return "";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/* ===== MAIN COMPONENT ===== */
export default function BlockTransactions({
  stamps = [],
  src20 = [],
  blockDifficulty = null,
}: BlockTransactionsProps) {
  const { fees } = useFees();
  const mempoolFees = feesFromHook(fees);
  const btcPrice = fees?.btcPrice ?? null;

  const [isExpanded, setIsExpanded] = useState(true);

  const minimumFee = mempoolFees.minimumFee ?? mempoolFees.economyFee;
  const hourFee = mempoolFees.hourFee;
  const halfHourFee = mempoolFees.halfHourFee;
  const fastestFee = mempoolFees.fastestFee;

  const difficultyLabel = formatDifficulty(blockDifficulty);
  const hasStamps = stamps.length > 0;
  const hasSrc20 = src20.length > 0;

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      class={`${containerBackground} text-color-grey-light gap-6 ${transitionAll}`}
    >
      <div class="flex justify-between">
        <h4 class={text2xl}>TRANSACTIONS</h4>
        <div class="flex items-center gap-3">
          <h6 class={text}>EXPAND</h6>
          <Icon
            type="icon"
            name="caretUp"
            size="md"
            color="primary500"
            weight="normal"
            className={`cursor-pointer ${isExpanded ? "" : "rotate-180"}`}
            onClick={() => handleExpand()}
          />
        </div>
      </div>

      {isExpanded && (
        <div class="flex flex-col gap-5">
          <div class="flex flex-col tablet:flex-row justify-between items-stretch gap-5">
            <div class="flex flex-col items-center gap-5">
              <div class="flex gap-[10px]">
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#986F10]" />
              </div>
              <p class="text-center text-[#6E6E6E]">Transaction Fees</p>

              <div class="bg-[#1B1D2B] py-2 tablet:py-4 px-3 tablet:px-6 w-full">
                <div class="grid grid-cols-2 tablet:grid-cols-4 gap-y-5">
                  <div class="md:mr-5">
                    <p class="bg-[#587206] min-w-[120px] py-1 text-center mb-5">
                      No Priority
                    </p>
                    <div class="text-center flex flex-col items-center">
                      <p class="text-[#6E6E6E]">
                        <span class="text-2xl text-white">{minimumFee}</span>
                        {" "}
                        sat/vB
                      </p>
                      <hr class="border-[#6E6E6E] w-[80px]" />
                      <p class="text-[#2E9C3B]">
                        {usdForFee(minimumFee, btcPrice)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p class="bg-gradient-to-r from-[#597206] to-[#6F7209] min-w-[120px] py-1 text-center mb-5">
                      Low Priority
                    </p>
                    <div class="text-center flex flex-col items-center">
                      <p class="text-[#6E6E6E]">
                        <span class="text-2xl text-white">{hourFee}</span>{" "}
                        sat/vB
                      </p>
                      <hr class="border-[#6E6E6E] w-[80px]" />
                      <p class="text-[#2E9C3B]">
                        {usdForFee(hourFee, btcPrice)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p class="bg-gradient-to-r from-[#6F7209] to-[#85720D] min-w-[120px] py-1 text-center mb-5">
                      Medium Priority
                    </p>
                    <div class="text-center flex flex-col items-center">
                      <p class="text-[#6E6E6E]">
                        <span class="text-2xl text-white">{halfHourFee}</span>
                        {" "}
                        sat/vB
                      </p>
                      <hr class="border-[#6E6E6E] w-[80px]" />
                      <p class="text-[#2E9C3B]">
                        {usdForFee(halfHourFee, btcPrice)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p class="bg-gradient-to-r from-[#85720D] to-[#9C7210] min-w-[120px] py-1 text-center mb-5 rounded-r-full">
                      High Priority
                    </p>
                    <div class="text-center flex flex-col items-center">
                      <p class="text-[#6E6E6E]">
                        <span class="text-2xl text-white">{fastestFee}</span>
                        {" "}
                        sat/vB
                      </p>
                      <hr class="border-[#6E6E6E] w-[80px]" />
                      <p class="text-[#2E9C3B]">
                        {usdForFee(fastestFee, btcPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border border-dashed"></div>

            <div class="flex flex-col items-center gap-5">
              <div class="flex gap-[10px]">
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
                <div class="w-[40px] tablet:w-[80px] h-[40px] tablet:h-[80px] bg-[#8434F0]" />
              </div>

              <div class="flex flex-col tablet:flex-row justify-between items-center w-full">
                <p class="hidden tablet:block invisible text-xs">
                  difficulty | <span class="text-[#8434F0]">halving</span>
                </p>
                <p class="text-[#6E6E6E]">Difficulty adjustment</p>
                <p class="text-[#6E6E6E] text-xs">
                  difficulty | <span class="text-[#8434F0]">halving</span>
                </p>
              </div>

              <div class="bg-[#1B1D2B] py-2 tablet:py-4 px-3 tablet:px-6 w-full">
                <div class="flex mb-5">
                  <div class="bg-[#254FB3] w-[200px] h-8">
                  </div>
                  <div class="bg-[#19892F] w-[20px] h-8">
                  </div>
                  <div class="w-full h-8 bg-[#282D3F]">
                  </div>
                </div>

                <div class="flex justify-between gap-2">
                  <div>
                    <p class="text-sm tablet:text-2xl text-center">
                      {difficultyLabel || "~10 minutes"}
                    </p>
                    <p class="text-[#6E6E6E] text-xs tablet:text-base text-center">
                      {difficultyLabel
                        ? "Block difficulty"
                        : "Average block time"}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm tablet:text-2xl text-center">
                      <span class="text-[#34C440]">
                        {hasStamps ? stamps.length : 0}
                      </span>
                    </p>
                    <p class="text-[#6E6E6E] text-xs tablet:text-base text-center">
                      Stamp issuances
                    </p>
                  </div>
                  <div>
                    <p class="text-sm tablet:text-2xl text-center">
                      {hasSrc20 ? src20.length : 0}
                    </p>
                    <p class="text-[#6E6E6E] text-xs tablet:text-base text-center">
                      SRC-20 operations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(hasStamps || hasSrc20) && (
            <div class="flex flex-col gap-3 border-t border-[#282D3F] pt-4">
              {hasStamps && (
                <div class="flex flex-col gap-2 overflow-x-auto">
                  <p class="text-[#6E6E6E]">Stamps ({stamps.length})</p>
                  {stamps.map((stamp, i) => (
                    <div
                      key={`${stamp.tx_hash}-${stamp.cpid ?? stamp.stamp}-${i}`}
                      class="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm py-2 border-b border-[#282D3F]"
                    >
                      <span>STAMP #{stamp.stamp ?? "—"}</span>
                      <span class="text-[#6E6E6E]">{stamp.ident ?? ""}</span>
                      <span class="text-[#6E6E6E] break-all">
                        {stamp.creator_name || stamp.creator || ""}
                      </span>
                      <span class="break-all">{stamp.tx_hash}</span>
                    </div>
                  ))}
                </div>
              )}

              {hasSrc20 && (
                <div class="flex flex-col gap-2 overflow-x-auto">
                  <p class="text-[#6E6E6E]">SRC-20 ({src20.length})</p>
                  {src20.map((row, i) => (
                    <div
                      key={`${row.tx_hash}-${row.tick}-${row.op}-${i}`}
                      class="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm py-2 border-b border-[#282D3F]"
                    >
                      <span>{unicodeEscapeToEmoji(row.tick ?? "")}</span>
                      <span class="text-[#6E6E6E] uppercase">
                        {row.op ?? ""}
                      </span>
                      <span class="text-[#6E6E6E]">
                        {row.amt != null ? String(row.amt) : ""}
                      </span>
                      <span class="text-[#6E6E6E]">
                        {row.block_index != null ? `#${row.block_index}` : ""}
                      </span>
                      <span class="break-all">{row.tx_hash}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasStamps && !hasSrc20 && (
            <p class="text-[#6E6E6E] text-sm">
              No stamp or SRC-20 transactions in this block
            </p>
          )}
        </div>
      )}
    </div>
  );
}
