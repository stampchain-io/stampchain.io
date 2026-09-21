/* ===== RECURSIVE STAMP CONTENT ===== */
import { Button, buttonHover, ToggleSwitchButton } from "$button";
import { StampCard } from "$card";
import { walletContext } from "$client/wallet/wallet.ts";
import { useFees } from "$fees";
import { inputField, inputNumeric, messageError } from "$form";
import { CreateStampRecursiveHeader, openShortcutsModal } from "$header";
import { Icon, PlaceholderImage, UserProfileIcon } from "$icon";
import { RangeSlider } from "$islands/button/RangeSlider.tsx";
import { ColorPicker } from "$islands/form/ColorPicker.tsx";
import { InputField } from "$islands/form/InputField.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import PreviewCodeModal from "$islands/modal/PreviewCodeModal.tsx";
import { openSearchStampPicker } from "$islands/modal/SearchStampPickerModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import {
  container2,
  container2Hover,
  container2Icon,
  container3,
  shadowGlowPurpleSm,
  transitionColors,
} from "$layout";
import {
  addStampLayer,
  addTextLayer,
  alignSelected,
  bringToFront,
  centerSelected,
  clearAllLayers,
  deleteLayer,
  deleteSelected,
  duplicateSelected,
  enterEdit,
  enterPreview,
  flipSelected,
  getLayer,
  GRID_DIV,
  GRID_STEP,
  groupSelection,
  moveLayer,
  mutateLayers,
  nudgeSelected,
  patchGuide,
  patchLayer,
  pushHistory,
  redo,
  removeGuide,
  reorderLayers,
  resetZoom,
  rsbBg,
  rsbGuides,
  rsbLayers,
  rsbPanX,
  rsbPanY,
  rsbSelId,
  rsbSelIds,
  rsbZoom,
  selectAll,
  selectLayer,
  sendToBack,
  setPreviewHtml,
  setSelection,
  setZoom,
  toggleLayerLock,
  toggleLayerVis,
  undo,
  ungroupSelection,
  useRecursiveStampState,
} from "$lib/hooks/useRecursiveStampState.ts";
import {
  fetchStampById,
  fetchStampsByCreator,
} from "$lib/utils/api/stamps/fetchStamp.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import {
  buildRecursiveStampHtml,
  defaultRecursiveFilters,
  layerDisplaySrc,
  layerFilterCss,
  layerTransformCss,
  RECURSIVE_STAMP_FONT_GROUPS,
  recursiveStampFontFamily,
  type RecursiveStampSrcId,
} from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import {
  layerHitsMarquee,
  type MeasureBadge,
  measureBadges,
  type SmartGuideLine,
  snapMove,
} from "$lib/utils/ui/rendering/recursiveStampSnap.ts";
import { FeeCalculatorBase } from "$section";
import {
  cardCreator,
  cardStampNumber,
  labelSm,
  labelXs,
  subtitlePrimary,
  text,
  textXs,
  truncate,
} from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import type {
  RecursiveStampContentProps,
  RecursiveStampLayer,
} from "$types/ui.d.ts";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

type RsbPanel =
  | "background"
  | "assets"
  | "text"
  | "layers"
  | "properties"
  | "filters"
  | "selected";

/** Offsets CollapsibleSection's `-mt-2 tablet:-mt-1` so overflow-hidden does not clip the first row. */
function SectionBody(
  { children }: { children: ComponentChildren },
): JSX.Element {
  return <div class="pt-2 tablet:pt-1">{children}</div>;
}

type TextAlign = "left" | "center" | "right";

type TextStyleDraft = {
  font: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
};

const DEFAULT_TEXT_STYLE: TextStyleDraft = {
  font: "Arial",
  fontSize: 5,
  color: "#ffffff",
  bold: false,
  italic: false,
  align: "center",
};

function clampFontSize(n: number): number {
  return Math.min(100, Math.max(0.5, n));
}

function capPos(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function formatPos(n: number): string {
  const v = capPos(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function sanitizePosDraft(raw: string): string {
  let s = raw.replace(",", ".").replace(/[^\d.-]/g, "");
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const hasDot = s.includes(".");
  const [whole = "", ...rest] = s.split(".");
  const frac = rest.join("");
  let out = whole;
  if (hasDot) {
    out += `.${frac.length > 1 ? frac.slice(-1) : frac}`;
  }
  return `${neg ? "-" : ""}${out}`;
}

/** Matches Tailwind `top-5` / `left-5` (1.25rem). */
const PREVIEW_INSET = 20;

function clampPreviewPos(
  x: number,
  y: number,
  wrap: HTMLElement,
  card: HTMLElement,
): { x: number; y: number } {
  const maxX = Math.max(0, wrap.clientWidth - card.offsetWidth);
  const maxY = Math.max(0, wrap.clientHeight - card.offsetHeight);
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
}

const LIBRARY_MIMES = new Set([
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/gzip",
  "application/json",
  "text/json",
]);

function isLibraryMime(mime?: string | null): boolean {
  return !!mime && LIBRARY_MIMES.has(mime);
}

function isUnrenderableMime(mime?: string | null): boolean {
  return mime === "UNKNOWN" || mime === "application/octet-stream";
}

function isHtmlMime(mime?: string | null): boolean {
  return mime === "text/html";
}

function isSvgMime(mime?: string | null): boolean {
  return mime === "image/svg+xml";
}

function layerToStampRow(layer: RecursiveStampLayer): StampRow {
  return {
    stamp: layer.num ?? 0,
    stamp_url: layer.url ?? "",
    stamp_mimetype: layer.mime ?? "",
    ident: layer.ident ?? "",
    tx_hash: layer.hash ?? "",
    stamp_base64: layer.b64 ?? "",
  } as StampRow;
}

function buildGeneratedStampRow(opts: {
  html: string;
  issuance: string;
  stampName: string;
  creator: string;
  creatorName: string | null;
  locked: boolean;
}): StampRow {
  const supply = parseInt(opts.issuance, 10);
  return {
    stamp: 1234567,
    cpid: opts.stampName || "AUTO GENERATED",
    ident: "SRC-721",
    block_index: 0,
    block_time: new Date(),
    tx_hash: "preview",
    tx_index: 0,
    creator: opts.creator,
    creator_name: opts.creatorName,
    divisible: false,
    keyburn: null,
    locked: opts.locked ? 1 : 0,
    supply: Number.isFinite(supply) && supply > 0 ? supply : 1,
    stamp_base64: "",
    stamp_mimetype: "text/html",
    stamp_url: "",
    stamp_hash: "",
    file_hash: "",
    file_size_bytes: new TextEncoder().encode(opts.html).length,
    unbound_quantity: 0,
  };
}

function liveHtmlSrc(
  stamp: Pick<StampRow, "stamp_url" | "stamp_mimetype" | "ident">,
): string | undefined {
  return getStampImageSrc(stamp as StampRow);
}

function staticThumbSrc(stamp: StampRow): string | undefined {
  const mime = stamp.stamp_mimetype;
  if (isLibraryMime(mime) || isUnrenderableMime(mime)) return undefined;
  if (isHtmlMime(mime) || isSvgMime(mime)) {
    if (stamp.stamp == null) return undefined;
    return getStampPreviewUrl(stamp, { placeholderOnFail: true });
  }
  return getStampImageSrc(stamp);
}

function staticLayerThumbSrc(
  layer: RecursiveStampLayer,
): string | undefined {
  const mime = layer.mime;
  if (isLibraryMime(mime) || isUnrenderableMime(mime)) return undefined;
  // Layer-list thumbs are always the static preview PNG when we have a
  // stamp number — never the live file/base64 (GIFs would animate, SVGs
  // would run, rasters would load the original).
  if (layer.num != null) {
    return getStampPreviewUrl(layerToStampRow(layer), {
      placeholderOnFail: true,
    });
  }
  if (mime?.startsWith("image/")) {
    return getStampImageSrc(layerToStampRow(layer)) ||
      layerDisplaySrc(layer) || undefined;
  }
  return undefined;
}

function StampThumb(
  { src, alt, mime, className, placeholderClassName }: {
    src?: string | undefined;
    alt: string;
    mime?: string | null | undefined;
    className?: string | undefined;
    placeholderClassName?: string | undefined;
  },
): JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const placeholderClass = placeholderClassName ?? "";
  if (isLibraryMime(mime)) {
    return (
      <PlaceholderImage
        variant="library"
        className={placeholderClass}
      />
    );
  }
  if (isUnrenderableMime(mime) || mime?.startsWith("audio/")) {
    return (
      <PlaceholderImage
        variant={mime?.startsWith("audio/") ? "audio" : "error"}
        className={placeholderClass}
      />
    );
  }
  if (!src || failedSrc === src) {
    return (
      <PlaceholderImage
        variant="no-image"
        className={placeholderClass}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      class={className ?? "w-full h-full object-contain pixelart"}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

function LiveStampPreview(
  { stamp, previewSrc }: { stamp: StampRow; previewSrc: string },
): JSX.Element {
  const [imgFailed, setImgFailed] = useState(false);
  const mime = stamp.stamp_mimetype;
  const placeholderClass = "!rounded-xl";

  if (isLibraryMime(mime)) {
    return <PlaceholderImage variant="library" className={placeholderClass} />;
  }
  if (isUnrenderableMime(mime)) {
    return <PlaceholderImage variant="error" className={placeholderClass} />;
  }
  if (mime?.startsWith("audio/")) {
    return <PlaceholderImage variant="audio" className={placeholderClass} />;
  }
  if (isHtmlMime(mime)) {
    const src = liveHtmlSrc(stamp);
    if (!src) {
      return (
        <PlaceholderImage variant="no-image" className={placeholderClass} />
      );
    }
    return (
      <iframe
        src={src}
        class="w-full h-full pointer-events-none rounded-xl"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }
  if (!previewSrc || imgFailed) {
    return <PlaceholderImage variant="no-image" className={placeholderClass} />;
  }
  return (
    <img
      src={previewSrc}
      alt={`Stamp #${stamp.stamp}`}
      class="w-full h-full object-contain rounded-xl pixelart
        pointer-events-none"
      draggable={false}
      onError={() => setImgFailed(true)}
    />
  );
}

function CanvasLayerMedia(
  { layer }: { layer: RecursiveStampLayer },
): JSX.Element {
  if (isHtmlMime(layer.mime)) {
    const src = liveHtmlSrc(layerToStampRow(layer)) ?? layer.url;
    if (!src) {
      return (
        <PlaceholderImage
          variant="no-image"
          className="!rounded-none"
        />
      );
    }
    return (
      <iframe
        src={src}
        sandbox="allow-scripts allow-same-origin"
      />
    );
  }
  if (isLibraryMime(layer.mime)) {
    return (
      <PlaceholderImage
        variant="library"
        className="!rounded-none"
      />
    );
  }
  if (isUnrenderableMime(layer.mime)) {
    return (
      <PlaceholderImage
        variant="error"
        className="!rounded-none"
      />
    );
  }
  return (
    <img
      src={layerDisplaySrc(layer)}
      alt={layer.name}
      class="pixelart"
      draggable={false}
    />
  );
}

function AssetPreviewCard(
  {
    stamp,
    previewSrc,
    more,
    onAdd,
    onPick,
    showCreatorAssets,
    onToggleCreatorAssets,
  }: {
    stamp: StampRow;
    previewSrc: string;
    more: StampRow[];
    onAdd: () => void;
    onPick: (id: string) => void;
    showCreatorAssets: boolean;
    onToggleCreatorAssets: () => void;
  },
): JSX.Element {
  // 5 columns x 2 rows max, minus the profile-icon cell (row 2, col 1)
  const moreRow = more.slice(0, 9);
  const hasMore = moreRow.length > 0;
  const assetCell = (s: StampRow) => (
    <button
      type="button"
      key={s.tx_hash}
      class={`${container3} hover:border-hover ${shadowGlowPurpleSm}
        !rounded-xl aspect-square overflow-hidden p-0`}
      onClick={() => onPick(String(s.stamp))}
    >
      <StampThumb
        src={staticThumbSrc(s)}
        alt={`#${s.stamp}`}
        mime={s.stamp_mimetype}
        placeholderClassName="!rounded-xl"
      />
    </button>
  );
  const profileToggleCell = (
    <button
      type="button"
      key="creator-profile-toggle"
      class={`${container2Icon} aspect-square !justify-center`}
      aria-label="Show stamp details"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleCreatorAssets();
      }}
    >
      <Icon
        type="iconButton"
        name="userCircle"
        weight="normal"
        size="lg"
        color="primary400"
      />
    </button>
  );
  const moreGrid = hasMore && (
    <div class="grid grid-cols-5 gap-3">
      {moreRow.slice(0, 5).map(assetCell)}
      {profileToggleCell}
      {moreRow.slice(5, 9).map(assetCell)}
    </div>
  );
  const showAssetsView = showCreatorAssets && hasMore;

  return (
    <>
      {showAssetsView ? moreGrid : (
        <div class="flex gap-3 items-start">
          <div
            class={`flex items-center justify-center shrink-0
                  w-[68px] h-[68px] overflow-hidden ${container3}`}
          >
            <LiveStampPreview
              key={stamp.tx_hash}
              stamp={stamp}
              previewSrc={previewSrc}
            />
          </div>
          <div class="flex flex-col min-w-0 flex-1 gap-0.5">
            <div class={cardStampNumber}>
              {stamp.stamp != null && <span class="font-light">#</span>}
              {stamp.stamp != null
                ? stamp.stamp.toLocaleString("en-US")
                : stamp.cpid}
            </div>
            {stamp.cpid && (
              <div
                class={`font-mono text-xs text-color-neutral-500
                      ${truncate}`}
              >
                {stamp.cpid}
              </div>
            )}
            {(stamp.creator_name || stamp.creator) && (
              <UserProfileIcon wrapperClassName="mt-0.5">
                <span class={`${cardCreator} !text-left`}>
                  {stamp.creator_name ||
                    abbreviateAddress(stamp.creator, 5)}
                </span>
              </UserProfileIcon>
            )}
          </div>
        </div>
      )}
      {!showAssetsView && (
        <div class="flex items-center gap-1.5 mt-3">
          {hasMore && (
            <div class={`${container2Icon}`}>
              <Icon
                type="iconButton"
                name="userCircle"
                weight="normal"
                size="md"
                color="neutral400"
                ariaLabel="Show more by creator"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleCreatorAssets();
                }}
              />
            </div>
          )}
          <Button
            variant="flat"
            color="neutral"
            class="flex-1"
            onClick={onAdd}
          >
            + ADD ASSET
          </Button>
        </div>
      )}
    </>
  );
}

function PlaceholderIcon(props: {
  label: string;
  name?: string;
  onClick?: (e: MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Icon
      type="iconButton"
      name={props.name ?? "website"}
      weight="normal"
      size="md"
      color={props.active ? "primary400" : "neutral400"}
      ariaLabel={props.label}
      className={props.disabled ? "opacity-80 pointer-events-none" : ""}
      onClick={props.disabled ? undefined : (e) => {
        e.preventDefault();
        props.onClick?.(e);
      }}
    />
  );
}

const CANVAS_CSS = `
.rsb-wrap{position:relative;width:100%;height:100%;
  overflow:hidden;touch-action:none}
.rsb-wrap:not(.preview){background:repeating-conic-gradient(#191919 0% 25%,#141414 0% 50%) 0 0/20px 20px}
.rsb-canvas,.rsb-el{touch-action:none}
.rsb-zoom,.rsb-preview{touch-action:manipulation}
.rsb-wrap.preview .rsb-guide,
.rsb-wrap.preview .rsb-grid,
.rsb-wrap.preview .rsb-ruler{display:none!important}
.rsb-canvas{position:absolute;top:0;bottom:0;left:0;right:0;margin:auto;
  max-width:calc(100% - 48px);max-height:calc(100% - 48px);aspect-ratio:1/1;
  overflow:hidden;container-type:size;transform-origin:center center;
  box-shadow:0 8px 60px rgba(0,0,0,.7)}
.rsb-grid{position:absolute;inset:0;width:100%;height:100%;display:block;
  pointer-events:none;z-index:9999}
.rsb-el{position:absolute;cursor:move;transform-origin:center center}
.rsb-wrap.preview .rsb-el{pointer-events:none}
.rsb-inner{width:100%;height:100%;overflow:hidden;position:relative;z-index:0}
.rsb-inner img,.rsb-inner iframe{width:100%;height:100%;object-fit:contain;
  border:none;outline:none;display:block;pointer-events:none}
.rsb-inner img{image-rendering:pixelated;image-rendering:-moz-crisp-edges;
  image-rendering:crisp-edges;-webkit-image-rendering:pixelated}
.rsb-sel{position:absolute;inset:0;pointer-events:none;z-index:100}
.rsb-ring{display:block;position:absolute;inset:0;
  border:2px solid var(--color-neutral-400)}
.rsb-el.sel .rsb-ring{border-color:var(--color-primary-400)}
.rsb-wrap.preview .rsb-sel{display:none}
.rsb-h{position:absolute;width:9px;height:9px;background:#fff;
  border:2px solid var(--color-neutral-400);pointer-events:all}
.rsb-el.sel .rsb-h{border-color:var(--color-primary-400)}
.h-tl{top:-5px;left:-5px;cursor:nw-resize}
.h-tr{top:-5px;right:-5px;cursor:ne-resize}
.h-bl{bottom:-5px;left:-5px;cursor:sw-resize}
.h-br{bottom:-5px;right:-5px;cursor:se-resize}
.h-tm{top:-5px;left:calc(50% - 4px);cursor:n-resize}
.h-bm{bottom:-5px;left:calc(50% - 4px);cursor:s-resize}
.h-ml{left:-5px;top:calc(50% - 4px);cursor:w-resize}
.h-mr{right:-5px;top:calc(50% - 4px);cursor:e-resize}
.rsb-rot{position:absolute;width:12px;height:12px;
  background:var(--color-neutral-400);border:2px solid #fff;
  border-radius:50%;top:-30px;left:calc(50% - 6px);cursor:crosshair;
  pointer-events:all}
.rsb-el.sel .rsb-rot{background:var(--color-primary-400)}
.rsb-rotline{position:absolute;width:1px;height:18px;
  background:var(--color-neutral-400);top:-22px;left:calc(50% - .5px)}
.rsb-el.sel .rsb-rotline{background:var(--color-primary-400)}
.rsb-text{width:100%;height:100%;overflow:hidden;word-break:break-word;
  white-space:pre-wrap;pointer-events:none;line-height:1.2}
.rsb-text.editing{pointer-events:all;cursor:text;outline:none}
.rsb-guide{position:absolute;pointer-events:all;z-index:8000}
.rsb-guide-h{left:0;right:0;height:1px;background:var(--color-neutral-500);
  cursor:ns-resize}
.rsb-guide-v{top:0;bottom:0;width:1px;background:var(--color-neutral-500);
  cursor:ew-resize}
.rsb-glabel{position:absolute;font-size:9px;background:var(--color-neutral-500);
  color:var(--color-neutral-50);padding:1px 4px;white-space:nowrap;
  font-family:monospace}
.rsb-guide-h .rsb-glabel{top:2px;left:4px}
.rsb-guide-v .rsb-glabel{left:4px;top:4px}
.rsb-smart{position:absolute;pointer-events:none;z-index:8500}
.rsb-smart-v{top:0;bottom:0;width:1px;background:var(--color-primary-400)}
.rsb-smart-h{left:0;right:0;height:1px;background:var(--color-primary-400)}
.rsb-measure{position:absolute;z-index:8510;pointer-events:none;
  transform:translate(-50%,-50%);font-family:monospace;font-size:9px;
  line-height:1;padding:2px 4px;white-space:nowrap;color:#fff;
  background:var(--color-primary-400);border-radius:2px}
.rsb-preview-frame{position:absolute;inset:0;width:100%;height:100%;border:0;
  pointer-events:none;background:transparent;z-index:1}
.rsb-marquee{position:absolute;z-index:8600;pointer-events:none;display:none;
  border:1px solid var(--color-primary-400);
  background:color-mix(in srgb,var(--color-primary-400) 12%,transparent)}
.rsb-ruler{position:absolute;z-index:7000;pointer-events:none;display:none;
  background:rgba(0,0,0,.55)}
.rsb-wrap.rulers-on .rsb-ruler{display:block}
.rsb-ruler-h{top:0;left:0;right:0;height:18px}
.rsb-ruler-v{top:0;left:0;bottom:0;width:18px}
.rsb-tick{position:absolute;background:rgba(255,255,255,.18)}
.rsb-rlabel{position:absolute;font-size:8px;color:#777;font-family:monospace}
.rsb-zoom{position:absolute;bottom:20px;right:20px;z-index:8800;
  display:flex;align-items:center;gap:4px}
.rsb-preview{position:absolute;z-index:8900;cursor:grab}
.rsb-preview.dragging{cursor:grabbing}
.rsb-wrap.preview .rsb-preview{display:none!important}
.rsb-wrap.panning,.rsb-wrap.panning *{cursor:grabbing!important}
.rsb-wrap.pan-ready{cursor:grab}
.rsb-ctx{position:fixed;z-index:9600;display:none;min-width:170px}
.rsb-ctx.open{display:block}
`;

type IX =
  | {
    type: "drag";
    id: string;
    sx: number;
    sy: number;
    layers: { id: string; ox: number; oy: number }[];
  }
  | {
    type: "resize";
    id: string;
    handle: string;
    corners: Record<string, { x: number; y: number }>;
    ow: number;
    oh: number;
    aspectRatio: number;
  }
  | {
    type: "rotate";
    id: string;
  };

type PointerLike = {
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  button?: number;
  target: EventTarget | null;
  stopPropagation: () => void;
  preventDefault: () => void;
};

type MarqueeIX = {
  startX: number;
  startY: number;
  wrapSx: number;
  wrapSy: number;
  shift: boolean;
  startIds: string[];
};

const ANCHOR: Record<string, string> = {
  tl: "br",
  tr: "bl",
  bl: "tr",
  br: "tl",
  tm: "bm",
  bm: "tm",
  ml: "mr",
  mr: "ml",
};

type RecentItem = { num: number; hash: string };

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v == null ? fallback : v as T;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function isEmptyCanvasTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null;
  if (!el) return false;
  return !el.closest(
    ".rsb-el, .rsb-guide, .rsb-zoom, .rsb-preview, button, a",
  );
}

function pointerFromTouch(
  e: TouchEvent,
  touch: Touch,
): PointerLike {
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    shiftKey: e.shiftKey,
    button: 0,
    target: e.target,
    stopPropagation: () => e.stopPropagation(),
    preventDefault: () => e.preventDefault(),
  };
}

function beginLayerRename(
  e: MouseEvent,
  layer: RecursiveStampLayer,
): void {
  e.stopPropagation();
  e.preventDefault();
  if (layer.locked) return;
  const span = e.currentTarget as HTMLElement;
  const original = layer.name;
  span.contentEditable = "true";
  span.spellcheck = false;
  span.focus();
  const selection = globalThis.getSelection();
  const range = document.createRange();
  range.selectNodeContents(span);
  selection?.removeAllRanges();
  selection?.addRange(range);
  let cancelled = false;
  const onBlur = () => {
    span.removeEventListener("blur", onBlur);
    span.removeEventListener("keydown", onKey);
    span.contentEditable = "false";
    if (cancelled) {
      span.textContent = original;
      return;
    }
    const name = (span.textContent ?? "").trim() || original;
    span.textContent = name;
    if (name !== original) {
      pushHistory();
      patchLayer(layer.id, { name });
    }
  };
  const onKey = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (ev.key === "Enter") {
      ev.preventDefault();
      span.blur();
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      cancelled = true;
      span.textContent = original;
      span.blur();
    }
  };
  span.addEventListener("blur", onBlur);
  span.addEventListener("keydown", onKey);
}

function corners(layer: RecursiveStampLayer) {
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  const hw = layer.w / 2;
  const hh = layer.h / 2;
  const a = layer.r * Math.PI / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const rot = (lx: number, ly: number) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  });
  return {
    tl: rot(-hw, -hh),
    tr: rot(hw, -hh),
    bl: rot(-hw, hh),
    br: rot(hw, hh),
    tm: rot(0, -hh),
    bm: rot(0, hh),
    ml: rot(-hw, 0),
    mr: rot(hw, 0),
  };
}

function RulerTicks({ axis }: { axis: "h" | "v" }) {
  const marks: JSX.Element[] = [];
  for (let i = 0; i <= 10; i++) {
    const pct = i * 10;
    marks.push(
      <div
        key={`t${i}`}
        class="rsb-tick"
        style={axis === "h"
          ? {
            left: `${pct}%`,
            top: 0,
            width: "1px",
            height: i % 5 === 0 ? "12px" : "6px",
          }
          : {
            top: `${pct}%`,
            left: 0,
            height: "1px",
            width: i % 5 === 0 ? "12px" : "6px",
          }}
      />,
    );
    if (i % 2 === 0) {
      marks.push(
        <div
          key={`l${i}`}
          class="rsb-rlabel"
          style={axis === "h"
            ? { left: `${pct}%`, top: "10px" }
            : { top: `${pct}%`, left: "2px" }}
        >
          {pct}
        </div>,
      );
    }
  }
  return <>{marks}</>;
}

export function StampRecursiveContent(
  _props: RecursiveStampContentProps = {},
) {
  const {
    layers,
    selId,
    selIds,
    bg,
    snap,
    grid,
    rulers,
    guides,
    zoom,
    panX,
    panY,
    mode,
  } = useRecursiveStampState();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const ixRef = useRef<IX | null>(null);
  const guideDrag = useRef<{ id: string } | null>(null);
  const marqueeRef = useRef<MarqueeIX | null>(null);
  const panIX = useRef<
    { sx: number; sy: number; px: number; py: number } | null
  >(null);
  const previewDrag = useRef<
    { sx: number; sy: number; ox: number; oy: number } | null
  >(null);
  const previewPosRef = useRef({ x: PREVIEW_INSET, y: PREVIEW_INSET });
  const spaceHeld = useRef(false);
  const clipboard = useRef<RecursiveStampLayer[]>([]);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<StampRow | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPos, setPreviewPos] = useState({
    x: PREVIEW_INSET,
    y: PREVIEW_INSET,
  });
  const [previewDragging, setPreviewDragging] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState("");
  const [creatorMore, setCreatorMore] = useState<StampRow[]>([]);
  const [showCreatorAssets, setShowCreatorAssets] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const { isConnected } = walletContext;
  const { fees } = useFees();
  const [fee, setFee] = useState(1);
  const [BTCPrice, setBTCPrice] = useState(60000);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [previewView, setPreviewView] = useState<"canvas" | "cards">(
    "canvas",
  );
  const [issuance, setIssuance] = useState("1");
  const [issuanceError, setIssuanceError] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [stampName, setStampName] = useState("");
  const [stampNameError, setStampNameError] = useState("");
  const [includeCustomCpid, setIncludeCustomCpid] = useState(false);
  const [useTxHashEndpoint, setUseTxHashEndpoint] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(false);
  const [stampTitle, setStampTitle] = useState("");
  const srcId: RecursiveStampSrcId = useTxHashEndpoint ? "txHash" : "cpid";
  const htmlTitle = includeTitle ? stampTitle.trim() : undefined;
  const [expandedSections, setExpandedSections] = useState<
    Record<RsbPanel, boolean>
  >({
    background: false,
    assets: false,
    text: false,
    layers: false,
    properties: false,
    filters: false,
    selected: false,
  });
  const toggleSection = (section: RsbPanel) => {
    setExpandedSections((prev) => {
      const nextOpen = !prev[section];
      const next = { ...prev, [section]: nextOpen };
      if (
        nextOpen &&
        (section === "background" || section === "assets" ||
          section === "text")
      ) {
        next.background = section === "background";
        next.assets = section === "assets";
        next.text = section === "text";
      }
      return next;
    });
  };
  const [ctxOpen, setCtxOpen] = useState<
    { x: number; y: number } | null
  >(null);
  const [smartLines, setSmartLines] = useState<SmartGuideLine[]>([]);
  const [measureChips, setMeasureChips] = useState<MeasureBadge[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<
    { left: number; top: number; width: number; height: number } | null
  >(null);
  const [textStyle, setTextStyle] = useState<TextStyleDraft>(
    DEFAULT_TEXT_STYLE,
  );
  const [fontSizeInput, setFontSizeInput] = useState(
    String(DEFAULT_TEXT_STYLE.fontSize),
  );
  const [posDraft, setPosDraft] = useState<
    Partial<Record<"x" | "y" | "r", string>>
  >({});
  const primary = getLayer(selId);

  const applyPosDraftInput = (
    key: "x" | "y" | "r",
    rawValue: string,
  ) => {
    if (!primary) return;
    const raw = sanitizePosDraft(rawValue);
    setPosDraft((d) => ({ ...d, [key]: raw }));
    if (
      raw === "" || raw === "-" || raw === "." || raw === "-."
    ) {
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    patchLayer(primary.id, { [key]: capPos(n) });
  };

  const commitPosDraft = (key: "x" | "y" | "r") => {
    if (!primary) return;
    const n = parseFloat(posDraft[key] ?? "");
    const next = Number.isFinite(n) ? capPos(n) : capPos(Number(primary[key]));
    patchLayer(primary.id, { [key]: next });
    setPosDraft((d) => {
      const rest = { ...d };
      delete rest[key];
      return rest;
    });
  };

  const patchTextStyle = (partial: Partial<TextStyleDraft>) => {
    setTextStyle((prev) => ({ ...prev, ...partial }));
    if (primary?.type === "text") {
      patchLayer(primary.id, partial);
    }
  };

  useEffect(() => {
    const layer = getLayer(selId);
    if (layer?.type !== "text") return;
    setExpandedSections((prev) => ({
      ...prev,
      text: true,
      background: false,
      assets: false,
    }));
    setTextStyle({
      font: layer.font ?? DEFAULT_TEXT_STYLE.font,
      fontSize: layer.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
      color: layer.color ?? DEFAULT_TEXT_STYLE.color,
      bold: !!layer.bold,
      italic: !!layer.italic,
      align: layer.align ?? DEFAULT_TEXT_STYLE.align,
    });
    setFontSizeInput(String(
      layer.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
    ));
  }, [selId]);

  useEffect(() => {
    setPosDraft({});
  }, [selId]);

  useEffect(() => {
    const recommended = fees?.recommendedFee;
    if (recommended != null && recommended >= 0.1) {
      setFee(recommended);
    }
    if (typeof fees?.btcPrice === "number" && fees.btcPrice > 0) {
      setBTCPrice(fees.btcPrice);
    }
  }, [fees]);

  const getPreview = async (raw?: string) => {
    const id = (raw ?? query).trim().replace(/^#/, "");
    if (!id) return;
    setFetching(true);
    setFetched(null);
    setPreviewVisible(false);
    setShowCreatorAssets(false);
    setStatus("");
    try {
      const s = await fetchStampById(id);
      if (!s) throw new Error("Stamp not found");
      setFetched(s);
      setPreviewVisible(true);
      const rec = { num: s.stamp ?? 0, hash: s.tx_hash };
      const next = [
        rec,
        ...recent.filter((r) => r.num !== s.stamp),
      ].slice(0, 14);
      setRecent(next);
      lsSet("rsb_recent", next);
      if (s.creator) {
        const others = (await fetchStampsByCreator(s.creator, 20))
          .filter((o) => o.creator === s.creator && o.stamp !== s.stamp)
          .slice(0, 14);
        setCreatorMore(others);
      } else {
        setCreatorMore([]);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Fetch failed");
      setCreatorMore([]);
    } finally {
      setFetching(false);
    }
  };

  const drawGrid = () => {
    const canvasEl = canvasRef.current;
    const gridCanvas = gridRef.current;
    if (!canvasEl || !gridCanvas) return;
    const cssW = canvasEl.clientWidth;
    const cssH = canvasEl.clientHeight;
    const dpr = globalThis.devicePixelRatio || 1;
    gridCanvas.width = Math.max(1, Math.round(cssW * dpr));
    gridCanvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!grid || mode === "preview") return;
    ctx.strokeStyle = "#262626";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_DIV; i++) {
      const x = Math.round(i * cssW / GRID_DIV) + 0.5;
      const y = Math.round(i * cssH / GRID_DIV) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawGrid();
  }, [grid, mode]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => drawGrid());
    ro.observe(el);
    return () => ro.disconnect();
  }, [grid, mode]);

  useEffect(() => {
    setRecent(lsGet<RecentItem[]>("rsb_recent", []));
  }, []);

  const applyPreviewPos = (next: { x: number; y: number }) => {
    if (
      next.x === previewPosRef.current.x &&
      next.y === previewPosRef.current.y
    ) {
      return;
    }
    previewPosRef.current = next;
    setPreviewPos(next);
  };

  const snapPreviewIntoWrap = () => {
    const wrap = wrapRef.current;
    const card = previewCardRef.current;
    if (!wrap || !card) return;
    applyPreviewPos(
      clampPreviewPos(
        previewPosRef.current.x,
        previewPosRef.current.y,
        wrap,
        card,
      ),
    );
  };

  useLayoutEffect(() => {
    snapPreviewIntoWrap();
  }, [fetched, mode, previewVisible]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => snapPreviewIntoWrap());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(rsbZoom.value * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!ctxOpen) return;
    const close = () => setCtxOpen(null);
    const t = setTimeout(
      () => document.addEventListener("click", close),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [ctxOpen]);

  const screenToPct = (clientX: number, clientY: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: (clientX - r.left) / r.width * 100,
      y: (clientY - r.top) / r.height * 100,
    };
  };

  const clearInteractionDecorations = () => {
    setSmartLines([]);
    setMeasureChips([]);
    setMarqueeRect(null);
    marqueeRef.current = null;
  };

  const beginCanvasPointer = (e: PointerLike) => {
    const button = e.button ?? 0;
    if (spaceHeld.current || button === 1) {
      e.preventDefault();
      panIX.current = {
        sx: e.clientX,
        sy: e.clientY,
        px: panX,
        py: panY,
      };
      wrapRef.current?.classList.add("panning");
      return;
    }
    if (mode !== "edit") return;
    if (button !== 0) return;
    if (!isEmptyCanvasTarget(e.target)) return;
    e.preventDefault();
    if (!e.shiftKey) selectLayer(null);
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    marqueeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      wrapSx: e.clientX - wr.left,
      wrapSy: e.clientY - wr.top,
      shift: e.shiftKey,
      startIds: e.shiftKey ? [...rsbSelIds.value] : [],
    };
  };

  const onPointerMove = (
    clientX: number,
    clientY: number,
    shiftKey: boolean,
  ) => {
    const ix = ixRef.current;
    if (previewDrag.current) {
      const wrap = wrapRef.current;
      const card = previewCardRef.current;
      if (!wrap || !card) return;
      const next = clampPreviewPos(
        previewDrag.current.ox + (clientX - previewDrag.current.sx),
        previewDrag.current.oy + (clientY - previewDrag.current.sy),
        wrap,
        card,
      );
      applyPreviewPos(next);
      return;
    }
    if (guideDrag.current) {
      const g = rsbGuides.value.find((x) => x.id === guideDrag.current?.id);
      if (!g) return;
      const p = screenToPct(clientX, clientY);
      patchGuide(g.id, Math.max(0, Math.min(100, g.type === "h" ? p.y : p.x)));
      return;
    }
    if (panIX.current) {
      rsbPanX.value = panIX.current.px + (clientX - panIX.current.sx);
      rsbPanY.value = panIX.current.py + (clientY - panIX.current.sy);
      return;
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      const dist = Math.hypot(clientX - m.startX, clientY - m.startY);
      if (dist > 3) {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const wr = wrap.getBoundingClientRect();
        const x1 = clientX - wr.left;
        const y1 = clientY - wr.top;
        setMarqueeRect({
          left: Math.min(m.wrapSx, x1),
          top: Math.min(m.wrapSy, y1),
          width: Math.abs(x1 - m.wrapSx),
          height: Math.abs(y1 - m.wrapSy),
        });
        const a = screenToPct(m.startX, m.startY);
        const b = screenToPct(clientX, clientY);
        const hits = rsbLayers.value
          .filter((l) => layerHitsMarquee(l, a.x, a.y, b.x, b.y))
          .map((l) => l.id);
        const ids = m.shift ? [...new Set([...m.startIds, ...hits])] : hits;
        setSelection(ids);
      }
      return;
    }
    if (!ix) return;
    const layer = getLayer(ix.id);
    if (!layer) {
      ixRef.current = null;
      return;
    }
    if (ix.type === "drag") {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const dx = (clientX - ix.sx) / r.width * 100;
      const dy = (clientY - ix.sy) / r.height * 100;
      const idMap = new Map(ix.layers.map((o) => [o.id, o]));
      const movingIds = ix.layers.map((o) => o.id);
      const primary = ix.layers.find((o) => o.id === ix.id);
      let extraDx = 0;
      let extraDy = 0;
      if (snap) {
        setSmartLines([]);
        setMeasureChips([]);
      } else if (!shiftKey && primary) {
        const snapped = snapMove(
          primary.ox + dx,
          primary.oy + dy,
          layer.w,
          layer.h,
          movingIds,
          rsbLayers.value,
          rsbGuides.value,
        );
        extraDx = snapped.dx;
        extraDy = snapped.dy;
        setSmartLines(snapped.lines);
        if (ix.layers.length === 1) {
          setMeasureChips(measureBadges({
            ...layer,
            x: primary.ox + dx + extraDx,
            y: primary.oy + dy + extraDy,
          }, rsbLayers.value));
        } else {
          setMeasureChips([]);
        }
      } else {
        setSmartLines([]);
        setMeasureChips([]);
      }
      mutateLayers((ls) =>
        ls.map((l) => {
          const o = idMap.get(l.id);
          if (!o) return l;
          let x = o.ox + dx + extraDx;
          let y = o.oy + dy + extraDy;
          if (snap) {
            x = Math.round((o.ox + dx) / GRID_STEP) * GRID_STEP;
            y = Math.round((o.oy + dy) / GRID_STEP) * GRID_STEP;
          }
          return { ...l, x, y };
        })
      );
    } else if (ix.type === "resize") {
      const p = screenToPct(clientX, clientY);
      const handle = ix.handle;
      const anchor = ix.corners[ANCHOR[handle] ?? "tl"];
      if (!anchor) return;
      const a = layer.r * Math.PI / 180;
      const cos = Math.cos(-a);
      const sin = Math.sin(-a);
      const sdx = p.x - anchor.x;
      const sdy = p.y - anchor.y;
      const ldx = sdx * cos - sdy * sin;
      const ldy = sdx * sin + sdy * cos;
      const MIN = 2;
      let nw = layer.w;
      let nh = layer.h;
      if (["tl", "tr", "bl", "br"].includes(handle)) {
        nw = Math.max(MIN, Math.abs(ldx));
        nh = Math.max(MIN, Math.abs(ldy));
      } else if (["tm", "bm"].includes(handle)) {
        nw = ix.ow;
        nh = Math.max(MIN, Math.abs(ldy));
      } else {
        nw = Math.max(MIN, Math.abs(ldx));
        nh = ix.oh;
      }
      if (shiftKey && ix.aspectRatio) {
        const ar = ix.aspectRatio;
        if (["tl", "tr", "bl", "br"].includes(handle)) {
          if (nw / nh > ar) nh = nw / ar;
          else nw = nh * ar;
        }
      }
      const ncx = (anchor.x + p.x) / 2;
      const ncy = (anchor.y + p.y) / 2;
      patchLayer(layer.id, {
        x: ncx - nw / 2,
        y: ncy - nh / 2,
        w: nw,
        h: nh,
      });
    } else if (ix.type === "rotate") {
      const p = screenToPct(clientX, clientY);
      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      patchLayer(layer.id, {
        r: Math.round(Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90),
      });
    }
  };

  useEffect(() => {
    const move = (e: MouseEvent) =>
      onPointerMove(e.clientX, e.clientY, e.shiftKey);
    const up = () => {
      ixRef.current = null;
      guideDrag.current = null;
      panIX.current = null;
      if (previewDrag.current) {
        previewDrag.current = null;
        setPreviewDragging(false);
      }
      wrapRef.current?.classList.remove("panning");
      clearInteractionDecorations();
    };
    const touchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      if (
        ixRef.current || panIX.current || guideDrag.current ||
        marqueeRef.current || previewDrag.current
      ) {
        e.preventDefault();
      }
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY, e.shiftKey);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", touchMove, { passive: false });
    document.addEventListener("touchend", up);
    document.addEventListener("touchcancel", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", touchMove);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", up);
    };
  }, [snap, grid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (t.isContentEditable) return;
      if (e.key === "?") {
        e.preventDefault();
        openShortcutsModal();
        return;
      }
      if (e.key === "Escape") {
        if (document.getElementById("animation-modal-container")) {
          return;
        }
        selectLayer(null);
        setCtxOpen(null);
        return;
      }
      if (e.key === "0" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        resetZoom();
        return;
      }
      if ((e.key === "=" || e.key === "+") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(rsbZoom.value * 1.2);
        return;
      }
      if (e.key === "-" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(rsbZoom.value / 1.2);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (rsbSelIds.value.length) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (
        rsbSelIds.value.length &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const dx = e.key === "ArrowLeft"
          ? -step
          : e.key === "ArrowRight"
          ? step
          : 0;
        const dy = e.key === "ArrowUp"
          ? -step
          : e.key === "ArrowDown"
          ? step
          : 0;
        nudgeSelected(dx, dy);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && rsbSelId.value) {
        e.preventDefault();
        duplicateSelected();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        selectAll();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        clipboard.current = rsbLayers.value
          .filter((l) => rsbSelIds.value.includes(l.id))
          .map((l) => JSON.parse(JSON.stringify(l)));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "x") {
        e.preventDefault();
        clipboard.current = rsbLayers.value
          .filter((l) => rsbSelIds.value.includes(l.id))
          .map((l) => JSON.parse(JSON.stringify(l)));
        deleteSelected();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        if (!clipboard.current.length) return;
        pushHistory();
        const copies = clipboard.current.map((src) => ({
          ...JSON.parse(JSON.stringify(src)) as RecursiveStampLayer,
          id: `l${Date.now()}${Math.random()}`,
          x: src.x + 2,
          y: src.y + 2,
        }));
        rsbLayers.value = [...rsbLayers.value, ...copies];
        rsbSelIds.value = copies.map((c) => c.id);
        rsbSelId.value = copies[copies.length - 1]?.id ?? null;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
      }
      if (!e.metaKey && !e.ctrlKey && e.shiftKey) {
        if (e.key === "H" || e.key === "h") {
          e.preventDefault();
          flipSelected("h");
        }
        if (e.key === "V" || e.key === "v") {
          e.preventDefault();
          flipSelected("v");
        }
      }
      if (e.code === "Space" && !spaceHeld.current) {
        spaceHeld.current = true;
        wrapRef.current?.classList.add("pan-ready");
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        wrapRef.current?.classList.remove("pan-ready");
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const onElPointer = (
    e: PointerLike,
    layer: RecursiveStampLayer,
  ) => {
    if (mode !== "edit") return;
    if (spaceHeld.current) return;
    e.stopPropagation();
    const t = e.target as HTMLElement;
    if (layer.locked) {
      selectLayer(layer.id, e.shiftKey);
      return;
    }
    if (t.dataset.rot) {
      pushHistory();
      selectLayer(layer.id);
      ixRef.current = { type: "rotate", id: layer.id };
      return;
    }
    if (t.dataset.h) {
      pushHistory();
      selectLayer(layer.id);
      ixRef.current = {
        type: "resize",
        id: layer.id,
        handle: t.dataset.h,
        corners: corners(layer),
        ow: layer.w,
        oh: layer.h,
        aspectRatio: layer.w / layer.h,
      };
      return;
    }
    selectLayer(layer.id, e.shiftKey);
    if (!e.shiftKey) {
      pushHistory();
      const dragLayers = rsbSelIds.value.length
        ? rsbLayers.value.filter((l) =>
          rsbSelIds.value.includes(l.id) || l.id === layer.id
        )
        : [layer];
      ixRef.current = {
        type: "drag",
        id: layer.id,
        sx: e.clientX,
        sy: e.clientY,
        layers: dragLayers.map((l) => ({ id: l.id, ox: l.x, oy: l.y })),
      };
    }
  };

  const onGenerate = () => {
    if (!layers.length) {
      showToast("Canvas is empty - add some assets.", "warning");
      return;
    }
    setPreviewView("canvas");
    enterPreview(
      buildRecursiveStampHtml(layers, bg, false, srcId, htmlTitle),
    );
  };

  const handleStamp = () => {
    if (!isConnected) {
      walletContext.showConnectModal();
    }
  };

  const handleIssuanceChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    if (/^\d*$/.test(value)) {
      setIssuance(value === "" ? "1" : value);
      setIssuanceError("");
    } else {
      setIssuanceError("Please enter a valid number.");
    }
  };

  const handleStampNameChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    if (value === "" || value === "A") {
      setStampName(value);
      setStampNameError("");
      return;
    }
    if (!value.startsWith("A")) {
      setStampNameError("Custom CPID must start with 'A'");
      return;
    }
    const numStr = value.slice(1);
    try {
      const num = BigInt(numStr);
      const min = BigInt(26) ** BigInt(12) + BigInt(1);
      const max = BigInt("18446744073709551615");
      if (num >= min && num <= max) {
        setStampName(value);
        setStampNameError("");
      } else {
        setStampNameError(
          `Number must be between ${min.toString()} and ${max.toString()}`,
        );
      }
    } catch (error) {
      setStampNameError("Invalid number format after 'A', error: " + error);
    }
  };

  const openSearch = () => {
    openSearchStampPicker({
      onPick: (id) => {
        setQuery(id);
        getPreview(id);
      },
    });
  };

  const dismissPreview = () => {
    previewDrag.current = null;
    setPreviewDragging(false);
    setPreviewVisible(false);
    setShowCreatorAssets(false);
  };

  const resetComposer = () => {
    if (
      !confirm("Clear the canvas and reset the editor?")
    ) {
      return;
    }
    clearAllLayers();
    setQuery("");
    setFetched(null);
    setStatus("");
    setCreatorMore([]);
    setFetching(false);
    dismissPreview();
    previewPosRef.current = { x: PREVIEW_INSET, y: PREVIEW_INSET };
    setPreviewPos({ x: PREVIEW_INSET, y: PREVIEW_INSET });
    setTextStyle(DEFAULT_TEXT_STYLE);
    setFontSizeInput(String(DEFAULT_TEXT_STYLE.fontSize));
    setIssuance("1");
    setIssuanceError("");
    setStampName("");
    setStampNameError("");
    setIncludeCustomCpid(false);
    setUseTxHashEndpoint(false);
    setIncludeTitle(false);
    setStampTitle("");
    setTosAgreed(false);
    setPreviewView("canvas");
    const recommended = fees?.recommendedFee;
    setFee(
      recommended != null && recommended >= 0.1 ? recommended : 1,
    );
  };

  const previewSrc = fetched
    ? layerDisplaySrc({
      b64: fetched.stamp_base64,
      mime: fetched.stamp_mimetype,
      ident: fetched.ident,
      stamp_url: fetched.stamp_url,
      url: fetched.stamp_url,
    })
    : "";

  const assetPreviewOpen = Boolean(
    fetched && previewVisible && mode === "edit",
  );

  const generatedHtml = buildRecursiveStampHtml(
    layers,
    bg,
    false,
    srcId,
    htmlTitle,
  );
  const generatedPreviewHtml = mode === "preview"
    ? buildRecursiveStampHtml(layers, bg, true, srcId, htmlTitle)
    : "";
  const generatedPreviewStamp = mode === "preview"
    ? buildGeneratedStampRow({
      html: generatedPreviewHtml,
      issuance,
      stampName: includeCustomCpid ? stampName : "",
      creator: isConnected ? walletContext.wallet.address : "",
      creatorName: isConnected ? null : "Connect Wallet",
      locked: isLocked,
    })
    : null;

  const onViewCode = () => {
    openModal(<PreviewCodeModal src={generatedHtml} />, "zoomInOut");
  };

  return (
    <div class="flex flex-col w-full pt-3">
      <style>{CANVAS_CSS}</style>
      <CreateStampRecursiveHeader />
      <div class="flex flex-col-reverse mobileLg:flex-row w-full gap-3 pt-3">
        <div
          class={`w-full mobileLg:w-[320px] mobileLg:shrink-0
            h-[700px] mobileLg:h-[640px] min-[1080px]:h-[690px]
            flex flex-col overflow-hidden p-5
            ${container2}`}
        >
          <h2 class={`${subtitlePrimary} -mt-2.5`}>
            {mode === "preview" ? "STAMP" : "COMPOSER"}
          </h2>
          <div
            class={`flex flex-1 flex-col pr-1
              mobileLg:min-h-0 mobileLg:overflow-y-auto
              ${mode === "preview" ? "hidden" : ""}`}
          >
            <CollapsibleSection
              title="BACKGROUND"
              variant="collapsibleTitle"
              expanded={expandedSections.background}
              toggle={() => toggleSection("background")}
            >
              <SectionBody>
                <ColorPicker
                  value={bg}
                  onChange={(hex) => {
                    rsbBg.value = hex;
                  }}
                  showValue
                  ariaLabel="Background color"
                />
              </SectionBody>
            </CollapsibleSection>

            <CollapsibleSection
              title="ASSETS"
              variant="collapsibleTitle"
              expanded={expandedSections.assets}
              toggle={() => toggleSection("assets")}
            >
              <SectionBody>
                <div class="flex flex-col gap-1">
                  <h5 class={labelXs}>STAMP</h5>
                  <div class="flex items-center gap-1.5">
                    <div
                      class={`${container2Icon}`}
                    >
                      <Icon
                        type="iconButton"
                        name="search"
                        weight="normal"
                        size="md"
                        color="neutral400"
                        ariaLabel="Browse stamps"
                        onClick={(e) => {
                          e.preventDefault();
                          openSearch();
                        }}
                      />
                    </div>
                    <form
                      class="flex-1 min-w-0"
                      onSubmit={(e) => {
                        e.preventDefault();
                        getPreview();
                      }}
                    >
                      <InputField
                        type="text"
                        placeholder="STAMP #, CPID OR TX HASH"
                        value={query}
                        onInput={(e) =>
                          setQuery(
                            (e.currentTarget as HTMLInputElement).value,
                          )}
                      />
                    </form>
                    <div
                      class={`${container2Icon}`}
                    >
                      <Icon
                        type="iconButton"
                        name={fetching
                          ? "loading"
                          : assetPreviewOpen
                          ? "hide"
                          : "view"}
                        weight="normal"
                        size="md"
                        color="neutral400"
                        className={fetching ? "animate-spin" : ""}
                        ariaLabel={assetPreviewOpen
                          ? "Hide preview"
                          : "Preview stamp"}
                        onClick={(e) => {
                          e.preventDefault();
                          if (fetching) return;
                          if (assetPreviewOpen) {
                            dismissPreview();
                            return;
                          }
                          getPreview();
                        }}
                      />
                    </div>
                  </div>
                </div>
                {status && !fetched && (
                  <p class={messageError}>
                    {status}
                  </p>
                )}
                {recent.length > 0 && (
                  <>
                    <hr class="my-3" />
                    <div class="flex flex-col gap-1">
                      <h5 class={labelXs}>RECENT</h5>
                      <div class="grid grid-cols-5 min-[420px]:grid-cols-6
                      mobileMd:grid-cols-7 mobileLg:grid-cols-5 gap-3">
                        {recent.map((r, i) => (
                          <button
                            type="button"
                            key={r.hash || r.num}
                            class={`${container2Hover} ${shadowGlowPurpleSm} !rounded-xl aspect-square overflow-hidden p-0
                            ${
                              i >= 12
                                ? "hidden mobileMd:block mobileLg:hidden"
                                : i >= 10
                                ? "hidden min-[420px]:block mobileLg:hidden"
                                : ""
                            }`}
                            onClick={() => {
                              const id = r.num ? String(r.num) : r.hash;
                              setQuery(id);
                              getPreview(id);
                            }}
                          >
                            <StampThumb
                              src={r.num != null
                                ? getStampPreviewUrl(
                                  { stamp: r.num } as StampRow,
                                  { placeholderOnFail: true },
                                )
                                : undefined}
                              alt={`#${r.num}`}
                              placeholderClassName="!rounded-xl"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </SectionBody>
            </CollapsibleSection>

            <CollapsibleSection
              title="TEXT"
              variant="collapsibleTitle"
              expanded={expandedSections.text}
              toggle={() => toggleSection("text")}
            >
              <SectionBody>
                <div class="flex flex-col gap-3">
                  <div class="flex flex-col gap-3">
                    <div class="flex justify-between gap-3">
                      <select
                        class={`${inputField} flex-1 min-w-0`}
                        value={textStyle.font}
                        onChange={(e) =>
                          patchTextStyle({
                            font: (e.target as HTMLSelectElement).value,
                          })}
                      >
                        {RECURSIVE_STAMP_FONT_GROUPS.map((g) => (
                          <optgroup key={g.generic} label={g.label}>
                            {g.fonts.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <label class="relative w-18 shrink-0">
                        <input
                          type="number"
                          class={`${inputNumeric} !pr-9 text-right`}
                          value={fontSizeInput}
                          step="0.5"
                          min={0.5}
                          max={100}
                          aria-label="Text size as percent of height"
                          onInput={(e) => {
                            const raw = (e.target as HTMLInputElement).value;
                            if (raw.trim() === "") {
                              setFontSizeInput(raw);
                              return;
                            }
                            const n = parseFloat(raw);
                            if (!Number.isFinite(n)) {
                              setFontSizeInput(raw);
                              return;
                            }
                            if (n > 100) {
                              setFontSizeInput("100");
                              patchTextStyle({ fontSize: 100 });
                              return;
                            }
                            setFontSizeInput(raw);
                            patchTextStyle({
                              fontSize: clampFontSize(n),
                            });
                          }}
                          onBlur={() => {
                            const n = parseFloat(fontSizeInput);
                            const next = Number.isFinite(n)
                              ? clampFontSize(n)
                              : textStyle.fontSize;
                            setFontSizeInput(String(next));
                            patchTextStyle({ fontSize: next });
                          }}
                        />
                        <span
                          class={`${labelXs} absolute right-3 top-1/2
                            -translate-y-1/2 pointer-events-none`}
                        >
                          %H
                        </span>
                      </label>
                    </div>
                    <div class="flex justify-between">
                      <div class={container2Icon}>
                        <ColorPicker
                          value={textStyle.color}
                          onChange={(hex) => patchTextStyle({ color: hex })}
                          ariaLabel="Text color"
                        />
                      </div>
                      <div class={container2Icon}>
                        <PlaceholderIcon
                          name="bold"
                          label="Bold"
                          active={textStyle.bold}
                          onClick={() =>
                            patchTextStyle({ bold: !textStyle.bold })}
                        />
                        <PlaceholderIcon
                          name="italic"
                          label="Italic"
                          active={textStyle.italic}
                          onClick={() =>
                            patchTextStyle({
                              italic: !textStyle.italic,
                            })}
                        />
                      </div>
                      <div class={container2Icon}>
                        {(
                          [
                            ["left", "justifyLeft", "Align left"],
                            ["center", "justifyCenter", "Align center"],
                            ["right", "justifyRight", "Align right"],
                          ] as const
                        ).map(([a, name, label]) => (
                          <PlaceholderIcon
                            key={a}
                            name={name}
                            label={label}
                            active={textStyle.align === a}
                            onClick={() => patchTextStyle({ align: a })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="flat"
                    color="neutral"
                    class="w-full"
                    disabled={mode !== "edit"}
                    onClick={() => {
                      addTextLayer(textStyle);
                      showToast(
                        "Text added to canvas — double-click to edit.",
                        "info",
                      );
                    }}
                  >
                    + ADD TEXT
                  </Button>
                </div>
              </SectionBody>
            </CollapsibleSection>

            {layers.length > 0 && (
              <CollapsibleSection
                title={`LAYERS - ${layers.length}`}
                variant="collapsibleTitle"
                expanded={expandedSections.layers}
                toggle={() => toggleSection("layers")}
              >
                <SectionBody>
                  <div class="flex flex-col gap-3">
                    {[...layers].reverse().map((l) => (
                      <div
                        key={l.id}
                        class={`flex items-center ${container3} !rounded-full p-0.5 gap-1.5
                  hover:border-color-hover ${transitionColors}
                  hover:shadow-[0px_0px_8px_2px_color-mix(in_srgb,var(--color-primary-500)_75%,transparent)]
                  ${
                          l.id === selId
                            ? "border-color-primary-400 cursor-default"
                            : "cursor-pointer"
                        }
                  ${!l.vis ? "opacity-50" : ""}`}
                        onClick={(e) =>
                          selectLayer(l.id, (e as MouseEvent).shiftKey)}
                        draggable={!l.locked}
                        onDragStart={(e) => {
                          e.dataTransfer?.setData("text/plain", l.id);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const src = e.dataTransfer?.getData("text/plain");
                          if (src) reorderLayers(src, l.id);
                        }}
                      >
                        <div class="w-7 h-7 overflow-hidden shrink-0 flex
                  items-center justify-center bg-color-neutral-900
                  rounded-full border border-color-neutral-700">
                          {l.type === "text"
                            ? (
                              <span class="text-color-primary-400 font-bold text-xs">
                                T
                              </span>
                            )
                            : (
                              <StampThumb
                                src={staticLayerThumbSrc(l)}
                                alt={l.name}
                                mime={l.mime}
                                className="w-full h-full object-contain pixelart rounded-full"
                                placeholderClassName="!rounded-full !p-[15%]"
                              />
                            )}
                        </div>
                        <span
                          class={`${textXs} flex-1 truncate`}
                          onDblClick={(e) => beginLayerRename(e, l)}
                        >
                          {l.name}
                        </span>
                        <Icon
                          type="iconButton"
                          name={l.locked ? "locked" : "unlocked"}
                          weight="bold"
                          size="md"
                          color={l.locked ? "primary400" : "neutral400"}
                          ariaLabel="Lock layer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLayerLock(l.id);
                          }}
                        />
                        <Icon
                          type="iconButton"
                          name="caretUp"
                          weight="bold"
                          size="md"
                          color="neutral400"
                          ariaLabel="Move up"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveLayer(l.id, 1);
                          }}
                        />
                        <Icon
                          type="iconButton"
                          name="caretDown"
                          weight="bold"
                          size="md"
                          color="neutral400"
                          ariaLabel="Move down"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveLayer(l.id, -1);
                          }}
                        />
                        <Icon
                          type="iconButton"
                          name={l.vis ? "view" : "hide"}
                          weight="bold"
                          size="md"
                          color="neutral400"
                          ariaLabel="Toggle visibility"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLayerVis(l.id);
                          }}
                        />
                        <Icon
                          type="iconButton"
                          name="close"
                          weight="bold"
                          size="md"
                          color="neutral400"
                          ariaLabel="Delete layer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteLayer(l.id);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    color="neutral"
                    class="w-full mt-3"
                    disabled={!primary || mode !== "edit"}
                    onClick={() => duplicateSelected()}
                  >
                    DUPLICATE
                  </Button>
                </SectionBody>
              </CollapsibleSection>
            )}

            {primary && (
              <>
                <CollapsibleSection
                  title="PROPERTIES"
                  variant="collapsibleTitle"
                  expanded={expandedSections.properties}
                  toggle={() => toggleSection("properties")}
                >
                  <SectionBody>
                    <div class="flex flex-col gap-3">
                      <div class="flex justify-between gap-3">
                        {([
                          ["X POSITION", "x"],
                          ["Y POSITION", "y"],
                        ] as const).map(([unit, key]) => (
                          <label key={key} class="relative min-w-0 flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              class={`${inputNumeric} text-right !pl-20`}
                              value={posDraft[key] ??
                                formatPos(Number(primary[key]))}
                              aria-label={unit}
                              onInput={(e) =>
                                applyPosDraftInput(
                                  key,
                                  (e.target as HTMLInputElement).value,
                                )}
                              onBlur={() =>
                                commitPosDraft(key)}
                            />
                            <span
                              class={`${labelXs} absolute left-2.5 top-1/2
                                -translate-y-1/2 pointer-events-none`}
                            >
                              {unit}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div class="flex justify-between gap-3">
                        {([
                          ["% WIDTH", "w"],
                          ["% HEIGHT", "h"],
                        ] as const).map(([unit, key]) => (
                          <label key={key} class="relative min-w-0 flex-1">
                            <input
                              type="number"
                              class={`${inputNumeric} text-right !pr-[74px]`}
                              value={Math.round(Number(primary[key]))}
                              step="1"
                              aria-label={unit}
                              onInput={(e) => {
                                const v = Math.round(
                                  parseFloat(
                                    (e.target as HTMLInputElement).value,
                                  ) || 0,
                                );
                                patchLayer(primary.id, { [key]: v });
                              }}
                            />
                            <span
                              class={`${labelXs} absolute right-2.5 top-1/2
                                -translate-y-1/2 pointer-events-none`}
                            >
                              {unit}
                            </span>
                          </label>
                        ))}
                      </div>
                      <label class="relative min-w-0 w-full">
                        <input
                          type="text"
                          inputMode="decimal"
                          class={`${inputNumeric} text-right !pl-20 !pr-4`}
                          value={posDraft.r ??
                            formatPos(Number(primary.r))}
                          aria-label="ROTATION"
                          onInput={(e) =>
                            applyPosDraftInput(
                              "r",
                              (e.target as HTMLInputElement).value,
                            )}
                          onBlur={() => commitPosDraft("r")}
                        />
                        <span
                          class={`${labelXs} absolute left-2.5 top-1/2
                            -translate-y-1/2 pointer-events-none`}
                        >
                          ROTATION
                        </span>
                        <span
                          aria-hidden="true"
                          class="absolute right-2.5 top-1/2 -translate-y-[70%]
                            pointer-events-none text-[0.625rem] leading-none
                            text-color-neutral-500"
                        >
                          °
                        </span>
                      </label>
                    </div>
                    <label class="flex flex-col gap-0.5 mt-2">
                      <span class={`${labelXs} flex w-full justify-between`}>
                        <span>OPACITY</span>
                        <span class="text-color-neutral-200">
                          {Math.round(primary.op * 100)}%
                        </span>
                      </span>
                      <RangeSlider
                        value={primary.op}
                        min={0}
                        max={1}
                        onChange={(v) => patchLayer(primary.id, { op: v })}
                      />
                    </label>
                    <div class="flex justify-between gap-3 mt-3">
                      <Button
                        variant={primary.flipH ? "flat" : "outline"}
                        color="neutral"
                        onClick={() => flipSelected("h")}
                      >
                        FLIP H
                      </Button>
                      <Button
                        variant={primary.flipV ? "flat" : "outline"}
                        color="neutral"
                        onClick={() => flipSelected("v")}
                      >
                        FLIP V
                      </Button>
                      <Button
                        variant="outline"
                        color="neutral"
                        disabled={mode !== "edit"}
                        onClick={() => centerSelected()}
                      >
                        CENTER
                      </Button>
                    </div>
                  </SectionBody>
                </CollapsibleSection>
                <CollapsibleSection
                  title="FILTERS"
                  variant="collapsibleTitle"
                  expanded={expandedSections.filters}
                  toggle={() => toggleSection("filters")}
                >
                  <SectionBody>
                    <div class="flex flex-col gap-3">
                      <div class="flex flex-col gap-3">
                        {([
                          ["brightness", "BRIGHTNESS", 0, 200, "%"],
                          ["contrast", "CONTRAST", 0, 200, "%"],
                          ["saturate", "SATURATE", 0, 200, "%"],
                          ["hue", "HUE ROTATE", 0, 360, "°"],
                          ["grayscale", "GRAYSCALE", 0, 100, "%"],
                        ] as const).map(([key, label, min, max, unit]) => (
                          <label key={key} class="flex flex-col gap-0.5">
                            <span
                              class={`${labelXs} flex w-full justify-between`}
                            >
                              <span>{label}</span>
                              <span class="text-color-neutral-200">
                                {primary.filters[key]}
                                {unit}
                              </span>
                            </span>
                            <RangeSlider
                              value={primary.filters[key]}
                              min={min}
                              max={max}
                              onChange={(v) => {
                                patchLayer(primary.id, {
                                  filters: {
                                    ...primary.filters,
                                    [key]: Math.round(v),
                                  },
                                });
                              }}
                            />
                          </label>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        color="neutral"
                        onClick={() => {
                          pushHistory();
                          patchLayer(primary.id, {
                            filters: defaultRecursiveFilters(),
                          });
                        }}
                      >
                        RESET FILTERS
                      </Button>
                    </div>
                  </SectionBody>
                </CollapsibleSection>
              </>
            )}
            {selIds.length > 1 && (
              <CollapsibleSection
                title={`${selIds.length} SELECTED`}
                variant="collapsibleTitle"
                expanded={expandedSections.selected}
                toggle={() => toggleSection("selected")}
              >
                <SectionBody>
                  <div class="grid grid-cols-3 gap-1">
                    {[
                      ["left", "⇤"],
                      ["hcenter", "⇔"],
                      ["right", "⇥"],
                      ["top", "⤒"],
                      ["vcenter", "⇕"],
                      ["bottom", "⤓"],
                      ["dh", "↔"],
                      ["dv", "↕"],
                    ].map(([modeKey, label]) => (
                      <Button
                        key={modeKey}
                        variant="outline"
                        color="neutral"
                        onClick={() => alignSelected(modeKey)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </SectionBody>
              </CollapsibleSection>
            )}
          </div>
          <div
            class={`flex min-h-0 flex-1 flex-col
              ${mode === "preview" ? "" : "hidden"}`}
          >
            <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-3">
                  <h5 class={text}>
                    EDITIONS
                  </h5>
                  <div
                    class="w-9 tablet:w-10 shrink-0"
                    style={issuance.length > 1
                      ? {
                        width: `calc(${issuance.length}ch + 1.5rem + 2px)`,
                      }
                      : undefined}
                  >
                    <InputField
                      type="text"
                      value={issuance}
                      onChange={handleIssuanceChange}
                      error={issuanceError}
                      textAlign="center"
                    />
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <h5 class={labelSm}>
                    {isLocked ? "LOCKED" : "UNLOCKED"}
                  </h5>
                  <ToggleSwitchButton
                    isActive={!isLocked}
                    onToggle={() => setIsLocked((prev) => !prev)}
                    toggleButtonId="switch-toggle-locked"
                  />
                </div>
                <div class="flex items-center justify-between gap-3">
                  {includeCustomCpid
                    ? (
                      <div class="flex-1 min-w-0">
                        <InputField
                          type="text"
                          value={stampName}
                          onChange={handleStampNameChange}
                          placeholder="CUSTOM CPID"
                          maxLength={21}
                          minLength={15}
                          error={stampNameError}
                        />
                      </div>
                    )
                    : <h5 class={labelSm}>AUTO GENERATE CPID</h5>}
                  <ToggleSwitchButton
                    isActive={includeCustomCpid}
                    onToggle={() => {
                      const next = !includeCustomCpid;
                      setIncludeCustomCpid(next);
                      if (!next) {
                        setStampName("");
                        setStampNameError("");
                      }
                    }}
                    toggleButtonId="switch-toggle-cpid"
                  />
                </div>
                <hr />
                <div class="flex items-center justify-between gap-3">
                  {includeTitle
                    ? (
                      <div class="flex-1 min-w-0">
                        <InputField
                          type="text"
                          value={stampTitle}
                          placeholder="TITLE"
                          onInput={(e) => {
                            const value =
                              (e.currentTarget as HTMLInputElement).value;
                            setStampTitle(value);
                            if (mode === "preview") {
                              setPreviewHtml(
                                buildRecursiveStampHtml(
                                  layers,
                                  bg,
                                  false,
                                  srcId,
                                  value.trim() || undefined,
                                ),
                              );
                            }
                          }}
                        />
                      </div>
                    )
                    : <h5 class={labelSm}>NO HTML TITLE</h5>}
                  <ToggleSwitchButton
                    isActive={includeTitle}
                    onToggle={() => {
                      const next = !includeTitle;
                      setIncludeTitle(next);
                      if (!next) setStampTitle("");
                      if (mode === "preview") {
                        setPreviewHtml(
                          buildRecursiveStampHtml(
                            layers,
                            bg,
                            false,
                            srcId,
                            next ? stampTitle.trim() : undefined,
                          ),
                        );
                      }
                    }}
                    toggleButtonId="switch-toggle-title"
                  />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <h5 class={labelSm}>
                    {useTxHashEndpoint ? "TXHASH STRING" : "CPID STRING"}
                  </h5>
                  <ToggleSwitchButton
                    isActive={useTxHashEndpoint}
                    onToggle={() => {
                      const next = !useTxHashEndpoint;
                      setUseTxHashEndpoint(next);
                      if (mode === "preview") {
                        setPreviewHtml(
                          buildRecursiveStampHtml(
                            layers,
                            bg,
                            false,
                            next ? "txHash" : "cpid",
                            htmlTitle,
                          ),
                        );
                      }
                    }}
                    toggleButtonId="switch-toggle-endpoint"
                  />
                </div>
              </div>
            </div>
            <div class="shrink-0">
              <hr class="my-3" />
              <FeeCalculatorBase
                fee={fee}
                handleChangeFee={setFee}
                type="stamp"
                fileType="text/html"
                fileSize={generatedHtml.length}
                issuance={parseInt(issuance, 10)}
                BTCPrice={BTCPrice}
                showCoinToggle
                tosAgreed={tosAgreed}
                onTosChange={setTosAgreed}
                isSubmitting={false}
                onSubmit={handleStamp}
                buttonName={isConnected ? "STAMP" : "CONNECT WALLET"}
                bitname=""
                {...(includeCustomCpid && stampName ? { cpid: stampName } : {})}
                feeDetails={{
                  minerFee: 0,
                  dustValue: 0,
                  totalValue: 0,
                  hasExactFees: false,
                  estimatedSize: 300,
                }}
              />
            </div>
          </div>
          {mode !== "preview" && (
            <div class="flex gap-5 pt-5 shrink-0">
              <Button
                variant="flat"
                color="neutral"
                class="w-full"
                disabled={!layers.length}
                onClick={resetComposer}
              >
                CLEAR
              </Button>
              <Button
                variant="flat"
                color="primary"
                class="w-full"
                onClick={onGenerate}
              >
                GENERATE
              </Button>
            </div>
          )}
        </div>

        {/* CANVAS */}
        <div
          class={`w-full mobileLg:flex-1 min-w-0
            h-[340px] min-[480px]:h-[400px] mobileMd:h-[480px]
            mobileLg:h-[640px] min-[1080px]:h-[690px]
            flex flex-col overflow-hidden ${container2}`}
        >
          <div
            ref={wrapRef}
            class={`rsb-wrap h-full rounded-2xl ${rulers ? "rulers-on" : ""} ${
              mode === "preview" ? "preview" : ""
            } ${
              mode === "preview" && previewView === "canvas"
                ? "bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80"
                : ""
            }`}
            onMouseDown={(e) => beginCanvasPointer(e)}
            onTouchStart={(e) => {
              if (e.touches.length !== 1) return;
              beginCanvasPointer(pointerFromTouch(e, e.touches[0]));
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const el = (e.target as HTMLElement).closest(".rsb-el") as
                | HTMLElement
                | null;
              if (el?.dataset.id) {
                if (!rsbSelIds.value.includes(el.dataset.id)) {
                  selectLayer(el.dataset.id);
                }
              }
              setCtxOpen({ x: e.clientX, y: e.clientY });
            }}
          >
            <div
              ref={canvasRef}
              class={`rsb-canvas${
                mode === "preview" && previewView === "cards" ? " hidden" : ""
              }`}
              style={{
                background: bg,
                transform: `translate(${panX}px,${panY}px) scale(${zoom})`,
              }}
            >
              <canvas ref={gridRef} class="rsb-grid" />
              {mode === "preview" && previewView === "canvas" && (
                <iframe
                  class="rsb-preview-frame"
                  title="Stamp preview"
                  srcDoc={generatedPreviewHtml}
                />
              )}
              {mode === "edit" && layers.length === 0 && (
                <div class="absolute inset-0 flex items-center justify-center
                text-color-neutral-500 text-xs uppercase pointer-events-none select-none">
                  Add assets and/or text
                </div>
              )}
              {mode === "edit" && guides.map((g) => (
                <div
                  key={g.id}
                  class={`rsb-guide rsb-guide-${g.type}`}
                  style={g.type === "h"
                    ? { top: `${g.pos}%` }
                    : { left: `${g.pos}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    guideDrag.current = { id: g.id };
                  }}
                  onTouchStart={(e) => {
                    if (e.touches.length !== 1) return;
                    e.stopPropagation();
                    e.preventDefault();
                    guideDrag.current = { id: g.id };
                  }}
                  onDblClick={() => removeGuide(g.id)}
                >
                  <div class="rsb-glabel">{g.pos.toFixed(1)}%</div>
                </div>
              ))}
              {mode === "edit" && layers.map((l, z) => {
                const isSel = l.id === selId;
                const isMulti = selIds.includes(l.id) && !isSel;
                return (
                  <div
                    key={l.id}
                    data-id={l.id}
                    class={`rsb-el${isSel ? " sel" : ""}${
                      isMulti ? " multi" : ""
                    }`}
                    style={{
                      left: `${l.x}%`,
                      top: `${l.y}%`,
                      width: `${l.w}%`,
                      height: `${l.h}%`,
                      transform: layerTransformCss(l),
                      opacity: l.op,
                      display: l.vis ? "block" : "none",
                      zIndex: z,
                      filter: layerFilterCss(l) || undefined,
                    }}
                    onMouseDown={(e) => onElPointer(e, l)}
                    onTouchStart={(e) => {
                      if (e.touches.length !== 1) return;
                      e.preventDefault();
                      onElPointer(pointerFromTouch(e, e.touches[0]), l);
                    }}
                    onDblClick={(e) => {
                      if (l.type !== "text") return;
                      const inner = (e.currentTarget as HTMLElement)
                        .querySelector(".rsb-text") as HTMLElement | null;
                      if (!inner) return;
                      pushHistory();
                      inner.contentEditable = "true";
                      inner.classList.add("editing");
                      inner.focus();
                      const finish = () => {
                        patchLayer(l.id, {
                          text: inner.textContent ?? "",
                          name: (inner.textContent ?? "").slice(0, 20) ||
                            "Text",
                        });
                        inner.contentEditable = "false";
                        inner.classList.remove("editing");
                        inner.removeEventListener("blur", finish);
                      };
                      inner.addEventListener("blur", finish);
                    }}
                  >
                    {l.type === "text"
                      ? (
                        <div
                          class="rsb-text"
                          style={{
                            fontFamily: recursiveStampFontFamily(l.font),
                            fontSize: `${l.fontSize}cqh`,
                            color: l.color,
                            fontWeight: l.bold ? "bold" : "normal",
                            fontStyle: l.italic ? "italic" : "normal",
                            textAlign: l.align,
                          }}
                        >
                          {l.text}
                        </div>
                      )
                      : (
                        <div class="rsb-inner">
                          <CanvasLayerMedia layer={l} />
                        </div>
                      )}
                    <div class="rsb-sel">
                      <div class="rsb-ring" />
                      <div class="rsb-rotline" />
                      <div class="rsb-rot" data-rot="1" />
                      {["tl", "tr", "bl", "br", "tm", "bm", "ml", "mr"]
                        .map((h) => (
                          <div
                            key={h}
                            class={`rsb-h h-${h}`}
                            data-h={h}
                          />
                        ))}
                    </div>
                  </div>
                );
              })}
              {smartLines.map((g, i) => (
                <div
                  key={`smart-${g.type}-${g.pos}-${i}`}
                  class={`rsb-smart rsb-smart-${g.type}`}
                  style={g.type === "h"
                    ? { top: `${g.pos}%` }
                    : { left: `${g.pos}%` }}
                />
              ))}
              {measureChips.map((b, i) => (
                <div
                  key={`measure-${i}`}
                  class="rsb-measure"
                  style={{ left: `${b.left}%`, top: `${b.top}%` }}
                >
                  {b.text}
                </div>
              ))}
            </div>
            {marqueeRect && (
              <div
                class="rsb-marquee"
                style={{
                  display: "block",
                  left: marqueeRect.left,
                  top: marqueeRect.top,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            )}
            <div class="rsb-ruler rsb-ruler-h">
              <RulerTicks axis="h" />
            </div>
            <div class="rsb-ruler rsb-ruler-v">
              <RulerTicks axis="v" />
            </div>
            {fetched && previewVisible && mode === "edit" && (
              <div
                ref={previewCardRef}
                class={`rsb-preview w-[260px] p-1
                  select-none ${container3} ${
                  previewDragging ? "dragging" : ""
                }`}
                style={{
                  left: `${previewPos.x}px`,
                  top: `${previewPos.y}px`,
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  const t = e.target as HTMLElement;
                  if (t.closest("button") || t.closest("a")) return;
                  e.preventDefault();
                  e.stopPropagation();
                  previewDrag.current = {
                    sx: e.clientX,
                    sy: e.clientY,
                    ox: previewPosRef.current.x,
                    oy: previewPosRef.current.y,
                  };
                  setPreviewDragging(true);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <AssetPreviewCard
                  stamp={fetched}
                  previewSrc={previewSrc}
                  more={creatorMore}
                  onAdd={() => {
                    addStampLayer(fetched);
                    dismissPreview();
                    showToast(
                      `Stamp #${fetched.stamp} added to canvas.`,
                      "success",
                    );
                  }}
                  showCreatorAssets={showCreatorAssets}
                  onToggleCreatorAssets={() => setShowCreatorAssets((v) => !v)}
                  onPick={(id) => {
                    setQuery(id);
                    getPreview(id);
                  }}
                />
              </div>
            )}
            {mode === "preview" && previewView === "cards" &&
              generatedPreviewStamp && (
              <div class="absolute inset-0 z-[8700] min-w-0 overflow-x-hidden
                overflow-y-auto min-[480px]:overflow-hidden p-3 flex
                items-start min-[480px]:items-center justify-center">
                <div class="flex flex-col min-[480px]:flex-row gap-3
                  items-center min-[480px]:items-start">
                  <div class="flex flex-col gap-3">
                    <div class="flex gap-3 items-end">
                      <div class="w-12 h-12 shrink-0">
                        <StampCard
                          stamp={generatedPreviewStamp}
                          variant="cardSquare"
                          previewHtml={generatedPreviewHtml}
                        />
                      </div>
                      <div class="w-24 h-24 shrink-0">
                        <StampCard
                          stamp={generatedPreviewStamp}
                          variant="cardSquare"
                          previewHtml={generatedPreviewHtml}
                        />
                      </div>
                    </div>
                    <div class="w-40 h-40 shrink-0">
                      <StampCard
                        stamp={generatedPreviewStamp}
                        variant="cardSquare"
                        previewHtml={generatedPreviewHtml}
                      />
                    </div>
                  </div>
                  <div class="w-[180px] shrink-0">
                    <StampCard
                      stamp={generatedPreviewStamp}
                      variant="cardVerticalDetail"
                      previewHtml={generatedPreviewHtml}
                    />
                  </div>
                </div>
              </div>
            )}
            {mode === "preview" && (
              <div class="absolute top-0 right-0 z-[8800] p-3 flex gap-3">
                <div class={`${container2Icon}`}>
                  <Icon
                    type="iconButton"
                    name="edit"
                    weight="normal"
                    size="md"
                    color="neutral400"
                    ariaLabel="Edit"
                    onClick={(e) => {
                      e.preventDefault();
                      setPreviewView("canvas");
                      enterEdit();
                    }}
                  />
                </div>
                <div class={`${container2Icon}`}>
                  <Icon
                    type="iconButton"
                    name="previewCode"
                    weight="normal"
                    size="md"
                    color="neutral400"
                    ariaLabel="View code"
                    onClick={(e) => {
                      e.preventDefault();
                      onViewCode();
                    }}
                  />
                </div>
                <div class={`${container2Icon}`}>
                  <Icon
                    type="iconButton"
                    name={previewView === "cards"
                      ? "viewCardMixed"
                      : "viewCardSingle"}
                    weight="normal"
                    size="md"
                    color="neutral400"
                    ariaLabel={previewView === "cards"
                      ? "Switch to canvas preview"
                      : "Switch to card preview"}
                    onClick={(e) => {
                      e.preventDefault();
                      setPreviewView((v) =>
                        v === "canvas" ? "cards" : "canvas"
                      );
                    }}
                  />
                </div>
              </div>
            )}
            {previewView !== "cards" && (
              <div class={`rsb-zoom ${container3} !rounded-full p-0.5`}>
                <button
                  type="button"
                  aria-label="Zoom out"
                  class={`inline-flex items-center leading-none
                    ${container3} !rounded-full p-0.5 cursor-pointer`}
                  onClick={() =>
                    setZoom(zoom / 1.2)}
                >
                  <span
                    class={`inline-flex items-center justify-center w-5 h-5
                      text-sm font-medium tracking-wide leading-none
                      text-color-neutral-400 hover:text-color-hover
                      ${buttonHover} ${transitionColors}`}
                  >
                    −
                  </span>
                </button>
                <button
                  type="button"
                  class="min-w-[42px] p-0 leading-none text-[0.625rem] font-mono
                text-color-neutral-500"
                  onClick={() => resetZoom()}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  class={`inline-flex items-center leading-none
                    ${container3} !rounded-full p-0.5 cursor-pointer`}
                  onClick={() => setZoom(zoom * 1.2)}
                >
                  <span
                    class={`inline-flex items-center justify-center w-5 h-5
                      text-sm font-medium tracking-wide leading-none
                      text-color-neutral-400 hover:text-color-hover
                      ${buttonHover} ${transitionColors}`}
                  >
                    +
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {ctxOpen && (
        <div
          class={`rsb-ctx open ${container2} p-1`}
          style={{ left: ctxOpen.x, top: ctxOpen.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            ["Copy", () => {
              clipboard.current = layers
                .filter((l) => selIds.includes(l.id))
                .map((l) => JSON.parse(JSON.stringify(l)));
            }],
            ["Duplicate", () => duplicateSelected()],
            ["Group", () => groupSelection()],
            ["Ungroup", () => ungroupSelection()],
            ["Bring to front", () => bringToFront()],
            ["Send to back", () => sendToBack()],
            ["Delete", () => deleteSelected()],
          ].map(([label, fn]) => (
            <button
              type="button"
              key={String(label)}
              class="flex w-full text-left text-xs px-2 py-1.5
                text-color-neutral-200 hover:text-color-hover"
              onClick={() => {
                (fn as () => void)();
                setCtxOpen(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
