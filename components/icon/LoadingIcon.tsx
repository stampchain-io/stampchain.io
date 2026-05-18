/* ===== LOADING ICON COMPONENT ===== */
import { Icon } from "$icon";
import { transitionColors } from "$layout";

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
          bg-gradient-to-br from-color-primary-300 via-color-primary-400 to-color-primary-500 rounded-xl
          object-contain ${transitionColors} ${containerClassName}`}
      >
        <Icon
          type="icon"
          name="stamp"
          weight="custom"
          size="custom"
          color="purpleDark"
          className={`p-[25%] [stroke-width:0.5] w-full h-full ${className}`}
        />
      </div>
    </div>
  );
}
