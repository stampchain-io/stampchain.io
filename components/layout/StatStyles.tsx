/* ===== STAT DISPLAY COMPONENTS ===== */
import { ActivityLevelIndicator } from "$components/indicators/ActivityLevelIndicator.tsx";
import { alignmentClasses } from "$layout";
import { cardPrice, labelXs, valueSm, valueXl } from "$text";
import type {
  StatItemProps,
  StatPriceProps,
  StatTitleProps,
} from "$types/ui.d.ts";

export function StatItem({
  label,
  value,
  align = "left",
  class: customClass,
  valueClass,
  href,
  target = "_self",
}: StatItemProps) {
  const alignmentClass = alignmentClasses[align];
  const content = (
    <div class="flex flex-col -space-y-0.5">
      <h5 class={`${labelXs} ${alignmentClass} ${customClass || ""}`}>
        {label}
      </h5>
      <h6
        class={`${valueSm} ${alignmentClass} ${customClass || ""} ${
          valueClass || ""
        } group-hover:text-color-hover transition-colors duration-200`}
      >
        {value}
      </h6>
    </div>
  );

  return href
    ? (
      <a href={href} target={target} class="group">
        {content}
      </a>
    )
    : content;
}

export function StatTitle({
  label,
  value,
  align = "left",
  href,
  target = "_self",
}: StatTitleProps) {
  const alignmentClass = alignmentClasses[align];
  const content = (
    <div class="flex flex-col -space-y-0.5">
      <h5 class={`${labelXs} ${alignmentClass}`}>
        {label}
      </h5>
      <h6
        class={`${valueXl} ${alignmentClass} group-hover:text-color-hover transition-colors duration-200`}
      >
        {value}
      </h6>
    </div>
  );

  return href
    ? (
      <a href={href} target={target} class="group">
        {content}
      </a>
    )
    : content;
}

export function StatPrice({
  priceBTC,
  priceUSD,
  activityLevel,
  align = "left",
  class: customClass,
}: StatPriceProps) {
  const alignmentClass = alignmentClasses[align];
  // COLD renders nothing from ActivityLevelIndicator, so treat it the same
  // as "no activity level" — otherwise the justify-between row below would
  // collapse to a single child and lose its intended alignment.
  const showActivityLevel = activityLevel && activityLevel !== "COLD";

  return (
    <div class={`flex flex-col -space-y-0.5 ${customClass || ""}`}>
      {showActivityLevel
        ? (
          <div class="flex justify-between items-center w-full gap-3">
            <ActivityLevelIndicator
              level={activityLevel}
              className="!cursor-default"
            />
            {priceUSD == null ? null : (
              <div
                class={`font-normal text-xs text-color-neutral-500 text-nowrap ${alignmentClass}`}
              >
                {priceUSD} USD
              </div>
            )}
          </div>
        )
        : priceUSD == null
        ? null
        : (
          <div
            class={`font-normal text-xs text-color-neutral-500 text-nowrap ${alignmentClass}`}
          >
            {priceUSD} USD
          </div>
        )}
      <div class={`${cardPrice} !text-sm ${alignmentClass}`}>
        {priceBTC} <span class="font-light">BTC</span>
      </div>
    </div>
  );
}
