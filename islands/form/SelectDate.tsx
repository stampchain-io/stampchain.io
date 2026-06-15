import { inputField } from "$form";
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
    <input
      class={`${inputField} ${isUppercase ? "uppercase" : ""}`}
      placeholder="SELECT DATE"
      ref={calendarRef}
    />
  );
};

export default SelectDate;
