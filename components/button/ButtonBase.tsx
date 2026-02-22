/* ===== BUTTON COMPONENT ===== */
import { button, buttonStyles } from "$button";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { loaderSpinSmGrey, loaderSpinXsGrey } from "$layout";
import type {
  ExtendedButtonProps,
  ExtendedIconButtonProps,
  ExtendedProcessingButtonProps,
} from "$types/ui.d.ts";

/* ===== HELPERS ===== */
const getButtonClass = (
  variant: keyof typeof buttonStyles.variant,
  color: keyof typeof buttonStyles.color,
  size: keyof typeof buttonStyles.size,
  states: {
    disabled?: boolean | undefined;
    loading?: boolean | undefined;
    active?: boolean | undefined;
  },
) =>
  button(variant, color, size, {
    disabled: states.disabled,
    loading: states.loading,
    active: states.active,
  });

const getCommonButtonProps = ({
  type = "button",
  disabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  ariaLabel,
  dataType,
  className,
  ref,
  ...props
}: any) => ({
  type,
  disabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
  "data-type": dataType,
  class: className,
  ref,
  ...props,
});

/* ===== COMPONENT ===== */
export function Button({
  variant = "outline",
  color = "grey",
  size = "mdR",
  disabled,
  isActive,
  href,
  "f-partial": fPartial,
  class: className,
  type,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  ariaLabel,
  "data-type": dataType,
  ref,
  children,
  ...props
}: ExtendedButtonProps) {
  const buttonClass = getButtonClass(variant, color, size, {
    disabled: disabled || undefined,
    active: isActive || undefined,
  });

  const combinedClass = `${buttonClass} ${className ?? ""} group`;

  const commonProps = getCommonButtonProps({
    type,
    disabled: !IS_BROWSER || disabled,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    role,
    ariaLabel,
    dataType,
    className: combinedClass,
    ref,
    ...props,
  });

  return href
    ? (
      <a href={href} f-partial={fPartial ?? href} {...commonProps}>
        {children}
      </a>
    )
    : (
      <button {...commonProps}>
        {children}
      </button>
    );
}

/* ===== ICON BUTTON COMPONENT ===== */
export function ButtonIcon({
  variant = "outline",
  color = "purple",
  size = "md",
  disabled,
  isLoading,
  isActive,
  href,
  "f-partial": fPartial,
  class: className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  ariaLabel,
  "data-type": dataType,
  ref,
  children,
  ...props
}: ExtendedIconButtonProps) {
  const buttonClass = getButtonClass(variant, color, size, {
    disabled: disabled || undefined,
    loading: isLoading || undefined,
    active: isActive || undefined,
  });

  const commonProps = getCommonButtonProps({
    disabled: !IS_BROWSER || disabled || isLoading,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    role,
    ariaLabel,
    dataType,
    className: `${buttonClass} ${className ?? ""} p-0 aspect-square`,
    ref,
    ...props,
  });

  const content = isLoading ? <div class={loaderSpinSmGrey} /> : children;

  return href
    ? (
      <a href={href} f-partial={fPartial ?? href} {...commonProps}>
        {content}
      </a>
    )
    : (
      <button {...commonProps}>
        {content}
      </button>
    );
}

/* ===== PROCESSING BUTTON COMPONENT ===== */
export function ButtonProcessing({
  variant = "outline",
  color = "grey",
  size = "mdR",
  disabled,
  isSubmitting,
  isActive,
  href,
  "f-partial": fPartial,
  class: className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  role,
  ariaLabel,
  "data-type": dataType,
  type,
  ref,
  children,
  ...props
}: ExtendedProcessingButtonProps) {
  const buttonClass = getButtonClass(variant, color, size, {
    disabled: disabled || undefined,
    loading: isSubmitting || undefined,
    active: isActive || undefined,
  });

  const commonProps = getCommonButtonProps({
    type,
    disabled: !IS_BROWSER || disabled || isSubmitting,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    role,
    ariaLabel,
    dataType,
    className: `${buttonClass} ${className ?? ""}`,
    ref,
    ...props,
  });

  const content = isSubmitting
    ? (
      <span class="inline-flex items-center gap-3">
        <div class={`${loaderSpinXsGrey} !border-current`} />
        PROCESSING
      </span>
    )
    : children;

  return href
    ? (
      <a href={href} f-partial={fPartial ?? href} {...commonProps}>
        {content}
      </a>
    )
    : (
      <button {...commonProps}>
        {content}
      </button>
    );
}
