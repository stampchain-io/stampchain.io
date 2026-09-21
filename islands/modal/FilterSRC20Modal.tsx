/* ===== FILTER SRC20 MODAL COMPONENT ===== */
// @bbaba+@reinamora - are the
// deno-lint-ignore-file
import { Button } from "$button";
import { InputField, SelectDate } from "$form";
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import type { FilterSRC20ModalProps } from "$types/ui.d.ts";
import { safeNavigate } from "$utils/navigation/freshNavigationUtils.ts";
import type { TargetedEvent } from "preact";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
const FilterSRC20Modal = ({ filterOptions }: FilterSRC20ModalProps) => {
  /* ===== STATE ===== */
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState({ min: "", max: "" });
  const [transactionCount, setTransactionCount] = useState({
    min: "",
    max: "",
  });
  const [dateRange, setDateRange] = useState<(Date | null)[]>([
    null,
    null,
  ]);
  const [supply, setSupply] = useState({ min: "", max: "" });
  const [volume, setVolume] = useState({ min: "", max: "" });
  const [marketcap, setMarketcap] = useState({ min: "", max: "" });
  const [holder, setHolder] = useState({ min: "", max: "" });
  const [price, setPrice] = useState({ min: "", max: "" });

  /* ===== EVENT HANDLERS ===== */
  const handleChange = (
    e: TargetedEvent<HTMLInputElement>,
    type: string,
  ) => {
    const target = e.target as HTMLInputElement;
    if (type === "progress_min") {
      setProgress({ ...progress, min: target.value });
    } else if (type === "progress_max") {
      setProgress({ ...progress, max: target.value });
    } else if (type === "min_tx") {
      setTransactionCount({ ...transactionCount, min: target.value });
    } else if (type === "max_tx") {
      setTransactionCount({ ...transactionCount, max: target.value });
    } else if (type === "supply_min") {
      setSupply({ ...supply, min: target.value });
    } else if (type === "supply_max") {
      setSupply({ ...supply, max: target.value });
    } else if (type === "marketcap_min") {
      setMarketcap({ ...marketcap, min: target.value });
    } else if (type === "marketcap_max") {
      setMarketcap({ ...marketcap, max: target.value });
    } else if (type === "holder_min") {
      setHolder({ ...holder, min: target.value });
    } else if (type === "holder_max") {
      setHolder({ ...holder, max: target.value });
    } else if (type === "volume_max") {
      setVolume({ ...volume, max: target.value });
    } else if (type === "volume_min") {
      setVolume({ ...volume, min: target.value });
    } else if (type === "price_max") {
      setPrice({ ...price, max: target.value });
    } else if (type === "price_min") {
      setPrice({ ...price, min: target.value });
    }
  };

  const handleCloseModal = () => {
    logger.debug("ui", {
      message: "Modal closing",
      component: "FilterSRC20Modal",
    });
    closeModal();
  };

  /* ===== FORM SUBMISSION ===== */
  const handleSubmit = () => {
    // SSR-safe browser environment check
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      return; // Cannot navigate during SSR
    }

    const url = new URL(globalThis.location.href);
    switch (filterOptions[filterOptions.length - 1]) {
      case "minting":
        url.searchParams.set(
          "minProgress",
          progress.min,
        );
        url.searchParams.set(
          "maxTxCount",
          transactionCount.max,
        );
        break;
      case "trending mints":
        url.searchParams.set(
          "minTxCount",
          transactionCount.min,
        );
        break;
      case "deploy":
        if (!dateRange[0]) return;
        url.searchParams.set(
          "dateFrom",
          new Date(dateRange[0]).toISOString(),
        );
        if (dateRange[1]) {
          url.searchParams.set(
            "dateTo",
            new Date(dateRange[1]).toISOString(),
          );
        }
        break;
      case "supply":
        url.searchParams.set(
          "minSupply",
          supply.min,
        );
        url.searchParams.set(
          "maxSupply",
          supply.max,
        );
        break;
      case "marketcap":
        if (!marketcap.min) return;
        url.searchParams.set(
          "minMarketCap",
          marketcap.min,
        );
        url.searchParams.set(
          "maxMarketCap",
          marketcap.max,
        );
        break;
      case "holders":
        url.searchParams.set(
          "minHolder",
          holder.min,
        );
        url.searchParams.set(
          "maxHolder",
          holder.max,
        );
        break;
      case "volume":
        if (!volume.min) return;
        url.searchParams.set(
          "minVolume",
          volume.min,
        );
        url.searchParams.set(
          "maxVolume",
          volume.max,
        );
        break;
      case "price change":
        if (dateRange[0]) {
          url.searchParams.set(
            "trendingDate",
            new Date(dateRange[0]).toISOString(),
          );
        }
        url.searchParams.set(
          "priceMin",
          price.min,
        );
        break;
    }

    safeNavigate(url.toString());
    closeModal();
  };

  /* ===== FILTER CONTENT RENDERING ===== */
  const renderContent = () => {
    const filterType = filterOptions[filterOptions.length - 1];

    switch (filterType) {
      case "minting":
        if (title !== "PROGRESS") setTitle("PROGRESS");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN MINT PROGRESS IN PERCENT"
              value={progress.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "progress_min")}
            />

            <InputField
              type="text"
              placeholder="MAX MINT PROGRESS IN PERCENT"
              value={progress.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "progress_max")}
            />
          </>
        );
      case "trending mints":
        if (title !== "TRENDING") setTitle("TRENDING");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN AMOUNT OF TRANSACTIONS"
              value={transactionCount.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "min_tx")}
            />
            <InputField
              type="text"
              placeholder="MAX AMOUNT OF TRANSACTIONS"
              value={transactionCount.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "max_tx")}
            />
          </>
        );
      case "deploy":
        if (title !== "DEPLOYED") setTitle("DEPLOYED");
        return (
          <>
            <SelectDate setDateRange={setDateRange} isUppercase />
          </>
        );
      case "supply":
        if (title !== "SUPPLY") setTitle("SUPPLY");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN SUPPLY"
              value={supply.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "supply_min")}
            />

            <InputField
              type="text"
              placeholder="MAX SUPPLY"
              value={supply.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "supply_max")}
            />
          </>
        );
      case "marketcap":
        if (title !== "MARKETCAP") setTitle("MARKETCAP");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN MARKETCAP"
              value={marketcap.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "marketcap_min")}
            />

            <InputField
              type="text"
              placeholder="MAX MARKETCAP"
              value={marketcap.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "marketcap_max")}
            />
          </>
        );
      case "holders":
        if (title !== "HOLDERS") setTitle("HOLDERS");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN HOLDERS AMOUNT"
              value={holder.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "holder_min")}
            />

            <InputField
              type="text"
              placeholder="MAX HOLDERS AMOUNT"
              value={holder.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "holder_max")}
            />
          </>
        );
      case "volume":
        if (title !== "VOLUME") setTitle("VOLUME");
        return (
          <>
            <InputField
              type="text"
              placeholder="MIN"
              value={volume.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "volume_min")}
            />

            <InputField
              type="text"
              placeholder="MAX"
              value={volume.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "volume_max")}
            />
          </>
        );
      case "price change":
        if (title !== "PRICE CHANGE") setTitle("PRICE CHANGE");
        return (
          <>
            <SelectDate setDateRange={setDateRange} isUppercase />

            <InputField
              type="text"
              placeholder="MIN PERCENT CHANGE"
              value={price.min}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "price_min")}
            />
            <InputField
              type="text"
              placeholder="MAX PERCENT CHANGE"
              value={price.max}
              onChange={(e: TargetedEvent<HTMLInputElement>) =>
                handleChange(e, "price_max")}
            />
          </>
        );
      default:
        return null;
    }
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={handleCloseModal}
      title={title}
    >
      <div class="flex flex-col items-center justify-center gap-5">
        {renderContent()}

        <Button
          variant="outline"
          color="primary"
          size="md"
          onClick={handleSubmit}
        >
          SUBMIT
        </Button>
      </div>
    </ModalBase>
  );
};

export default FilterSRC20Modal;
