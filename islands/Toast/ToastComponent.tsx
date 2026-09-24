import { Icon } from "$icon";
import type { Toast as ToastTypeFromProvider } from "$islands/Toast/ToastProvider.tsx";
import { transitionAll } from "$layout";
import {
  notificationBody,
  notificationContainerError,
  notificationContainerInfo,
  notificationContainerSuccess,
  notificationContainerWarning,
  notificationFooter,
  notificationHeader,
} from "$notification";
import type { ToastComponentProps } from "$types/ui.d.ts";

export const ToastComponent = (
  {
    id,
    message,
    body,
    type,
    onClose,
    autoDismiss,
    duration = 3000,
    isAnimatingOut: externalIsAnimatingOut,
    isUpdate = false,
  }: ToastComponentProps & { isAnimatingOut?: boolean },
) => {
  // Use the external animation state from the provider
  const shouldAnimateOut = externalIsAnimatingOut ?? false;
  const getIconName = (toastType: ToastTypeFromProvider["type"]) => {
    switch (toastType) {
      case "error":
        return "error";
      case "warning":
        return "info";
      case "success":
        return "success";
      case "info":
      default:
        return "info";
    }
  };

  const getIconColor = (toastType: ToastTypeFromProvider["type"]) => {
    switch (toastType) {
      case "error":
        return "stroke-color-red-700";
      case "warning":
        return "stroke-color-orange-500";
      case "success":
        return "stroke-color-green-700";
      case "info":
      default:
        return "stroke-color-neutral-400";
    }
  };

  const getContainerStyle = (toastType: ToastTypeFromProvider["type"]) => {
    switch (toastType) {
      case "error":
        return notificationContainerError;
      case "warning":
        return notificationContainerWarning;
      case "success":
        return notificationContainerSuccess;
      case "info":
      default:
        return notificationContainerInfo;
    }
  };

  const getProgressBarColor = (toastType: ToastTypeFromProvider["type"]) => {
    switch (toastType) {
      case "error":
        return "bg-color-red-700";
      case "warning":
        return "bg-color-orange-500";
      case "success":
        return "bg-color-green-700";
      case "info":
      default:
        return "bg-color-neutral-500";
    }
  };

  // Split message into first line and remaining lines
  const lines = message.split("\n");
  const firstLine = lines[0];
  const remainingLines = lines.slice(1);
  // Only the update announcement toast distinguishes heading/footer lines;
  // all other toasts render every line with the plain body style.
  const lastLine = lines[lines.length - 1];
  const middleLines = lines.slice(1, -1);

  return (
    <div
      id={`toast-${id}`}
      class={`fixed top-5 inset-x-5 z-notification !w-auto
        min-[460px]:left-5 min-[460px]:right-auto min-[420px]:max-w-[420px] ${
        shouldAnimateOut ? "notification-exit" : "notification-enter"
      } ${getContainerStyle(type)}`}
      role="alert"
    >
      {
        /* Positioned outside the padded/flex content so it can hug the
          corner without being constrained by the container's padding
          (this container intentionally has no overflow-hidden). */
      }
      <div class="absolute top-1 right-1">
        <Icon
          type="iconButton"
          name="close"
          weight="bold"
          size="lg"
          color="neutral400"
          ariaLabel="Close notification"
          onClick={onClose}
        />
      </div>

      <div class="flex items-start space-x-3 pr-6">
        <Icon
          type="icon"
          name={getIconName(type)}
          weight="bold"
          size="xl"
          color="custom"
          className={`${getIconColor(type)}`}
          ariaLabel={`${type} notification`}
        />

        <div class="flex-1 mt-[1px] ml-3 break-words">
          {isUpdate
            ? (
              <>
                <div class={notificationHeader}>{firstLine}</div>
                {middleLines.length > 0 && (
                  <div class={`${notificationBody} whitespace-pre-line`}>
                    {middleLines.join("\n")}
                  </div>
                )}
                {lines.length > 1 && (
                  <div class={`${notificationFooter} mt-1`}>{lastLine}</div>
                )}
              </>
            )
            : (
              <>
                <div class={notificationBody}>{firstLine}</div>
                {body
                  ? (
                    <div class={notificationBody}>
                      {body}
                    </div>
                  )
                  : remainingLines.length > 0 && (
                    <div class={`${notificationBody} whitespace-pre-line`}>
                      {remainingLines.join("\n")}
                    </div>
                  )}
              </>
            )}
        </div>
      </div>

      {autoDismiss && (
        <div class="mt-2 w-full h-0.5 rounded-full bg-color-neutral-800">
          <div
            class={`h-full rounded-full ${
              getProgressBarColor(type)
            } ${transitionAll} ease-linear`}
            style={{
              animation: `progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};
