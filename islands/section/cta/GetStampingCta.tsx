/* ===== GET STAMPING CTA COMPONENT ===== */
import { Button } from "$button";
import { containerBackground, containerGap } from "$layout";
import { subtitleNeutral, text, titleNeutral } from "$text";

/* ===== COMPONENT ===== */
export default function GetStampingCta() {
  /* ===== STATE ===== */

  /* ===== RENDER ===== */
  return (
    <div class={`${containerBackground}`}>
      {/* ===== HEADER SECTION ===== */}
      <h3 class={titleNeutral}>GET STAMPING</h3>
      <h4 class={subtitleNeutral}>IMMORTALISE YOUR ART</h4>

      {/* ===== CONTENT SECTION ===== */}
      <div
        class={`flex flex-col tablet:flex-row ${containerGap} ${text}`}
      >
        <div class="flex flex-col tablet:w-[47%]">
          <p>
            <b>
              The Stampchain stamping machine lets you create and stamp art in
              three ways: - Classic, Posh and Recursive.
            </b>
          </p>
          <p>
            <b>Classic numeric stamps</b>
            <br />
            Classic stamps are named and indexed using Counterparty
            Identification (CPID) A-numerics. Your stamp art gets a randomly
            generated CPID when broadcasted to the blockchain - or you can
            choose a custom CPID.
          </p>
          <p>
            <b>Posh named stamps</b>
            <br />
            Posh stamps are named CPID's that let's you use letters to create a
            unique name to identify your stamp. Just make sure your wallet holds
            enough XCP to register it.
          </p>
        </div>
        <div class="flex flex-col tablet:w-[53%] tablet:text-right">
          <p>
            <b>Recursive stamps</b>
            <br />
            Compose existing stamps into brand new artwork with the recursive
            stamp builder. Add assets, text, apply filters and move, resize and
            rotate everything right on the canvas. Your stamp only references
            the originals, so it stays light and cheap to broadcast.
            <br />
            Recursive stamps use A-numeric CPIDs, lets you choose a custom CPID
            and give it an optional title, by using the html meta tag.
          </p>
          <p>
            Whichever way you stamp, the machine handles everything, from low-fi
            pixel art (png/jpg/gif) to hi-res vector art (svg/html) - up to
            65kB.
            <br />
            Set your editions, tune the fee with the slider and preview your
            stamp in fullscreen or as a stamp card before you sign.
          </p>
        </div>
      </div>

      {/* ===== BUTTONS SECTION ===== */}
      <div class="flex flex-col pt-7 gap-3">
        {/* ===== BUTTONS ===== */}
        <div class="flex justify-end gap-5">
          <Button
            variant="outline"
            color="neutral"
            href="/faq"
          >
            FAQ
          </Button>
          <Button
            variant="flat"
            color="neutral"
            href="/create/classic"
          >
            CREATE
          </Button>
        </div>
      </div>
    </div>
  );
}
