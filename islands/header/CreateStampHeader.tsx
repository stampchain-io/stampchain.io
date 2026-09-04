/* ===== CREATE STAMP HEADER ===== */
import { SelectorButtons } from "$button";
import { Icon } from "$icon";
import { container2Icon, ScrollFadeRow } from "$layout";
import { titlePrimary } from "$text";
import type { CreateStampHeaderProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

export function CreateStampHeader(
  _props: CreateStampHeaderProps = {},
) {
  const [stampType, setStampType] = useState("recursive");
  const [source, setSource] = useState("stamp");

  return (
    <div class="flex flex-col w-full gap-1.5">
      <h1 class={titlePrimary}>CREATE</h1>

      <ScrollFadeRow deps={[stampType, source]}>
        {/* Stamp Type Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "classic", label: "CLASSIC" },
              { value: "posh", label: "POSH" },
              { value: "recursive", label: "RECURSIVE" },
            ]}
            value={stampType}
            onChange={setStampType}
            size="xsR"
            color="primary"
          />
        </div>

        {/* Source Selector - Center (Recursive only) */}
        {stampType === "recursive" && (
          <div class="grow shrink-0 flex justify-center">
            <SelectorButtons
              options={[
                { value: "stamp", label: "STAMP" },
                { value: "ordinal", label: "ORDINAL" },
                { value: "kontor", label: "KONTOR" },
                { value: "arweave", label: "ARWEAVE" },
                { value: "imgur", label: "IMGUR" },
              ]}
              value={source}
              onChange={setSource}
              size="xsR"
              color="primary"
            />
          </div>
        )}

        {/* View Mode + Info - Right */}
        {
          /* ml-auto: keeps this pinned right even when the source selector
            (the other flex-grow element) is hidden for Classic/Posh. */
        }
        <div class="flex shrink-0 ml-auto gap-3">
          <div class={container2Icon}>
            <Icon
              type="iconButton"
              name="viewCardVertical"
              weight="normal"
              size="xsR"
              color="neutral400"
              ariaLabel="View mode"
            />
          </div>
          <div class={container2Icon}>
            <Icon
              type="iconButton"
              name="info"
              weight="normal"
              size="xsR"
              color="neutral400"
              ariaLabel="Info"
            />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
}
