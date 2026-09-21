/* ===== LOADING ICON COMPONENT ===== */
import { transitionColors } from "$components/layout/styles.ts";
import { Icon } from "$icon";

interface LoadingIconProps {
  className?: string;
  containerClassName?: string;
  wrapperClassName?: string;
}

export function LoadingIcon({
  className = "",
  containerClassName = "",
  wrapperClassName = "",
}: LoadingIconProps) {
  return (
    <div
      className={`relative z-10 aspect-square animate-pulse ${wrapperClassName}`}
    >
      <div
        className={`flex items-center justify-center max-w-none
          bg-gradient-to-br from-color-primary-300 via-color-primary-400 to-color-primary-500 rounded-2xl
          object-contain ${transitionColors} ${containerClassName}`}
      >
        <Icon
          type="icon"
          name="stamp"
          weight="custom"
          size="custom"
          color="custom"
          className={`w-full h-full p-[25%] [stroke-width:0.6] stroke-color-primary-500 ${className}`}
        />
      </div>
    </div>
  );
}
