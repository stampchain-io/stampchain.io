import { inputField } from "$form";
import type { SRC20InputFieldProps } from "$types/ui.d.ts";

export function SRC20InputField({
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  maxLength,
  isUppercase,
  inputMode,
  pattern,
  onFocus,
}: SRC20InputFieldProps) {
  return (
    <div class="w-full">
      <input
        type={type}
        class={`${inputField} ${isUppercase ? "uppercase" : ""}`}
        placeholder={placeholder}
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
      />
      {error && <div class="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}
