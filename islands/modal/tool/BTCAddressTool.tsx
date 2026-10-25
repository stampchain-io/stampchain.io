/* ===== BITCOIN ADDRESS TOOL MODAL ===== */
import { walletContext } from "$client/wallet/wallet.ts";
import { Icon } from "$icon";
import { openModalTool, ModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { tooltipIcon } from "$notification";
import type { BTCAddressToolProps } from "$types/ui.d.ts";
import QRCodeStyling from "https://esm.sh/qr-code-styling@1.6.0-rc.1";
import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== OPENER ===== */
export function openBTCAddressTool(props: BTCAddressToolProps = {}) {
  openModalTool(<BTCAddressTool {...props} />);
}

/* ===== HELPERS ===== */
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
    index < groups.length - 1 && (
      (index + 1) % 4 === 0
        ? <br key={`break-${index}`} />
        : <span key={`space-${index}`}>&nbsp;</span>
    ),
  ]).flat().filter(Boolean) as JSX.Element[];
}

/* ===== COMPONENT ===== */
export function BTCAddressTool({ address }: BTCAddressToolProps) {
  const { wallet } = walletContext;
  const displayAddress = address || wallet?.address || "";

  /* ===== STATE ===== */
  const [isCopyTooltipVisible, setIsCopyTooltipVisible] = useState(false);
  const [allowCopyTooltip, setAllowCopyTooltip] = useState(true);
  const [copyTooltipText, setCopyTooltipText] = useState("COPY ADDY");

  /* ===== REFS ===== */
  const qrRef = useRef<HTMLDivElement>(null);
  const copyTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== QR CODE GENERATION ===== */
  useEffect(() => {
    if (!qrRef.current) return;

    const qrCode = new QRCodeStyling({
      type: "svg",
      width: 256,
      height: 256,
      data: `bitcoin:${displayAddress}`,
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
            { offset: 1, color: "var(--color-neutral-400)" },
          ],
        },
      },
      backgroundOptions: {
        color: "transparent",
      },
    });

    qrRef.current.innerHTML = "";
    qrCode.append(qrRef.current);
  }, [displayAddress]);

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
      await navigator.clipboard.writeText(displayAddress);
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
    <ModalTool title="BITCOIN" subtitle="ADDRESS">
      <div class="flex flex-col items-center">
        <div
          ref={qrRef}
          class="mb-5 bg-transparent w-[256px] h-[256px] flex items-center
            justify-center"
        />

        <div class="flex flex-col items-center">
          <p class="break-all text-center text-base leading-relaxed
              text-color-neutral-200 max-w-full">
            {formatAddress(displayAddress)}
          </p>
        </div>

        <div class="flex flex-col items-center pt-3 pb-1">
          <div
            class="relative"
            onMouseEnter={handleCopyMouseEnter}
            onMouseLeave={handleCopyMouseLeave}
          >
            <Icon
              type="iconButton"
              name="copy"
              weight="normal"
              size="lg"
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
    </ModalTool>
  );
}
