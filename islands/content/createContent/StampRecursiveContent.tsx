/* ===== RECURSIVE STAMP CONTENT ===== */
import { Button, ButtonProcessing } from "$button";
import { inputField, inputFieldSquare, messageError } from "$form";
import { CreateStampRecursiveHeader } from "$header";
import { Icon } from "$icon";
import { RangeSlider } from "$islands/button/RangeSlider.tsx";
import { ColorPicker } from "$islands/form/ColorPicker.tsx";
import { InputField } from "$islands/form/InputField.tsx";
import { CollapsibleSection } from "$islands/layout/CollapsibleSection.tsx";
import PreviewCodeModal from "$islands/modal/PreviewCodeModal.tsx";
import { closeModal, openModal } from "$islands/modal/states.ts";
import {
  container2,
  container3,
  containerPill,
  loaderSpinSmGrey,
  ModalBase,
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
  setZoom,
  toggleLayerLock,
  toggleLayerVis,
  undo,
  ungroupSelection,
  useRecursiveStampState,
} from "$lib/hooks/useRecursiveStampState.ts";
import {
  fetchCollections,
  fetchCollectionStamps,
  fetchStampById,
  fetchStampList,
  fetchStampsByCreator,
} from "$lib/utils/api/stamps/fetchStamp.ts";
import {
  abbreviateAddress,
  formatFileSize,
  formatFileType,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import {
  buildRecursiveStampHtml,
  defaultRecursiveFilters,
  layerDisplaySrc,
  layerFilterCss,
  layerTransformCss,
  RECURSIVE_STAMP_FONTS,
} from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import {
  cardCreator,
  cardFileSize,
  cardFileType,
  cardStampNumber,
  labelXs,
  textXs,
  truncate,
} from "$text";
import type { Collection } from "$types/api.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type {
  RecursiveStampContentProps,
  RecursiveStampLayer,
} from "$types/ui.d.ts";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

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

const CANVAS_CSS = `
.rsb-wrap{position:relative;width:100%;height:100%;
  overflow:hidden;
  background:repeating-conic-gradient(#191919 0% 25%,#141414 0% 50%) 0 0/20px 20px}
.rsb-wrap.preview .rsb-guide,
.rsb-wrap.preview .rsb-grid,
.rsb-wrap.preview .rsb-ruler{display:none!important}
.rsb-canvas{position:absolute;top:0;bottom:0;left:0;right:0;margin:auto;
  max-width:calc(100% - 48px);max-height:calc(100% - 48px);aspect-ratio:1/1;
  overflow:hidden;container-type:size;transform-origin:center center;
  box-shadow:0 8px 60px rgba(0,0,0,.7)}
.rsb-grid{position:absolute;inset:0;pointer-events:none;z-index:9999}
.rsb-el{position:absolute;cursor:move;transform-origin:center center}
.rsb-wrap.preview .rsb-el{pointer-events:none}
.rsb-inner{width:100%;height:100%;overflow:hidden;position:relative;z-index:0}
.rsb-inner img,.rsb-inner iframe{width:100%;height:100%;object-fit:contain;
  border:none;display:block;pointer-events:none}
.rsb-sel{position:absolute;inset:0;pointer-events:none;z-index:100}
.rsb-ring{display:none;position:absolute;inset:0;
  border:2px solid var(--color-primary-400)}
.rsb-el.sel .rsb-ring,.rsb-el.multi .rsb-ring{display:block}
.rsb-el.multi .rsb-ring{border-color:color-mix(in srgb,var(--color-primary-400) 50%,transparent)}
.rsb-wrap.preview .rsb-sel{display:none}
.rsb-h{position:absolute;width:9px;height:9px;background:#fff;
  border:2px solid var(--color-primary-400);pointer-events:all}
.h-tl{top:-5px;left:-5px;cursor:nw-resize}
.h-tr{top:-5px;right:-5px;cursor:ne-resize}
.h-bl{bottom:-5px;left:-5px;cursor:sw-resize}
.h-br{bottom:-5px;right:-5px;cursor:se-resize}
.h-tm{top:-5px;left:calc(50% - 4px);cursor:n-resize}
.h-bm{bottom:-5px;left:calc(50% - 4px);cursor:s-resize}
.h-ml{left:-5px;top:calc(50% - 4px);cursor:w-resize}
.h-mr{right:-5px;top:calc(50% - 4px);cursor:e-resize}
.rsb-rot{position:absolute;width:12px;height:12px;
  background:var(--color-primary-400);border:2px solid #fff;
  border-radius:50%;top:-30px;left:calc(50% - 6px);cursor:crosshair;
  pointer-events:all}
.rsb-rotline{position:absolute;width:1px;height:18px;
  background:var(--color-primary-400);top:-22px;left:calc(50% - .5px)}
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
.rsb-zoom{position:absolute;bottom:12px;right:12px;z-index:8800;
  display:flex;align-items:center;gap:2px}
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

function BrowseStampsModal(
  { onPick }: { onPick: (id: string) => void },
) {
  const [mode, setMode] = useState<"all" | "collections" | "favorites">(
    "all",
  );
  const [ident, setIdent] = useState("");
  const [page, setPage] = useState(1);
  const [stamps, setStamps] = useState<StampRow[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<Collection | null>(null);
  const [favs, setFavs] = useState<RecentItem[]>(() =>
    lsGet<RecentItem[]>("rsb_favorites", [])
  );

  const load = async () => {
    setLoading(true);
    try {
      if (mode === "favorites") {
        const results = await Promise.all(
          favs.slice(0, 40).map((f) => fetchStampById(String(f.num))),
        );
        setStamps(results.filter(Boolean) as StampRow[]);
        setCols([]);
        setStatus(`${favs.length} favorites`);
      } else if (mode === "collections" && !collection) {
        const list = await fetchCollections(60);
        setCols(list.filter((c) => c.stamp_count > 0));
        setStamps([]);
        setStatus(`${list.length} collections`);
      } else if (mode === "collections" && collection) {
        const list = await fetchCollectionStamps(
          collection.collection_id,
          20,
          page,
        );
        setStamps(list);
        setCols([]);
        setStatus(collection.collection_name);
      } else if (search.trim()) {
        const s = await fetchStampById(search.trim().replace(/^#/, ""));
        setStamps(s ? [s] : []);
        setCols([]);
        setStatus(s ? "1 result" : "No stamp found");
      } else {
        const list = await fetchStampList({
          limit: 20,
          page,
          ident,
        });
        setStamps(list);
        setCols([]);
        setStatus(`Page ${page}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode, ident, page, collection]);

  const toggleFav = (s: StampRow) => {
    const num = s.stamp;
    if (num == null) return;
    const next = favs.some((f) => f.num === num)
      ? favs.filter((f) => f.num !== num)
      : [{ num, hash: s.tx_hash }, ...favs];
    setFavs(next);
    lsSet("rsb_favorites", next);
  };

  return (
    <ModalBase title="BROWSE STAMPS" className="w-[680px] max-w-[96vw]">
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex gap-2">
          {(["all", "collections", "favorites"] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "flat" : "outline"}
              color="primary"
              size="xxsR"
              onClick={() => {
                setMode(m);
                setPage(1);
                setCollection(null);
              }}
            >
              {m.toUpperCase()}
            </Button>
          ))}
        </div>
        {mode === "all" && (
          <>
            <input
              class={inputField}
              placeholder="STAMP # OR TX HASH"
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPage(1);
                  load();
                }
              }}
            />
            <div class="flex gap-2">
              {[
                { v: "", label: "ALL" },
                { v: "STAMP", label: "CLASSIC" },
                { v: "SRC-721", label: "SRC-721" },
              ].map((opt) => (
                <Button
                  key={opt.v}
                  variant={ident === opt.v ? "flat" : "outline"}
                  color="primary"
                  size="xxsR"
                  onClick={() => {
                    setIdent(opt.v);
                    setPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </>
        )}
        <div class="grid grid-cols-5 gap-2 min-h-[200px]">
          {loading && (
            <div class={`${loaderSpinSmGrey} col-span-5 mx-auto mt-8`} />
          )}
          {!loading && collection && (
            <button
              type="button"
              class={`${container2} aspect-square flex items-center
                justify-center text-xs text-color-primary-400`}
              onClick={() => {
                setCollection(null);
                setPage(1);
              }}
            >
              ← BACK
            </button>
          )}
          {!loading && cols.map((c) => (
            <button
              type="button"
              key={c.collection_id}
              class={`${container2} aspect-square p-2 text-center`}
              onClick={() => {
                setCollection(c);
                setPage(1);
              }}
            >
              <div class={`${textXs} text-color-neutral-200 break-words`}>
                {c.collection_name}
              </div>
              <div class="text-[0.625rem] text-color-neutral-500 mt-1">
                {c.stamp_count} stamps
              </div>
            </button>
          ))}
          {!loading && stamps.map((s) => (
            <div key={s.tx_hash} class="relative">
              <button
                type="button"
                class="absolute top-1 right-1 z-10 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(s);
                }}
              >
                {favs.some((f) => f.num === s.stamp) ? "★" : "☆"}
              </button>
              <button
                type="button"
                class={`${container2} aspect-square overflow-hidden w-full`}
                onClick={() => {
                  onPick(String(s.stamp ?? s.tx_hash));
                  closeModal();
                }}
              >
                {s.stamp_mimetype === "text/html"
                  ? (
                    <iframe
                      src={s.stamp_url}
                      class="w-full h-[80%] pointer-events-none bg-black"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )
                  : (
                    <img
                      src={s.stamp_url}
                      alt={`#${s.stamp}`}
                      class="w-full h-[80%] object-cover"
                    />
                  )}
                <div class="text-[0.625rem] text-center text-color-neutral-500
                  py-1 font-mono">
                  #{s.stamp}
                </div>
              </button>
            </div>
          ))}
        </div>
        <div class="flex items-center gap-2">
          <span class={`${textXs} flex-1 text-color-neutral-500`}>
            {status}
          </span>
          {mode !== "favorites" && (
            <>
              <Button
                variant="outline"
                color="neutral"
                size="xxsR"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                PREV
              </Button>
              <Button
                variant="outline"
                color="neutral"
                size="xxsR"
                onClick={() => setPage((p) => p + 1)}
              >
                NEXT
              </Button>
            </>
          )}
        </div>
      </div>
    </ModalBase>
  );
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
    html,
  } = useRecursiveStampState();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const ixRef = useRef<IX | null>(null);
  const guideDrag = useRef<{ id: string } | null>(null);
  const panIX = useRef<
    { sx: number; sy: number; px: number; py: number } | null
  >(null);
  const spaceHeld = useRef(false);
  const clipboard = useRef<RecursiveStampLayer[]>([]);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<StampRow | null>(null);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState("");
  const [creatorMore, setCreatorMore] = useState<StampRow[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<
    Record<RsbPanel, boolean>
  >({
    background: false,
    assets: true,
    text: false,
    layers: false,
    properties: false,
    filters: false,
    selected: false,
  });
  const toggleSection = (section: RsbPanel) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  const [ctxOpen, setCtxOpen] = useState<
    { x: number; y: number } | null
  >(null);
  const primary = getLayer(selId);

  const getPreview = async (raw?: string) => {
    const id = (raw ?? query).trim().replace(/^#/, "");
    if (!id) return;
    setFetching(true);
    setFetched(null);
    setStatus("");
    try {
      const s = await fetchStampById(id);
      if (!s) throw new Error("Stamp not found");
      setFetched(s);
      const rec = { num: s.stamp ?? 0, hash: s.tx_hash };
      const next = [
        rec,
        ...recent.filter((r) => r.num !== s.stamp),
      ].slice(0, 10);
      setRecent(next);
      lsSet("rsb_recent", next);
      if (s.creator) {
        const others = (await fetchStampsByCreator(s.creator, 20))
          .filter((o) => o.creator === s.creator && o.stamp !== s.stamp)
          .slice(0, 8);
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
    const r = canvasEl.getBoundingClientRect();
    gridCanvas.width = Math.round(r.width);
    gridCanvas.height = Math.round(r.height);
    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;
    const w = gridCanvas.width;
    const h = gridCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!grid || mode === "preview") return;
    ctx.strokeStyle = "#262626";
    ctx.lineWidth = 1;
    const step = Math.round(w / GRID_DIV);
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(w / 2 + 0.5, 0);
    ctx.lineTo(w / 2 + 0.5, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + 0.5);
    ctx.lineTo(w, h / 2 + 0.5);
    ctx.stroke();
  };

  useEffect(() => {
    drawGrid();
  }, [grid, zoom, mode]);

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

  const onPointerMove = (
    clientX: number,
    clientY: number,
    shiftKey: boolean,
  ) => {
    const ix = ixRef.current;
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
      mutateLayers((ls) =>
        ls.map((l) => {
          const o = idMap.get(l.id);
          if (!o) return l;
          let x = o.ox + dx;
          let y = o.oy + dy;
          if (snap) {
            x = Math.round(x / GRID_STEP) * GRID_STEP;
            y = Math.round(y / GRID_STEP) * GRID_STEP;
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
      wrapRef.current?.classList.remove("panning");
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [snap, grid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (t.isContentEditable) return;
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
    e: MouseEvent,
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
      showToast("The canvas is empty - add some assets.", "warning");
      return;
    }
    enterPreview(buildRecursiveStampHtml(layers, bg, false));
  };

  const onViewCode = () => {
    openModal(<PreviewCodeModal src={html} />, "zoomInOut");
  };

  const openBrowse = () => {
    openModal(
      <BrowseStampsModal
        onPick={(id) => {
          setQuery(id);
          getPreview(id);
        }}
      />,
      "zoomInOut",
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

  return (
    <div class="flex flex-col w-full pt-5">
      <style>{CANVAS_CSS}</style>
      <CreateStampRecursiveHeader />
      <div class="flex flex-col-reverse min-[720px]:flex-row w-full gap-5 pt-5">
        <div
          class={`w-full min-[720px]:w-1/3 min-[1080px]:w-1/4
            h-[800px] min-[720px]:h-[480px] min-[1080px]:h-[560px]
            desktop:h-[640px] flex flex-col overflow-hidden p-3
            ${container2}`}
        >
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
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
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-1.5">
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
                    ß{" "}
                    <div
                      class={`relative flex items-center justify-center
                        shrink-0 ${container3} !rounded-full p-0.5`}
                    >
                      <Icon
                        type="iconButton"
                        name="search"
                        weight="normal"
                        size="xsR"
                        color="neutral400"
                        ariaLabel="Browse stamps"
                        onClick={(e) => {
                          e.preventDefault();
                          openBrowse();
                        }}
                      />
                    </div>
                  </div>
                  <ButtonProcessing
                    variant="outline"
                    color="primary"
                    size="smR"
                    class="w-full"
                    isSubmitting={fetching}
                    onClick={() => getPreview()}
                  >
                    PREVIEW
                  </ButtonProcessing>
                </div>
                {status && !fetched && (
                  <p class={messageError}>
                    {status}
                  </p>
                )}
                {fetched && (
                  <>
                    <div class="flex gap-3 mt-3 items-start">
                      <div
                        class={`flex items-center justify-center shrink-0
                          w-[84px] h-[84px] overflow-hidden ${container3}`}
                      >
                        {fetched.stamp_mimetype === "text/html"
                          ? (
                            <iframe
                              src={fetched.stamp_url}
                              class="w-full h-full"
                              sandbox="allow-scripts allow-same-origin"
                            />
                          )
                          : (
                            <img
                              src={previewSrc}
                              alt={`Stamp #${fetched.stamp}`}
                              class="max-w-full max-h-full object-contain"
                            />
                          )}
                      </div>
                      <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                        <div class={cardStampNumber}>
                          {fetched.stamp != null && (
                            <span class="font-light">#</span>
                          )}
                          {fetched.stamp != null
                            ? fetched.stamp.toLocaleString("en-US")
                            : fetched.cpid}
                        </div>
                        {fetched.cpid && (
                          <div
                            class={`font-mono text-xs text-color-neutral-500
                              ${truncate}`}
                          >
                            {fetched.cpid}
                          </div>
                        )}
                        {(fetched.creator_name || fetched.creator) && (
                          <span class={`${cardCreator} !text-left`}>
                            {fetched.creator_name ||
                              abbreviateAddress(fetched.creator, 5)}
                          </span>
                        )}
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                          <div class={`${containerPill} ${cardFileType}`}>
                            {formatFileType(fetched.stamp_mimetype)}
                          </div>
                          {fetched.file_size_bytes != null && (
                            <div class={`${containerPill} ${cardFileSize}`}>
                              {formatFileSize(
                                fetched.file_size_bytes,
                                fetched.stamp_mimetype === "text/plain",
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      color="neutral"
                      size="xsR"
                      class="w-full mt-3"
                      disabled={mode !== "edit"}
                      onClick={() => {
                        addStampLayer(fetched);
                        showToast(
                          `Stamp #${fetched.stamp} added to canvas.`,
                          "success",
                        );
                      }}
                    >
                      ADD TO CANVAS
                    </Button>
                  </>
                )}
                {creatorMore.length > 0 && fetched && (
                  <div class="mt-4 flex flex-col gap-1.5">
                    <p class={labelXs}>
                      MORE BY {fetched.creator_name ||
                        `${fetched.creator.slice(0, 6)}…`}
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      {creatorMore.map((s) => (
                        <button
                          type="button"
                          key={s.tx_hash}
                          class={`${container3} w-11 overflow-hidden`}
                          onClick={() => {
                            setQuery(String(s.stamp));
                            getPreview(String(s.stamp));
                          }}
                        >
                          <img
                            src={s.stamp_url}
                            alt={`#${s.stamp}`}
                            class="w-full h-8 object-cover"
                          />
                          <div class="text-[0.5rem] text-center font-mono
                    text-color-neutral-500">
                            #{s.stamp}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {recent.length > 0 && (
                  <div class="mt-4 flex flex-col gap-1.5">
                    <p class={labelXs}>RECENT</p>
                    <div class="grid grid-cols-4 gap-1.5">
                      {recent.map((r) => (
                        <button
                          type="button"
                          key={r.hash || r.num}
                          class={`${container3} aspect-square overflow-hidden
                            p-0`}
                          onClick={() => {
                            const id = r.num ? String(r.num) : r.hash;
                            setQuery(id);
                            getPreview(id);
                          }}
                        >
                          <img
                            src={`/api/v2/stamp/${r.num}/preview`}
                            alt={`#${r.num}`}
                            class="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
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
                <Button
                  variant="outline"
                  color="neutral"
                  size="xsR"
                  class="w-full"
                  disabled={mode !== "edit"}
                  onClick={() => {
                    addTextLayer();
                    showToast(
                      "Text added to canvas — double-click to edit.",
                      "info",
                    );
                  }}
                >
                  + ADD TEXT
                </Button>
              </SectionBody>
            </CollapsibleSection>

            <CollapsibleSection
              title={`LAYERS${layers.length ? ` (${layers.length})` : ""}`}
              variant="collapsibleTitle"
              expanded={expandedSections.layers}
              toggle={() => toggleSection("layers")}
            >
              <SectionBody>
                <div class="flex flex-col gap-1">
                  {layers.length === 0 && (
                    <p class={`${textXs} text-color-neutral-500`}>
                      Fetch a stamp and add it to begin.
                    </p>
                  )}
                  {[...layers].reverse().map((l) => (
                    <div
                      key={l.id}
                      class={`flex items-center gap-1.5 ${container3} p-1
                  ${l.id === selId ? "border-color-primary-400" : ""}
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
                  items-center justify-center bg-color-neutral-900">
                        {l.type === "text"
                          ? (
                            <span class="text-color-primary-400 font-bold text-xs">
                              T
                            </span>
                          )
                          : l.mime?.startsWith("image/")
                          ? (
                            <img
                              src={layerDisplaySrc(l)}
                              alt={l.name}
                              class="w-full h-full object-cover"
                            />
                          )
                          : <span class={`${textXs}`}>HTML</span>}
                      </div>
                      <span class={`${textXs} flex-1 truncate`}>{l.name}</span>
                      <Icon
                        type="iconButton"
                        name={l.locked ? "locked" : "unlocked"}
                        weight="normal"
                        size="xxxs"
                        color="neutral400"
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
                        weight="normal"
                        size="xxxs"
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
                        weight="normal"
                        size="xxxs"
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
                        weight="normal"
                        size="xxxs"
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
                        weight="normal"
                        size="xxxs"
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
                  size="xsR"
                  class="w-full mt-2"
                  disabled={!primary || mode !== "edit"}
                  onClick={() => duplicateSelected()}
                >
                  DUPLICATE
                </Button>
              </SectionBody>
            </CollapsibleSection>

            {primary && (
              <>
                <CollapsibleSection
                  title="PROPERTIES"
                  variant="collapsibleTitle"
                  expanded={expandedSections.properties}
                  toggle={() => toggleSection("properties")}
                >
                  <SectionBody>
                    <div class="grid grid-cols-2 gap-2">
                      {([
                        ["X (%)", "x"],
                        ["Y (%)", "y"],
                        ["WIDTH (%)", "w"],
                        ["HEIGHT (%)", "h"],
                        ["ROTATION (°)", "r"],
                      ] as const).map(([label, key]) => (
                        <label key={key} class="flex flex-col gap-0.5">
                          <span class={labelXs}>{label}</span>
                          <input
                            type="number"
                            class={inputFieldSquare}
                            value={Number(primary[key]).toFixed(1)}
                            step="0.1"
                            onInput={(e) => {
                              const v = parseFloat(
                                (e.target as HTMLInputElement).value,
                              ) || 0;
                              patchLayer(primary.id, { [key]: v });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <label class="flex flex-col gap-0.5 mt-2">
                      <span class={labelXs}>
                        OPACITY {Math.round(primary.op * 100)}%
                      </span>
                      <RangeSlider
                        value={primary.op}
                        min={0}
                        max={1}
                        onChange={(v) => patchLayer(primary.id, { op: v })}
                      />
                    </label>
                    <div class="flex justify-between gap-2 mt-2">
                      <Button
                        variant={primary.flipH ? "flat" : "outline"}
                        color="neutral"
                        size="xxsR"
                        onClick={() => flipSelected("h")}
                      >
                        FLIP H
                      </Button>
                      <Button
                        variant={primary.flipV ? "flat" : "outline"}
                        color="neutral"
                        size="xxsR"
                        onClick={() => flipSelected("v")}
                      >
                        FLIP V
                      </Button>
                      <Button
                        variant="outline"
                        color="neutral"
                        size="xxsR"
                        disabled={mode !== "edit"}
                        onClick={() => centerSelected()}
                      >
                        CENTER
                      </Button>
                    </div>
                    {primary.type === "text" && (
                      <div class="flex flex-col gap-2 mt-3">
                        <select
                          class={inputField}
                          value={primary.font}
                          onChange={(e) =>
                            patchLayer(primary.id, {
                              font: (e.target as HTMLSelectElement).value,
                            })}
                        >
                          {RECURSIVE_STAMP_FONTS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <label class="flex flex-col gap-0.5">
                          <span class={labelXs}>SIZE (%H)</span>
                          <input
                            type="number"
                            class={inputField}
                            value={primary.fontSize}
                            step="0.5"
                            onInput={(e) =>
                              patchLayer(primary.id, {
                                fontSize: Math.max(
                                  0.5,
                                  parseFloat(
                                    (e.target as HTMLInputElement).value,
                                  ) ||
                                    5,
                                ),
                              })}
                          />
                        </label>
                        <ColorPicker
                          value={primary.color ?? "#ffffff"}
                          onChange={(hex) =>
                            patchLayer(primary.id, { color: hex })}
                          ariaLabel="Text color"
                        />
                        <div class="flex gap-1">
                          <Button
                            variant={primary.bold ? "flat" : "outline"}
                            color="neutral"
                            size="xxsR"
                            onClick={() =>
                              patchLayer(primary.id, { bold: !primary.bold })}
                          >
                            B
                          </Button>
                          <Button
                            variant={primary.italic ? "flat" : "outline"}
                            color="neutral"
                            size="xxsR"
                            onClick={() =>
                              patchLayer(primary.id, {
                                italic: !primary.italic,
                              })}
                          >
                            I
                          </Button>
                          {(["left", "center", "right"] as const).map((a) => (
                            <Button
                              key={a}
                              variant={primary.align === a ? "flat" : "outline"}
                              color="neutral"
                              size="xxsR"
                              onClick={() =>
                                patchLayer(primary.id, { align: a })}
                            >
                              {a[0]?.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionBody>
                </CollapsibleSection>
                <CollapsibleSection
                  title="FILTERS"
                  variant="collapsibleTitle"
                  expanded={expandedSections.filters}
                  toggle={() => toggleSection("filters")}
                >
                  <SectionBody>
                    <div class="flex flex-col gap-2">
                      {([
                        ["brightness", "BRIGHTNESS", 0, 200, "%"],
                        ["contrast", "CONTRAST", 0, 200, "%"],
                        ["saturate", "SATURATE", 0, 200, "%"],
                        ["hue", "HUE ROTATE", 0, 360, "°"],
                        ["grayscale", "GRAYSCALE", 0, 100, "%"],
                      ] as const).map(([key, label, min, max, unit]) => (
                        <label key={key} class="flex flex-col gap-0.5">
                          <span class={labelXs}>
                            {label} {primary.filters[key]}
                            {unit}
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
                      <Button
                        variant="outline"
                        color="neutral"
                        size="xxsR"
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
                        size="xxsR"
                        onClick={() => alignSelected(modeKey)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </SectionBody>
              </CollapsibleSection>
            )}

            <Button
              variant="outline"
              color="neutral"
              size="xsR"
              class="w-full"
              disabled={!layers.length || mode !== "edit"}
              onClick={() => {
                if (!confirm("Remove all layers from the canvas?")) return;
                clearAllLayers();
              }}
            >
              CLEAR ALL
            </Button>
          </div>
          <div class="flex flex-col gap-2 pt-3 shrink-0">
            {mode === "preview"
              ? (
                <>
                  <Button
                    variant="flat"
                    color="primary"
                    size="xsR"
                    class="w-full"
                    onClick={() => enterEdit()}
                  >
                    EDIT
                  </Button>
                  <Button
                    variant="outline"
                    color="primary"
                    size="xsR"
                    class="w-full"
                    onClick={onViewCode}
                  >
                    VIEW CODE
                  </Button>
                </>
              )
              : (
                <Button
                  variant="flat"
                  color="primary"
                  size="xsR"
                  class="w-full"
                  onClick={onGenerate}
                >
                  GENERATE
                </Button>
              )}
          </div>
        </div>

        {/* CANVAS */}
        <div
          class={`w-full min-[720px]:w-2/3 min-[1080px]:w-3/4 min-w-0
            h-[340px] min-[480px]:h-[400px] mobileMd:h-[480px]
            min-[720px]:h-[480px] min-[1080px]:h-[560px]
            desktop:h-[640px]
            flex flex-col overflow-hidden ${container2}`}
        >
          <div
            ref={wrapRef}
            class={`rsb-wrap h-full ${rulers ? "rulers-on" : ""} ${
              mode === "preview" ? "preview" : ""
            }`}
            onMouseDown={(e) => {
              if (mode !== "edit") return;
              if (spaceHeld.current || e.button === 1) {
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
              if (e.button === 0 && e.target === wrapRef.current) {
                selectLayer(null);
              }
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
              class="rsb-canvas"
              style={{
                background: bg,
                transform: `translate(${panX}px,${panY}px) scale(${zoom})`,
              }}
              onMouseDown={(e) => {
                if (
                  e.target === canvasRef.current ||
                  (e.target as HTMLElement).classList.contains("rsb-grid")
                ) {
                  selectLayer(null);
                }
              }}
            >
              <canvas ref={gridRef} class="rsb-grid" />
              {layers.length === 0 && (
                <div class="absolute inset-0 flex items-center justify-center
                text-color-neutral-500 text-xs pointer-events-none">
                  Fetch a stamp and click Add to Canvas
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
                  onDblClick={() => removeGuide(g.id)}
                >
                  <div class="rsb-glabel">{g.pos.toFixed(1)}%</div>
                </div>
              ))}
              {layers.map((l, z) => {
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
                            fontFamily: `${l.font},sans-serif`,
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
                          {l.mime === "text/html"
                            ? (
                              <iframe
                                src={l.url}
                                sandbox="allow-scripts allow-same-origin"
                              />
                            )
                            : (
                              <img
                                src={layerDisplaySrc(l)}
                                alt={l.name}
                                draggable={false}
                              />
                            )}
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
            </div>
            <div class="rsb-ruler rsb-ruler-h">
              <RulerTicks axis="h" />
            </div>
            <div class="rsb-ruler rsb-ruler-v">
              <RulerTicks axis="v" />
            </div>
            <div class={`rsb-zoom ${container2} p-0.5`}>
              <Button
                variant="outline"
                color="neutral"
                size="xxsR"
                onClick={() => setZoom(zoom / 1.2)}
              >
                −
              </Button>
              <button
                type="button"
                class="min-w-[42px] text-[0.625rem] font-mono
                text-color-neutral-400"
                onClick={() => resetZoom()}
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="outline"
                color="neutral"
                size="xxsR"
                onClick={() => setZoom(zoom * 1.2)}
              >
                +
              </Button>
            </div>
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
