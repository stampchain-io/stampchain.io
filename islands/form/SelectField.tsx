import { inputField, inputFieldWrapper } from "$form";
import type { SelectFieldProps } from "$types/ui.d.ts";

export function SelectField({
  onChange,
  onClick,
  error,
  disabled = false,
  options,
  value,
  placeholder,
  className,
}: SelectFieldProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    onChange?.(target.value);
  };

  return (
    <div class={`w-full ${className || ""}`}>
      <div class={inputFieldWrapper}>
        <select
          onChange={handleChange}
          onClick={onClick}
          disabled={disabled}
          class={`${inputField} appearance-none cursor-pointer`}
          value={value?.toString() ?? ""}
        >
          {placeholder && (
            <option value="" disabled={options.length > 0}>
              {placeholder}
            </option>
          )}

          {options.length > 0
            ? options.map((item) => (
              <option
                key={item.value}
                value={item.value}
                class="font-light uppercase"
              >
                {item.label}
              </option>
            ))
            : !placeholder && <option value="" disabled>NO STAMPS</option>}
        </select>
      </div>
      {error && <p class="text-red-500 mt-2 text-xs">{error}</p>}
    </div>
  );
}
