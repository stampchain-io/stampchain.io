/**
 * Creates a blob URL for previewing recursive HTML stamps.
 *
 * Recursive stamps reference other on-chain stamps via relative paths
 * (e.g., `/s/A113120141518165165` in CSS url(), script src, img src, etc.).
 * When previewing a local file via a blob: URL, these paths need a base URL
 * so the browser resolves them against the stampchain server.
 *
 * This injects a `<base>` tag into the HTML without modifying the original
 * file — the returned blob is used only for preview rendering.
 */

/**
 * Read an HTML file, inject a `<base href>` tag, and return a blob URL
 * suitable for iframe preview. The original File object is never mutated.
 *
 * @param file        The uploaded HTML File
 * @param baseUrl     Origin to resolve relative paths against
 *                    (defaults to current page origin)
 * @returns           A blob: URL string for use as an iframe src
 */
export function createRecursiveHtmlPreviewUrl(
  file: File,
  baseUrl = globalThis.location?.origin ?? "",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      let html = reader.result as string;
      const baseTag = `<base href="${baseUrl}/">`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(
          /(<html[^>]*>)/i,
          `$1<head>${baseTag}</head>`,
        );
      } else {
        html = `${baseTag}\n${html}`;
      }

      const blob = new Blob([html], { type: "text/html" });
      resolve(URL.createObjectURL(blob));
    };

    reader.onerror = () =>
      reject(new Error("Failed to read HTML file for preview"));
    reader.readAsText(file);
  });
}

/**
 * Safely revoke a blob URL if it was created by createRecursiveHtmlPreviewUrl.
 */
export function revokePreviewUrl(url: string | null): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
