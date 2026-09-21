/* ===== RECEIVE ADDRESS MODAL COMPONENT ===== */
import { Icon } from "$icon";
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import { tooltipIcon } from "$notification";
import type { ReceiveAddyModalProps } from "$types/ui.d.ts";
import QRCodeStyling from "https://esm.sh/qr-code-styling@1.6.0-rc.1";
import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
function RecieveAddyModal(
  { address, title = "RECEIVE" }: ReceiveAddyModalProps,
) {
  /* ===== STATE ===== */
  const [isCopyTooltipVisible, setIsCopyTooltipVisible] = useState(false);
  const [allowCopyTooltip, setAllowCopyTooltip] = useState(true);
  const [copyTooltipText, setCopyTooltipText] = useState("COPY ADDY");
  const qrRef = useRef<HTMLDivElement>(null);

  /* ===== REFS ===== */
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const copyTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== QR CODE GENERATION ===== */
  useEffect(() => {
    if (!qrRef.current) return;

    const qrCode = new QRCodeStyling({
      type: "svg",
      width: 256,
      height: 256,
      data: `bitcoin:${address}`,
      margin: 2,
      qrOptions: {
        errorCorrectionLevel: "L",
      },
      dotsOptions: {
        type: "square",
        gradient: {
          type: "linear",
          rotation: 45,
          colorStops: [
            { offset: 0, color: "var(--color-neutral-100)" },
            { offset: 1, color: "var(--color-neutral-500)" },
          ],
        },
      },
      backgroundOptions: {
        color: "transparent",
      },
    });

    // Clear previous content
    qrRef.current.innerHTML = "";

    // Append new QR code
    qrCode.append(qrRef.current);
  }, [address]);

  useEffect(() => {
    return () => {
      if (copyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(copyTooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== EVENT HANDLERS ===== */
  const handleCopyMouseEnter = () => {
    if (allowCopyTooltip) {
      setCopyTooltipText(
        copyTooltipText === "ADDY COPIED" ? "ADDY COPIED" : "COPY ADDY",
      );

      if (copyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(copyTooltipTimeoutRef.current);
      }

      copyTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCopyTooltipVisible(true);
      }, 1500);
    }
  };

  const handleCopyMouseLeave = () => {
    if (copyTooltipTimeoutRef.current) {
      globalThis.clearTimeout(copyTooltipTimeoutRef.current);
    }
    setIsCopyTooltipVisible(false);
    setAllowCopyTooltip(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address ?? "");
      setCopyTooltipText("ADDY COPIED");
      setIsCopyTooltipVisible(true);
      setAllowCopyTooltip(false);

      if (copyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(copyTooltipTimeoutRef.current);
      }

      copyTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCopyTooltipVisible(false);
        globalThis.setTimeout(() => {
          setCopyTooltipText("COPY ADDY");
        }, 300);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={() => {
        logger.debug("ui", {
          message: "Modal closing",
          component: "RecieveAddyModal",
        });
        closeModal();
      }}
      title={title}
    >
      <div class="flex flex-col items-center">
        {/* ===== QR CODE SECTION ===== */}
        <div
          ref={qrRef}
          class="mb-5 bg-transparent w-[256px] h-[256px] flex items-center justify-center"
        />

        {/* ===== ADDRESS SECTION ===== */}
        <div class="flex flex-col items-center">
          <p class="break-all text-center text-base leading-relaxed text-color-neutral-200 max-w-full">
            {formatAddress(address ?? "")}
          </p>
        </div>

        {/* ===== COPY BUTTON SECTION ===== */}
        <div class="flex flex-col items-center pt-3 pb-1">
          <div
            ref={copyButtonRef}
            class="relative"
            onMouseEnter={handleCopyMouseEnter}
            onMouseLeave={handleCopyMouseLeave}
          >
            <Icon
              type="iconButton"
              name="copy"
              weight="normal"
              size="md"
              color="neutral400"
              onClick={handleCopy}
            />
            <div
              class={`${tooltipIcon} ${
                isCopyTooltipVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {copyTooltipText}
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}

/* ===== HELPER FUNCTIONS ===== */
function formatAddress(address: string): JSX.Element[] {
  const groups = address.match(/.{1,4}/g) ?? [address];
  return groups.map((group, index) => [
    index % 2 === 0 ? <span key={index}>{group}</span> : (
      <span
        key={index}
        class="font-semibold text-base text-color-primary-400"
      >
        {group}
      </span>
    ),
    // Add line break after every 4th group (16 characters)
    index < groups.length - 1 && (
      (index + 1) % 4 === 0
        ? <br key={`break-${index}`} />
        : <span key={`space-${index}`}>&nbsp;</span>
    ),
  ]).flat().filter(Boolean) as JSX.Element[];
}

export default RecieveAddyModal;
