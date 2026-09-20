/* ===== RECURSIVE STAMP EDITOR STATE ===== */
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { defaultRecursiveFilters } from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type {
  RecursiveStampGuide,
  RecursiveStampLayer,
  RecursiveStampMode,
} from "$types/ui.d.ts";
import { signal } from "@preact/signals";

export const GRID_DIV = 24;
export const GRID_STEP = 100 / GRID_DIV;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 8;
const HISTORY_LIMIT = 80;

export const rsbLayers = signal<RecursiveStampLayer[]>([]);
export const rsbSelId = signal<string | null>(null);
export const rsbSelIds = signal<string[]>([]);
export const rsbBg = signal("#000000");
export const rsbSnap = signal(false);
export const rsbGrid = signal(false);
export const rsbRulers = signal(false);
export const rsbGuides = signal<RecursiveStampGuide[]>([]);
export const rsbZoom = signal(1);
export const rsbPanX = signal(0);
export const rsbPanY = signal(0);
export const rsbMode = signal<RecursiveStampMode>("edit");
export const rsbHtml = signal("");
export const rsbUid = signal(1);
export const rsbHistory = signal<string[]>([]);
export const rsbFuture = signal<string[]>([]);

let guideUid = 1;
let previewSelId: string | null = null;
let previewSelIds: string[] = [];

function nextId(): string {
  const id = `l${rsbUid.value}`;
  rsbUid.value = rsbUid.value + 1;
  return id;
}

function maxLayerUid(layers: RecursiveStampLayer[]): number {
  let max = 0;
  for (const layer of layers) {
    const n = Number.parseInt(String(layer.id).replace(/^[^\d]*/, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function snapshot(): string {
  return JSON.stringify({
    layers: rsbLayers.value,
    bg: rsbBg.value,
    selId: rsbSelId.value,
    selIds: rsbSelIds.value,
    uid: rsbUid.value,
  });
}

export function pushHistory(): void {
  const next = [...rsbHistory.value, snapshot()];
  if (next.length > HISTORY_LIMIT) next.shift();
  rsbHistory.value = next;
  rsbFuture.value = [];
}

function restoreSnapshot(snap: string): void {
  const st = JSON.parse(snap) as {
    layers: RecursiveStampLayer[];
    bg: string;
    selId: string | null;
    selIds: string[];
    uid?: number;
  };
  rsbLayers.value = st.layers;
  rsbBg.value = st.bg;
  rsbSelId.value = st.selId;
  rsbSelIds.value = st.selIds ?? [];
  rsbUid.value = Math.max(st.uid ?? 1, maxLayerUid(st.layers) + 1);
}

export function undo(): void {
  if (!rsbHistory.value.length) return;
  rsbFuture.value = [...rsbFuture.value, snapshot()];
  const hist = [...rsbHistory.value];
  const last = hist.pop();
  rsbHistory.value = hist;
  if (last) restoreSnapshot(last);
}

export function redo(): void {
  if (!rsbFuture.value.length) return;
  rsbHistory.value = [...rsbHistory.value, snapshot()];
  const fut = [...rsbFuture.value];
  const next = fut.pop();
  rsbFuture.value = fut;
  if (next) restoreSnapshot(next);
}

export function getLayer(id: string | null): RecursiveStampLayer | undefined {
  if (!id) return undefined;
  return rsbLayers.value.find((l) => l.id === id);
}

function expandGroups(ids: string[]): string[] {
  const groups = new Set<string>();
  ids.forEach((id) => {
    const l = getLayer(id);
    if (l?.group) groups.add(l.group);
  });
  if (!groups.size) return ids;
  const out = new Set(ids);
  rsbLayers.value.forEach((l) => {
    if (l.group && groups.has(l.group)) out.add(l.id);
  });
  return [...out];
}

export function selectLayer(id: string | null, addToSel = false): void {
  if (addToSel && id) {
    const current = new Set(rsbSelIds.value);
    if (current.has(id)) {
      expandGroups([id]).forEach((gid) => current.delete(gid));
      rsbSelIds.value = [...current];
      if (!current.has(rsbSelId.value ?? "")) {
        rsbSelId.value = current.size ? [...current][current.size - 1] : null;
      }
    } else {
      expandGroups([id]).forEach((gid) => current.add(gid));
      rsbSelIds.value = [...current];
      rsbSelId.value = id;
    }
    return;
  }
  rsbSelId.value = id;
  rsbSelIds.value = id ? expandGroups([id]) : [];
}

export function setSelection(ids: string[]): void {
  const expanded = expandGroups(ids);
  rsbSelIds.value = expanded;
  rsbSelId.value = expanded.length
    ? expanded[expanded.length - 1] ?? null
    : null;
}

export function mutateLayers(
  fn: (layers: RecursiveStampLayer[]) => RecursiveStampLayer[],
): void {
  rsbLayers.value = fn(rsbLayers.value);
}

export function patchLayer(
  id: string,
  patch: Partial<RecursiveStampLayer>,
): void {
  rsbLayers.value = rsbLayers.value.map((l) =>
    l.id === id ? { ...l, ...patch } : l
  );
}

export function addStampLayer(s: StampRow): RecursiveStampLayer {
  pushHistory();
  const sz = 50;
  const layer: RecursiveStampLayer = {
    id: nextId(),
    ...(s.stamp != null ? { num: s.stamp } : {}),
    hash: s.tx_hash,
    cpid: s.cpid || null,
    url: s.stamp_url,
    mime: s.stamp_mimetype,
    ident: s.ident || null,
    b64: s.stamp_base64 || null,
    name: `#${s.stamp}`,
    x: (100 - sz) / 2,
    y: (100 - sz) / 2,
    w: sz,
    h: sz,
    r: 0,
    flipH: false,
    flipV: false,
    op: 1,
    filters: defaultRecursiveFilters(),
    vis: true,
  };
  rsbLayers.value = [...rsbLayers.value, layer];
  selectLayer(layer.id);
  return layer;
}

export function addTextLayer(
  style?: Pick<
    RecursiveStampLayer,
    "font" | "fontSize" | "color" | "bold" | "italic" | "align"
  >,
): RecursiveStampLayer {
  pushHistory();
  const layer: RecursiveStampLayer = {
    id: nextId(),
    type: "text",
    text: "Text",
    font: style?.font ?? "Arial",
    fontSize: style?.fontSize ?? 5,
    color: style?.color ?? "#ffffff",
    bold: style?.bold ?? false,
    italic: style?.italic ?? false,
    align: style?.align ?? "center",
    name: "Text",
    x: 25,
    y: 25,
    w: 50,
    h: 50,
    r: 0,
    flipH: false,
    flipV: false,
    op: 1,
    filters: defaultRecursiveFilters(),
    vis: true,
  };
  rsbLayers.value = [...rsbLayers.value, layer];
  selectLayer(layer.id);
  return layer;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function layerNameBase(name: string): string {
  return name.replace(/(?: \(copy\)| - \d+)+$/, "");
}

function nextDuplicateName(
  name: string,
  layers: RecursiveStampLayer[],
): string {
  const base = layerNameBase(name);
  const re = new RegExp(`^${escapeRegExp(base)} - (\\d+)$`);
  let max = 0;
  for (const layer of layers) {
    const match = layer.name.match(re);
    if (!match) continue;
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${base} - ${max + 1}`;
}

export function duplicateSelected(): void {
  const layer = getLayer(rsbSelId.value);
  if (!layer) return;
  pushHistory();
  const copy: RecursiveStampLayer = {
    ...layer,
    filters: { ...layer.filters },
    id: nextId(),
    x: layer.x + 2,
    y: layer.y + 2,
    name: nextDuplicateName(layer.name, rsbLayers.value),
  };
  rsbLayers.value = [...rsbLayers.value, copy];
  selectLayer(copy.id);
}

export function deleteSelected(): void {
  const ids = rsbSelIds.value.filter((id) => !getLayer(id)?.locked);
  if (!ids.length) {
    showToast("Selected layer is locked.", "warning");
    return;
  }
  pushHistory();
  const idSet = new Set(ids);
  rsbLayers.value = rsbLayers.value.filter((l) => !idSet.has(l.id));
  selectLayer(null);
}

export function clearAllLayers(): void {
  if (!rsbLayers.value.length) return;
  pushHistory();
  rsbLayers.value = [];
  selectLayer(null);
  rsbBg.value = "#000000";
  resetZoom();
  rsbMode.value = "edit";
  rsbHtml.value = "";
  rsbUid.value = 1;
  previewSelId = null;
  previewSelIds = [];
}

export function toggleLayerVis(id: string): void {
  const l = getLayer(id);
  if (!l) return;
  pushHistory();
  patchLayer(id, { vis: !l.vis });
}

export function toggleLayerLock(id: string): void {
  const l = getLayer(id);
  if (!l) return;
  pushHistory();
  const locked = !l.locked;
  patchLayer(id, { locked });
  if (locked && rsbSelId.value === id) selectLayer(null);
}

export function deleteLayer(id: string): void {
  pushHistory();
  rsbLayers.value = rsbLayers.value.filter((l) => l.id !== id);
  if (rsbSelId.value === id) selectLayer(null);
  rsbSelIds.value = rsbSelIds.value.filter((sid) => sid !== id);
}

export function moveLayer(id: string, dir: 1 | -1): void {
  const i = rsbLayers.value.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rsbLayers.value.length) return;
  pushHistory();
  const next = [...rsbLayers.value];
  const a = next[i];
  const b = next[j];
  if (!a || !b) return;
  next[i] = b;
  next[j] = a;
  rsbLayers.value = next;
}

export function reorderLayers(srcId: string, dstId: string): void {
  if (srcId === dstId) return;
  const srcIdx = rsbLayers.value.findIndex((l) => l.id === srcId);
  const dstIdx = rsbLayers.value.findIndex((l) => l.id === dstId);
  if (srcIdx === -1 || dstIdx === -1) return;
  pushHistory();
  const next = [...rsbLayers.value];
  const [moved] = next.splice(srcIdx, 1);
  if (!moved) return;
  next.splice(dstIdx, 0, moved);
  rsbLayers.value = next;
}

export function centerSelected(): void {
  const layer = getLayer(rsbSelId.value);
  if (!layer) return;
  pushHistory();
  patchLayer(layer.id, {
    x: (100 - layer.w) / 2,
    y: (100 - layer.h) / 2,
  });
}

export function flipSelected(axis: "h" | "v"): void {
  const ids = rsbSelIds.value.length
    ? rsbSelIds.value
    : (rsbSelId.value ? [rsbSelId.value] : []);
  if (!ids.length) return;
  pushHistory();
  const idSet = new Set(ids);
  rsbLayers.value = rsbLayers.value.map((l) => {
    if (!idSet.has(l.id)) return l;
    return axis === "h" ? { ...l, flipH: !l.flipH } : { ...l, flipV: !l.flipV };
  });
}

export function addGuide(type: "h" | "v", pos = 50): void {
  const g: RecursiveStampGuide = {
    id: `g${guideUid++}`,
    type,
    pos,
  };
  rsbGuides.value = [...rsbGuides.value, g];
}

export function removeGuide(id: string): void {
  rsbGuides.value = rsbGuides.value.filter((g) => g.id !== id);
}

export function clearGuides(): void {
  rsbGuides.value = [];
}

export function patchGuide(id: string, pos: number): void {
  rsbGuides.value = rsbGuides.value.map((g) => g.id === id ? { ...g, pos } : g);
}

export function setZoom(z: number): void {
  rsbZoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

export function resetZoom(): void {
  rsbZoom.value = 1;
  rsbPanX.value = 0;
  rsbPanY.value = 0;
}

export function enterPreview(html: string): void {
  previewSelId = rsbSelId.value;
  previewSelIds = [...rsbSelIds.value];
  rsbHtml.value = html;
  rsbMode.value = "preview";
  selectLayer(null);
}

export function setPreviewHtml(html: string): void {
  rsbHtml.value = html;
}

export function enterEdit(): void {
  rsbMode.value = "edit";
  const validIds = previewSelIds.filter((id) => getLayer(id));
  const primaryId = previewSelId && getLayer(previewSelId)
    ? previewSelId
    : (validIds[validIds.length - 1] ?? null);
  rsbSelId.value = primaryId;
  rsbSelIds.value = validIds.length ? validIds : (primaryId ? [primaryId] : []);
}

export function alignSelected(mode: string): void {
  const sel = rsbLayers.value.filter((l) => rsbSelIds.value.includes(l.id));
  if (sel.length < 2) return;
  pushHistory();
  const next = rsbLayers.value.map((l) => ({ ...l }));
  const chosen = next.filter((l) => rsbSelIds.value.includes(l.id));
  if (mode === "dh" || mode === "dv") {
    const horiz = mode === "dh";
    const sorted = [...chosen].sort((a, b) =>
      horiz
        ? (a.x + a.w / 2) - (b.x + b.w / 2)
        : (a.y + a.h / 2) - (b.y + b.h / 2)
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return;
    const firstC = horiz ? first.x + first.w / 2 : first.y + first.h / 2;
    const lastC = horiz ? last.x + last.w / 2 : last.y + last.h / 2;
    const step = (lastC - firstC) / (sorted.length - 1);
    sorted.forEach((l, i) => {
      const c = firstC + step * i;
      if (horiz) l.x = c - l.w / 2;
      else l.y = c - l.h / 2;
    });
  } else {
    const minX = Math.min(...chosen.map((l) => l.x));
    const maxR = Math.max(...chosen.map((l) => l.x + l.w));
    const minY = Math.min(...chosen.map((l) => l.y));
    const maxB = Math.max(...chosen.map((l) => l.y + l.h));
    const cX = (minX + maxR) / 2;
    const cY = (minY + maxB) / 2;
    chosen.forEach((l) => {
      if (mode === "left") l.x = minX;
      if (mode === "right") l.x = maxR - l.w;
      if (mode === "hcenter") l.x = cX - l.w / 2;
      if (mode === "top") l.y = minY;
      if (mode === "bottom") l.y = maxB - l.h;
      if (mode === "vcenter") l.y = cY - l.h / 2;
    });
  }
  rsbLayers.value = next;
}

export function groupSelection(): void {
  const sel = rsbLayers.value.filter((l) => rsbSelIds.value.includes(l.id));
  if (sel.length < 2) return;
  pushHistory();
  const gid = nextId().replace("l", "g");
  const ids = new Set(sel.map((l) => l.id));
  rsbLayers.value = rsbLayers.value.map((l) =>
    idSetHas(ids, l.id) ? { ...l, group: gid } : l
  );
}

export function ungroupSelection(): void {
  const sel = rsbLayers.value.filter((l) =>
    rsbSelIds.value.includes(l.id) && l.group
  );
  if (!sel.length) return;
  pushHistory();
  const ids = new Set(sel.map((l) => l.id));
  rsbLayers.value = rsbLayers.value.map((l) => {
    if (!idSetHas(ids, l.id)) return l;
    const { group: _g, ...rest } = l;
    return rest;
  });
}

function idSetHas(ids: Set<string>, id: string): boolean {
  return ids.has(id);
}

export function bringToFront(): void {
  const sel = rsbLayers.value.filter((l) => rsbSelIds.value.includes(l.id));
  if (!sel.length) return;
  pushHistory();
  rsbLayers.value = [
    ...rsbLayers.value.filter((l) => !rsbSelIds.value.includes(l.id)),
    ...sel,
  ];
}

export function sendToBack(): void {
  const sel = rsbLayers.value.filter((l) => rsbSelIds.value.includes(l.id));
  if (!sel.length) return;
  pushHistory();
  rsbLayers.value = [
    ...sel,
    ...rsbLayers.value.filter((l) => !rsbSelIds.value.includes(l.id)),
  ];
}

export function nudgeSelected(dx: number, dy: number): void {
  const ids = rsbSelIds.value.filter((id) => !getLayer(id)?.locked);
  if (!ids.length) return;
  pushHistory();
  const idSet = new Set(ids);
  rsbLayers.value = rsbLayers.value.map((l) =>
    idSet.has(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l
  );
}

export function selectAll(): void {
  rsbSelIds.value = rsbLayers.value.map((l) => l.id);
  rsbSelId.value = rsbLayers.value.length
    ? rsbLayers.value[rsbLayers.value.length - 1]?.id ?? null
    : null;
}

export function useRecursiveStampState() {
  return {
    layers: rsbLayers.value,
    selId: rsbSelId.value,
    selIds: rsbSelIds.value,
    bg: rsbBg.value,
    snap: rsbSnap.value,
    grid: rsbGrid.value,
    rulers: rsbRulers.value,
    guides: rsbGuides.value,
    zoom: rsbZoom.value,
    panX: rsbPanX.value,
    panY: rsbPanY.value,
    mode: rsbMode.value,
    html: rsbHtml.value,
    canUndo: rsbHistory.value.length > 0,
    canRedo: rsbFuture.value.length > 0,
  };
}
