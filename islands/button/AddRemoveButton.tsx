/* ===== ADD REMOVE BUTTON ===== */
import { Icon } from "$icon";
import { containerIcon, transitionTransform } from "$layout";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */
interface AddRemoveButtonProps {
  /** Plus click. The icon turns into an X. */
  onAdd?: (e: MouseEvent) => void;
  /** X click. The icon is already rotated. */
  onRemove?: (e: MouseEvent) => void;
  /**
   * When false, an X click turns the icon back into a plus instead of
   * removing the row.
   */
  canRemove?: boolean;
  addLabel?: string;
  removeLabel?: string;
}

/* ===== COMPONENT ===== */
/**
 * Plus icon pill. Click rotates it a quarter turn into an X, the same
 * motion as the FAQ accordion, then calls `onAdd`. Clicking the X calls
 * `onRemove`.
 */
export function AddRemoveButton({
  onAdd,
  onRemove,
  canRemove = true,
  addLabel = "Add",
  removeLabel = "Remove",
}: AddRemoveButtonProps) {
  const [isRotated, setIsRotated] = useState(false);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    if (isRotated) {
      if (!canRemove) {
        setIsRotated(false);
        return;
      }
      onRemove?.(e);
      return;
    }
    setIsRotated(true);
    onAdd?.(e);
  };

  return (
    <div class={`${containerIcon} shrink-0`}>
      <span
        class={`inline-flex ${transitionTransform} ${
          isRotated ? "rotate-45" : "rotate-0"
        }`}
      >
        <Icon
          type="iconButton"
          name="plus"
          weight="normal"
          size="containerIcon"
          color="neutral400"
          ariaLabel={isRotated ? removeLabel : addLabel}
          onClick={handleClick}
        />
      </span>
    </div>
  );
}
