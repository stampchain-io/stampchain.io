/* ===== ARTICLE COMPONENT ===== */
import { body, bodyArticle, containerGap } from "$layout";
import { ArticlesOverview } from "$section";
import { headingGrey, subtitleNeutral, text, titleNeutral } from "$text";
import type { ArticleProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function Article(
  { title, subtitle, headerImage, children, importantNotes = [] }: ArticleProps,
) {
  /* ===== COMPONENT RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      <div class={bodyArticle}>
        {/* ===== MAIN CONTENT SECTION ===== */}
        <section>
          {/* ===== HEADER ===== */}
          <h1 class={titleNeutral}>{title}</h1>
          <h2 class={subtitleNeutral}>{subtitle}</h2>

          {/* ===== FEATURED IMAGE ===== */}
          <img
            src={headerImage}
            width="100%"
            alt="Screenshot"
            class="pt-2 pb-9 mobileMd:pb-12 rounded-2xl"
          />

          {/* ===== CONTENT ===== */}
          <div>
            <div class={`flex flex-col ${text}`}>
              {children}
            </div>
          </div>

          {/* ===== IMPORTANT NOTES SECTION ===== */}
          {importantNotes?.length > 0 && (
            <div class="mt-0">
              <p class={`${headingGrey} !text-color-grey-light mb-0`}>
                IMPORTANT
              </p>
              {importantNotes.map((note: string, index: number) => (
                <p key={index} class={text}>
                  {note}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ===== ARTICLES OVERVIEW SUBSECTION ===== */}
      <ArticlesOverview />
    </div>
  );
}
