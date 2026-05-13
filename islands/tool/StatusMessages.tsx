/* ===== STATUS MESSAGES ===== */
/*@baba-move file*/
import { container1 } from "$layout";
import type { StatusMessagesProps } from "$types/ui.d.ts";

export function StatusMessages({
  submissionMessage,
  apiError,
  fileUploadError,
  walletError,
  maraError,
  transactionHex,
  onCopyHex,
}: StatusMessagesProps) {
  // Handle different submissionMessage types
  const messageText = typeof submissionMessage === "string"
    ? submissionMessage
    : submissionMessage?.message || "";

  const txid = typeof submissionMessage === "object"
    ? submissionMessage?.txid
    : undefined;

  // Only render submission message if there's actual content
  const hasSubmissionMessage = !!messageText;

  return (
    <>
      {hasSubmissionMessage && (
        <div
          class={`w-full mt-4 ${container1} bg-gradient-to-br from-green-900/15 to-green-800/25 border-green-500/20 p-4`}
        >
          <p class="text-green-400 text-center font-medium">{messageText}</p>
          {txid && (
            <div class="overflow-x-auto mt-2" style={{ maxWidth: "100%" }}>
              <span class="text-green-300">TXID:&nbsp;</span>
              <a
                href={`https://mempool.space/tx/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                class="text-green-400 underline whitespace-nowrap hover:text-green-300 transition-colors"
              >
                {txid}
              </a>
            </div>
          )}
        </div>
      )}
      {apiError && (
        <div
          class={`w-full mt-4 ${container1} bg-gradient-to-br from-red-900/15 to-red-800/25 border-red-500/20 p-4`}
        >
          <div class="flex items-center justify-center gap-3">
            <p class="text-red-400 text-center font-medium">{apiError}</p>
            {transactionHex && onCopyHex && (
              <button
                type="button"
                onClick={onCopyHex}
                class="flex items-center gap-1 px-2 py-1 rounded-2xl bg-red-500/20 hover:bg-red-500/30 transition-colors group"
                title="Copy transaction hex"
              >
                <svg
                  class="w-4 h-4 fill-red-300 group-hover:fill-red-200"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
                <span class="text-xs text-red-300 group-hover:text-red-200">
                  Copy Hex
                </span>
              </button>
            )}
          </div>
        </div>
      )}
      {fileUploadError && (
        <div
          class={`w-full mt-4 ${container1} bg-gradient-to-br from-yellow-900/15 to-yellow-800/25 border-yellow-500/20 p-4`}
        >
          <p class="text-yellow-400 text-center font-medium">
            {fileUploadError}
          </p>
        </div>
      )}
      {walletError && (
        <div
          class={`w-full mt-4 ${container1} bg-gradient-to-br from-red-900/15 to-red-800/25 border-red-500/20 p-4`}
        >
          <p class="text-red-400 text-center font-medium">{walletError}</p>
        </div>
      )}
      {maraError && !apiError && (
        <div
          class={`w-full mt-4 ${container1} bg-gradient-to-br from-purple-900/15 to-purple-800/25 border-purple-500/20 p-4`}
        >
          <p class="text-purple-400 text-center font-medium">
            MARA Service: {maraError}
          </p>
        </div>
      )}
    </>
  );
}
