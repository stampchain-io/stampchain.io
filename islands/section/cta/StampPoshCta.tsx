/* ===== STAMP POSH CTA COMPONENT ===== */
import { Button } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, text } from "$text";

/* ===== COMPONENT ===== */
export const StampPoshCta = () => {
  return (
    <>
      {/* ===== CONTENT SECTION ===== */}
      <div class={`${containerBackground} mt-6 mobileLg:mt-12`}>
        <h4 class={subtitleNeutral}>
          NAMED ASSETS
        </h4>
        <div
          class={`flex flex-col mobileLg:flex-row gap-6 tablet:gap-9 ${text}`}
        >
          <div class={`flex flex-col w-full mobileLg:w-1/2`}>
            <p class="tablet:mb-0">
              Posh stamps are an advanced version of cursed stamps integrated
              with the Counterparty asset-naming system.<br />
              While they require additional steps to acquire XCP to conform to
              the Counterparty Meta-Protocol rules,{" "}
              <b>
                this allows artists to create a vanity name on-chain for their
                stamps and collections.
              </b>
            </p>
          </div>
          <div class={`flex flex-col w-full mobileLg:w-1/2`}>
            <p>
              <b>
                With the Stampchain stamping tool we've made it smooth and
                frictionless to create Posh stamps.
              </b>
              <br />
              You just need a small amount of XCP to pay for the name and we
              handle the rest.
            </p>
            <p>
              Your most treasured art can now have unique names, instead of just
              arbitrary numbers.
            </p>
          </div>
        </div>
        {/* ===== BUTTON SECTION ===== */}
        <div class="flex justify-end">
          <Button
            variant="outline"
            color="grey"
            size="mdR"
            href="/tool/stamp/create"
            class="float-right mt-6"
          >
            STAMP
          </Button>
        </div>
      </div>
    </>
  );
};
