/* ===== FAQ HEADER COMPONENT ===== */
import { containerBackground } from "$layout";
import { subtitleNeutral, text, textLg, titleNeutralLD } from "$text";
/* ===== COMPONENT ===== */
export function FaqHeader() {
  return (
    <section class={containerBackground}>
      <div class="flex flex-col ">
        {/* ===== TITLE SECTION ===== */}
        <h1 class={titleNeutralLD}>
          YOU'VE GOT QUESTIONS
        </h1>
        <h2 class={subtitleNeutral}>
          WE'VE GOT ANSWERS
        </h2>

        {/* ===== SUBTITLE SECTION ===== */}
        <h6 class={`${textLg}`}>
          <b>
            New to Bitcoin Stamps? Curious to know more?
          </b>
        </h6>
        <h6 class={text}>
          Explore our comprehensive FAQ to understand this innovative technology
          built on Bitcoin.
        </h6>
      </div>
    </section>
  );
}
