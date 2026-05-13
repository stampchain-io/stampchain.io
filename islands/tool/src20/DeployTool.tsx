/* ===== SRC20 TOKEN DEPLOYMENT COMPONENT ===== */
import { ToggleSwitchButton } from "$button";
import { useSRC20Form } from "$client/hooks/useSRC20Form.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { inputTextarea, inputTextareaWrapper, SRC20InputField } from "$form";
import { Icon } from "$icon";
import { DeployToolSkeleton } from "$indicators";
import {
  bodyTool,
  containerBackground,
  containerColForm,
  containerGap,
  containerRowForm,
  container2,
  container2Hover,
  transitionAll,
  transitionColors,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import type { APIResponse } from "$lib/types/api.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { getCSRFToken } from "$lib/utils/security/clientSecurityUtils.ts";
import { StatusMessages, tooltipButton, tooltipImage } from "$notification";
import { FeeCalculatorBase } from "$section";
import { titlePurpleLD } from "$text";
import axiod from "axiod";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== INTERFACE DEFINITIONS ===== */
interface UploadResponse extends APIResponse {
  url?: string;
}

/* ===== COMPONENT IMPLEMENTATION ===== */
export function SRC20DeployTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = { trxType: "olga" },
) {
  console.log("SRC20DeployTool trxType:", trxType);
  /* ===== FORM HOOK AND STATE ===== */
  const {
    formState,
    setFormState,
    handleChangeFee,
    handleInputChange,
    handleSubmit,
    config,
    isSubmitting,
    submissionMessage,
    apiError,
    handleInputBlur,
  } = useSRC20Form("deploy", trxType);

  /* ===== LOCAL STATE ===== */
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isUploadTooltipVisible, setIsUploadTooltipVisible] = useState(false);
  const [isToggleTooltipVisible, setIsToggleTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const uploadTooltipTimeoutRef = useRef<number | null>(null);
  const toggleTooltipTimeoutRef = useRef<number | null>(null);
  const [tooltipText, setTooltipText] = useState("OPTIONAL FIELDS");
  const { isConnected, wallet } = walletContext;

  /* ===== PROGRESSIVE FEE ESTIMATION INTEGRATION ===== */
  const {
    getBestEstimate,
    isPreFetching,
    estimateExact, // Phase 3: Exact estimation before deploying
    // Phase-specific results for UI indicators
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "src20-deploy",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // SRC-20 deploy specific parameters
    tick: formState.token,
    max: formState.max,
    lim: formState.lim,
    dec: formState.dec ? parseInt(formState.dec, 10) : 18,
  });

  // Get the best available fee estimate
  const progressiveFeeDetails = getBestEstimate();

  // Local state for exact fee details (updated when Phase 3 completes) - StampingTool pattern
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  // Reset exactFeeDetails when fee rate changes to allow slider updates - StampingTool pattern
  useEffect(() => {
    // Clear exact fee details when fee rate changes so slider updates work
    setExactFeeDetails(null);
  }, [formState.fee]);

  // Wrapper function for deploying that gets exact fees first - StampingTool pattern
  const handleDeployWithExactFees = async () => {
    try {
      // Get exact fees before final submission
      const exactFees = await estimateExact();
      if (exactFees) {
        // Calculate net spend amount (matches wallet display)
        const netSpendAmount = exactFees.totalValue || 0;
        setExactFeeDetails({
          ...exactFees,
          totalValue: netSpendAmount, // Matches wallet
        });
      }

      // Call the original deploy submission
      await handleSubmit();
    } catch (error) {
      console.error("SRC20 DEPLOY: Error in exact fee estimation", error);
      // Still proceed with submission even if exact fees fail
      await handleSubmit();
    }
  };

  /* ===== FILE HANDLING ===== */
  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0] || null;
    if (file) {
      const img = new Image();
      img.onload = () => {
        if (img.width === 420 && img.height === 420) {
          setFormState((prev) => ({ ...prev, file }));
        } else {
          setFileUploadError("Image must be exactly 420x420 pixels.");
        }
      };
      img.onerror = () => {
        setFileUploadError("Invalid image file.");
      };
      img.src = URL.createObjectURL(file);
    } else {
      setFormState((prev) => ({ ...prev, file: null }));
    }
  };

  /* ===== FILE UPLOAD HANDLER ===== */
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      try {
        const csrfToken = await getCSRFToken();

        logger.debug("stamps", {
          message: "Preparing background image upload",
          tick: formState.token,
          fileSize: file.size,
          mimeType: file.type,
          csrfTokenPresent: !!csrfToken,
          csrfTokenPreview: csrfToken ? csrfToken.slice(0, 10) + "..." : "none",
        });

        const response = await axiod.post<UploadResponse>(
          "/api/internal/src20Background",
          {
            fileData: base64String,
            tick: formState.token,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
          },
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Upload failed");
        }

        logger.debug("stamps", {
          message: "Background image uploaded successfully",
          tick: formState.token,
          url: response.data.url,
        });
      } catch (error) {
        // Improved error logging
        const errorMessage = error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
            "Unknown error";

        logger.error("stamps", {
          message: "Background image upload failed",
          error: errorMessage,
          tick: formState.token,
          details: error instanceof Error ? error.stack : undefined,
        });

        setFileUploadError(
          // `File upload failed: ${errorMessage}. The deployment will continue without the background image.`,
          `File upload failed: The deployment will continue without the background image.`,
        );
      }
    };

    reader.onerror = (error) => {
      logger.error("stamps", {
        message: "Failed to read image file",
        error: error,
        tick: formState.token,
      });
      setFileUploadError("Failed to read the image file");
    };

    reader.readAsDataURL(file);
  };

  /* ===== SUBMIT HANDLER ===== */
  const handleSubmitWithUpload = async () => {
    if (!isConnected) {
      logger.debug("stamps", {
        message: "Showing wallet connect modal - user not connected",
      });
      walletContext.showConnectModal();
      return;
    }

    if (formState.file) {
      try {
        await handleFileUpload(formState.file);
      } catch (error) {
        console.error("File upload error:", error);
        // Continue with deployment even if file upload fails
      }
    }

    await handleDeployWithExactFees();
  };

  /* ===== ADANCED OPTIONS TOGGLE ===== */
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const handleShowAdvancedOptions = () => {
    setAllowTooltip(false);
    setIsToggleTooltipVisible(false);
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  /* ===== TOOLTIP HANDLERS ===== */
  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({
      x: e.clientX, // Viewport coordinates for fixed positioning
      y: e.clientY,
    });
  };

  // Track global mouse movement when tooltip is visible
  useEffect(() => {
    if (!isUploadTooltipVisible) return;

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      setTooltipPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () =>
      document.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [isUploadTooltipVisible]);

  const handleUploadMouseEnter = () => {
    if (uploadTooltipTimeoutRef.current) {
      globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
    }

    uploadTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsUploadTooltipVisible(true);
    }, 1500);
  };

  const handleUploadMouseLeave = () => {
    if (uploadTooltipTimeoutRef.current) {
      globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
    }
    setIsUploadTooltipVisible(false);
  };

  const handleToggleMouseEnter = () => {
    if (allowTooltip) {
      setTooltipText(
        showAdvancedOptions ? "REQUIRED FIELDS" : "OPTIONAL FIELDS",
      );

      if (toggleTooltipTimeoutRef.current) {
        globalThis.clearTimeout(toggleTooltipTimeoutRef.current);
      }

      toggleTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsToggleTooltipVisible(true);
      }, 1500);
    }
  };

  const handleToggleMouseLeave = () => {
    if (toggleTooltipTimeoutRef.current) {
      globalThis.clearTimeout(toggleTooltipTimeoutRef.current);
    }
    setIsToggleTooltipVisible(false);
    setAllowTooltip(true);
  };

  /* ===== CLEANUP EFFECT ===== */
  useEffect(() => {
    return () => {
      if (uploadTooltipTimeoutRef.current) {
        globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
      }
      if (toggleTooltipTimeoutRef.current) {
        globalThis.clearTimeout(toggleTooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== CONFIG CHECK ===== */
  if (!config) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titlePurpleLD} mx-auto -mb-2 mobileLg:-mb-4`}>
          Deploy
        </h1>
        <DeployToolSkeleton />
      </div>
    );
  }

  /* ===== COMPONENT RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titlePurpleLD} mx-auto -mb-2 mobileLg:-mb-4`}>
        Deploy
      </h1>

      <form
        class={containerBackground}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitWithUpload();
        }}
        aria-label="Deploy SRC20 token"
        novalidate
      >
        {/* ===== MAIN FORM CONTAINER ===== */}
        <div class={containerRowForm}>
          {/* Image upload and decimals section */}
          <div class={`${containerColForm} !w-[100px]`}>
            {/* Image upload preview */}
            <div
              id="image-preview"
              class={`relative flex flex-col items-center justify-center content-center mx-auto min-h-[100px] min-w-[100px]
              ${container2} ${container2Hover}
              ${transitionColors} cursor-pointer group`}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleUploadMouseEnter}
              onMouseLeave={handleUploadMouseLeave}
              onMouseDown={() => setIsUploadTooltipVisible(false)}
              onClick={() => setIsUploadTooltipVisible(false)}
            >
              {/* File input and preview logic */}
              <input
                id="upload"
                type="file"
                class="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              {formState.file !== null && (
                <img
                  width={324}
                  class="bg-conic-pattern bg-[length:4px_4px]"
                  style={{
                    height: "100%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    backgroundColor: "rgb(0,0,0)",
                    borderRadius: "12px",
                  }}
                  src={URL.createObjectURL(formState.file)}
                />
              )}
              {formState.file === null && (
                <label
                  for="upload"
                  class="cursor-pointer h-full flex flex-col items-center justify-center gap-3"
                >
                  <Icon
                    type="icon"
                    name="uploadImage"
                    weight="extraLight"
                    size="xl"
                    color="custom"
                    className="stroke-color-neutral-600 group-hover:stroke-color-hover"
                    colorAccent="var(--color-primary-400)"
                    colorAccentHover="var(--color-primary-300)"
                  />
                </label>
              )}
            </div>

            {/* Decimal input */}
            <SRC20InputField
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Decimals"
              value={formState.dec}
              onChange={(e) => handleInputChange(e, "dec")}
            />
          </div>

          {/* Token details section */}
          <div class={containerColForm}>
            <div class={containerRowForm}>
              {/* Token input */}
              <SRC20InputField
                type="text"
                placeholder="Ticker name"
                value={formState.token}
                onChange={(e) => {
                  const newValue = (e.target as HTMLInputElement).value
                    .toUpperCase();
                  if (newValue !== formState.token) {
                    handleInputChange(e, "token");
                  }
                }}
                onBlur={() => handleInputBlur("token")}
                error={formState.tokenError}
                maxLength={5}
                isUppercase
              />
              {/* Advanced options toggle */}
              <div class="relative" tabIndex={0}>
                <ToggleSwitchButton
                  isActive={showAdvancedOptions}
                  onToggle={() => {
                    handleShowAdvancedOptions();
                    setIsToggleTooltipVisible(false);
                    setAllowTooltip(false);
                  }}
                  toggleButtonId="switch-toggle-advanced"
                  onMouseEnter={handleToggleMouseEnter}
                  onMouseLeave={handleToggleMouseLeave}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
                <div
                  class={`${tooltipButton} ${
                    isToggleTooltipVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {tooltipText}
                </div>
              </div>
            </div>

            {/* Supply and limit inputs */}
            <SRC20InputField
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Supply"
              value={formState.max}
              onChange={(e) => handleInputChange(e, "max")}
              onBlur={() => handleInputBlur("max")}
              error={formState.maxError}
            />

            <SRC20InputField
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Limit per mint"
              value={formState.lim}
              onChange={(e) => handleInputChange(e, "lim")}
              onBlur={() => handleInputBlur("lim")}
              error={formState.limError}
            />
          </div>
        </div>

        {/* ===== ADVANCED OPTIONS SECTION ===== */}
        <div
          class={`overflow-hidden ${transitionAll} ${
            showAdvancedOptions
              ? "max-h-[320px] opacity-100 mt-5"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div class={containerColForm}>
            <div class={inputTextareaWrapper}>
              <textarea
                class={`${inputTextarea} scrollbar-background-layer1`}
                placeholder="Description"
                rows={3}
                value={formState.description || ""}
                onChange={(e) => handleInputChange(e, "description")}
              />
            </div>
            <div class={containerRowForm}>
              <SRC20InputField
                type="text"
                placeholder="X"
                value={formState.x}
                onChange={(e) => handleInputChange(e, "x")}
                error={formState.xError}
              />
              <SRC20InputField
                type="text"
                placeholder="Website"
                value={formState.web}
                onChange={(e) => handleInputChange(e, "web")}
              />
            </div>
            <div class={containerRowForm}>
              <SRC20InputField
                type="text"
                placeholder="Telegram"
                value={formState.tg || ""}
                onChange={(e) => handleInputChange(e, "tg")}
              />
              <SRC20InputField
                type="email"
                placeholder="Email"
                value={formState.email || ""}
                onChange={(e) => handleInputChange(e, "email")}
              />
            </div>
            <SRC20InputField
              type="text"
              placeholder="EXTERNAL IMAGE LINK"
              value={formState.img || ""}
              onChange={(e) => {
                const value = (e.target as HTMLInputElement).value;
                // If it's an st: reference and longer than allowed, normalize it
                if (value.startsWith("st:") && value.length > 23) {
                  const normalizedValue = `st:${value.substring(3, 23)}`;
                  (e.target as HTMLInputElement).value = normalizedValue;
                }
                handleInputChange(e, "img");
              }}
              maxLength={32}
            />
          </div>
        </div>
      </form>

      {/* ===== FEE CALCULATOR AND STATUS MESSAGES ===== */}
      <div class={containerBackground}>
        <FeeCalculatorBase
          fee={formState.fee}
          ticker={formState.token}
          limit={Number(formState.lim) || 0}
          supply={Number(formState.max) || 0}
          dec={Number(formState.dec) || 18}
          fromPage="src20_deploy"
          handleChangeFee={handleChangeFee}
          type="src20"
          BTCPrice={formState.BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleDeployWithExactFees}
          buttonName={isConnected ? "DEPLOY" : "CONNECT WALLET"}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          bitname=""
          feeDetails={mapProgressiveFeeDetails(
            exactFeeDetails || progressiveFeeDetails,
          )}
          progressIndicator={
            <ProgressiveEstimationIndicator
              isConnected={!!wallet && !isSubmitting}
              isSubmitting={isSubmitting}
              isPreFetching={isPreFetching}
              currentPhase={currentPhase}
              phase1={!!phase1}
              phase2={!!phase2}
              phase3={!!phase3}
              feeEstimationError={feeEstimationError}
              clearError={clearError}
            />
          }
        />

        <StatusMessages
          submissionMessage={submissionMessage}
          apiError={apiError}
          fileUploadError={fileUploadError}
        />
      </div>

      {/* Tooltip outside backdrop-blur container to avoid stacking context issues */}
      <div
        class={`${tooltipImage} ${
          isUploadTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 6}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        UPLOAD COVER IMAGE
      </div>
    </div>
  );
}
