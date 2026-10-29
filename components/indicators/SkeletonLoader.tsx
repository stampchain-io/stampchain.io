/* ===== SKELETON LOADER COMPONENTS ===== */
/* Simple skeleton loaders (for card and rows) are defined in _app.tsx */
/* The styling of both files need to be in sync */

import { Icon } from "$icon";
import { containerColForm, containerRowForm, loaderSkeleton } from "$layout";

/* ===== BASIC SKELETON COMPONENTS ===== */
/* Skeleton container */
export function SkeletonContainer({
  height = "h-auto",
  width = "w-full",
  rounded = "rounded-3xl",
  className = "flex p-5 gap-5",
  children,
}: {
  height?: string;
  width?: string;
  rounded?: string;
  className?: string;
  children?: any;
}) {
  return (
    <div
      class={`${loaderSkeleton} ${height} ${width} ${rounded} ${className}`}
    >
      {children}
    </div>
  );
}

/* Skeleton for form inputs */
export function SkeletonInput({
  height = "h-10",
  width = "w-full",
  rounded = "rounded-2xl",
  className = "",
}: {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      class={`${loaderSkeleton} ${height} ${width} ${rounded} ${className}`}
    />
  );
}

/* Skeleton for buttons */
export function SkeletonButton({
  width = "w-32",
  rounded = "rounded-full",
  size = "md",
  className = "",
}: {
  height?: string;
  width?: string;
  rounded?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-6.5",
    sm: "h-7",
    md: "h-8",
    lg: "h-9",
  };

  return (
    <div
      class={`${loaderSkeleton} ${width} ${rounded} ${
        sizes[size]
      } ${className}`}
    />
  );
}

/* Skeleton for toggle switches */
export function SkeletonToggle({
  height = "h-5",
  width = "w-10",
  rounded = "rounded-full",
  className = "",
}: {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      class={`${loaderSkeleton} ${height} ${width} ${rounded} ${className} flex items-center relative`}
    >
      <div
        class={`flex justify-center items-center relative w-5 bg-transparent ${height} ${rounded}`}
      >
        <div
          class={`w-[14px] h-[14px] bg-color-grey opacity-30 ${rounded}`}
        />
      </div>
    </div>
  );
}

/* Skeleton for text lines */
export function SkeletonText({
  lines = 1,
  heights = ["h-4"],
  widths = ["w-full"],
  rounded = "rounded",
  className = "",
}: {
  lines?: number;
  heights?: string[];
  widths?: string[];
  rounded?: string;
  className?: string;
}) {
  const lineWidths = Array.from(
    { length: lines },
    (_, i) => widths[i] || widths[widths.length - 1],
  );

  const lineHeights = Array.from(
    { length: lines },
    (_, i) => heights[i] || heights[heights.length - 1],
  );

  return (
    <div class={`space-y-2 ${className}`}>
      {lineWidths.map((_, index) => {
        const width = lineWidths[index];
        const height = lineHeights[index];
        return (
          <div
            key={index}
            class={`${loaderSkeleton} ${height} ${width} ${rounded} !border-transparent`}
          />
        );
      })}
    </div>
  );
}

/* Skeleton for image previews */
export function SkeletonImage({
  size = "w-[100px] h-[100px]",
  rounded = "rounded-2xl",
  className = "",
}: {
  size?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      class={`flex items-center justify-center ${loaderSkeleton} ${size} ${rounded} ${className}`}
    >
      <Icon
        type="icon"
        name="previewImage"
        weight="extraLight"
        size="xl"
        color="custom"
        className="stroke-color-border/75"
      />
    </div>
  );
}

/* ===== BASE SKELETON COMPONENTS ===== */
/* FEE CALCULATOR SKELETON */
export function FeeCalculatorSkeleton() {
  return (
    <SkeletonContainer>
      <div class={`${containerColForm}`}>
        <div class={`${containerRowForm} justify-between`}>
          {/* Left side - Text lines */}
          <SkeletonText
            lines={2}
            heights={["h-3", "h-[14px]"]}
            widths={["w-[164px]", "w-[112px]"]}
            className="mt-0.5"
          />

          {/* Right side - Toggle switch */}
          <SkeletonToggle />
        </div>

        {/* Fee slider skeleton */}
        <SkeletonInput
          width="w-[85%]"
          height="h-5 tablet:h-4"
          rounded="rounded-full"
          className="-mt-2.5"
        />

        <div class="mt-2 mb-6 flex flex-col-reverse justify-start min-[420px]:flex-row min-[420px]:justify-between">
          {/* Estimate and details text lines */}
          <SkeletonText
            lines={2}
            widths={["w-[254px]", "w-[70px]"]}
            heights={["h-4", "h-3"]}
            className="mt-0.5"
          />

          {/* Fee estimation pill */}
          <div
            className={`flex justify-start -mt-0.5 mb-2 w-auto
              min-[420px]:justify-end min-[420px]:mt-0 min-[420px]:mb-0 `}
          >
            <SkeletonInput
              width="w-[84px] min-[420px]:w-[44px] min-[460px]:w-[84px]"
              height="h-5"
              rounded="rounded-full"
            />
          </div>
        </div>

        {/* Bottom Section - TOS + Buttons */}
        <div class={`${containerColForm} items-end`}>
          <SkeletonText
            lines={1}
            heights={["h-3"]}
            widths={["w-[160px] tablet:w-[226px]"]}
            className="-mb-1 tablet:-mb-0.5"
          />
          <SkeletonButton size="md" width="w-[168px] tablet:w-[150px]" />
        </div>
      </div>
    </SkeletonContainer>
  );
}
