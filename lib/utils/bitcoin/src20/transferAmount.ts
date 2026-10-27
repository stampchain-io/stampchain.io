/**
 * Amount clamping for the SRC-20 transfer form.
 *
 * Returns the value to store in the form's `amt` field. When both the typed
 * value and the selected token's balance parse as numbers and the typed value
 * is larger, the balance is returned instead. Anything else (including
 * partial input such as "1." or a non-numeric balance) passes through
 * unchanged so validation can report it.
 */
export function clampTransferAmount(
  value: string,
  maxAmount: string | number | undefined,
): string {
  const inputAmount = Number(value);
  const max = Number(maxAmount);

  if (!isNaN(inputAmount) && !isNaN(max) && inputAmount > max) {
    return max.toString();
  }

  return value;
}
