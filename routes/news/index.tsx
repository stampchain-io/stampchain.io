import { Handlers } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { NewsController } from "$server/controller/newsController.ts";
import { body } from "$layout";
import {
  type Broadcast,
  BroadcastCard,
} from "$components/news/BroadcastCard.tsx";

export const handler: Handlers = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const result = await NewsController.handleBroadcastsRequest({
      page,
      limit: 50,
    });

    return ctx.render({
      broadcasts: result.data || [],
      totalPages: result.totalPages || 1,
      page: result.page || 1,
      total: result.total || 0,
      lastBlock: result.last_block || 0,
    });
  },
};

export default function NewsIndex({ data }: any) {
  const { broadcasts, total, lastBlock } = data;

  return (
    <div class={`${body} min-h-screen bg-black text-slate-200 mt-4 mb-10`}>
      <Head>
        <title>SNN Terminal | Stamp News Network</title>
        {/* Enforce dark terminal body overrides specifically for news section */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { background-color: #000 !important; color: #e2e8f0; }
        `,
          }}
        />
      </Head>

      <div class="flex items-center justify-between mb-8 border-b border-orange-500/30 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-orange-500 animate-pulse rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          <h1 class="font-mono text-xl md:text-2xl font-bold tracking-tight text-orange-500">
            SNN<span class="text-slate-500 font-light">TERMINAL</span>
          </h1>
        </div>
        <nav class="flex items-center gap-4 md:gap-6 text-sm font-mono text-slate-400">
          <a
            href="/news"
            class="text-orange-400 font-bold uppercase tracking-wider"
          >
            Live Feed
          </a>
          <a
            href="/news/publish"
            class="hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            Publish
          </a>
          <a
            href="/news/profile/me"
            class="hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            My Profile
          </a>
        </nav>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Market Context or Filters */}
        <div class="hidden lg:flex flex-col gap-4 col-span-1 border-r border-slate-800 pr-6">
          <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase mb-2 border-b border-orange-500/30 pb-2">
            Filter Feed
          </h2>
          <div class="flex flex-col gap-2 font-mono text-xs">
            <button class="text-left text-orange-400 bg-orange-500/10 px-3 py-2 border border-orange-500/20 uppercase">
              Global Top
            </button>
            <button class="text-left text-slate-400 hover:bg-slate-900 px-3 py-2 border border-transparent hover:border-slate-800 uppercase transition-colors">
              Locked / Verified Only
            </button>
          </div>

          <div class="mt-8">
            <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase mb-2 border-b border-orange-500/30 pb-2">
              Network Stat
            </h2>
            <div class="flex justify-between items-center text-xs font-mono mb-1">
              <span class="text-slate-500">Block Height:</span>
              <span class="text-slate-300">{lastBlock}</span>
            </div>
            <div class="flex justify-between items-center text-xs font-mono mb-1">
              <span class="text-slate-500">SNN Txs:</span>
              <span class="text-slate-300">{total}</span>
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <div class="col-span-1 lg:col-span-3 flex flex-col">
          <div class="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase flex items-center gap-2">
              Live Broadcasts
            </h2>
            <span class="text-xs font-mono text-slate-500">
              AUTO-SYNC: <span class="text-green-500">ON</span>
            </span>
          </div>

          <div class="flex flex-col gap-4 flex-1">
            {broadcasts.length > 0
              ? (
                broadcasts.map((b: Broadcast) => (
                  <BroadcastCard key={b.tx_hash} broadcast={b} />
                ))
              )
              : (
                <div class="text-center py-12 text-slate-500 font-mono border border-slate-800 border-dashed">
                  Waiting for incoming broadcasts on block {lastBlock}...
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
