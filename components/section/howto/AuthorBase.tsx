/* ===== AUTHOR COMPONENT ===== */
import { Icon } from "$icon";
import { container2 } from "$layout";
import { eyebrowNeutral } from "$text";
import type { AuthorProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function AuthorSection({ name, twitter, website }: AuthorProps) {
  return (
    <section>
      <div
        class={`flex min-[520px]:flex-col justify-between min-[520px]:justify-end items-center min-[520px]:items-end w-full min-[520px]:w-fit -mt-4 min-[520px]:ml-auto p-1 ${container2}`}
      >
        <div class="flex flex-col min-[520px]:items-end -mt-1 min-[520px]:mt-0 px-2 ">
          <h6 class={eyebrowNeutral}>
            AUTHOR
          </h6>
          <h5 class="-mt-1 font-semibold text-sm text-color-neutral-400">
            {name}
          </h5>
        </div>
        <div class="flex items-center min-[520px]:items-end gap-1 tablet:gap-0">
          <Icon
            type="iconButton"
            name="twitter"
            weight="normal"
            size="md"
            color="neutral400"
            href={`https://twitter.com/${twitter}`}
            target="_blank"
            rel="noopener noreferrer"
          />
          {website && (
            <Icon
              type="iconButton"
              name="website"
              weight="normal"
              size="md"
              color="neutral400"
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
