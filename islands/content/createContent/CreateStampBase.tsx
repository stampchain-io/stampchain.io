/* ===== CREATE STAMP BASE ===== */
/*
 * Shared UI for the Classic, Posh (and Recursive) create pages:
 *  - CreateStampLayout:      two-column shell (sidebar panel + workspace)
 *  - StampMintPanel:         EDITIONS / LOCKED / CPID rows, fee calculator
 *  - StampCpidToggleRow:     AUTO GENERATE CPID <-> CUSTOM CPID (classic)
 *  - StampNamedStampRow:     required ADD ASSET NAME input (posh)
 *  - StampUploadWorkspace:   upload + preview column (classic / posh)
 * Logic lives in `useStampMint` / `useStampFile`.
 */
import { ToggleSwitchButton } from "$button";
import { StampCard } from "$card";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { Icon, PlaceholderImage } from "$icon";
import { InputField } from "$islands/form/InputField.tsx";
import PreviewCodeModal from "$islands/modal/PreviewCodeModal.tsx";
import PreviewImageModal from "$islands/modal/PreviewImageModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import { container2, container2Icon, transitionColors } from "$layout";
import type { StampFileController } from "$lib/hooks/useStampFile.ts";
import type { StampMintController } from "$lib/hooks/useStampMint.ts";
import { MAX_STAMP_FILE_BYTES } from "$lib/utils/stamps/mintHelpers.ts";
import { handleImageError } from "$lib/utils/ui/media/imageUtils.ts";
import { StatusMessages } from "$notification";
import { FeeCalculatorBase } from "$section";
import { labelSm, labelXs, subtitlePrimary, textSm, textXs } from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== LAYOUT ===== */
interface CreateStampLayoutProps {
  /** Sidebar heading, e.g. "STAMP" or "COMPOSER". */
  title: string;
  sidebar: ComponentChildren;
  /** Workspace column content (canvas, upload area, ...). */
  children: ComponentChildren;
}

/** Two-column shell shared by all create pages (workspace on top on mobile). */
export function CreateStampLayout(
  { title, sidebar, children }: CreateStampLayoutProps,
) {
  return (
    <div class="flex flex-col-reverse mobileLg:flex-row w-full gap-5 pt-3">
      <div
        class={`w-full mobileLg:w-[320px] mobileLg:shrink-0
          h-[700px] mobileLg:h-[640px] min-[1080px]:h-[690px]
          flex flex-col overflow-hidden p-5
          ${container2}`}
      >
        <h2 class={`${subtitlePrimary} -mt-2.5`}>{title}</h2>
        {sidebar}
      </div>
      <div
        class={`w-full mobileLg:flex-1 min-w-0
          h-[340px] min-[480px]:h-[400px] mobileMd:h-[480px]
          mobileLg:h-[640px] min-[1080px]:h-[690px]
          flex flex-col overflow-hidden ${container2}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ===== MINT PANEL ROWS ===== */
interface MintRowProps {
  mint: StampMintController;
}

function StampEditionsRow({ mint }: MintRowProps) {
  const { issuance } = mint;
  return (
    <div class="flex items-center justify-between gap-3">
      <h5 class={textSm}>EDITIONS</h5>
      <div
        class="w-8 shrink-0"
        style={issuance.length > 1
          ? { width: `calc(${issuance.length}ch + 1.5rem + 2px)` }
          : undefined}
      >
        <InputField
          type="text"
          value={issuance}
          onChange={mint.handleIssuanceChange}
          error={mint.issuanceError}
          textAlign="center"
        />
      </div>
    </div>
  );
}

function StampLockedRow({ mint }: MintRowProps) {
  return (
    <div class="flex items-center justify-between gap-3">
      <h5 class={labelXs}>{mint.isLocked ? "LOCKED" : "UNLOCKED"}</h5>
      <ToggleSwitchButton
        isActive={!mint.isLocked}
        onToggle={() => mint.setIsLocked((prev) => !prev)}
        toggleButtonId="switch-toggle-locked"
      />
    </div>
  );
}

/** Classic / Recursive: auto-generated CPID, or a custom A-prefixed number. */
export function StampCpidToggleRow({ mint }: MintRowProps) {
  return (
    <div class="flex items-center justify-between gap-3">
      {mint.includeCustomCpid
        ? (
          <div class="flex-1 min-w-0">
            <InputField
              type="text"
              value={mint.stampName}
              onChange={mint.handleStampNameChange}
              placeholder="CUSTOM CPID"
              maxLength={21}
              minLength={15}
              error={mint.stampNameError}
            />
          </div>
        )
        : <h5 class={labelXs}>AUTO GENERATE CPID</h5>}
      <ToggleSwitchButton
        isActive={mint.includeCustomCpid}
        onToggle={mint.toggleCustomCpid}
        toggleButtonId="switch-toggle-cpid"
      />
    </div>
  );
}

/** Posh: the named stamp is mandatory (B-Z, up to 13 letters, needs XCP). */
export function StampNamedStampRow({ mint }: MintRowProps) {
  return (
    <div class="flex flex-col gap-1">
      <InputField
        type="text"
        value={mint.stampName}
        onChange={mint.handleStampNameChange}
        placeholder="ADD ASSET NAME"
        maxLength={13}
        minLength={1}
        error={mint.stampNameError}
      />
      <p class={textXs}>REQUIRES XCP IN YOUR WALLET</p>
    </div>
  );
}

/* ===== MINT PANEL ===== */
interface StampMintPanelProps {
  mint: StampMintController;
  /** CPID row: `StampCpidToggleRow` or `StampNamedStampRow`. */
  cpidRow: ComponentChildren;
  /** Render the CPID row above the LOCKED row (default: below it). */
  cpidAboveLocked?: boolean;
  /** Extra rows rendered below the CPID row, after a divider. */
  extraRows?: ComponentChildren;
  /** MIME type of the stamp (fee calculator size hint). */
  fileType: string;
  fileSize: number;
  /** Extra file/payload error shown under the fee calculator. */
  fileUploadError?: string | null;
  /** Override the submit handler (defaults to `mint.mint`). */
  onSubmit?: () => void | Promise<void>;
}

/** Sidebar content: EDITIONS, LOCKED, CPID rows + fee calculator + status. */
export function StampMintPanel(
  {
    mint,
    cpidRow,
    cpidAboveLocked = false,
    extraRows,
    fileType,
    fileSize,
    fileUploadError = null,
    onSubmit,
  }: StampMintPanelProps,
) {
  const { feeDetails } = mint;
  const cpid = mint.variant === "posh" || mint.includeCustomCpid
    ? mint.stampName
    : "";

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex flex-col gap-3">
          <StampEditionsRow mint={mint} />
          {cpidAboveLocked && cpidRow}
          <StampLockedRow mint={mint} />
          {!cpidAboveLocked && cpidRow}
          {extraRows && (
            <>
              <hr />
              {extraRows}
            </>
          )}
        </div>
      </div>
      <div class="shrink-0">
        <hr class="my-3" />
        <FeeCalculatorBase
          fee={mint.fee}
          handleChangeFee={mint.handleChangeFee}
          type="stamp"
          fileType={fileType}
          fileSize={fileSize}
          issuance={parseInt(mint.issuance, 10)}
          BTCPrice={mint.BTCPrice}
          showCoinToggle
          tosAgreed={mint.tosAgreed}
          onTosChange={mint.setTosAgreed}
          isSubmitting={mint.isSubmitting}
          onSubmit={onSubmit ?? mint.mint}
          buttonName={mint.isConnected ? "STAMP" : "CONNECT WALLET"}
          disabled={mint.isConnected ? !mint.isFormValid : false}
          bitname=""
          {...(cpid ? { cpid } : {})}
          feeDetails={{
            minerFee: feeDetails?.minerFee || 0,
            dustValue: feeDetails?.dustValue || 0,
            totalValue: feeDetails?.totalValue || 0,
            hasExactFees: feeDetails?.hasExactFees || false,
            estimatedSize: 300, // Default transaction size for stamps
          }}
          progressIndicator={
            <ProgressiveEstimationIndicator
              {...mint.estimation}
            />
          }
        />
        <StatusMessages
          submissionMessage={mint.submissionMessage}
          apiError={mint.apiError}
          fileUploadError={fileUploadError}
          walletError={mint.isConnected ? mint.addressError ?? null : null}
        />
      </div>
    </div>
  );
}

/* ===== GENERATED STAMP ROW (card previews) ===== */
/** Placeholder `StampRow` so unpublished stamps can render in `StampCard`. */
export function buildGeneratedStampRow(opts: {
  /** Used for `file_size_bytes` when `fileSize` is not given. */
  html?: string;
  fileSize?: number;
  issuance: string;
  stampName: string;
  creator: string;
  creatorName: string | null;
  locked: boolean;
  mimeType?: string;
  /** Card name shown while `stampName` is empty. */
  emptyName?: string;
  /** "SRC-721" shows the recursive badge; Classic / Posh use "STAMP". */
  ident?: "STAMP" | "SRC-721";
  /** Base64 payload; lets `StampCard` render images as a data URI. */
  base64?: string;
}): StampRow {
  const supply = parseInt(opts.issuance, 10);
  return {
    stamp: 1234567,
    cpid: opts.stampName || opts.emptyName || "AUTO GENERATED",
    ident: opts.ident ?? "SRC-721",
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
    stamp_base64: opts.base64 ?? "",
    stamp_mimetype: opts.mimeType ?? "text/html",
    stamp_url: "",
    stamp_hash: "",
    file_hash: "",
    file_size_bytes: opts.fileSize ??
      new TextEncoder().encode(opts.html ?? "").length,
    unbound_quantity: 0,
  };
}

/* ===== UPLOAD WORKSPACE ===== */
interface StampUploadWorkspaceProps {
  stampFile: StampFileController;
  /** Feeds the card preview (editions, lock state, CPID). */
  mint: StampMintController;
  disabled?: boolean;
}

const TEXT_FILE_EXT = /\.(svg|html|txt|json|xml)$/i;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  html: "text/html",
};

function getFileMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

const CHECKER_BG =
  "bg-conic-pattern bg-[length:4px_4px] bg-color-grey/30 [image-rendering:pixelated]";

/** 1:1 square sized to the largest fit inside the size-container wrapper. */
const SQUARE_SIZE = "shrink-0 w-[min(100cqw,100cqh)] h-[min(100cqw,100cqh)]";

/**
 * Right column for Classic / Posh: upload, drag & drop and file preview.
 * Overlay buttons (top right): delete, fullscreen, view code, view mode
 * (single preview <-> cards).
 */
export function StampUploadWorkspace(
  { stampFile, mint, disabled = false }: StampUploadWorkspaceProps,
) {
  const {
    file,
    fileKind,
    objectUrl,
    htmlPreviewUrl,
  } = stampFile;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewView, setPreviewView] = useState<"single" | "cards">("single");
  const [htmlSource, setHtmlSource] = useState("");

  // HTML source for the card previews (srcDoc)
  useEffect(() => {
    if (!file || fileKind !== "html") {
      setHtmlSource("");
      return;
    }
    let cancelled = false;
    file.text().then((text) => {
      if (!cancelled) setHtmlSource(text);
    }).catch(() => {
      if (!cancelled) setHtmlSource("");
    });
    return () => {
      cancelled = true;
    };
  }, [file, fileKind]);

  // Back to the single preview once the file is gone
  useEffect(() => {
    if (!file) setPreviewView("single");
  }, [file]);

  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    stampFile.selectFile(input.files?.[0]);
    // Allow re-selecting the same file after clearing
    input.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    stampFile.selectFile(e.dataTransfer?.files?.[0]);
  };

  const openFullscreen = () => {
    if (!file) return;
    const isHtml = fileKind === "html";
    openModal(
      <PreviewImageModal
        src={isHtml && htmlPreviewUrl ? htmlPreviewUrl : file}
        contentType={isHtml ? "html" : "image"}
      />,
      "zoomInOut",
    );
  };

  /** Shows the code that will be stamped: source for text files, else base64. */
  const openCode = async () => {
    if (!file) return;
    let code = stampFile.payload?.file ?? "";
    if (file.type.startsWith("text/") || TEXT_FILE_EXT.test(file.name)) {
      try {
        code = await file.text();
      } catch (_error) {
        // Fall back to the base64 payload
      }
    }
    openModal(<PreviewCodeModal src={code} />, "zoomInOut");
  };

  const cardStamp = file
    ? buildGeneratedStampRow({
      fileSize: file.size,
      issuance: mint.issuance,
      stampName: mint.variant === "posh" || mint.includeCustomCpid
        ? mint.stampName
        : "",
      creator: walletContext.isConnected ? walletContext.wallet.address : "",
      creatorName: walletContext.isConnected ? null : "Connect Wallet",
      locked: mint.isLocked,
      mimeType: getFileMime(file),
      ident: "STAMP",
      ...(mint.variant === "posh" ? { emptyName: "ADD NAME" } : {}),
      ...(stampFile.payload ? { base64: stampFile.payload.file } : {}),
    })
    : null;
  const cardPreviewHtml = fileKind === "html" && htmlSource
    ? htmlSource
    : undefined;
  const cardProps = cardPreviewHtml ? { previewHtml: cardPreviewHtml } : {};

  const emptyState = (
    <label
      for="stamp-upload"
      class={`group flex ${SQUARE_SIZE} flex-col items-center justify-center
        gap-3 rounded-2xl cursor-pointer ${CHECKER_BG} ${transitionColors}
        border border-dashed ${
        isDragging ? "border-color-primary-400" : "border-color-neutral-700"
      }`}
    >
      <Icon
        type="icon"
        name="uploadImage"
        weight="extraLight"
        size="custom"
        color="neutral600"
        className="w-20 h-20"
      />
      <h5 class={labelSm}>UPLOAD FILE</h5>
      <h6 class={labelXs}>
        CLICK OR DROP HERE - MAX {MAX_STAMP_FILE_BYTES / 1024}KB
      </h6>
    </label>
  );

  const previewState = file && (
    <div
      class={`relative flex ${SQUARE_SIZE} items-center justify-center
        rounded-2xl overflow-hidden ${CHECKER_BG}
        ${isDragging ? "ring-2 ring-color-primary-400" : ""}`}
    >
      {previewView === "single" && (fileKind === "image" && objectUrl
        ? (
          <img
            class="w-full h-full object-contain [image-rendering:pixelated]"
            src={objectUrl}
            alt="Stamp preview"
            onError={handleImageError}
          />
        )
        : fileKind === "html" && htmlPreviewUrl
        ? (
          <iframe
            title="Stamp preview"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
            src={htmlPreviewUrl}
            class="w-full h-full overflow-hidden"
          />
        )
        : (
          <div class="w-1/3 max-w-[200px]">
            <PlaceholderImage variant="no-image" />
          </div>
        ))}
      {previewView === "cards" && cardStamp && (
        <div class="absolute inset-0 z-[5] min-w-0 overflow-x-hidden
          overflow-y-auto min-[480px]:overflow-hidden p-3 flex
          items-start min-[480px]:items-center justify-center">
          <div class="flex flex-col min-[480px]:flex-row gap-3
            items-center min-[480px]:items-start">
            <div class="flex flex-col gap-3">
              <div class="flex gap-3 items-end">
                <div class="w-12 h-12 shrink-0">
                  <StampCard
                    stamp={cardStamp}
                    variant="cardSquare"
                    {...cardProps}
                  />
                </div>
                <div class="w-24 h-24 shrink-0">
                  <StampCard
                    stamp={cardStamp}
                    variant="cardSquare"
                    {...cardProps}
                  />
                </div>
              </div>
              <div class="w-40 h-40 shrink-0">
                <StampCard
                  stamp={cardStamp}
                  variant="cardSquare"
                  {...cardProps}
                />
              </div>
            </div>
            <div class="w-[180px] shrink-0">
              <StampCard
                stamp={cardStamp}
                variant="cardVerticalDetail"
                {...cardProps}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* Action buttons sit in the top-right corner of the container2 column */
  const actionButtons = file && (
    <div class="absolute top-0 right-0 z-10 p-5 flex gap-2">
      <div class={container2Icon}>
        <Icon
          type="iconButton"
          name="trash"
          weight="normal"
          size="md"
          color="neutral400"
          ariaLabel="Delete file"
          onClick={(e) => {
            e.preventDefault();
            stampFile.clearFile();
          }}
        />
      </div>
      <div class={container2Icon}>
        <Icon
          type="iconButton"
          name="previewCode"
          weight="normal"
          size="md"
          color="neutral400"
          ariaLabel="View code"
          onClick={(e) => {
            e.preventDefault();
            openCode();
          }}
        />
        <Icon
          type="iconButton"
          name="previewImage"
          weight="normal"
          size="md"
          color="neutral400"
          ariaLabel="Preview stamp fullscreen"
          onClick={(e) => {
            e.preventDefault();
            openFullscreen();
          }}
        />
        <Icon
          type="iconButton"
          name={previewView === "cards" ? "viewCardMixed" : "viewCardSingle"}
          weight="normal"
          size="md"
          color="neutral400"
          ariaLabel={previewView === "cards"
            ? "Switch to single preview"
            : "Switch to card preview"}
          onClick={(e) => {
            e.preventDefault();
            setPreviewView((v) => v === "single" ? "cards" : "single");
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      class="relative flex flex-1 min-h-0 flex-col gap-3 p-5"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        id="stamp-upload"
        ref={inputRef}
        type="file"
        class="hidden"
        disabled={disabled}
        onChange={handleInput}
      />
      {/* Size-container: the 1:1 area fits the largest square available */}
      <div class="flex flex-1 min-h-0 items-center justify-center [container-type:size]">
        {file ? previewState : emptyState}
      </div>
      {actionButtons}
      {/* All notifications live in the sidebar (StatusMessages) */}
    </div>
  );
}
