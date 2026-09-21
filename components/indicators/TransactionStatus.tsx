import { Button } from "$button";
import { Icon } from "$icon";
import { transitionAll } from "$layout";
import type {
  MaraSuccessMessageProps,
  TransactionBadgeProps,
  TransactionStatusProps,
} from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export function TransactionStatus({
  state,
  txid,
  confirmations = 0,
  targetConfirmations = 6,
  estimatedTime,
  errorMessage,
  class: className = "",
  onViewTransaction,
  onRetry,
}: TransactionStatusProps) {
  const [remainingTime, setRemainingTime] = useState(estimatedTime || 0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (estimatedTime && state === "pending") {
      setRemainingTime(estimatedTime);

      intervalRef.current = globalThis.setInterval(() => {
        setRemainingTime((prev: number) => {
          if (prev <= 0) {
            if (intervalRef.current) {
              globalThis.clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          globalThis.clearInterval(intervalRef.current);
        }
      };
    }
    return undefined;
  }, [estimatedTime, state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = () => {
    switch (state) {
      case "submitted":
        return {
          icon: "send",
          title: "Transaction Submitted to MARA",
          description: "Your transaction has been sent to the MARA mining pool",
          color: "purple",
          bgColor: "purple-900/20",
          borderColor: "purple-500/30",
          iconBg: "purple-500/20",
          textColor: "purple-300",
        };
      case "pending":
        return {
          icon: "clock",
          title: "Pending Confirmation",
          description: `${confirmations}/${targetConfirmations} confirmations`,
          color: "blue",
          bgColor: "blue-900/20",
          borderColor: "blue-500/30",
          iconBg: "blue-500/20",
          textColor: "blue-300",
        };
      case "confirmed":
        return {
          icon: "checkCircle",
          title: "Transaction Confirmed",
          description: "Your stamp has been successfully created",
          color: "green",
          bgColor: "green-900/20",
          borderColor: "green-500/30",
          iconBg: "green-500/20",
          textColor: "green-300",
        };
      case "failed":
        return {
          icon: "alertCircle",
          title: "Transaction Failed",
          description: errorMessage || "The transaction could not be processed",
          color: "red",
          bgColor: "red-900/20",
          borderColor: "red-500/30",
          iconBg: "red-500/20",
          textColor: "red-300",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      class={`bg-${config.bgColor} backdrop-blur-sm border border-${config.borderColor} rounded-2xl p-4 ${className}`}
    >
      <div class="flex items-start gap-3">
        <div class={`p-2 bg-${config.iconBg} rounded-2xl`}>
          <Icon
            type="icon"
            name={config.icon}
            size="sm"
            weight="normal"
            color="custom"
            className={`fill-${config.color}-400`}
          />
        </div>

        <div class="flex-1">
          <h3
            class={`text-${config.textColor} font-semibold text-base mb-1`}
          >
            {config.title}
          </h3>
          <p class={`text-${config.textColor}/80 text-sm mb-2`}>
            {config.description}
          </p>

          {state === "pending" && remainingTime > 0 && (
            <div class="flex items-center gap-2 mb-3">
              <Icon
                type="icon"
                name="timer"
                size="xs"
                weight="normal"
                color="custom"
                className={`fill-${config.color}-400`}
              />
              <span class={`text-${config.textColor}/60 text-xs`}>
                Estimated time: {formatTime(remainingTime)}
              </span>
            </div>
          )}

          {state === "pending" && (
            <div class="mb-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-color-grey-light">Progress</span>
                <span class="text-xs text-color-grey-light">
                  {Math.round((confirmations / targetConfirmations) * 100)}%
                </span>
              </div>
              <div class="w-full h-2 bg-color-grey-semidark rounded-full overflow-hidden">
                <div
                  class={`h-full bg-${config.color}-500 ${transitionAll}`}
                  style={{
                    width: `${(confirmations / targetConfirmations) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {txid && (
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs text-color-grey-light">TX ID:</span>
              <span
                class={`text-xs text-${config.textColor} font-mono truncate flex-1`}
              >
                {txid.slice(0, 8)}...{txid.slice(-8)}
              </span>
            </div>
          )}

          <div class="flex gap-3">
            {txid && onViewTransaction && (
              <Button
                variant="outline"
                color="neutral"
                onClick={onViewTransaction}
              >
                VIEW TRANSACTION
              </Button>
            )}
            {state === "failed" && onRetry && (
              <Button
                variant="flat"
                color="neutral"
                onClick={onRetry}
              >
                RETRY
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact status badge for inline display

export function TransactionBadge(
  { state, class: className = "" }: TransactionBadgeProps,
) {
  const getConfig = () => {
    switch (state) {
      case "submitted":
        return {
          label: "Submitted",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          textColor: "text-purple-400",
          dot: "bg-purple-400",
        };
      case "pending":
        return {
          label: "Pending",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          textColor: "text-blue-400",
          dot: "bg-blue-400",
        };
      case "confirmed":
        return {
          label: "Confirmed",
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          textColor: "text-green-400",
          dot: "bg-green-400",
        };
      case "failed":
        return {
          label: "Failed",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          textColor: "text-red-400",
          dot: "bg-red-400",
        };
    }
  };

  const config = getConfig();

  return (
    <div
      class={`inline-flex items-center gap-1.5 ${config.bg} ${config.border} border rounded-full px-2.5 py-1 ${className}`}
    >
      <div class={`w-1.5 h-1.5 ${config.dot} rounded-full`} />
      <span class={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}

// MARA-specific success message component

export function MaraSuccessMessage({
  txid,
  outputValue,
  feeRate,
  poolInfo = { name: "MARA Pool" },
  class: className = "",
}: MaraSuccessMessageProps) {
  return (
    <div
      class={`bg-purple-900/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-4 ${className}`}
    >
      <div class="flex items-start gap-3">
        <div class="p-2 bg-purple-500/20 rounded-2xl">
          <Icon
            type="icon"
            name="rocket"
            size="sm"
            weight="normal"
            color="custom"
            className="fill-purple-400"
          />
        </div>

        <div class="flex-1">
          <h3 class="text-purple-300 font-semibold text-base mb-2">
            Successfully Submitted to MARA Pool! 🎉
          </h3>

          <div class="space-y-2 text-sm text-purple-300/80">
            <p>
              Your non-standard transaction with {outputValue}{" "}
              sat outputs has been accepted by {poolInfo.name}.
            </p>

            <div class="grid grid-cols-2 gap-2 mt-3">
              <div class="bg-purple-900/30 rounded p-2">
                <span class="text-xs text-purple-400/60 block">
                  Output Value
                </span>
                <span class="text-purple-300 font-medium">
                  {outputValue} sats
                </span>
              </div>
              <div class="bg-purple-900/30 rounded p-2">
                <span class="text-xs text-purple-400/60 block">
                  Fee Rate
                </span>
                <span class="text-purple-300 font-medium">
                  {feeRate} sat/vB
                </span>
              </div>
            </div>

            {poolInfo.hashrate && (
              <div class="bg-purple-900/30 rounded p-2">
                <span class="text-xs text-purple-400/60 block">
                  Pool Hashrate
                </span>
                <span class="text-purple-300 font-medium">
                  {poolInfo.hashrate}
                </span>
              </div>
            )}

            <p class="text-xs text-purple-400/60 mt-3">
              Transaction ID:{" "}
              <span class="font-mono">{txid?.slice(0, 16)}...</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
