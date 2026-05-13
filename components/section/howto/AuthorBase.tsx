/* ===== AUTHOR COMPONENT ===== */
import { Icon } from "$icon";
import { container2 } from "$layout";
import { labelSm, textLg } from "$text";
import type { AuthorProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function AuthorSection({ name, twitter, website }: AuthorProps) {
  return (
    <section>
      <div
        class={`flex min-[520px]:flex-col justify-between min-[520px]:justify-end items-start min-[520px]:items-end w-full min-[520px]:w-fit -mt-4 min-[520px]:ml-auto p-3 ${container2}`}
      >
        <div class="flex flex-col min-[520px]:items-end min-[520px]:mb-1">
          <h6 class={labelSm}>
            ARTICLE BY
          </h6>
          <h5
            class={`${textLg} tablet:text-base !font-semibold !text-color-grey-semilight min-[520px]:mb-1`}
          >
            {name}
          </h5>
        </div>
        <div class="flex gap-4 tablet:gap-3 items-end">
          <Icon
            type="iconButton"
            name="twitter"
            weight="normal"
            size="smR"
            color="grey"
            href={`https://twitter.com/${twitter}`}
            target="_blank"
            rel="noopener noreferrer"
          />
          {website && (
            <Icon
              type="iconButton"
              name="website"
              weight="normal"
              size="smR"
              color="grey"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            />
          )}
        </div>
      </div>
    </section>
  );
}
