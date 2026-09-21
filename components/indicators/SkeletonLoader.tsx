/* ===== SKELETON LOADER COMPONENTS ===== */
/* Simple skeleton loaders (for card and rows) are defined in _app.tsx */
/* The styling of both files need to be in sync */

import { Icon } from "$icon";
import {
  containerColForm,
  containerRowForm,
  loaderSkeleton,
  rowResponsiveForm,
} from "$layout";
import type { SkeletonLoaderProps } from "$types/ui.d.ts";

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

/* ===== TOOL-SPECIFIC SKELETON LOADERS ===== */
/* ===== STAMP TOOLS ===== */
/* CREATE STAMP TOOL */
export function StampingToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        {/* Left Column Skeleton - Image upload */}
        <div class={`${containerColForm} !w-[100px]`}>
          <SkeletonImage />
        </div>

        {/* Right Column Skeleton - Token details */}
        <div class={`${containerColForm} justify-between items-end`}>
          <div class={`${containerRowForm} justify-end`}>
            {/* Toggle switch skeleton */}
            <SkeletonToggle />
          </div>
          <div class={`${containerRowForm} justify-end items-center gap-5`}>
            {/* Editions text skeleton */}
            <SkeletonText lines={1} widths={["w-[88px]"]} />

            {/* Editions input skeleton */}
            <SkeletonInput width="w-10" />
          </div>
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}

/* SEND STAMP TOOL */
export function SendToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        <div class={`${containerColForm}`}>
          <div class={`${containerRowForm}`}>
            {/* Left Column Skeleton - Image upload */}
            <div class={`${containerColForm} !w-[100px]`}>
              <SkeletonImage />
            </div>

            {/* Right Column Skeleton - Token details */}
            <div class={`${containerColForm} justify-between items-end`}>
              <div class={`${containerRowForm} `}>
                {/* Stamp selector skeleton */}
                <SkeletonInput />
              </div>
              <div class={`${containerRowForm} justify-end items-center gap-5`}>
                {/* Editions text skeleton */}
                <SkeletonText
                  lines={2}
                  widths={["w-[88px]", "w-[48px]"]}
                  heights={["h-4", "h-3"]}
                  className="mt-0.5"
                />

                {/* Editions input skeleton */}
                <SkeletonInput width="w-10" />
              </div>
            </div>
          </div>
          {/* Address input skeleton */}
          <SkeletonInput />
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}

/* ===== SRC20 TOOLS ===== */
/* DEPLOY SRC20 TOOL */
export function DeployToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        {/* Left Column Skeleton - Image upload and decimals */}
        <div class={`${containerColForm} !w-[100px]`}>
          {/* Image upload skeleton */}
          <SkeletonImage />

          {/* Decimals input skeleton */}
          <SkeletonInput />
        </div>

        {/* Right Column Skeleton - Token details */}
        <div class={`${containerColForm}`}>
          <div class={`${containerRowForm}`}>
            {/* Ticker name input skeleton */}
            <SkeletonInput width="w-full flex-1" />

            {/* Toggle switch skeleton */}
            <SkeletonToggle />
          </div>

          {/* Supply input skeleton */}
          <SkeletonInput />

          {/* Limit per mint input skeleton */}
          <SkeletonInput />
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}

/* MINT SRC20 TOOL */
export function MintToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        <div class={`${containerColForm}`}>
          <div class={`${containerRowForm}`}>
            {/* Left Column Skeleton - Image preview */}
            <div class={`${containerColForm} !w-[100px]`}>
              {/* Image upload skeleton */}
              <SkeletonImage />
            </div>

            {/* Right Column Skeleton - Token details */}
            <div class={`${containerColForm}`}>
              {/* Ticker name input skeleton */}
              <SkeletonInput />

              {/* Amount input skeleton */}
              <SkeletonInput />
            </div>
          </div>
          {/* Mint progress skeleton */}
          <div
            class={`flex flex-col
          min-[480px]:flex-row min-[480px]:justify-between min-[480px]:items-end
          gap-4 min-[480px]:gap-0 mt-2 min-[480px]:mt-0`}
          >
            <div class={`flex flex-col w-full min-[480px]:w-[55%] gap-2.5`}>
              {/* Progress indicator skeleton */}
              <SkeletonText
                lines={1}
                widths={["w-[150px]"]}
                className="my-0"
              />

              {/* Progress bar skeleton */}
              <SkeletonInput
                width="w-full max-w-[420px]"
                height="h-3"
                rounded="rounded-full"
              />
            </div>
            {/* Supply, limit and minters information skeleton */}
            <div
              class={`flex flex-col w-full items-start mt-2
            min-[480px]:w-[45%] min-[480px]:!items-end min-[480px]:mt-1`}
            >
              <SkeletonText
                lines={3}
                heights={["h-3"]}
                widths={["w-[80px]", "w-[70px]", "w-[90px]"]}
                className="min-[480px]:flex min-[480px]:flex-col min-[480px]:items-end"
              />
            </div>
          </div>
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}

/* TRANSFER SRC20 TOOL */
export function TransferToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        <div class={`${containerColForm}`}>
          <div class={`${rowResponsiveForm}`}>
            {/* Ticker name input skeleton */}
            <SkeletonInput width="w-full min-[420px]:flex-1" />

            {/* Amount input skeleton */}
            <SkeletonInput width="w-full min-[420px]:flex-1" />
          </div>

          {/* Address input skeleton */}
          <SkeletonInput />
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}

/* ===== SRC101 TOOLS ===== */
/* REGISTER SRC101 TOOL */
export function RegisterToolSkeleton({ className = "" }: SkeletonLoaderProps) {
  return (
    <div class={`space-y-5 mobileLg:space-y-7.5 ${className}`}>
      <SkeletonContainer>
        <div class={`${containerColForm} items-end`}>
          <div class={`${rowResponsiveForm}`}>
            {/* Domain input skeleton */}
            <SkeletonInput width="w-full" />

            {/* TLD input skeleton */}
            <SkeletonInput width="w-[64px] !flex-none" />
          </div>

          {/* Available button skeleton */}
          <SkeletonButton size="md" width="w-[116px]" />
        </div>
      </SkeletonContainer>

      {/* Fee calculator skeleton */}
      <FeeCalculatorSkeleton />
    </div>
  );
}
