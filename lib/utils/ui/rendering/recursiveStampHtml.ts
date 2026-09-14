/* ===== RECURSIVE STAMP HTML GENERATION ===== */
import type {
  RecursiveStampFilters,
  RecursiveStampLayer,
} from "$types/ui.d.ts";

export const RECURSIVE_STAMP_FONTS = [
  "Arial",
  "Arial Black",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Impact",
  "Lucida Console",
  "Palatino Linotype",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

export function defaultRecursiveFilters(): RecursiveStampFilters {
  return {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hue: 0,
    grayscale: 0,
  };
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatStampMime(m?: string | null): string {
  if (!m) return "?";
  const parts = m.split("/");
  return (parts[parts.length - 1] ?? m).toUpperCase();
}

export function formatStampBytes(b?: number | null): string {
  if (!b) return "?";
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
}

export function layerTransformCss(layer: RecursiveStampLayer): string {
  const parts: string[] = [];
  if (layer.r) parts.push(`rotate(${layer.r}deg)`);
  if (layer.flipH) parts.push("scaleX(-1)");
  if (layer.flipV) parts.push("scaleY(-1)");
  return parts.join(" ");
}

export function layerFilterCss(layer: RecursiveStampLayer): string {
  const f = layer.filters;
  if (!f) return "";
  const parts: string[] = [];
  if (f.brightness !== 100) {
    parts.push(`brightness(${f.brightness}%)`);
  }
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.grayscale !== 0) parts.push(`grayscale(${f.grayscale}%)`);
  return parts.join(" ");
}

/** Nearest-neighbor scaling so pixel-art stamps stay crisp when enlarged. */
export const PIXELATED_RENDERING_CSS =
  "-webkit-image-rendering:pixelated;" +
  "image-rendering:pixelated;" +
  "image-rendering:-moz-crisp-edges;" +
  "image-rendering:crisp-edges";

export function layerDisplaySrc(
  layer: RecursiveStampLayer | {
    b64?: string | null;
    mime?: string;
    ident?: string | null;
    stamp_url?: string;
    url?: string;
  },
): string {
  const mime = "mime" in layer ? layer.mime : undefined;
  const b64 = "b64" in layer ? layer.b64 : undefined;
  const ident = "ident" in layer ? layer.ident : undefined;
  if (
    b64 && mime && mime.startsWith("image/") && ident !== "SRC-721"
  ) {
    return `data:${mime};base64,${b64}`;
  }
  if ("stamp_url" in layer && layer.stamp_url) return layer.stamp_url;
  return layer.url ?? "";
}

function layerInlineStyle(layer: RecursiveStampLayer): string {
  const st = [
    `left:${+layer.x.toFixed(3)}%`,
    `top:${+layer.y.toFixed(3)}%`,
    `width:${+layer.w.toFixed(3)}%`,
    `height:${+layer.h.toFixed(3)}%`,
  ];
  if (layer.r !== 0 || layer.flipH || layer.flipV) {
    st.push(`transform:${layerTransformCss(layer)}`);
  }
  if (layer.op !== 1) st.push(`opacity:${layer.op}`);
  const filterStr = layerFilterCss(layer);
  if (filterStr) st.push(`filter:${filterStr}`);
  return st.filter(Boolean).join(";");
}

/**
 * Compose a self-contained recursive stamp HTML document from canvas layers.
 * `forPreview` embeds base64 image data when available so the live preview
 * does not depend on `/s/{cpid}` for SVG stamps.
 */
export function buildRecursiveStampHtml(
  layers: RecursiveStampLayer[],
  bg: string,
  forPreview = false,
): string {
  const visible = layers.filter((l) => l.vis);
  const els = visible.map((l) => {
    const style = layerInlineStyle(l);
    if (l.type === "text") {
      const textSt = [
        `font-family:${l.font},sans-serif`,
        `font-size:${l.fontSize}cqh`,
        `color:${l.color}`,
        l.bold ? "font-weight:bold" : "",
        l.italic ? "font-style:italic" : "",
        l.align && l.align !== "left" ? `text-align:${l.align}` : "",
      ].filter(Boolean).join(";");
      return `<div class="s t" style="${style};${textSt}">${
        escHtml(l.text ?? "")
      }</div>`;
    }
    let src = "";
    if (forPreview) {
      if (
        l.b64 && l.mime && l.mime.startsWith("image/") &&
        l.ident !== "SRC-721"
      ) {
        src = `data:${l.mime};base64,${l.b64}`;
      } else {
        src = l.url || (l.cpid ? `/s/${l.cpid}` : "");
      }
    } else {
      src = l.cpid ? `/s/${l.cpid}` : (l.url ?? "");
    }
    if (l.mime === "text/html") {
      return `<iframe class="s" src="${src}" style="${style}"></iframe>`;
    }
    return `<img class="s" src="${src}" style="${style}">`;
  }).join("");

  const css = `html,body{margin:0;width:100%;height:100%;background:${bg}}` +
    `#c{position:relative;width:100%;height:100%;container-type:size;` +
    `overflow:hidden}` +
    `.s{position:absolute;transform-origin:center center;margin:0;` +
    `${PIXELATED_RENDERING_CSS}}` +
    `img.s,iframe.s{object-fit:contain;border:0;display:block}` +
    `.t{overflow:hidden;word-break:break-word;white-space:pre-wrap;` +
    `line-height:1.2}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<style>${css}</style></head><body><div id="c">${els}</div>` +
    `</body></html>`;
}
