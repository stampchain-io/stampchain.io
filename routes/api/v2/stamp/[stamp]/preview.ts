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
import { GIF, Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
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
}): Promise<Uint8Array | null> {
  if (!isCfWorkerConfigured) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(CF_WORKER_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CF_WORKER_SECRET}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[Preview] CF Worker returned ${response.status}: ${errorBody}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Preview] CF Worker request failed: ${msg}`);
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

const FALLBACK_LOGO =
  "https://stampchain.io/img/logo/stampchain-logo-opengraph.jpg";

/** Cached preview stored in Redis: base64 PNG + metadata headers */
interface CachedPreview {
  png: string;
  meta: Record<string, string>;
}

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
  const isComplex = stamp_url?.includes("recursive") ||
    stamp_url?.includes("fractal") ||
    stamp_url?.includes("canvas");
  const delay = isComplex ? 8000 : 5000;

  // Try CF Worker first: fetch raw HTML from CDN, clean it, send to Worker
  if (isCfWorkerConfigured) {
    try {
      const htmlResponse = await fetch(stamp_url);
      if (htmlResponse.ok) {
        const rawHtml = await htmlResponse.text();
        const cleanedHtml = cleanHtmlForRendering(rawHtml);

        const cfBuffer = await renderWithCloudflare({
          html: cleanedHtml,
          viewport: { width: 1200, height: 1200 },
          delay,
        });

        if (cfBuffer) {
          console.log(
            `[HTML Preview] Stamp ${stampNumber} rendered via CF Worker`,
          );
          const result = await centerOnCanvas(cfBuffer, {
            stampNumber,
            stamp_mimetype,
            method: "cloudflare-browser",
          });
          result.meta["X-Render-Time"] = isComplex ? "extended" : "standard";
          result.meta["X-Rendering-Engine"] = "cloudflare-worker";
          return result;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        `[HTML Preview] CF Worker path failed for stamp ${stampNumber}: ${msg}`,
      );
    }
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
  await uploadPreview(stamp, pngBytes, rendered.meta);

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

  let wasRendered = false;
  const cached = await dbManager.handleCache<CachedPreview | null>(
    cacheKey,
    async () => {
      wasRendered = true;
      return await renderPreview(stamp);
    },
    604800,
  );

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

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const { stamp } = ctx.params;
      const url = new URL(req.url);
      const forceRefresh = url.searchParams.get("refresh") === "true";

      if (useS3Storage) {
        return await handleS3Preview(stamp, forceRefresh);
      }
      return await handleRedisPreview(stamp, forceRefresh);
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
