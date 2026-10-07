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
        <div class="flex flex-col">
          <p>
            <b>
              The Stampchain stamping machine now comes with three ways to
              stamp - Classic, Posh and Recursive.
            </b>
          </p>
          <p>
            <b>
              Adorn your treasured art with fanciful letters and posh names.
            </b>
            <br />
            By leveraging Counterparty's named assets, you can give your stamp
            a unique, readable name instead of a random numeric CPID. Just make
            sure your wallet holds enough XCP to register it.
          </p>
          <p>
            <b>Feeling creative ?</b>
            <br />
            Compose existing stamps into brand new artwork with the recursive
            stamp builder. Layer assets, add text, apply filters and move,
            resize and rotate everything right on the canvas. Your stamp only
            references the originals, so it stays light and cheap to broadcast.
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
            Whichever way you stamp, the machine handles everything, from
            low-fi pixel art (png/jpg/gif) to hi-res vector art (svg/html) - up
            to a whooping 65kB. Set your editions, tune the fee with the slider
            and preview your stamp in fullscreen or as a stamp card before you
            sign.
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
            color="neutral"
            href="/faq"
          >
            FAQ
          </Button>
          <Button
            variant="flat"
            color="neutral"
            href="/tool/stamp/create"
          >
            STAMP
          </Button>
        </div>
      </div>
    </div>
  );
}
