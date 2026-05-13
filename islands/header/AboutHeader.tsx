/* ===== ABOUT HEADER COMPONENT ===== */
import { containerBackground } from "$layout";
import { subtitleNeutral, text, textLg, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export default function AboutHeader() {
  return (
    <section class={containerBackground}>
      <div class="flex flex-col">
        {/* ===== HEADER SECTION ===== */}
        <h1 class={titleNeutralLD}>ABOUT</h1>
        <h2 class={subtitleNeutral}>STAMPCHAIN</h2>

        {/* ===== INTRODUCTION SECTION ===== */}
        <p class={textLg}>
          The <b>Bitcoin Stamps meta-protocol</b>{" "}
          was conceived by Mike In Space, a maverick figure in the Bitcoin and
          Counterparty community with deep roots in underground memetic culture.
          While others saw Bitcoin's UTXO model as just a ledger, Mike glimpsed
          something more profound: the foundation for humanity's most permanent
          digital canvas.
        </p>
        <p class={text}>
          Enter Arwyn, a long-time peer and fellow digital conspirator, who may
          or may not have slightly oversold his dev credentials when Mike came
          calling. Together, they began experimenting with various methods, some
          so forward-thinking they accidentally predicted future innovations.
        </p>
        <p class={text}>
          As the project evolved from concept to creation, Reinamora joined the
          fellowship, bringing technical precision and focused determination to
          the team during what he called his "extended sabbatical." This trinity
          of builders didn't just create a protocol—they forged a new standard
          for digital permanence that would make ancient stone tablets look like
          temporary Post-it notes.
        </p>
        <p class={text}>
          The introduction of <b>SRC-20 tokens</b>{" "}
          marked a watershed moment, proving that Bitcoin Stamps could do more
          than just store data—it could breathe new life into the entire
          ecosystem. In a delightful twist of fate, the success of this
          innovation drew Counterparty's original creators back into the
          community after years away, reigniting their passion for building on
          Bitcoin.
        </p>
        <p class={text}>
          Today,{" "}
          <b>
            Bitcoin Stamps stands as an immutable testament to human ingenuity
          </b>, combining Bitcoin's unshakeable security with groundbreaking
          on-chain capabilities. Every stamp is a story, every transaction a
          timestamp in the grand narrative of human creativity, preserved
          forever in the most enduring medium mankind has ever devised.
        </p>
      </div>
    </section>
  );
}
