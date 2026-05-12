import { inputField, inputFieldWrapper } from "$form";
import flatpickr from "flatpickr";
import { useEffect, useRef } from "preact/hooks";

interface PropTypes {
  setDateRange: (date: Date[]) => void;
  isUppercase?: boolean;
}

const SelectDate = ({ setDateRange, isUppercase = true }: PropTypes) => {
  const calendarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (calendarRef.current) {
      flatpickr(calendarRef.current, {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: (selectedDates) => {
          setDateRange(selectedDates);
        },
      });
    }
  }, []);

  return (
    <div class={inputFieldWrapper}>
      <input
        class={`${inputField} ${isUppercase ? "uppercase" : ""}`}
        placeholder="SELECT DATE"
        ref={calendarRef}
      />
    </div>
  );
};

export default SelectDate;
