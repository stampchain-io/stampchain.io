import { Icon } from "$icon";
import { container1 } from "$layout";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { TransactionHexDisplayProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/**
 * Displays transaction hex in a container1 box with copy functionality
 * Useful for debugging MARA submissions or manual transaction broadcasts
 */
export function TransactionHexDisplay({
  hex,
  txid,
  class: className = "",
}: TransactionHexDisplayProps) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      showToast("Transaction hex copied to clipboard!", "success", false);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy transaction hex", "error", false);
      console.error("Copy failed:", error);
    }
  };

  const truncatedHex = hex.substring(0, 100) + "...";
  const displayHex = showFull ? hex : truncatedHex;

  return (
    <div
      class={`${container1} bg-gradient-to-br from-purple-900/10 to-purple-800/15 border-purple-500/15 p-4 ${className}`}
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="text-purple-400 text-lg">🔧</div>
          <h3 class="text-purple-200 font-semibold text-sm">
            Debug: Signed Transaction Hex
          </h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFull(!showFull)}
            class="text-xs text-purple-300 hover:text-purple-200 transition-colors"
          >
            {showFull ? "Show Less" : "Show Full"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            class={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
              copied
                ? "bg-green-500/20 text-green-300"
                : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200"
            }`}
          >
            <Icon
              type="icon"
              name={copied ? "check" : "copy"}
              size="xs"
              weight="normal"
              color="custom"
              className={copied ? "fill-green-300" : "fill-purple-300"}
            />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {txid && (
        <div class="mb-2">
          <span class="text-xs text-purple-300">TXID:</span>
          <span class="text-xs text-purple-200 font-mono">{txid}</span>
        </div>
      )}

      <div class="bg-color-neutral-dark/50 rounded p-3 overflow-x-auto">
        <pre class="text-xs text-color-neutral-light font-mono whitespace-pre-wrap break-all">
          {displayHex}
        </pre>
      </div>

      <div class="mt-3 text-xs text-color-neutral-light">
        <p class="mb-1">
          Length: {hex.length} characters
        </p>
        <p class="text-purple-300">
          💡 Tip: You can manually submit this hex at{" "}
          <a
            href="https://pool.marathondigital.com/submit"
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-purple-200 transition-colors"
          >
            pool.marathondigital.com
          </a>
        </p>
      </div>
    </div>
  );
}
