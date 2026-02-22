import { inputField } from "$form";
import type { InputFieldProps } from "$types/ui.d.ts";

export function InputField({
  type,
  placeholder,
  value,
  onChange,
  onInput,
  error,
  inputMode,
  pattern,
  maxLength,
  minLength,
  min,
  step,
  disabled = false,
  textAlign = "left",
  isUppercase = false,
  class: extraClass = "",
}: InputFieldProps) {
  return (
    <div class="w-full">
      <input
        type={type}
        class={`${inputField} ${textAlign === "center" ? "text-center" : ""} ${
          isUppercase ? "uppercase" : ""
        } ${extraClass}`}
        placeholder={placeholder}
        value={isUppercase ? value?.toUpperCase() : value}
        onChange={onChange}
        onInput={onInput}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        minLength={minLength}
        min={min}
        step={step}
        disabled={disabled}
        style={{ textAlign }}
      />
      {error && <p class="text-red-500 mt-2 text-xs">{error}</p>}
    </div>
  );
}
