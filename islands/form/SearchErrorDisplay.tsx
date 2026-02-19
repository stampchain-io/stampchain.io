/**
 * Shared error display component for search modals.
 *
 * Renders the "broken" placeholder image and a multi-line error
 * message with consistent styling used by both SearchStampModal
 * and SearchSRC20Modal.
 */
import { textSm } from "$text";

interface SearchErrorDisplayProps {
  error: string;
}

export function SearchErrorDisplay(
  { error }: SearchErrorDisplayProps,
) {
  const lines = error.split("\n");

  return (
    <ul class="bg-color-background/50 rounded-b-3xl z-modal overflow-y-auto">
      <li class="flex flex-col items-center justify-end pt-1.5 pb-3 px-7.5">
        <img
          src="/img/placeholder/broken.png"
          alt="No results"
          class="w-[84px] pb-3"
        />
        <span class="text-center w-full">
          {lines.map((text: string, index: number) => (
            <div
              key={index}
              class={`${
                index === 0
                  ? "font-light text-base text-color-grey-light"
                  : index === lines.length - 1
                  ? textSm
                  : "font-medium text-sm text-color-grey pt-0.5 pb-1"
              } break-all overflow-hidden`}
            >
              {text}
            </div>
          ))}
        </span>
      </li>
    </ul>
  );
}
