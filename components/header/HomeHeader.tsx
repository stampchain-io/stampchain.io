import { containerBackground } from "$layout";
import type { BrandChain } from "$lib/utils/chain/brand.ts";
import { ECX_FORK_BLOCK } from "$lib/utils/chain/ecxView.ts";
import { ComponentChildren } from "preact";

function TitleText({
  children,
  class: className = "",
}: {
  children: ComponentChildren;
  class?: string;
}) {
  return (
    <span
      class={`
        font-montserrat
        bg-clip-text text-transparent
        whitespace-normal mobileLg:whitespace-nowrap inline-block
        ${className}
      `}
      style="filter: drop-shadow(0.05em 0.05em 0.05em rgba(0, 0, 0, 0.75));"
    >
      {children}
    </span>
  );
}

/* ===== ECX: eSTAMPS BY STAMPCHAIN ===== */
function EstampsHomeHeader() {
  return (
    <header
      class={`relative overflow-hidden flex flex-col items-center justify-center ${containerBackground} estamps-hero`}
    >
      <div class="absolute inset-0 z-0">
        <img
          src="/img/components/stamps-collage-1920.webp"
          alt=""
          width={1920}
          height={1280}
          fetchpriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div class="absolute inset-0 estamps-hero__shade" />
      </div>
      <div class="relative z-10 estamps-hero__body">
        <h1 class="estamps-hero__title">
          <span class="estamps-hero__mark">
            <span class="estamps-hero__e">e</span>STAMPS
          </span>
          <span class="estamps-hero__by">by Stampchain</span>
        </h1>
        <p class="estamps-hero__lead">
          Unprunable art and SRC-20 tokens, stamped on ECX.
        </p>
        <p class="estamps-hero__note">
          ECX-native stamps start at block{" "}
          {ECX_FORK_BLOCK.toLocaleString("en-US")}. Earlier stamps are history
          ECX inherited from Bitcoin.
        </p>
      </div>
    </header>
  );
}

export function HomeHeader(
  { chain = "bitcoin" }: { chain?: BrandChain } = {},
) {
  if (chain === "ecx") return <EstampsHomeHeader />;
  return (
    <header
      class={`
        relative overflow-hidden
        flex flex-col items-center justify-center
        ${containerBackground} h-[420px] tablet:h-[520px]
        gap-1.5 mobileMd:gap-3 mobileLg:gap-[18px]
      `}
    >
      {/* ===== BACKGROUND IMAGE with dark overlay gradient (top -> bottom) ===== */}
      <div class="absolute inset-0 z-0">
        <img
          src="/img/components/stamps-collage-1920.webp"
          alt=""
          width={1920}
          height={1280}
          fetchpriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-color-neutral-950/95 via-color-neutral-900/70 to-color-neutral-1000/90" />
      </div>

      <div class="
          relative z-10
          w-[clamp(21rem,80vw,61rem)]
          flex flex-col justify-center leading-[1]
        ">
        <h1 class="text-center">
          <TitleText class="
              font-black
              bg-gradient-to-r color-neutral-gradient
              text-[clamp(1.375rem,5vw,2.75rem)]
            ">
            UNPRUNABLE{" "}
            <span class="bg-gradient-to-l color-primary-gradient">
              UTXO ART
            </span>
          </TitleText>
          <br />
          <TitleText class="
              font-bold
              bg-gradient-to-r color-neutral-gradient
              uppercase
              text-[clamp(1.125rem,4vw,2rem)]
            ">
            BECAUSE SATS DON'T EXIST
          </TitleText>
        </h1>
      </div>

      <h3 class="
          relative z-10 mx-auto
          w-[clamp(19.375rem,80vw,34.375rem)]
          font-normal text-center text-color-neutral-200
          text-[clamp(0.8125rem,2vw,0.9375rem)]
          leading-[1.3]
        ">
        Welcome to the forefront of digital collectibles, where each stamp is a
        unique piece of art intertwined with the immutability of the blockchain.
      </h3>
    </header>
  );
}
