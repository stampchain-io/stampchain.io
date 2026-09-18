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

export type RecursiveStampFont = typeof RECURSIVE_STAMP_FONTS[number];

export type RecursiveStampFontGeneric =
  | "serif"
  | "sans-serif"
  | "monospace";

export const RECURSIVE_STAMP_FONT_GENERIC: Record<
  RecursiveStampFont,
  RecursiveStampFontGeneric
> = {
  Arial: "sans-serif",
  "Arial Black": "sans-serif",
  "Comic Sans MS": "sans-serif",
  "Courier New": "monospace",
  Georgia: "serif",
  Impact: "sans-serif",
  "Lucida Console": "monospace",
  "Palatino Linotype": "serif",
  Tahoma: "sans-serif",
  "Times New Roman": "serif",
  "Trebuchet MS": "sans-serif",
  Verdana: "sans-serif",
};

/** Web-safe aliases between the named face and the CSS generic. */
const FONT_ALIASES: Partial<
  Record<RecursiveStampFont, readonly string[]>
> = {
  Arial: ["Helvetica"],
  "Arial Black": ["Gadget"],
  "Comic Sans MS": ["Comic Sans"],
  "Courier New": ["Courier"],
  Impact: ["Charcoal"],
  "Lucida Console": ["Monaco"],
  "Palatino Linotype": ["Palatino"],
  Tahoma: ["Geneva"],
  "Times New Roman": ["Times"],
  "Trebuchet MS": ["Helvetica"],
  Verdana: ["Geneva"],
};

const GENERIC_LABEL: Record<RecursiveStampFontGeneric, string> = {
  "sans-serif": "Sans-serif",
  serif: "Serif",
  monospace: "Monospace",
};

const GENERIC_ORDER: RecursiveStampFontGeneric[] = [
  "sans-serif",
  "serif",
  "monospace",
];

export const RECURSIVE_STAMP_FONT_GROUPS = GENERIC_ORDER.map((generic) => ({
  label: GENERIC_LABEL[generic],
  generic,
  fonts: RECURSIVE_STAMP_FONTS.filter(
    (f) => RECURSIVE_STAMP_FONT_GENERIC[f] === generic,
  ),
}));

function quoteCssFontFamily(name: string): string {
  if (/^[a-zA-Z][\w-]*$/.test(name)) return name;
  return `'${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** Named face + aliases + matching generic family. */
export function recursiveStampFontFamily(font?: string): string {
  const name = font?.trim() || "Arial";
  const known = (RECURSIVE_STAMP_FONTS as readonly string[]).includes(name)
    ? name as RecursiveStampFont
    : undefined;
  const generic = known ? RECURSIVE_STAMP_FONT_GENERIC[known] : "sans-serif";
  const aliases = known ? (FONT_ALIASES[known] ?? []) : [];
  return [name, ...aliases, generic].map(quoteCssFontFamily).join(",");
}

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

/** Shared recursive layout CSS stamp used by the prototype builder. */
export const RECURSIVE_STAMP_CSS_SRC = "/s/A15716034302284605000";

const STAMPCHAIN_ORIGIN = "https://stampchain.io";

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
 * Compose a recursive stamp HTML document from canvas layers.
 * Layout CSS comes from `RECURSIVE_STAMP_CSS_SRC`; this file only sets
 * background and layer markup. `forPreview` embeds base64 image data when
 * available and prefixes relative `/s/…` URLs with stampchain.io.
 */
export function buildRecursiveStampHtml(
  layers: RecursiveStampLayer[],
  bg: string,
  forPreview = false,
): string {
  const abs = (u: string): string =>
    forPreview && u.charAt(0) === "/" ? `${STAMPCHAIN_ORIGIN}${u}` : u;
  const visible = layers.filter((l) => l.vis);
  const els = visible.map((l) => {
    const style = layerInlineStyle(l);
    if (l.type === "text") {
      const textSt = [
        `font-family:${recursiveStampFontFamily(l.font)}`,
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
        src = abs(l.url || (l.cpid ? `/s/${l.cpid}` : ""));
      }
    } else {
      src = abs(l.cpid ? `/s/${l.cpid}` : (l.url ?? ""));
    }
    if (l.mime === "text/html") {
      return `<iframe class="s" src="${src}" style="${style}"></iframe>`;
    }
    return `<img class="s" src="${src}" style="${style}">`;
  }).join("");

  const stylesScript = `<script src="${
    abs(RECURSIVE_STAMP_CSS_SRC)
  }"><\/script>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `${stylesScript}<style>body{background:${bg}}</style></head>` +
    `<body><div id="c">${els}</div></body></html>`;
}
