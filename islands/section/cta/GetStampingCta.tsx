/* ===== GET STAMPING CTA COMPONENT ===== */
import { Button } from "$button";
import { containerBackground, containerGap } from "$layout";
import { subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export default function GetStampingCta() {
  /* ===== STATE ===== */

  /* ===== RENDER ===== */
  return (
    <div class={`${containerBackground}`}>
      {/* ===== HEADER SECTION ===== */}
      <h3 class={titleNeutralLD}>GET STAMPING</h3>
      <h4 class={subtitleNeutral}>IMMORTALISE YOUR ART</h4>

      {/* ===== CONTENT SECTION ===== */}
      <div
        class={`flex flex-col tablet:flex-row ${containerGap} ${text}`}
      >
        <div class="flex flex-col">
          <p>
            <b>
              The Stampchain stamping machine has been revamped and refitted
              with sleek new naming features.
            </b>
          </p>
          <p>
            <b>
              Experience greater creative freedom and adorn your treasured art
              with fanciful letters and posh names.
            </b>
            <br />
            By leveraging Counterparty's asset-naming system and handling the
            XCP fee, we've made it simple and smooth for you to create Posh
            stamps.
          </p>
        </div>
        <div class="flex flex-col -mt-1 mobileMd:-mt-2 mobileLg:-mt-4 tablet:mt-0 tablet:text-right">
          <p>
            <b>Wanna stay true to classic A grade numerics ?</b>
            <br />
            No problem, we still offer random lucky numbers - or you can choose
            a custom CPID number for your stamp.
          </p>
          <p>
            Either way the stamping machine handles everything, from low-fi
            pixel art (png/jpg/gif) to hi-res vector art (svg/html) - up to a
            whooping 65kB.
          </p>
          <p>
            <b>Time to get stamping !</b>
          </p>
        </div>
      </div>

      {/* ===== BUTTONS SECTION ===== */}
      <div class="flex flex-col pt-7 gap-3">
        {/* ===== BUTTONS ===== */}
        <div class="flex justify-end gap-5">
          <Button
            variant="outline"
            color="grey"
            size="mdR"
            href="/faq"
          >
            FAQ
          </Button>
          <Button
            variant="flat"
            color="grey"
            size="mdR"
            href="/tool/stamp/create"
          >
            STAMP
          </Button>
        </div>
      </div>
    </div>
  );
}
