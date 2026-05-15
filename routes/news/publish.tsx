import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { body } from "$layout";
import PublishPortalIsland from "$islands/news/PublishPortal.tsx";

export const handler: Handlers = {
  GET(req, ctx) {
    return ctx.render();
  },
};

export default function PublishPage() {
  return (
    <div class={`${body} min-h-screen bg-black text-slate-200 mt-4 mb-10`}>
      <Head>
        <title>Publish | Stamp News Network</title>
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
          <h1 class="font-mono text-xl md:text-2xl font-bold tracking-tight text-orange-500 hover:text-orange-400 transition-colors">
            <a href="/news">
              SNN<span class="text-slate-500 font-light">TERMINAL</span>
            </a>
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
            class="text-orange-400 uppercase tracking-wider"
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

      <div class="max-w-4xl mx-auto flex flex-col gap-6 w-full">
        {/* Info Banner */}
        <div class="bg-blue-900/20 border border-blue-500/30 p-4 font-mono text-sm text-blue-300">
          <strong class="text-blue-400 uppercase tracking-widest block mb-2">
            Protocol Publishing
          </strong>
          Stamp News Network acts purely as a protocol indexer. To broadcast
          immutable news, you will formulate a standard Counterparty broadcast
          linking your reporting. No central entity can censor or alter these
          messages once confirmed on the Bitcoin network.
        </div>

        <PublishPortalIsland />
      </div>
    </div>
  );
}
