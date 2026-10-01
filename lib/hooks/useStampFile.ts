/* ===== STAMP FILE HOOK ===== */
/*
 * Upload state for the Classic / Posh create pages: validation, base64 payload
 * (same encoding that is minted), and preview URLs that are created once per
 * file and revoked on change/unmount.
 */
import { logger } from "$lib/utils/logger.ts";
import {
  fileToBase64,
  type StampMintPayload,
  validateStampFile,
} from "$lib/utils/stamps/mintHelpers.ts";
import {
  createRecursiveHtmlPreviewUrl,
  revokePreviewUrl,
} from "$lib/utils/ui/media/recursivePreview.ts";
import { useEffect, useMemo, useState } from "preact/hooks";

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;
const HTML_EXT = /\.html$/i;

export type StampFileKind = "image" | "html" | "other";

export function getStampFileKind(file: Pick<File, "name">): StampFileKind {
  if (IMAGE_EXT.test(file.name)) return "image";
  if (HTML_EXT.test(file.name)) return "html";
  return "other";
}

export function useStampFile() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [fileError, setFileError] = useState("");
  const [fileWarning, setFileWarning] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState<string | null>(null);

  // Preview URLs: one per file, always revoked.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setHtmlPreviewUrl(null);
      return;
    }

    let cancelled = false;
    let htmlUrl: string | null = null;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    // Recursive HTML stamps need a <base>-injected blob so /s/ refs resolve
    if (getStampFileKind(file) === "html") {
      createRecursiveHtmlPreviewUrl(file).then((created) => {
        if (cancelled) {
          revokePreviewUrl(created);
          return;
        }
        htmlUrl = created;
        setHtmlPreviewUrl(created);
      }).catch((error) => {
        logger.error("stamps", {
          message: "Failed to create recursive HTML preview",
          error: error?.message,
        });
        if (!cancelled) setHtmlPreviewUrl(null);
      });
    } else {
      setHtmlPreviewUrl(null);
    }

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      revokePreviewUrl(htmlUrl);
    };
  }, [file]);

  // Base64 of the exact bytes that will be minted (also feeds fee estimation)
  useEffect(() => {
    if (!file) {
      setFileBase64(undefined);
      return;
    }
    let cancelled = false;
    fileToBase64(file).then((b64) => {
      if (!cancelled) setFileBase64(b64);
    }).catch((error) => {
      logger.error("ui", {
        message: "Failed to convert file to base64 for fee estimation",
        error: error?.message,
      });
      if (!cancelled) setFileBase64(undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const clearFile = () => {
    setFile(null);
    setFileError("");
    setFileWarning("");
  };

  /** Validate and select a file; returns whether it was accepted. */
  const selectFile = (selected: File | null | undefined): boolean => {
    if (!selected) {
      setFileError("No file selected");
      setFileWarning("");
      setFile(null);
      return false;
    }
    const validation = validateStampFile(selected);
    if (!validation.isValid) {
      setFileError(validation.error || "Invalid file");
      setFileWarning("");
      setFile(null);
      return false;
    }
    setFileError("");
    setFileWarning(validation.warning ?? "");
    setFile(selected);
    return true;
  };

  const payload = useMemo<StampMintPayload | null>(() => {
    if (!file || !fileBase64) return null;
    return { file: fileBase64, filename: file.name, fileSize: file.size };
  }, [file, fileBase64]);

  return {
    file,
    fileKind: file ? getStampFileKind(file) : (null as StampFileKind | null),
    fileError,
    fileWarning,
    objectUrl,
    htmlPreviewUrl,
    /** Null until a valid file is selected and its base64 is ready. */
    payload,
    selectFile,
    clearFile,
  };
}

export type StampFileController = ReturnType<typeof useStampFile>;
