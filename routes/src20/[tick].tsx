/* ===== SRC20 DETAIL PAGE ===== */
import { Handlers } from "$fresh/server.ts";
import { SRC20DetailHeader } from "$islands/header/index.ts";
import ChartWidget from "$islands/layout/ChartWidget.tsx";
import { body, containerGap } from "$layout";
import {
  DEV_DUMMY_MODE,
  DUMMY_TOKEN_DETAIL_PAGE,
  withTimeout,
} from "$lib/utils/devDummyData.ts";
import { Src20Controller } from "$server/controller/src20Controller.ts";
import { DetailsTableBase, HoldersTable } from "$table";
import type { ProcessedHolder } from "$types/wallet.d.ts";

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(_req, ctx) {
    if (DEV_DUMMY_MODE) {
      return await ctx.render(DUMMY_TOKEN_DETAIL_PAGE);
    }
    try {
      /* ===== TOKEN IDENTIFICATION ===== */
      const rawTick = ctx.params.tick;
      const decodedTick = decodeURIComponent(rawTick);
      const encodedTick = encodeURIComponent(rawTick);

      /* ===== SERVER-SIDE DATA FETCHING ===== */
      const [body, transferCount, mintCount, combinedListings] =
        await withTimeout(
          Promise.all([
            Src20Controller.fetchSrc20TickPageData(decodedTick),
            // 🚀 SERVER-SIDE: Use controller directly instead of HTTP fetch
            Src20Controller.getTickData({
              tick: decodedTick,
              limit: 1,
              page: 1,
              op: "TRANSFER",
            }).then((result) => ({ total: result.total })),
            // 🚀 SERVER-SIDE: Use controller directly instead of HTTP fetch
            Src20Controller.getTickData({
              tick: decodedTick,
              limit: 1,
              page: 1,
              op: "MINT",
            }).then((result) => ({ total: result.total })),
            // 🚀 EXTERNAL API: Keep external call but with better error handling
            fetch(
              `https://api.stampscan.xyz/utxo/combinedListings?tick=${encodedTick}`,
            ).then((r) => r.ok ? r.json() : []).catch(() => []),
          ]),
          15000,
        );

      if (!body) {
        return ctx.renderNotFound();
      }
      /* @fullman */
      const highchartsData = combinedListings.map((
        item: any,
        _index: number,
      ) => [
        new Date(item.date).getTime(),
        item.unit_price_btc * 100000000, // Convert BTC to sats
      ]).sort((a: any, b: any) => a[0] - b[0]);

      /* ===== RESPONSE FORMATTING ===== */
      body.initialCounts = {
        totalTransfers: transferCount.total || 0,
        totalMints: mintCount.total || 0,
      };
      body.highcharts = highchartsData || [];

      return await ctx.render(body);
    } catch (error) {
      console.error("Error in SRC20 detail page:", error);
      if ((error as Error).message?.includes("not found")) {
        return ctx.renderNotFound();
      }
      return await ctx.render(DUMMY_TOKEN_DETAIL_PAGE);
    }
  },
};

/* ===== TYPES ===== */
interface SRC20DetailPageData {
  deployment: any;
  holders: ProcessedHolder[];
  mint_status: any;
  total_mints: number;
  total_transfers: number;
  marketInfo?: any;
  highcharts?: any[];
  error?: string;
}

/* ===== PAGE COMPONENT ===== */
function SRC20DetailPage(props: { data: SRC20DetailPageData }) {
  /* ===== ERROR HANDLING ===== */
  if ("error" in props.data) {
    return (
      <div class="text-center text-red-500">
        {props.data.error}
      </div>
    );
  }

  const {
    deployment,
    holders,
    mint_status,
    total_mints,
    total_transfers,
    marketInfo,
    highcharts,
  } = props.data;

  const tick = deployment.tick;

  /* ===== TABLE CONFIGURATION ===== */
  const tableConfigs = [
    { id: "mints", label: "MINTS" },
    { id: "transfers", label: "TRANSFERS" },
  ];

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      <SRC20DetailHeader
        deployment={deployment}
        _mintStatus={mint_status}
        _totalMints={total_mints}
        _totalTransfers={total_transfers}
        {...(marketInfo && { marketInfo })}
      />
      <ChartWidget
        type="line"
        data={highcharts || []}
        fromPage="src20"
        tick={tick}
      />
      <HoldersTable
        holders={holders.map((h) => ({
          address: h.address,
          quantity: h.amt,
          divisible: false, // SRC20 tokens are not divisible
          amt: h.amt,
          percentage: h.percentage,
        }))}
      />
      <DetailsTableBase
        type="src20"
        configs={tableConfigs}
        tick={tick}
      />
    </div>
  );
}
export default SRC20DetailPage;
