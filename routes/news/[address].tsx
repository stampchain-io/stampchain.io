import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { NewsController } from "$server/controller/newsController.ts";
import { body } from "$layout";
import {
  type Broadcast,
  BroadcastCard,
} from "$components/news/BroadcastCard.tsx";

export const handler: Handlers = {
  async GET(req, ctx) {
    const address = ctx.params.address;

    const [publisherResult, broadcastsResult] = await Promise.all([
      NewsController.handlePublisherRequest(address),
      NewsController.handleBroadcastsRequest({
        source_address: address,
        limit: 50,
        page: 1,
      }),
    ]);

    return ctx.render({
      publisher: publisherResult.data || { address },
      lastBlock: publisherResult.last_block || 0,
      broadcasts: broadcastsResult.data || [],
    });
  },
};

export default function PublisherPage({ data, url }: PageProps) {
  const { publisher, lastBlock, broadcasts } = data;

  return (
    <div class={`${body} min-h-screen bg-black text-slate-200 mt-4 mb-10`}>
      <Head>
        <title>
          {publisher.src101_domain || publisher.address} | SNN Terminal
        </title>
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
            class="hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            Live Feed
          </a>
          <a
            href="/news/publish"
            class="hover:text-orange-400 transition-colors uppercase tracking-wider"
          >
            Publish
          </a>
        </nav>
      </div>

      <div class="max-w-4xl mx-auto flex flex-col gap-6 w-full">
        {/* Profile Header Block */}
        <div class="bg-slate-900/50 border border-slate-800 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
          {/* Avatar Placeholder */}
          <div class="w-24 h-24 min-w-[6rem] bg-black border border-slate-700 flex items-center justify-center font-mono text-3xl text-orange-500/50 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
            {publisher.src101_domain?.[0].toUpperCase() || "P"}
          </div>

          <div class="flex-1 flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-bold font-mono text-slate-100 uppercase tracking-tighter break-all">
                {publisher.src101_domain || "Unverified Publisher"}
              </h1>

              {publisher.src101_domain && (
                <span class="border border-green-500 text-green-500 bg-green-500/10 text-[10px] px-2 py-0.5 uppercase tracking-widest inline-block">
                  ✓ SRC-101 VERIFIED
                </span>
              )}

              {publisher.is_locked === 1
                ? (
                  <span class="border border-orange-500 text-orange-500 bg-orange-500/10 text-[10px] px-2 py-0.5 uppercase tracking-widest inline-block">
                    🔒 IMMUTABLE SECURED
                  </span>
                )
                : (
                  <span class="border border-slate-500 text-slate-400 bg-slate-500/10 text-[10px] px-2 py-0.5 uppercase tracking-widest inline-block">
                    ACTIVE (UNLOCKED)
                  </span>
                )}
            </div>

            <div class="flex items-center gap-2 mt-2 font-mono text-xs text-slate-400">
              <span class="text-slate-600">ADDR:</span>
              <span class="bg-black px-2 py-1 border border-slate-800 font-mono text-slate-300 break-all select-all">
                {publisher.address}
              </span>
            </div>
          </div>
        </div>

        {/* Publisher Feed */}
        <div class="mt-4">
          <h2 class="text-orange-500 font-mono text-sm tracking-widest uppercase mb-4 border-b border-slate-800/50 pb-2 flex items-center justify-between">
            <span>PUBLISHER FEED</span>
            <span class="text-slate-600 font-mono text-[10px]">
              VERIFIED AT BLOCK {lastBlock}
            </span>
          </h2>

          <div class="flex flex-col gap-4">
            {broadcasts.length > 0
              ? (
                broadcasts.map((b: Broadcast) => (
                  <BroadcastCard key={b.tx_hash} broadcast={b} />
                ))
              )
              : (
                <div class="text-center py-12 text-slate-500 font-mono border border-slate-800 border-dashed">
                  No active broadcasts.
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
