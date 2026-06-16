// TODO(@baba): Move checkbox + radiobuttons to form folder
import { inputCheckbox } from "$form";
import { labelLogicResponsive } from "$text";
import type { CheckboxProps, RadioProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

// Checkbox Component
export const Checkbox = ({
  label,
  checked,
  onChange,
  hasDropdown = false,
  dropdownContent = null,
}: CheckboxProps) => {
  const [canHoverSelected, setCanHoverSelected] = useState(true);

  const handleChange = () => {
    onChange(!checked);
    setTimeout(() => setCanHoverSelected(false), 0);
  };

  const handleMouseLeave = () => {
    setCanHoverSelected(true);
  };

  return (
    <div class="flex flex-col">
      <div
        class="flex items-center py-1.5 tablet:py-1.5 cursor-pointer group"
        onMouseLeave={handleMouseLeave}
        onClick={handleChange}
      >
        <input
          class={inputCheckbox(checked, canHoverSelected)}
          type="checkbox"
          checked={checked}
          readOnly
        />
        <label class={labelLogicResponsive(checked, canHoverSelected)}>
          {label}
        </label>
      </div>

      {hasDropdown && checked && dropdownContent && (
        <div class="ml-0.5 mt-1 mb-2">
          {dropdownContent}
        </div>
      )}
    </div>
  );
};

// Radiobutton Component
export const Radiobutton = (
  { label, value, checked, onChange, name }: RadioProps,
) => {
  const [canHoverSelected, setCanHoverSelected] = useState(true);

  const handleChange = () => {
    onChange();
    setTimeout(() => setCanHoverSelected(false), 0);
  };

  const handleMouseLeave = () => {
    setCanHoverSelected(true);
  };

  return (
    <div
      class="flex items-center py-1.5 mobileLg:py-1.5 cursor-pointer group"
      onMouseLeave={handleMouseLeave}
      onClick={handleChange}
    >
      <input
        class={inputCheckbox(checked, canHoverSelected)}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        readOnly
      />
      <label class={labelLogicResponsive(checked, canHoverSelected)}>
        {label}
      </label>
    </div>
  );
};
