/* ===== HOW-TO PAGE ===== */
import { body, containerBackground, containerGap } from "$layout";
import { headingGrey, subtitleNeutral, text, textLg, titleNeutralLD } from "$text";

/* ===== PAGE COMPONENT ===== */
export default function HowToPage() {
  return (
    <div class={`${body} ${containerGap}`}>
      {/* ===== INTRODUCTION SECTION ===== */}
      <section class={containerBackground}>
        <h1 class={titleNeutralLD}>How-To</h1>
        <h2 class={subtitleNeutral}>Our step-by-step guides</h2>
        <p class={textLg}>
          <b>
            Explore our comprehensive How-To section, where you'll find
            step-by-step guides for the most popular features on our platform.
          </b>
          <br />
          Whether you're a beginner or a pro, these guides will help you make
          the most out of every tool we offer.
        </p>
        <p class={text}>
          Need help with something that's not covered? Let us know!
          <br />
          Reach out to us, and we'll be happy to create new how-tos based on
          your suggestions.
        </p>
      </section>

      {/* ===== LEATHER WALLET CREATION GUIDE ===== */}
      <section class={containerBackground}>
        <div
          class={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          <img
            src="/img/how-tos/createleatherwallet/00.png"
            width="100%"
            alt="Create, setup and install Bitcoin Leather wallet"
            class="rounded-2xl"
          />
          <div class="flex flex-col desktop:col-span-2 gap-2">
            <h2 class={`${headingGrey} mb-2`}>Create a Leather wallet</h2>
            <p class={text}>
              New to Bitcoin, Stamps, wallets and all the other fancy
              lingo?<br />
              No worries! We've got you covered.
            </p>
            <p class={text}>
              <a
                href="/howto/leathercreate"
                f-partial="/howto/leathercreate"
                class="animated-underline mb-1.5"
              >
                Start your stamps journey by creating a Leather wallet
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== LEATHER WALLET CONNECTION GUIDE ===== */}
      <section class={containerBackground}>
        <div
          class={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          <img
            src="/img/how-tos/connectleatherwallet/00.png"
            width="100%"
            alt="Connect your Bitcoin Leather wallet to the Stampchain website"
            class="block tablet:order-last rounded-2xl"
          />
          <div class="flex flex-col desktop:col-span-2 gap-2">
            <h2 class={`${headingGrey} mb-2`}>Connect your Leather wallet</h2>
            <p class={text}>
              To create and buy stamps, deploy, mint and transfer tokens or
              interact with the Stamps protocol, you need to connect and verify
              with your Leather wallet.
            </p>
            <p class={text}>
              <a
                href="/howto/leatherconnect"
                f-partial="/howto/leatherconnect"
                class="animated-underline mb-1.5"
              >
                Learn how connect your Leather wallet to stampchain.io
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== TOKEN DEPLOYMENT GUIDE ===== */}
      <section class={containerBackground}>
        <div
          class={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          <img
            src="/img/how-tos/deploy/00.png"
            width="100%"
            alt="Deploy a SRC-20 token on Bitcoin"
            class="rounded-2xl"
          />
          <div class="flex flex-col desktop:col-span-2 gap-2">
            <h2 class={`${headingGrey} mb-2`}>Deploy your own token</h2>
            <p class={text}>
              To deploy a SRC-20 token, you need to stamp the transaction on
              Bitcoin with the token's supply and metadata. This makes the token
              immutable and secured by Bitcoin's blockchain.
            </p>
            <p class={text}>
              <a
                href="/howto/deploytoken"
                f-partial="/howto/deploytoken"
                class="animated-underline mb-1.5"
              >
                Read how to deploy your very own SRC-20 token
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== TOKEN MINTING GUIDE ===== */}
      <section class={containerBackground}>
        <div
          class={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          <img
            src="/img/how-tos/mintsrc20/00.png"
            width="100%"
            alt="How to mint a SRC-20 Bitcoin stamps token"
            class="block tablet:order-last rounded-2xl"
          />
          <div class="flex flex-col desktop:col-span-2 gap-2">
            <h2 class={`${headingGrey} mb-2`}>Mint your token</h2>
            <p class={text}>
              After deploying a token, anyone can mint SRC-20 tokens based on
              the initial supply set in the contract.
            </p>
            <p class={text}>
              <a
                href="/howto/minttoken"
                f-partial="/howto/minttoken"
                class="animated-underline mb-1.5"
              >
                Learn how to mint a SRC-20 token
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== CREATE A STAMP GUIDE ===== */}
      <section class={containerBackground}>
        <div
          class={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 ${containerGap}`}
        >
          <img
            src="/img/how-tos/stamping/00.png"
            width="100%"
            alt="Guide on how to create NFTs on Bitcoin using the stamps protocol"
            class="rounded-2xl"
          />
          <div class="flex flex-col desktop:col-span-2 gap-2">
            <h2 class={`${headingGrey} mb-2`}>Create a stamp</h2>
            <p class={text}>
              Store your art permanently on Bitcoin - the most resilient
              blockchain in the world.<br />
              With our state of the art stamping tools, we've made it smooth and
              simple for you to immortalize your art on Bitcoin.
            </p>
            <p class={text}>
              <a
                href="/howto/stamp"
                f-partial="/howto/stamp"
                class="animated-underline mb-1.5"
              >
                Time to get stamping !
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
