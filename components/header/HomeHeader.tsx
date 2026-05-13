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

export function HomeHeader() {
  return (
    <header class="
      flex flex-col items-center justify-center
      gap-1.5 mobileMd:gap-3 mobileLg:gap-[18px]
      w-full
      h-[220px] tablet:h-[250px]
      mt-0 mb-6
      relative overflow-visible
    ">
      <div class="
          w-[336px]
          min-[420px]:w-[376px]
          mobileMd:w-[520px]
          mobileLg:w-[720px]
          tablet:w-[976px]
          flex flex-col justify-center
          relative
        ">
        <h1 class="text-center">
          <TitleText class="
              font-black
              bg-gradient-to-r color-neutral-gradient
              text-2xl
              min-[420px]:text-3xl
              mobileMd:text-4xl
              mobileLg:text-5xl
              tablet:text-5xl
              desktop:text-5xl
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
              text-xl
              min-[420px]:text-2xl
              mobileMd:text-3xl
              mobileLg:text-4xl
              tablet:text-4xl
              -mt-1
              tablet:mt-0
            ">
            BECAUSE SATS DON'T EXIST
          </TitleText>
        </h1>
      </div>

      <h3 class="
          mx-auto
          w-full
          max-w-[310px]
          text-center
          font-normal
          text-color-grey-light
          text-base
          mobileLg:text-xl
          mobileMd:max-w-[380px]
          mobileLg:max-w-[515px]
          tablet:max-w-[550px]
        ">
        Welcome to the forefront of digital collectibles, where each stamp is a
        unique piece of art intertwined with the immutability of the blockchain.
      </h3>
    </header>
  );
}
