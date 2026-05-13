/* ===== FAQ PAGE ===== */
import { FaqAccordion } from "$content";
import { FaqHeader } from "$header";
import { body, containerBackground, containerGap, FAQ_CONTENT } from "$layout";
import { subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== PAGE COMPONENT ===== */
export default function FaqPage() {
  return (
    <div class={`${body} ${containerGap}`}>
      {/* ===== HEADER SECTION ===== */}
      <FaqHeader />

      {/* ===== FAQ SECTION ===== */}
      {FAQ_CONTENT.map((section) => (
        <section
          key={section.title}
          class={`${containerBackground} space-y-7`}
        >
          {/* ===== ACCORDION HEADER SECTION ===== */}
          <div>
            <h3 class={titleNeutralLD}>{section.title}</h3>
            <h4 class={subtitleNeutral}>{section.subtitle}</h4>
            <p class={text}>
              {section.description.split("\n").map((line, lineIndex, array) => (
                <span key={lineIndex}>
                  {line}
                  {lineIndex < array.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>

          {/* ===== ACCORDION SUBSECTION ===== */}
          <div class="grid grid-cols-1 tablet:grid-cols-2 gap-3 tablet:gap-9 tablet:gap-y-3">
            {section.items.map((item) => (
              <FaqAccordion key={item.title} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
