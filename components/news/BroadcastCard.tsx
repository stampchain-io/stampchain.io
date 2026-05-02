export interface Broadcast {
  tx_hash: string;
  source_address: string;
  text: string;
  value: number;
  block_index: number;
  block_time: string;
  is_locked: number;
  src101_domain?: string;
}

export function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  let content = { title: "", body: broadcast.text };
  let isJson = false;

  try {
    const parsed = JSON.parse(broadcast.text);
    if (parsed.title || parsed.body) {
      content = { title: parsed.title, body: parsed.body };
      isJson = true;
    }
  } catch (e) {
    // Valid text broadcast, continue parsing linearly
  }

  const timeStr = new Date(broadcast.block_time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = new Date(broadcast.block_time).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div class="bg-black border border-slate-800 overflow-hidden group hover:border-orange-500/50 transition-colors w-full mb-4 font-sans text-slate-200">
      <div class="flex flex-col sm:flex-row">
        {/* Timeline / Metadata Gutter */}
        <div class="sm:w-32 bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-800 p-3 sm:p-4 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1 font-mono">
          <div class="text-orange-500 text-sm">{timeStr}</div>
          <div class="text-slate-500 text-xs">{dateStr}</div>
          <div class="hidden sm:block mt-4 text-slate-600 text-[10px] break-all leading-tight">
            BLK {broadcast.block_index}
          </div>
        </div>

        {/* Main Content Area */}
        <div class="flex-1 p-4 sm:p-5 flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-4">
            <a
              href={`/news/${broadcast.source_address}`}
              class="font-mono text-xs text-orange-400 hover:text-orange-300 transition-colors uppercase truncate flex items-center gap-2"
            >
              {broadcast.src101_domain || broadcast.source_address}
              {broadcast.src101_domain && (
                <span class="text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 px-1 py-0.5 rounded-sm" title="SRC-101 Verified">✓</span>
              )}
            </a>
            {broadcast.is_locked === 1 && (
              <span class="border border-orange-500 text-orange-500 bg-orange-500/10 uppercase text-[10px] px-2 py-0.5 inline-block">
                LOCKED
              </span>
            )}
          </div>

          <div class="font-sans">
            {content.title && (
              <h3 class="text-lg font-bold text-slate-200 mb-2">
                {content.title}
              </h3>
            )}
            <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {content.body}
            </p>
          </div>

          <div class="mt-2 text-slate-600 font-mono text-[10px] flex items-center justify-between">
            <a
              href={`https://xchain.io/tx/${broadcast.tx_hash}`}
              target="_blank"
              class="truncate max-w-[200px] hover:text-orange-500 cursor-pointer transition-colors"
              title={broadcast.tx_hash}
            >
              TX: {broadcast.tx_hash.substring(0, 12)}...
            </a>
            <span>{isJson ? "JSON" : "TEXT"} PARSED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
