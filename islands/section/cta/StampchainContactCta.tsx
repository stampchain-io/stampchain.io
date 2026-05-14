/* ===== STAMPCHAIN CONTACT CTA COMPONENT ===== */
import { Button } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, text, textLg, titleNeutral } from "$text";

/* ===== COMPONENT ===== */
export const StampchainContactCta = () => {
  /* ===== RENDER ===== */
  return (
    <div
      class={`grid grid-cols-1 desktop:grid-cols-3 gap-7 items-end
      max-w-desktop w-full mx-auto ${containerBackground}`}
    >
      <div class="col-span1 desktop:col-span-2">
        {/* ===== HEADER SECTION ===== */}
        <h3 class={titleNeutral}>STAMPCHAIN</h3>
        <h4 class={subtitleNeutral}>
          THE CREATORS OF BITCOIN STAMPS
        </h4>
        {/* ===== CONTENT SECTION ===== */}
        <div class={`flex flex-col ${text}`}>
          <p>
            <span class={textLg}>
              <b>
                As the architects of the Bitcoin Stamps protocol, we've been at
                the forefront of the ecosystem since its inception.
              </b>
            </span>
            <br />
            Our platform combines deep technical expertise with user-friendly
            tools to help you create, collect, and trade Bitcoin Stamps with
            confidence.
          </p>
          <p>
            <b>We empower creators and collectors by:</b>
            <br />
            • Providing battle-tested tools developed by the original Bitcoin
            Stamps team <br />
            • Maintaining the most comprehensive knowledge base for Stamps
            technology
            {/* • Offering expert guidance on stamp creation, trading, and collection management */}
          </p>
        </div>
      </div>

      {/* ===== BUTTONS SECTION ===== */}
      <div class="flex gap-5 justify-end">
        <Button
          variant="outline"
          color="grey"
          size="mdR"
          href="/about/#contact"
        >
          CONTACT
        </Button>
        <Button
          variant="flat"
          color="grey"
          size="mdR"
          href="/about"
        >
          ABOUT
        </Button>
      </div>
    </div>
  );
};
