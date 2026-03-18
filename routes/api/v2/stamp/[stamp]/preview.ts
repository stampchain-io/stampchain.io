/**
 * Social Media Preview Generator for Bitcoin Stamps
 *
 * Supported formats:
 * - SVG: Converted to PNG using resvg-wasm with proper padding
 * - SVG with foreignObject: Rendered via Cloudflare Browser Rendering Worker
 * - PNG/JPEG/GIF/TIFF: Upscaled using ImageScript with pixel-perfect scaling
 * - WebP/BMP/AVIF: Rendered via Cloudflare Browser Rendering Worker
 * - HTML: Rendered via CF Worker (with cleanHtmlForRendering)
 * - Audio: Stylized waveform visualization generated with ImageScript
 * - Video: First frame via Cloudflare Browser Rendering Worker
 *
 * Chrome-dependent content is rendered by the Cloudflare Browser Rendering
 * Worker (env: CF_PREVIEW_WORKER_URL + CF_PREVIEW_WORKER_SECRET).
 *
 * All images are output as 1200x1200 PNG with compression level 9
 *
 * Caching:
 *   PREVIEW_STORAGE=redis (default): PNGs cached in Redis as base64 with 7-day TTL.
 *   PREVIEW_STORAGE=s3: PNGs stored in S3 as raw binary, served via CloudFront redirect.
 *     S3 path: {IMAGE_DIR}/previews/{identifier}.png
 *     CloudFront delivers with immutable Cache-Control.
 */
import { Handlers } from "$fresh/server.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";
import { cleanHtmlForRendering } from "$lib/utils/ui/rendering/htmlCleanup.ts";
import {
  calculateSocialMediaDimensions,
  calculateSvgDimensions,
  getOptimalConversionOptions,
} from "$lib/utils/ui/rendering/svgUtils.ts";
import { StampController } from "$server/controller/stampController.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import {
  Frame,
  GIF,
  Image,
} from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.0";

// Initialize WASM on module load
let wasmInitialized = false;
async function ensureWasmInitialized() {
  if (!wasmInitialized) {
    await initWasm(
      fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.0/index_bg.wasm"),
    );
    wasmInitialized = true;
  }
}

import { serverConfig } from "$server/config/config.ts";
import {
  getPreviewUrl,
  previewExists,
  uploadPreview,
} from "$server/services/aws/previewStorageService.ts";

const useS3Storage = serverConfig.PREVIEW_STORAGE === "s3";
console.log("[Preview] Storage mode:", useS3Storage ? "s3" : "redis");

/**
 * Detect whether HTML stamp content contains meaningful animation.
 * Used to gate animated GIF generation — static HTML stamps skip GIF
 * and return the existing PNG preview instead.
 */
interface AnimationDetection {
  isAnimated: boolean;
  patterns: string[];
}

export function detectAnimation(rawHtml: string): AnimationDetection {
  const patterns: string[] = [];

  // JS-driven animation loops
  if (rawHtml.includes("requestAnimationFrame")) {
    patterns.push("requestAnimationFrame");
  }

  // CSS keyframe animations (looping)
  if (rawHtml.includes("@keyframes")) {
    patterns.push("@keyframes");
  }

  // Canvas-based drawing (must have both canvas element and context)
  if (
    (rawHtml.includes("<canvas") || rawHtml.includes("createElement('canvas") ||
      rawHtml.includes('createElement("canvas')) &&
    rawHtml.includes("getContext")
  ) {
    patterns.push("canvas+getContext");
  }

  // Web Animations API
  if (/\.animate\s*\(/.test(rawHtml)) {
    patterns.push("WebAnimationsAPI");
  }

  // CSS animation property (not just transition)
  if (/animation(-name)?\s*:/.test(rawHtml) && rawHtml.includes("@keyframes")) {
    // Only count if paired with actual keyframes definition
    patterns.push("css-animation");
  }

  // setInterval with drawing context (not standalone timers)
  if (
    rawHtml.includes("setInterval") &&
    (rawHtml.includes("requestAnimationFrame") ||
      rawHtml.includes("getContext") ||
      rawHtml.includes("innerHTML") ||
      rawHtml.includes("style."))
  ) {
    patterns.push("setInterval+DOM");
  }

  return { isAnimated: patterns.length > 0, patterns };
}

// Cloudflare Browser Rendering Worker configuration
const CF_WORKER_URL = serverConfig.CF_PREVIEW_WORKER_URL;
const CF_WORKER_SECRET = serverConfig.CF_PREVIEW_WORKER_SECRET;
const isCfWorkerConfigured = !!(CF_WORKER_URL && CF_WORKER_SECRET);
console.log("[Preview] CF Worker configured:", isCfWorkerConfigured);

/**
 * Render content via the Cloudflare Browser Rendering Worker.
 * Sends either a URL or raw HTML to the Worker, which uses headless Chrome
 * at Cloudflare's edge to take a PNG screenshot.
 *
 * @returns PNG buffer on success, null on failure (caller falls back to local Chrome)
 */
async function renderWithCloudflare(params: {
  url?: string;
  html?: string;
  viewport?: { width: number; height: number };
  delay?: number;
  timeout?: number;
}): Promise<Uint8Array | null> {
  if (!isCfWorkerConfigured) return null;

  // Use caller's timeout (default 30s). The handler-level Promise.race at 55s
  // is the safety net — if render exceeds that, the handler returns fallback.
  const fetchTimeout = params.timeout ?? 30000;
  const maxRetries = 2;
  const retryDelays = [2000, 4000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), fetchTimeout);

      const response = await fetch(CF_WORKER_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CF_WORKER_SECRET}`,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
      }

      const errorBody = await response.text().catch(() => "");

      // Only retry on 500+ (server errors) — not 400/401/403
      if (response.status >= 500 && attempt < maxRetries) {
        console.warn(
          `[Preview] CF Worker returned ${response.status} (attempt ${
            attempt + 1
          }/${maxRetries + 1}): ${errorBody} — retrying in ${
            retryDelays[attempt]
          }ms`,
        );
        await new Promise((r) => setTimeout(r, retryDelays[attempt]));
        continue;
      }

      console.error(
        `[Preview] CF Worker returned ${response.status}: ${errorBody}`,
      );
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : "";
      // Don't retry abort/timeout errors — they mean the render genuinely
      // timed out. Retrying a 45s timeout 3 times would hang for 141s.
      const isAbort = msg.toLowerCase().includes("abort") ||
        errName === "AbortError" ||
        errName === "TimeoutError";
      const isRetryable = !isAbort && (
        msg.includes("network") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ETIMEDOUT")
      );

      if (isRetryable && attempt < maxRetries) {
        console.warn(
          `[Preview] CF Worker request failed (attempt ${attempt + 1}/${
            maxRetries + 1
          }): ${msg} — retrying in ${retryDelays[attempt]}ms`,
        );
        await new Promise((r) => setTimeout(r, retryDelays[attempt]));
        continue;
      }

      console.error(
        `[Preview] CF Worker request failed (final): ${errName}: ${msg}`,
      );
      return null;
    }
  }

  return null;
}

/**
 * Request multiple animation frames from the CF Worker for GIF assembly.
 * Returns an array of base64-encoded PNG strings at 400x400 resolution,
 * or null on failure. No retries — GIF generation is best-effort.
 */
async function renderMultiFrameWithCloudflare(params: {
  url?: string;
  html?: string;
  delay?: number;
  frames: number;
  frameInterval: number;
  timeout?: number;
}): Promise<string[] | null> {
  if (!isCfWorkerConfigured) return null;

  const fetchTimeout = params.timeout ?? 90000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeout);

    const response = await fetch(CF_WORKER_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CF_WORKER_SECRET}`,
      },
      body: JSON.stringify({
        ...params,
        viewport: { width: 400, height: 400 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[Preview GIF] CF Worker returned ${response.status}: ${errorBody}`,
      );
      return null;
    }

    const data = await response.json() as { frames?: string[] };
    if (
      !data.frames || !Array.isArray(data.frames) || data.frames.length === 0
    ) {
      console.error("[Preview GIF] CF Worker returned empty or invalid frames");
      return null;
    }

    console.log(
      `[Preview GIF] Received ${data.frames.length} frames from CF Worker`,
    );
    return data.frames;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Preview GIF] CF Worker multi-frame request failed: ${msg}`);
    return null;
  }
}

// Cache control headers for different scenarios
const CACHE_HEADERS = {
  // Cache successful conversions for 1 year
  success: { "Cache-Control": "public, max-age=31536000, immutable" },
  // Cache redirects for 1 day
  redirect: { "Cache-Control": "public, max-age=86400" },
  // Don't cache errors
  error: { "Cache-Control": "no-cache, no-store" },
};

const FALLBACK_LOGO = "https://stampchain.io/img/logo/opengraph-1200x630.png";

/** Cached preview stored in Redis: base64 PNG + metadata headers */
interface CachedPreview {
  png: string;
  meta: Record<string, string>;
}

/** Sentinel stored in Redis when a render fails, to avoid re-rendering on every request */
interface FailedRenderSentinel {
  failed: true;
  timestamp: number;
}

/** Type guard for the failure sentinel */
function isFailedSentinel(
  value: unknown,
): value is FailedRenderSentinel {
  return typeof value === "object" && value !== null &&
    (value as FailedRenderSentinel).failed === true;
}

const FAILED_RENDER_TTL = 3600; // 1 hour — retry after this

/** Encode Uint8Array to base64 string */
function toBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/** Decode base64 string to Uint8Array */
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Render a stamp preview PNG. Returns CachedPreview on success, null on failure.
 * Null results are NOT cached permanently — they get stored as JSON "null" (5 bytes)
 * and treated as cache miss on next read, so failed renders are retried.
 */
async function renderPreview(
  stampIdentifier: string,
): Promise<CachedPreview | null> {
  const stampData = await StampController.getSpecificStamp(stampIdentifier);
  if (!stampData?.stamp_url) {
    return null;
  }

  const { stamp_url, stamp_mimetype, stamp: stampNumber } = stampData;

  // Raster images (PNG, JPEG, GIF, TIFF) — upscale with ImageScript
  // WebP/BMP/AVIF fall through to Chrome rendering on ImageScript failure
  if (
    stamp_mimetype?.startsWith("image/") &&
    stamp_mimetype !== "image/svg+xml"
  ) {
    const result = await renderRasterPreview(
      stamp_url,
      stamp_mimetype,
      stampNumber,
    );
    if (result) return result;
    // ImageScript couldn't decode (WebP/BMP/AVIF) — try Chrome
    return await renderImageWithChrome(
      stamp_url,
      stamp_mimetype,
      stampNumber,
    );
  }

  // SVG — convert with resvg-wasm (or Chrome for foreignObject SVGs)
  if (stamp_mimetype === "image/svg+xml") {
    return await renderSvgPreview(stamp_url, stamp_mimetype, stampNumber);
  }

  // HTML — render with local Chrome
  if (stamp_mimetype === "text/html") {
    return await renderHtmlPreview(stamp_url, stamp_mimetype, stampNumber);
  }

  // Audio — generate waveform visualization
  if (stamp_mimetype?.startsWith("audio/")) {
    return await renderAudioPreview(stamp_url, stamp_mimetype, stampNumber);
  }

  // Video — extract first frame via Chrome
  if (stamp_mimetype?.startsWith("video/")) {
    return await renderVideoPreview(stamp_url, stamp_mimetype, stampNumber);
  }

  // Unsupported content type
  return null;
}

async function renderRasterPreview(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  const imageResponse = await fetch(stamp_url);
  if (!imageResponse.ok) {
    console.error(`Failed to fetch image: ${imageResponse.status}`);
    return null;
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBytes = new Uint8Array(imageBuffer);

  try {
    // For animated GIFs, use GIF.decode() to extract first frame
    // (Image.decode() throws on animated GIFs)
    let sourceImage;
    if (stamp_mimetype === "image/gif") {
      const gif = await GIF.decode(imageBytes);
      sourceImage = gif[0];
      if (!sourceImage) {
        console.error(`GIF has no frames: stamp ${stampNumber}`);
        return null;
      }
    } else {
      sourceImage = await Image.decode(imageBytes);
    }

    const maxDimension = Math.max(sourceImage.width, sourceImage.height);
    const targetSize = 1200;

    const rawScale = Math.max(2, Math.floor(targetSize / maxDimension));
    const scale = Math.min(
      rawScale,
      Math.floor(targetSize / sourceImage.width),
      Math.floor(targetSize / sourceImage.height),
    );
    const scaledWidth = sourceImage.width * scale;
    const scaledHeight = sourceImage.height * scale;

    const outputImage = new Image(targetSize, targetSize);
    outputImage.fill(0x00000000); // transparent background

    const offsetX = Math.floor((targetSize - scaledWidth) / 2);
    const offsetY = Math.floor((targetSize - scaledHeight) / 2);

    for (let y = 0; y < sourceImage.height; y++) {
      for (let x = 0; x < sourceImage.width; x++) {
        const pixel = sourceImage.getPixelAt(x + 1, y + 1);
        for (let dy = 0; dy < scale; dy++) {
          const py = offsetY + y * scale + dy + 1;
          if (py < 1 || py > targetSize) continue;
          for (let dx = 0; dx < scale; dx++) {
            const px = offsetX + x * scale + dx + 1;
            if (px < 1 || px > targetSize) continue;
            outputImage.setPixelAt(px, py, pixel);
          }
        }
      }
    }

    const pngBuffer = await outputImage.encode(9);

    return {
      png: toBase64(pngBuffer),
      meta: {
        "X-Stamp-Number": stampNumber?.toString() || "unknown",
        "X-Original-Type": stamp_mimetype,
        "X-Conversion-Method": "imagescript-upscale",
        "X-Original-Size": `${sourceImage.width}x${sourceImage.height}`,
        "X-Scale-Factor": scale.toString(),
        "X-Dimensions": "1200x1200",
      },
    };
  } catch (upscaleError: unknown) {
    console.error("Image upscaling error:", upscaleError);
    const errorMessage = upscaleError instanceof Error
      ? upscaleError.message
      : String(upscaleError);
    const isUnsupportedFormat =
      errorMessage.includes("Unknown file signature") ||
      errorMessage.includes("Invalid") ||
      stamp_mimetype === "image/webp" ||
      stamp_mimetype === "image/bmp" ||
      stamp_mimetype === "image/avif";

    if (isUnsupportedFormat) {
      console.log(`Unsupported image format: ${stamp_mimetype}`);
    }

    return null;
  }
}

async function renderSvgPreview(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  const svgResponse = await fetch(stamp_url);
  if (!svgResponse.ok) {
    console.error(`Failed to fetch SVG: ${svgResponse.status}`);
    return null;
  }

  const svgContent = await svgResponse.text();

  // SVGs with <foreignObject> embed HTML content that resvg-wasm cannot render.
  // Route these to Chrome which handles foreignObject natively.
  if (svgContent.includes("<foreignObject")) {
    console.log(
      `[SVG Preview] Stamp ${stampNumber} uses foreignObject — routing to Chrome`,
    );
    return await renderSvgWithChrome(
      stamp_url,
      stamp_mimetype,
      stampNumber,
    );
  }

  await ensureWasmInitialized();

  const hasAnimations = svgContent.includes("@keyframes") ||
    svgContent.includes("animation:") ||
    svgContent.includes("animation-");

  let processedSvgContent = svgContent;

  if (hasAnimations) {
    console.log(
      `SVG contains animations that resvg-wasm cannot handle: ${stampNumber}`,
    );
    processedSvgContent = processedSvgContent.replace(
      /<style[^>]*>[\s\S]*?<\/style>/gi,
      "",
    );
    processedSvgContent = processedSvgContent.replace(
      /animation[^;]*;?/gi,
      "",
    );
    processedSvgContent = processedSvgContent.replace(
      /animation-[^;]*;?/gi,
      "",
    );
  }

  const conversionOptions = getOptimalConversionOptions(processedSvgContent);
  const originalDimensions = calculateSvgDimensions(processedSvgContent);

  const targetWidth = conversionOptions.width || 1200;
  const targetHeight = conversionOptions.height || 1200;

  const socialDimensions = calculateSocialMediaDimensions(
    originalDimensions.width,
    originalDimensions.height,
    targetWidth,
    targetHeight,
  );

  const paddingColor = conversionOptions.padding?.color || "transparent";

  const viewBoxMatch = processedSvgContent.match(
    /viewBox=["']([^"']+)["']/,
  );
  const viewBox = viewBoxMatch
    ? viewBoxMatch[1]
    : `0 0 ${originalDimensions.width} ${originalDimensions.height}`;

  const wrappedSvg =
    `<svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${targetWidth}" height="${targetHeight}" fill="${paddingColor}"/>
            <svg x="${socialDimensions.x}" y="${socialDimensions.y}"
                 width="${socialDimensions.imageWidth}" height="${socialDimensions.imageHeight}"
                 viewBox="${viewBox}">
              ${processedSvgContent.replace(/<\/?svg[^>]*>/g, "")}
            </svg>
          </svg>`;

  const resvgOptions: any = {
    fitTo: {
      mode: "width",
      value: targetWidth,
    },
    background: paddingColor,
  };

  if (conversionOptions.font) {
    resvgOptions.font = conversionOptions.font;
  }

  const resvg = new Resvg(wrappedSvg, resvgOptions);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return {
    png: toBase64(pngBuffer),
    meta: {
      "X-Stamp-Number": stampNumber?.toString() || "unknown",
      "X-Original-Type": stamp_mimetype,
      "X-Conversion-Method": "resvg-wasm",
      "X-Background": conversionOptions.background || "transparent",
      "X-Dimensions": `${pngData.width}x${pngData.height}`,
      "X-Animations-Stripped": hasAnimations ? "true" : "false",
    },
  };
}

/**
 * Render SVGs containing foreignObject using Cloudflare Browser Rendering Worker.
 */
async function renderSvgWithChrome(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  const cfBuffer = await renderWithCloudflare({
    url: stamp_url,
    viewport: { width: 1200, height: 1200 },
  });

  if (cfBuffer) {
    console.log(
      `[SVG Preview] Stamp ${stampNumber} rendered via CF Worker`,
    );
    const result = await centerOnCanvas(cfBuffer, {
      stampNumber,
      stamp_mimetype,
      method: "cloudflare-browser",
    });
    result.meta["X-Rendering-Engine"] = "cloudflare-worker";
    result.meta["X-ForeignObject"] = "true";
    return result;
  }

  console.error(
    "[SVG Preview] CF Worker failed for foreignObject SVG",
    { stamp: stampNumber },
  );
  return null;
}

async function renderHtmlPreview(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  if (!isCfWorkerConfigured) {
    console.error(
      "[HTML Preview] CF Worker not configured",
      { stamp: stampNumber },
    );
    return null;
  }

  try {
    const renderStart = Date.now();

    const htmlResponse = await fetch(stamp_url);
    if (!htmlResponse.ok) {
      console.error(
        `[HTML Preview] Failed to fetch HTML: ${htmlResponse.status}`,
        { stamp: stampNumber },
      );
      return null;
    }

    const rawHtml = await htmlResponse.text();

    // Detect if HTML contains iframes, external references, or relative
    // script/resource loads that require a proper origin to resolve.
    const hasIframe = rawHtml.includes("<iframe");
    const hasExternalRef = rawHtml.includes("ordinals.com/") ||
      rawHtml.includes("arweave.net/") ||
      rawHtml.includes("github.io/");
    // Stamps loading other stamps via relative /s/ paths (e.g. <script src="/s/...">)
    // or CPID references (e.g. Append().js(["A1234..."]))
    const hasRelativeScriptSrc = /src\s*=\s*["']\//.test(rawHtml);
    const hasStampContentRef = /["']\/s\//.test(rawHtml) ||
      /["']A\d{10,}["']/.test(rawHtml);
    const isRecursive = hasIframe || hasExternalRef || hasRelativeScriptSrc ||
      hasStampContentRef;

    // Differentiate delay by content complexity:
    // - Simple iframe wrappers: parent JS is synchronous, done by networkidle2. 3s is enough.
    // - Complex content (canvas, animations, async scripts): needs more time. 8s.
    // - Simple static HTML: 3s.
    const hasCanvas = rawHtml.includes("<canvas") ||
      rawHtml.includes("getContext");
    const hasAnimation = rawHtml.includes("requestAnimationFrame") ||
      rawHtml.includes("@keyframes") ||
      rawHtml.includes("setInterval");
    const hasAsyncLoad = rawHtml.includes("async") ||
      rawHtml.includes("await") ||
      rawHtml.includes(".then(");
    const isSimpleIframe = hasIframe && !hasCanvas && !hasAnimation &&
      !hasAsyncLoad &&
      rawHtml.length < 500;
    const isComplex = (isRecursive && !isSimpleIframe) ||
      stamp_url?.includes("recursive") ||
      stamp_url?.includes("fractal") ||
      hasCanvas;
    const delay = isComplex ? 8000 : 3000;

    // Build content URL for URL-mode rendering — uses the /content/ endpoint
    // so relative paths (like /s/) resolve against stampchain.io origin.
    const txHash = stamp_url.split("/stamps/").pop()?.replace(
      /\.html?$/i,
      "",
    );
    const contentUrl = txHash
      ? `https://stampchain.io/content/${txHash}`
      : stamp_url;

    let cfBuffer: Uint8Array | null = null;

    // For simple iframe wrappers, render the iframe target directly.
    // Puppeteer's networkidle2 never fires for pages containing iframes
    // because the iframe's network connections prevent the idle condition.
    // Rendering the target URL directly bypasses this issue entirely.
    let renderUrl = contentUrl;
    if (isSimpleIframe) {
      const iframeSrcMatch = rawHtml.match(
        /src\s*=\s*["']([^"']+)["']/,
      );
      if (iframeSrcMatch?.[1]) {
        const iframeSrc = iframeSrcMatch[1];
        renderUrl = iframeSrc.startsWith("/")
          ? `https://stampchain.io${iframeSrc}`
          : iframeSrc;
        console.log(
          `[HTML Preview] Stamp ${stampNumber} is simple iframe wrapper — rendering target directly (${renderUrl})`,
        );
      }
    }

    if (isRecursive) {
      // Recursive/dependent stamps: navigate Chrome to the content URL.
      // Simple iframes use the extracted target; others use /content/ endpoint.
      if (!isSimpleIframe) {
        console.log(
          `[HTML Preview] Stamp ${stampNumber} has recursive/dependent content — using URL mode (${contentUrl})`,
        );
      }
      cfBuffer = await renderWithCloudflare({
        url: renderUrl,
        viewport: { width: 1200, height: 1200 },
        delay,
        timeout: 45000,
      });
    } else {
      // Simple static HTML: clean Rocket Loader artifacts, render inline.
      // Timeout of 40s accounts for CF Worker tiered fallback (15s networkidle0
      // timeout + 8s extra delay + render overhead) on complex inline stamps.
      const cleanedHtml = cleanHtmlForRendering(rawHtml);
      cfBuffer = await renderWithCloudflare({
        html: cleanedHtml,
        viewport: { width: 1200, height: 1200 },
        delay,
        timeout: 40000,
      });
    }

    // If inline mode produced a suspiciously small image (blank render),
    // retry with URL mode as a fallback before giving up.
    // Skip retry if not enough time budget remains (handler timeout is 55s).
    const MIN_VALID_PNG_SIZE = 5_000;
    const elapsedMs = Date.now() - renderStart;
    const TIME_BUDGET_FOR_RETRY_MS = 40000; // URL mode needs ~37s worst case
    if (
      cfBuffer && cfBuffer.length < MIN_VALID_PNG_SIZE && !isRecursive &&
      elapsedMs < (HANDLER_TIMEOUT_MS - TIME_BUDGET_FOR_RETRY_MS)
    ) {
      console.warn(
        `[HTML Preview] Stamp ${stampNumber} inline render too small (${cfBuffer.length}B, ${elapsedMs}ms elapsed) — retrying with URL mode`,
      );
      cfBuffer = await renderWithCloudflare({
        url: contentUrl,
        viewport: { width: 1200, height: 1200 },
        delay: 8000,
        timeout: 45000,
      });
    } else if (
      cfBuffer && cfBuffer.length < MIN_VALID_PNG_SIZE && !isRecursive
    ) {
      console.warn(
        `[HTML Preview] Stamp ${stampNumber} inline render too small (${cfBuffer.length}B) — skipping URL retry (${elapsedMs}ms elapsed, not enough time budget)`,
      );
    }

    if (cfBuffer && cfBuffer.length >= MIN_VALID_PNG_SIZE) {
      console.log(
        `[HTML Preview] Stamp ${stampNumber} rendered via CF Worker (${
          isRecursive ? "url" : "html"
        } mode, ${cfBuffer.length}B)`,
      );
      const result = await centerOnCanvas(cfBuffer, {
        stampNumber,
        stamp_mimetype,
        method: "cloudflare-browser",
      });
      result.meta["X-Render-Time"] = isComplex ? "extended" : "standard";
      result.meta["X-Rendering-Engine"] = "cloudflare-worker";
      result.meta["X-Recursive"] = isRecursive ? "true" : "false";
      return result;
    }

    if (cfBuffer) {
      console.warn(
        `[HTML Preview] Stamp ${stampNumber} render too small after retry (${cfBuffer.length}B) — treating as failed`,
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[HTML Preview] CF Worker path failed for stamp ${stampNumber}: ${msg}`,
    );
  }

  console.error(
    "[HTML Preview] CF Worker failed for HTML content",
    { stamp: stampNumber },
  );
  return null;
}

/**
 * Render unsupported image formats (WebP, BMP, AVIF) via Cloudflare Browser Rendering Worker.
 */
async function renderImageWithChrome(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  // Wrap image in HTML for proper centering and scaling
  // (raw URL causes Chrome to show default image viewer with grey background)
  const imageHtml = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { background: transparent; display: flex; align-items: center; justify-content: center; width: 1200px; height: 1200px; overflow: hidden; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; image-rendering: pixelated; }
</style></head><body>
<img src="${stamp_url}" />
</body></html>`;

  const cfBuffer = await renderWithCloudflare({
    html: imageHtml,
    viewport: { width: 1200, height: 1200 },
    delay: 2000,
  });

  if (cfBuffer) {
    console.log(
      `[Image Preview] Stamp ${stampNumber} (${stamp_mimetype}) rendered via CF Worker`,
    );
    const result = await centerOnCanvas(cfBuffer, {
      stampNumber,
      stamp_mimetype,
      method: "cloudflare-browser",
    });
    result.meta["X-Rendering-Engine"] = "cloudflare-worker";
    return result;
  }

  console.log(
    `[Image Preview] CF Worker failed for ${stamp_mimetype} stamp ${stampNumber}`,
  );
  return null;
}

/**
 * Generate a stylized audio waveform visualization.
 * Uses a deterministic pseudo-random pattern seeded from the stamp URL
 * to create a unique waveform for each audio stamp.
 */
async function renderAudioPreview(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  const targetSize = 1200;
  const outputImage = new Image(targetSize, targetSize);
  const bgColor = 0x14001fff; // dark purple background
  outputImage.fill(bgColor);

  // Generate deterministic seed from stamp URL
  let seed = 0;
  for (let i = 0; i < stamp_url.length; i++) {
    seed = ((seed << 5) - seed + stamp_url.charCodeAt(i)) | 0;
  }
  const rng = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };

  // Draw waveform bars
  const barCount = 64;
  const barWidth = Math.floor(targetSize * 0.7 / barCount);
  const gap = 2;
  const totalWidth = barCount * (barWidth + gap);
  const startX = Math.floor((targetSize - totalWidth) / 2);
  const centerY = Math.floor(targetSize * 0.50);
  const maxBarHeight = Math.floor(targetSize * 0.30);

  // Waveform color: orange/amber gradient
  const colors = [0xf59e0bff, 0xf97316ff, 0xef4444ff, 0xec4899ff];

  for (let i = 0; i < barCount; i++) {
    // Smooth waveform shape with some randomness
    const t = i / barCount;
    const envelope = Math.sin(t * Math.PI) * 0.7 + 0.3;
    const variation = 0.3 + (rng(700) / 1000);
    const barHeight = Math.floor(maxBarHeight * envelope * variation);
    const x = startX + i * (barWidth + gap);

    const color = colors[rng(colors.length)];

    // Draw bar (symmetric above and below center)
    for (let dy = -barHeight; dy <= barHeight; dy++) {
      const py = centerY + dy;
      if (py < 1 || py > targetSize) continue;
      for (let dx = 0; dx < barWidth; dx++) {
        const px = x + dx;
        if (px < 1 || px > targetSize) continue;
        outputImage.setPixelAt(px, py, color);
      }
    }
  }

  // Draw play button circle in center
  const circleR = 60;
  const cx = Math.floor(targetSize / 2);
  const cy = Math.floor(targetSize * 0.50);
  for (let dy = -circleR; dy <= circleR; dy++) {
    for (let dx = -circleR; dx <= circleR; dx++) {
      if (dx * dx + dy * dy <= circleR * circleR) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 1 && px <= targetSize && py >= 1 && py <= targetSize) {
          outputImage.setPixelAt(px, py, 0x14001fcc); // semi-transparent bg
        }
      }
    }
  }
  // Draw triangle (play icon) inside circle
  const triSize = 30;
  for (let row = -triSize; row <= triSize; row++) {
    const halfWidth = Math.floor(((row + triSize) / (triSize * 2)) * triSize);
    for (let col = -5; col < halfWidth; col++) {
      const px = cx + col + 8;
      const py = cy + row;
      if (px >= 1 && px <= targetSize && py >= 1 && py <= targetSize) {
        outputImage.setPixelAt(px, py, 0xffffffff);
      }
    }
  }

  const pngBuffer = await outputImage.encode(9);

  return {
    png: toBase64(pngBuffer),
    meta: {
      "X-Stamp-Number": stampNumber?.toString() || "unknown",
      "X-Original-Type": stamp_mimetype,
      "X-Conversion-Method": "imagescript-waveform",
      "X-Dimensions": "1200x1200",
    },
  };
}

/**
 * Extract the first frame of a video using Cloudflare Browser Rendering Worker.
 */
async function renderVideoPreview(
  stamp_url: string,
  stamp_mimetype: string,
  stampNumber: number | undefined,
): Promise<CachedPreview | null> {
  const videoHtml = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { background: #14001f; display: flex; align-items: center; justify-content: center; width: 1200px; height: 1200px; overflow: hidden; }
  video { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head><body>
<video src="${stamp_url}" muted preload="auto" autoplay></video>
<script>
  const v = document.querySelector('video');
  v.addEventListener('loadeddata', () => { v.pause(); v.currentTime = 0; });
</script></body></html>`;

  const cfBuffer = await renderWithCloudflare({
    html: videoHtml,
    viewport: { width: 1200, height: 1200 },
    delay: 3000,
  });

  if (cfBuffer) {
    console.log(
      `[Video Preview] Stamp ${stampNumber} first frame rendered via CF Worker`,
    );
    return centerOnCanvas(cfBuffer, {
      stampNumber,
      stamp_mimetype,
      method: "cloudflare-browser-video",
    });
  }

  console.log(
    `[Video Preview] CF Worker failed for video stamp ${stampNumber}`,
  );
  return null;
}

/**
 * Helper: center a screenshot buffer on a 1200x1200 canvas with dark background.
 * Shared by HTML, image-via-Chrome, SVG-via-Chrome, and video renderers.
 */
async function centerOnCanvas(
  screenshotBuffer: Uint8Array,
  opts: {
    stampNumber?: number | undefined;
    stamp_mimetype: string;
    method: string;
    contentBounds?: { width: number; height: number } | undefined;
  },
): Promise<CachedPreview> {
  const targetSize = 1200;
  const sourceImage = await Image.decode(screenshotBuffer);
  const srcW = sourceImage.width;
  const srcH = sourceImage.height;

  // Always re-encode through ImageScript to ensure consistent PNG output
  // with transparent background (Chrome screenshots may have white bg pixels)
  const scale = Math.min(targetSize / srcW, targetSize / srcH);
  const scaledW = Math.round(srcW * scale);
  const scaledH = Math.round(srcH * scale);

  const resized = sourceImage.resize(scaledW, scaledH);
  const outputImage = new Image(targetSize, targetSize);
  outputImage.fill(0x00000000); // transparent background

  const offsetX = Math.floor((targetSize - scaledW) / 2);
  const offsetY = Math.floor((targetSize - scaledH) / 2);
  outputImage.composite(resized, offsetX, offsetY);

  const pngBuffer = await outputImage.encode(9);

  return {
    png: toBase64(pngBuffer),
    meta: {
      "X-Stamp-Number": opts.stampNumber?.toString() || "unknown",
      "X-Original-Type": opts.stamp_mimetype,
      "X-Conversion-Method": opts.method,
      "X-Content-Size": opts.contentBounds
        ? `${opts.contentBounds.width}x${opts.contentBounds.height}`
        : `${srcW}x${srcH}`,
      "X-Dimensions": "1200x1200",
    },
  };
}

/**
 * S3 storage path: check S3 → redirect to CloudFront. On miss → render →
 * upload raw PNG to S3 → redirect. No Redis involvement.
 */
async function handleS3Preview(
  stamp: string,
  forceRefresh: boolean,
): Promise<Response> {
  // Check if preview already exists in S3 (skip on force refresh)
  if (!forceRefresh && await previewExists(stamp)) {
    return WebResponseUtil.redirect(getPreviewUrl(stamp), 302, {
      headers: {
        "X-Cache": "s3-hit",
        ...CACHE_HEADERS.redirect,
      },
    });
  }

  // Render the preview
  const rendered = await renderPreview(stamp);
  if (!rendered?.png) {
    return WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
      headers: {
        "X-Fallback": "render-failed-or-unsupported",
        ...CACHE_HEADERS.redirect,
      },
    });
  }

  // Upload raw binary PNG to S3 (decode from base64)
  const pngBytes = fromBase64(rendered.png);
  await uploadPreview(stamp, pngBytes, "png", rendered.meta);

  // Redirect to CloudFront URL — CF handles Cache-Control from S3 object metadata
  return WebResponseUtil.redirect(getPreviewUrl(stamp), 302, {
    headers: {
      "X-Cache": "s3-uploaded",
      ...CACHE_HEADERS.redirect,
    },
  });
}

/**
 * Redis storage path: original behavior — cache base64 PNG in Redis,
 * serve binary response directly.
 */
async function handleRedisPreview(
  stamp: string,
  forceRefresh: boolean,
): Promise<Response> {
  const cacheKey = `preview:${stamp}`;

  if (forceRefresh) {
    await dbManager.invalidateCacheByPattern(cacheKey);
    console.log(`[Preview] Force refresh for ${stamp}, cache cleared`);
  }

  // Check cache first — may contain a CachedPreview, a FailedRenderSentinel, or nothing
  let wasRendered = false;
  const cached = await dbManager.handleCache<
    CachedPreview | FailedRenderSentinel | null
  >(
    cacheKey,
    async () => {
      wasRendered = true;
      const result = await renderPreview(stamp);
      if (result) return result;
      // Store a sentinel so we don't re-render on every request
      return { failed: true, timestamp: Date.now() } as FailedRenderSentinel;
    },
    604800,
  );

  // Cache hit: check if it's a failure sentinel
  if (isFailedSentinel(cached)) {
    const age = Date.now() - cached.timestamp;
    if (age < FAILED_RENDER_TTL * 1000) {
      // Still within the failure TTL — return fallback without re-rendering
      return WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
        headers: {
          "X-Fallback": "cached-render-failure",
          "X-Failure-Age": `${Math.round(age / 1000)}s`,
          ...CACHE_HEADERS.redirect,
        },
      });
    }
    // Failure sentinel has expired — invalidate and re-render
    await dbManager.invalidateCacheByPattern(cacheKey);
    const freshResult = await renderPreview(stamp);
    if (freshResult?.png) {
      await dbManager.handleCache(
        cacheKey,
        () => Promise.resolve(freshResult),
        604800,
      );
      const pngBytes = fromBase64(freshResult.png);
      return WebResponseUtil.binaryResponse(pngBytes, "image/png", {
        immutableBinary: true,
        headers: {
          ...freshResult.meta,
          "X-Cache": "retry-after-failure",
          ...CACHE_HEADERS.success,
        },
      });
    }
    // Still failing — cache a new sentinel
    await dbManager.handleCache(
      cacheKey,
      () => Promise.resolve({ failed: true, timestamp: Date.now() }),
      604800,
    );
    return WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
      headers: {
        "X-Fallback": "render-failed-retry",
        ...CACHE_HEADERS.redirect,
      },
    });
  }

  if (cached?.png) {
    const pngBytes = fromBase64(cached.png);
    return WebResponseUtil.binaryResponse(pngBytes, "image/png", {
      immutableBinary: true,
      headers: {
        ...cached.meta,
        "X-Cache": wasRendered ? "rendered" : "redis-hit",
        ...CACHE_HEADERS.success,
      },
    });
  }

  return WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
    headers: {
      "X-Fallback": "render-failed-or-unsupported",
      ...CACHE_HEADERS.redirect,
    },
  });
}

// Handler-level timeout: prevent the request from hanging indefinitely
// when rendering takes too long (e.g. complex recursive stamps).
const HANDLER_TIMEOUT_MS = 55000; // 55s — must beat ALB 60s idle timeout
const GIF_HANDLER_TIMEOUT_MS = 58000; // 58s — must beat ALB 60s idle timeout

/**
 * Generate animated GIF preview for an HTML stamp with detected animation.
 * S3-only storage path (GIF previews are not cached in Redis).
 *
 * Flow: check S3 cache → detect animation → capture frames → assemble GIF → upload → redirect
 */
async function handleS3GifPreview(
  stamp: string,
  forceRefresh: boolean,
): Promise<Response> {
  // Check S3 cache for existing GIF
  if (!forceRefresh && await previewExists(stamp, "gif")) {
    return WebResponseUtil.redirect(getPreviewUrl(stamp, "gif"), 302, {
      headers: {
        "X-Cache": "s3-hit",
        "X-Format": "gif",
        ...CACHE_HEADERS.redirect,
      },
    });
  }

  // Look up stamp data to get stamp_url and mimetype
  const stampData = await StampController.getSpecificStamp(stamp);
  if (!stampData?.stamp_url || stampData.stamp_mimetype !== "text/html") {
    // Not an HTML stamp — redirect to existing PNG preview
    return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
      headers: {
        "X-Gif-Skipped": "not-html",
        ...CACHE_HEADERS.redirect,
      },
    });
  }

  // Fetch HTML content for animation detection
  try {
    const htmlResponse = await fetch(stampData.stamp_url);
    if (!htmlResponse.ok) {
      return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
        headers: { "X-Gif-Skipped": "html-fetch-failed" },
      });
    }

    const rawHtml = await htmlResponse.text();
    const animation = detectAnimation(rawHtml);

    if (!animation.isAnimated) {
      console.log(
        `[Preview GIF] Stamp ${stamp} is not animated — returning PNG`,
      );
      return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
        headers: {
          "X-Gif-Skipped": "not-animated",
          ...CACHE_HEADERS.redirect,
        },
      });
    }

    console.log(
      `[Preview GIF] Stamp ${stamp} has animation: ${
        animation.patterns.join(", ")
      }`,
    );

    // Build content URL for URL-mode rendering
    const txHash = stampData.stamp_url.split("/stamps/").pop()?.replace(
      /\.html?$/i,
      "",
    );
    const contentUrl = txHash
      ? `https://stampchain.io/content/${txHash}`
      : stampData.stamp_url;

    // Determine render mode: recursive stamps use URL mode, inline use HTML mode.
    // Same logic as the PNG path in renderHtmlPreview().
    const hasIframe = rawHtml.includes("<iframe");
    const hasExternalRef = rawHtml.includes("ordinals.com/") ||
      rawHtml.includes("arweave.net/");
    const hasRelativeScriptSrc = /src\s*=\s*["']\//.test(rawHtml);
    const hasStampContentRef = /["']\/s\//.test(rawHtml) ||
      /["']A\d{10,}["']/.test(rawHtml);
    const isRecursive = hasIframe || hasExternalRef ||
      hasRelativeScriptSrc || hasStampContentRef;

    // Capture multiple frames from CF Worker.
    // 10 frames at 200ms = 2s of animation at 5fps — good balance of
    // quality vs time budget (must finish within ALB 60s idle timeout).
    const renderParams: {
      url?: string;
      html?: string;
      delay: number;
      frames: number;
      frameInterval: number;
      timeout: number;
    } = {
      delay: 3000,
      frames: 10,
      frameInterval: 200,
      timeout: 55000,
    };

    if (isRecursive) {
      renderParams.url = contentUrl;
    } else {
      renderParams.html = cleanHtmlForRendering(rawHtml);
    }

    const frames = await renderMultiFrameWithCloudflare(renderParams);

    if (!frames || frames.length === 0) {
      console.warn(
        `[Preview GIF] Frame capture failed for stamp ${stamp} — falling back to PNG`,
      );
      return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
        headers: {
          "X-Gif-Skipped": "capture-failed",
          ...CACHE_HEADERS.redirect,
        },
      });
    }

    // Assemble animated GIF from captured frames using ImageScript
    let gifBytes: Uint8Array;
    try {
      const gifFrames: InstanceType<typeof Frame>[] = [];
      for (const frameB64 of frames) {
        const raw = Uint8Array.from(atob(frameB64), (c) => c.charCodeAt(0));
        const img = await Image.decode(raw);
        gifFrames.push(Frame.from(img, 200)); // 200ms per frame = 5fps
      }

      const animatedGif = new GIF(gifFrames);
      const encoded = await animatedGif.encode();
      gifBytes = encoded instanceof Uint8Array
        ? encoded
        : new Uint8Array(encoded);

      console.log(
        `[Preview GIF] Stamp ${stamp} GIF assembled: ${gifFrames.length} frames, ${gifBytes.length}B`,
      );
    } catch (assemblyError) {
      const msg = assemblyError instanceof Error
        ? assemblyError.message
        : String(assemblyError);
      console.error(`[Preview GIF] Assembly failed for stamp ${stamp}: ${msg}`);
      return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
        headers: {
          "X-Gif-Skipped": `assembly-error: ${msg.slice(0, 100)}`,
          ...CACHE_HEADERS.redirect,
        },
      });
    }

    // Upload GIF to S3
    try {
      await uploadPreview(stamp, gifBytes, "gif", {
        "X-Animation-Patterns": animation.patterns.join(","),
      });
    } catch (uploadError) {
      const msg = uploadError instanceof Error
        ? uploadError.message
        : String(uploadError);
      console.error(
        `[Preview GIF] S3 upload failed for stamp ${stamp}: ${msg}`,
      );
      return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
        headers: {
          "X-Gif-Skipped": `upload-error: ${msg.slice(0, 100)}`,
          ...CACHE_HEADERS.redirect,
        },
      });
    }

    return WebResponseUtil.redirect(getPreviewUrl(stamp, "gif"), 302, {
      headers: {
        "X-Cache": "s3-uploaded",
        "X-Format": "gif",
        ...CACHE_HEADERS.redirect,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Preview GIF] Error generating GIF for stamp ${stamp}: ${msg}`,
    );
    // Graceful fallback to PNG
    return WebResponseUtil.redirect(getPreviewUrl(stamp, "png"), 302, {
      headers: {
        "X-Gif-Skipped": `error: ${msg.slice(0, 100)}`,
        ...CACHE_HEADERS.redirect,
      },
    });
  }
}

export const handler: Handlers = {
  async GET(req, ctx) {
    const handlerStart = Date.now();
    try {
      const { stamp } = ctx.params;
      const url = new URL(req.url);
      const forceRefresh = url.searchParams.get("refresh") === "true";
      const format = url.searchParams.get("format") || "png";

      // Validate format parameter
      if (format !== "png" && format !== "gif") {
        return WebResponseUtil.badRequest(
          `Invalid format: "${format}". Supported: png, gif`,
        );
      }

      console.log(
        `[Preview] Handler start for stamp ${stamp}, format=${format}, forceRefresh=${forceRefresh}`,
      );

      // Choose timeout based on format — GIF generation is slower
      const timeoutMs = format === "gif"
        ? GIF_HANDLER_TIMEOUT_MS
        : HANDLER_TIMEOUT_MS;

      const previewPromise = (async () => {
        let result: Response;
        if (format === "gif") {
          // GIF always uses S3 storage (too large for Redis)
          result = await handleS3GifPreview(stamp, forceRefresh);
        } else {
          result = useS3Storage
            ? await handleS3Preview(stamp, forceRefresh)
            : await handleRedisPreview(stamp, forceRefresh);
        }
        console.log(
          `[Preview] Render complete for stamp ${stamp} (${format}) in ${
            Date.now() - handlerStart
          }ms`,
        );
        return result;
      })();

      const timeoutPromise = new Promise<Response>((resolve) => {
        setTimeout(() => {
          console.warn(
            `[Preview] Handler timeout for stamp ${stamp} after ${
              Date.now() - handlerStart
            }ms`,
          );
          resolve(WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
            headers: {
              "X-Fallback": "handler-timeout",
              ...CACHE_HEADERS.error,
            },
          }));
        }, timeoutMs);
      });

      const response = await Promise.race([previewPromise, timeoutPromise]);
      console.log(
        `[Preview] Response ready for stamp ${stamp} in ${
          Date.now() - handlerStart
        }ms`,
      );
      return response;
    } catch (error) {
      const errName = error instanceof Error ? error.name : "unknown";
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        "Preview generation error:",
        errName,
        errMsg,
        error instanceof Error ? error.stack : "",
      );
      return WebResponseUtil.redirect(FALLBACK_LOGO, 302, {
        headers: {
          "X-Fallback": "general-error",
          ...CACHE_HEADERS.error,
        },
      });
    }
  },
};
