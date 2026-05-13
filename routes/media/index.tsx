/* ===== MEDIA PAGE ===== */
/* TODO @baba: Refactor the page and create island components for each section  - similar to About page */
import { Button } from "$button";
import {
  body,
  containerBackground,
  containerGap,
  container1,
} from "$layout";
import {
  headingGreyLDLink,
  subtitleNeutral,
  text,
  textLg,
  titleNeutralLD,
} from "$text";

/* ===== PAGE COMPONENT ===== */
export default function MediaPage() {
  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      {/* ===== INTRODUCTION SECTION ===== */}
      <section class={containerBackground}>
        <div class={`flex flex-col w-full`}>
          <h1 class={titleNeutralLD}>Media Matters</h1>
          <h2 class={subtitleNeutral}>Stamp Mentions</h2>
          <p class={textLg}>
            Explore the world of Bitcoin Stamps with our curated list of news
            coverage, in-depth articles, reports and video podcasts.
          </p>
          <p class={textLg}>
            We share articles worthwhile reading. From technical deep-dives into
            the protocol, ecosystem formats and lingo explainers, to all things
            stamp art. Catch up on the most important news coverage, or watch
            Mike in Space share his vision behind stamps, break down the
            technology and offer unique insights on what the future holds.
          </p>
          <p class={text}>
            Stay informed by regularly checking back. We're constantly adding
            new interviews and articles about the space.
          </p>
        </div>
      </section>

      {/* ===== INTERVIEWS SECTION ===== */}
      <section class={`flex flex-col ${container1} p-5`}>
        <h1 class={titleNeutralLD}>Interviews</h1>
        <div
          class={`grid grid-cols-1 mobileLg:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          {/* ===== RICE TVX INTERVIEW ===== */}
          <div class={`flex flex-col`}>
            <h2 class={subtitleNeutral}>Rice TVX</h2>
            <div class="relative w-full pt-[56.25%]">
              <iframe
                class="absolute top-0 left-0 w-full h-full pb-3 mobileMd:pb-6"
                src="https://www.youtube.com/embed/zwzi0qsd3sg"
                title="Rice TVX"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p class={text}>
              On this episode, I am joined by Mike In Space! He is the creator
              of Bitcoin Stamps & the SRC-20 protocol.
            </p>
            <p class={text}>
              I invited him on to learn more about him & all things Stamp. Mike
              refers to Stamps & SRC-20 as an art experiment that allows for the
              creation of NFTs, memecoins, & more on the Bitcoin blockchain. We
              talk about that, Ordinals, BRC-20 tokens, LTC-20 tokens,
              Counterparty, more potential experiments on Bitcoin, plus
              everything in between!
            </p>
          </div>

          {/* ===== WAGE CUCKING INTERVIEW ===== */}
          <div class={`flex flex-col`}>
            <h2 class={subtitleNeutral}>Wage Cucking</h2>
            <div class="relative w-full pt-[56.25%]">
              <iframe
                class="absolute top-0 left-0 w-full h-full pb-3 mobileMd:pb-6"
                src="https://www.youtube.com/embed/jJV_-EFZshU"
                title="WAGE CUCKING"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p class={text}>
              This week Jmo and Andreas were joined by the creator of Bitcoin
              STAMPS, Mike In Space!
            </p>
            <p class={text}>
              Tune in for the lowdown on STAMPS, and how it compares to Ordinals
              and Ethereum. Plus, why Mike thinks they will live on the
              blockchain for hundreds of years to come. This is an episode you
              don't want to miss!
            </p>
          </div>

          {/* ===== UNIVERSE INTERVIEW ===== */}
          <div class={`flex flex-col`}>
            <h2 class={subtitleNeutral}>Universe</h2>
            <div class="relative w-full pt-[56.25%]">
              <iframe
                class="absolute top-0 left-0 w-full h-full pb-3 mobileMd:pb-6"
                src="https://www.youtube.com/embed/y07GjM0DqYs?si=bSAG-uFvhjMsSLtc"
                title="The Origin of Bitcoin Stamps"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p class={text}>
              Curious about the story behind Bitcoin Stamps?
            </p>
            <p class={text}>
              Join us for an exclusive episode of "Guess Who's Coming to the
              Universe" as special guest @mikeinspace shares the origins and
              vision that sparked the creation of Stamps! From inspiration to
              innovation, he takes us through the journey of building secure,
              transferable digital artifacts on Bitcoin.
            </p>
            <p class={text}>
              Don't miss this deep dive into all things Stamps and what's next
              in the Bitcoin collectible space!
            </p>
          </div>
        </div>
      </section>

      {/* ===== NEWS SECTION ===== */}
      <section>
        <div class={containerBackground}>
          <h1 class={titleNeutralLD}>In the News</h1>
          <h2 class={subtitleNeutral}>Breaking Stories</h2>
          {/* ===== NEWS ARTICLES LIST ===== */}
          <div class={`flex flex-col min-[940px]:flex-row ${containerGap}`}>
            <div class="flex flex-col w-full min-[940px]:w-1/2">
              <p class={text}>
                BINANCE
                <br />
                <a
                  href="https://academy.binance.com/en/articles/what-are-bitcoin-stamps"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT ARE BITCOIN STAMPS
                </a>
              </p>
              <p class={text}>
                YAHOO FINANCE
                <br />
                <a
                  href="https://finance.yahoo.com/video/project-bitcoin-stamps-renews-debate-164902188.html?guccounter=1"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  RENEWED DEBATE OVER BITCOIN NFTS
                </a>
              </p>
              <p class={text}>
                BINGX
                <br />
                <a
                  href="https://blog.bingx.com/bingx-insights/a-dive-into-bitcoin-stamps/"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  A DIVE INTO BITCOIN STAMPS
                </a>
              </p>
              <p class={text}>
                HACKERNOON
                <br />
                <a
                  href="https://hackernoon.com/what-are-bitcoin-stamps"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT ARE BITCOIN STAMPS
                </a>
              </p>
              <p class={text}>
                COINMARKETCAP
                <br />
                <a
                  href="https://coinmarketcap.com/community/articles/6554749e8f19ea588322c1ae/"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  BITCOIN STAMPS VS ORDINALS
                </a>
              </p>
            </div>
            <div class="flex flex-col w-full -mt-1 mobileMd:-mt-2 mobileLg:-mt-4 tablet:-mt-7 min-[940px]:mt-0
                          min-[940px]:w-1/2 min-[940px]:justify-end min-[940px]:pt-0 min-[940px]:text-right">
              <p class={`${text} min-[940px]:text-color-grey-semidark`}>
                M2
                <br />
                <a
                  href="https://explore.m2.com/learn/what-are-bitcoin-stamps"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT ARE BITCOIN STAMPS
                </a>
              </p>
              <p class={`${text} min-[940px]:text-color-grey-semidark`}>
                GATE
                <br />
                <a
                  href="https://www.gate.io/learn/articles/what-are-bitcoin-stamps-and-src-20/1006"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT ARE BITCOIN STAMPS AND SRC-20
                </a>
              </p>
              <p class={`${text} min-[940px]:text-color-grey-semidark`}>
                BITCOIN.COM
                <br />
                <a
                  href="https://news.bitcoin.com/study-src20-protocols-unmatched-data-permanence-makes-it-a-superior-choice-over-brc20-and-runes/"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  UNMATCHED DATA PERMANENCE
                </a>
              </p>
              <p class={`${text} min-[940px]:text-color-grey-semidark`}>
                OKX
                <br />
                <a
                  href="https://www.okx.com/learn/what-is-src20-spurring-innovation-in-bitcoin-ecosystem"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT IS SRC-20
                </a>
              </p>
              <p class={`${text} min-[940px]:text-color-grey-semidark`}>
                COIN CODEX
                <br />
                <a
                  href="https://coincodex.com/article/44872/src-20-tokens/"
                  target="_blank"
                  class={`${headingGreyLDLink} -mt-1`}
                >
                  WHAT ARE SRC-20 TOKENS
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== REPORTS SECTION ===== */}
      <section class={containerBackground}>
        <h1 class={titleNeutralLD}>Reports</h1>
        <div class="flex flex-col mobileLg:flex-row gap-3 mobileMd:gap-6 mobileLg:gap-9 desktop:gap-12">
          {/* ===== SQRR DEEP DIVE ===== */}
          <div
            class={`flex flex-col w-full mobileLg:w-2/3 ${text}`}
          >
            <h2 class={subtitleNeutral}>SQRR - Deep Dive</h2>
            <p>
              Stamps is a blockchain protocol created by MikeInSpace that
              enables storing images on-chain on Bitcoin transaction outputs.
            </p>
            <p>
              It utilizes the Counterparty platform, a longstanding Bitcoin meta
              layer, to broadcast Stamping transactions to the Bitcoin Network.
              In addition, using a Counterparty ...
            </p>
            <div>
              <Button
                variant="outline"
                color="grey"
                size="mdR"
                href="https://sqrr.xyz/reports/docs/4/1/Stamps%20Protocol_Final_17_May_2023.pdf"
                target="_blank"
              >
                DOWNLOAD
              </Button>
            </div>
          </div>

          {/* ===== INSIGHTS REPORT ===== */}
          <div class="flex flex-col w-full mobileLg:w-1/3 mobileLg:text-right">
            <h2 class={subtitleNeutral}>Insights</h2>
            <p class={text}>
              <b>Detailed monthly reports about Bitcoin Stamps.</b>
              <br />
              A comprehensive research into the usage of the Stamps protocol,
              with multiple stats and illustrative charts.
            </p>
            <div class="flex justify-start mobileLg:justify-end">
              <Button
                variant="outline"
                color="grey"
                size="mdR"
                href="https://sqrr.xyz/reports/"
                target="_blank"
              >
                READ
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
