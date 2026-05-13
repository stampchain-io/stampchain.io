/* ===== RECURSIVE CONTACT CTA COMPONENT ===== */
import { Button } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, text } from "$text";

/* ===== COMPONENT ===== */
export const RecursiveContactCta = () => {
  /* ===== RENDER ===== */
  return (
    <>
      {/* ===== CONTENT SECTION ===== */}
      <div class={`${containerBackground} mt-6 mobileLg:mt-12`}>
        <h4 class={subtitleNeutral}>
          RECURSIVE LAYERING
        </h4>
        <div
          class={`flex flex-col mobileLg:flex-row gap-6 tablet:gap-9 ${text}`}
        >
          <div class={`flex flex-col w-full mobileLg:w-1/2`}>
            <p class="tablet:mb-0">
              <b>
                SRC-721r allows for recursive NFT creation
              </b>{" "}
              by leveraging multiple layers of data utilizing not just JSON, but
              also on-chain JS libraries to build complex recursion and on-chain
              web applications.<br />
              Its structure maximizes cost efficiency, making it suitable for
              larger, more detailed and animated art collections.
            </p>
          </div>
          <div class={`flex flex-col w-full mobileLg:w-1/2`}>
            <p>
              Get in contact with us if you're planning a large PFP collection
              or dreaming of complex multilayered art compositions.
            </p>
            <p>
              <b>
                We would love to get involved and can definitely help you out !
              </b>
            </p>
          </div>
        </div>
        {/* ===== BUTTON SECTION ===== */}
        <div class="flex justify-end">
          <Button
            variant="outline"
            color="grey"
            size="mdR"
            href="/about#contact"
            class="float-right mt-6"
          >
            CONTACT
          </Button>
        </div>
      </div>
    </>
  );
};
