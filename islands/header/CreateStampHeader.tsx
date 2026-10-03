/* ===== CREATE STAMP HEADER ===== */
import { SelectorButtons } from "$button";
import { InfoButton } from "$islands/button/InfoButton.tsx";
import { StampCreateClassicHowto } from "$islands/section/howto/StampCreateClassicHowto.tsx";
import { StampCreatePoshHowto } from "$islands/section/howto/StampCreatePoshHowto.tsx";
import { StampCreateRecursiveHowto } from "$islands/section/howto/StampCreateRecursiveHowto.tsx";
import { ScrollFadeRow } from "$layout";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import { titlePrimary } from "$text";
import type { CreateStampHeaderProps, CreateStampType } from "$types/ui.d.ts";
import type { JSX } from "preact";

const CREATE_STAMP_TYPES: readonly CreateStampType[] = [
  "classic",
  "posh",
  "recursive",
];

export function CreateStampHeader(
  { active = "classic" }: CreateStampHeaderProps = {},
) {
  const { navigate } = useSSRSafeNavigation();
  const stampType = active;
  const howtoByType: Record<CreateStampType, JSX.Element> = {
    classic: <StampCreateClassicHowto />,
    posh: <StampCreatePoshHowto />,
    recursive: <StampCreateRecursiveHowto />,
  };

  const handleTypeChange = (value: string) => {
    if (value === active) return;
    if (!CREATE_STAMP_TYPES.includes(value as CreateStampType)) return;
    navigate(`/create/${value}`);
  };

  return (
    <div class="flex flex-col w-full gap-1.5">
      <h1 class={titlePrimary}>CREATE</h1>

      <ScrollFadeRow deps={[stampType]}>
        {/* Stamp Type Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "classic", label: "CLASSIC" },
              { value: "posh", label: "POSH" },
              { value: "recursive", label: "RECURSIVE" },
            ]}
            value={stampType}
            onChange={handleTypeChange}
            size="xs"
            color="primary"
          />
        </div>

        {/* Info - Right (how-to modal for the active stamp type) */}
        <div class="flex shrink-0 ml-auto">
          <InfoButton modal={howtoByType[stampType]} />
        </div>
      </ScrollFadeRow>
    </div>
  );
}
