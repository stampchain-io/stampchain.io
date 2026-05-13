/* ===== ARTICLES OVERVIEW COMPONENT ===== */
import { Button } from "$button";
import { ARTICLE_LINKS } from "$components/section/howto/data.ts"; // needs direct import - cannot use "$howto"
import { bodyArticle, containerGap } from "$layout";
import { headingGreyLDLink, subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export function ArticlesOverview() {
  /* ===== COMPONENT RENDER ===== */
  return (
    <section class={bodyArticle}>
      {/* ===== SECTION TITLE ===== */}
      <h1 class={titleNeutralLD}>
        KEEP READING
      </h1>

      {/* ===== CONTENT GRID ===== */}
      <div class={`flex flex-col tablet:flex-row ${containerGap}`}>
        {/* ===== HOW-TO ARTICLES LIST ===== */}
        <div class="w-full tablet:w-2/3">
          <h2 class={subtitleNeutral}>HOW-TO</h2>
          {ARTICLE_LINKS.map(({ title, href }) => (
            <div class="block">
              <a
                key={`${title}-${href}`}
                href={href}
                f-partial={href}
                class={`${headingGreyLDLink} pb-1 tablet:pb-0`}
              >
                {title}
              </a>
            </div>
          ))}
        </div>

        {/* ===== FAQ SECTION ===== */}
        <div class="flex flex-col w-full tablet:w-1/3 tablet:items-end tablet:text-right">
          <h2 class={subtitleNeutral}>FAQ</h2>
          <p class={text}>
            All you ever wanted to know about the Bitcoin Stamps protocol and
            stuff you never thought you needed to know.
          </p>
          {/* ===== FAQ BUTTON ===== */}
          <div class="w-full flex justify-start tablet:justify-end">
            <Button variant="outline" color="grey" size="mdR" href="/faq">
              FAQ
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
