import { Icon } from "$icon";
import { transitionAll } from "$layout";
import type {
  ProgressIndicatorProps,
  SpinnerProps,
  TransactionProgressProps,
} from "$types/ui.d.ts";

export function ProgressIndicator({
  state,
  message,
  class: className = "",
}: ProgressIndicatorProps) {
  const getStateConfig = () => {
    switch (state) {
      case "loading":
        return {
          icon: "spinner",
          color: "purple-400",
          bgColor: "purple-900/20",
          borderColor: "purple-500/30",
          animate: true,
        };
      case "success":
        return {
          icon: "check",
          color: "green-400",
          bgColor: "green-900/20",
          borderColor: "green-500/30",
          animate: false,
        };
      case "error":
        return {
          icon: "close",
          color: "red-400",
          bgColor: "red-900/20",
          borderColor: "red-500/30",
          animate: false,
        };
      default:
        return {
          icon: "circle",
          color: "color-grey-light",
          bgColor: "color-grey-semidark/20",
          borderColor: "color-grey-light/30",
          animate: false,
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      class={`flex items-center gap-2 bg-${config.bgColor} backdrop-blur-sm border border-${config.borderColor} rounded-2xl px-3 py-2 ${className}`}
    >
      <div class="relative">
        {config.icon === "spinner"
          ? (
            <div
              class={`w-4 h-4 border-2 border-${config.color} border-t-transparent rounded-full animate-spin`}
            />
          )
          : (
            <Icon
              type="icon"
              name={config.icon}
              size="xs"
              weight="normal"
              color="custom"
              className={`fill-${config.color}`}
            />
          )}
      </div>
      {message && (
        <span class={`text-sm text-${config.color}`}>
          {message}
        </span>
      )}
    </div>
  );
}

// Multi-step progress bar for transaction flow
export interface TransactionStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
}

export function TransactionProgress({
  steps,
  class: className = "",
}: TransactionProgressProps) {
  return (
    <div class={className}>
      <div class="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} class="flex items-center flex-1">
            {/* Step indicator */}
            <div class="flex flex-col items-center">
              <div
                class={`w-8 h-8 rounded-full flex items-center justify-center ${transitionAll} ${
                  step.status === "completed"
                    ? "bg-purple-500 text-white"
                    : step.status === "active"
                    ? "bg-purple-500/20 border-2 border-purple-500 text-purple-400"
                    : step.status === "error"
                    ? "bg-red-500/20 border-2 border-red-500 text-red-400"
                    : "bg-color-grey-semidark border-2 border-color-grey-light/30 text-color-grey-light"
                }`}
              >
                {step.status === "completed"
                  ? (
                    <Icon
                      type="icon"
                      name="check"
                      size="xs"
                      weight="normal"
                      color="custom"
                      className="fill-white"
                    />
                  )
                  : step.status === "error"
                  ? (
                    <Icon
                      type="icon"
                      name="close"
                      size="xs"
                      weight="normal"
                      color="custom"
                      className="fill-red-400"
                    />
                  )
                  : step.status === "active"
                  ? (
                    <div class="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                  )
                  : <span class="text-xs font-medium">{index + 1}</span>}
              </div>
              <span
                class={`text-xs mt-1 text-center ${
                  step.status === "active"
                    ? "text-purple-400 font-medium"
                    : step.status === "completed"
                    ? "text-purple-300"
                    : step.status === "error"
                    ? "text-red-400"
                    : "text-color-grey-light"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div class="flex-1 h-0.5 mx-2 mt-[-20px]">
                <div
                  class={`h-full ${transitionAll} ${
                    steps[index + 1].status !== "pending"
                      ? "bg-purple-500"
                      : "bg-color-grey-light/30"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Spinner component for loading states

export function Spinner({
  size = "md",
  color = "purple-400",
  class: className = "",
}: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      class={`${
        sizeClasses[size]
      } border-${color} border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

// Skeleton loader for fee fetching
export function FeeSkeletonLoader() {
  return (
    <div class="animate-pulse">
      <div class="flex items-center gap-2 mb-2">
        <div class="h-4 w-12 bg-color-grey-semidark rounded" />
        <div class="h-6 w-16 bg-color-grey-semidark rounded" />
        <div class="h-4 w-20 bg-color-grey-semidark rounded" />
      </div>
      <div class="flex items-center gap-2">
        <div class="h-3 w-24 bg-color-grey-semidark rounded" />
        <div class="h-4 w-12 bg-color-grey-semidark rounded" />
        <div class="h-3 w-16 bg-color-grey-semidark rounded" />
      </div>
    </div>
  );
}
