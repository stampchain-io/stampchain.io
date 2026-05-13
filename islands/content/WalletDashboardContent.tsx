/* ===== WALLET DASHBOARD CONTENT COMPONENT ===== */
import type { DispenserRow as Dispenser, StampRow } from "$types/stamp.d.ts";

import { PaginationButtons } from "$button";
import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import { SettingsButton } from "$islands/button/SettingsButton.tsx";
import { SortButton } from "$islands/button/SortButton.tsx";
import FreshSRC20Gallery from "$islands/section/gallery/FreshSRC20Gallery.tsx";
import { FreshStampGallery } from "$islands/section/gallery/FreshStampGallery.tsx";
import { glassmorphism, shadowGlowPurple } from "$layout";
import {
  createPaginationHandler,
  getCurrentUrl,
  navigateWithFresh,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import type { WalletContentProps } from "$types/wallet.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== ITEM HEADER SUBCOMPONENT ===== */
const ItemHeader = ({
  title = "STAMP",
  sortBy = "ASC" as const,
  isOpenSetting = false,
  handleOpenSetting = () => {},
  sort = true,
  setting = false,
  setOpenSettingModal = () => {},
  onChangeSort = () => {},
}: {
  title: string;
  sortBy: "ASC" | "DESC";
  isOpenSetting: boolean;
  handleOpenSetting: (open: boolean) => void;
  sort: boolean;
  setting: boolean;
  setOpenSettingModal?: (open: boolean) => void;
  onChangeSort?: (newSortBy: "ASC" | "DESC") => void;
}) => {
  /* ===== RENDER HEADER ===== */
  return (
    <div class="flex flex-row justify-between items-center gap-3 w-full relative">
      <div class="flex items-end">
        <p class="text-2xl mobileMd:text-3xl mobileLg:text-4xl desktop:text-5xl font-extralight text-color-purple-light">
          {title}
        </p>
      </div>
      <div class="flex gap-3 justify-between h-[36px] items-center">
        {setting && (
          <SettingsButton
            initFilter={[]}
            open={isOpenSetting}
            handleOpen={handleOpenSetting}
            filterButtons={["transfer"]}
            onFilterClick={(filter: string) => {
              if (filter === "transfer") {
                setOpenSettingModal(true);
              }
            }}
          />
        )}
        {sort && (
          <SortButton
            initSort={sortBy}
            onChangeSort={onChangeSort}
            sortParam={title === "STAMPS"
              ? "stampsSortBy"
              : title === "TOKENS"
              ? "src20SortBy"
              : "dispensersSortBy"}
          />
        )}
      </div>
    </div>
  );
};

/* ===== DISPENSER ITEM SUBCOMPONENT ===== */
function DispenserItem({
  dispensers = [],
  pagination,
}: {
  dispensers?: Dispenser[];
  pagination?: {
    page: number;
    totalPages: number;
    prefix?: string;
    onPageChange?: (page: number) => void;
  };
}) {
  /* ===== EMPTY STATE HANDLING ===== */
  if (!dispensers?.length) {
    return (
      <div class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient">
        NO LISTINGS FOUND
      </div>
    );
  }

  /* ===== DISPENSER FILTERING ===== */
  const dispensersWithStamps = dispensers?.filter((d) => d.stamp) ?? [];
  const openDispensers = dispensersWithStamps.filter((d) =>
    d.give_remaining > 0
  );
  const closedDispensers = dispensersWithStamps.filter((d) =>
    d.give_remaining === 0
  );

  if (!openDispensers.length && !closedDispensers.length) {
    return (
      <div>
        <h3 class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient">
          NO LISTINGS FOUND
        </h3>
      </div>
    );
  }

  /* ===== RENDER DISPENSER ITEM ===== */
  return (
    <div class="relative shadow-md">
      <div class="hidden mobileLg:flex flex-col gap-6 -mt-6">
        {/* Open Dispensers Section */}
        {openDispensers.length > 0 && (
          <div id="open-listings-section">
            <h3 class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient mb-6">
              OPEN LISTINGS
            </h3>
            <div class="flex flex-col gap-6">
              {openDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="tablet" />
              ))}
            </div>
          </div>
        )}

        {/* Closed Dispensers Section */}
        {closedDispensers.length > 0 && (
          <div id="closed-listings-section">
            <h3 class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient mb-6">
              CLOSED LISTINGS
            </h3>
            <div class="flex flex-col gap-6">
              {closedDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="tablet" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* For mobile */}
      <div class="flex mobileLg:hidden flex-col gap-3">
        {/* Open Dispensers Section */}
        {openDispensers.length > 0 && (
          <div class="mb-8" id="open-listings-section">
            <h3 class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient mb-6">
              OPEN LISTINGS
            </h3>
            <div class="flex flex-col gap-6">
              {openDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="mobile" />
              ))}
            </div>
          </div>
        )}

        {/* Closed Dispensers Section */}
        {closedDispensers.length > 0 && (
          <div id="closed-listings-section">
            <h3 class="inline-block text-xl mobileMd:text-2xl mobileLg:text-3xl desktop:text-4xl font-black bg-gradient-to-r color-primary-gradient mb-6">
              CLOSED LISTINGS
            </h3>
            <div class="flex flex-col gap-6">
              {closedDispensers.map((dispenser) => (
                <DispenserRow dispenser={dispenser} view="mobile" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div class="mt-6">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            prefix="dispensers"
            onPageChange={createPaginationHandler(
              "dispensers_page",
              "closed_listings",
            )}
          />
        </div>
      )}
    </div>
  );
}

/* ===== DISPENSER ROW SUBCOMPONENT ===== */
function DispenserRow(
  { dispenser, view }: { dispenser: Dispenser; view: "mobile" | "tablet" },
) {
  /* ===== STATE ===== */
  const imageSize = view === "mobile"
    ? "w-[146px] h-[146px]"
    : "w-[172px] h-[172px]";
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState<string | undefined>(undefined);

  /* ===== IMAGE FETCHING ===== */
  const fetchStampImage = () => {
    setLoading(true);
    const res = getStampImageSrc(dispenser.stamp as StampRow);
    setSrc(res);
    setLoading(false);
  };

  /* ===== EFFECTS ===== */
  useEffect(() => {
    fetchStampImage();
  }, []);

  /* ===== RENDER DISPENSER ROW ===== */
  if (!dispenser.stamp) {
    return null;
  }

  return (
    <div
      class={`flex justify-between ${glassmorphism} rounded-2xl hover:border-color-purple-light ${shadowGlowPurple} border-2 border-transparent`}
    >
      <div class="flex p-3 mobileLg:p-6 gap-6 uppercase w-full">
        <a
          href={`/stamp/${dispenser.stamp.stamp}`}
          class={`${imageSize} relative flex-shrink-0`}
        >
          <div class="relative p-[6px] mobileMd:p-3 bg-color-background rounded-2xl aspect-square">
            <div class="stamp-container absolute inset-0 flex items-center justify-center">
              <div class="relative z-10 w-full h-full">
                {loading && !src ? <LoadingIcon /> : src
                  ? (
                    <img
                      width="100%"
                      height="100%"
                      loading="lazy"
                      class="max-w-none w-full h-full object-contain rounded pixelart stamp-image"
                      src={src}
                      alt={`Stamp ${dispenser.stamp.stamp}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                        (e.target as HTMLImageElement).alt =
                          "Content not available";
                      }}
                    />
                  )
                  : <PlaceholderImage variant="no-image" />}
              </div>
            </div>
          </div>
        </a>
        <div class="flex flex-col w-full">
          <div class="flex flex-col justify-between w-full mt-[6px]">
            <div class="relative">
              <a
                href={`/stamp/${dispenser.stamp.stamp}`}
                class="!inline-block text-2xl mobileLg:text-4xl font-black bg-gradient-to-r color-primary-gradient color-gradient-hover"
              >
                {`#${dispenser.stamp.stamp}`}
              </a>
            </div>
          </div>

          <div class="flex justify-between flex-row w-full">
            <p
              class={`text-base text-color-purple-semilight font-light text-ellipsis overflow-hidden ${
                view === "mobile" ? "tablet:w-full" : ""
              }`}
            >
              <span class="font-bold text-color-purple-semilight text-base mobileLg:text-xl normal-case">
                {/* Abbreviate origin address differently depending on screen size */}
                <span class="mobileMd:hidden">
                  {abbreviateAddress(dispenser.origin, 4)}
                </span>
                <span class="hidden mobileMd:inline mobileLg:hidden">
                  {abbreviateAddress(dispenser.origin, 7)}
                </span>
                <span class="hidden mobileLg:inline tablet:hidden">
                  {abbreviateAddress(dispenser.origin, 10)}
                </span>
                <span class="hidden tablet:inline">{dispenser.origin}</span>
              </span>
            </p>
            <div class="flex flex-row gap-[9px] mobileLg:gap-3">
              <Icon
                type="iconButton"
                name="copy"
                weight="normal"
                size="xs"
                color="greyLight"
              />
              <Icon
                type="iconButton"
                name="history"
                weight="normal"
                size="xs"
                color="greyLight"
              />
            </div>
          </div>
          <div class="text-center flex justify-between mt-[6px]">
            <p class="text-base mobileLg:text-lg text-color-grey-semidark font-light">
              GIVE{" "}
              <span class="font-bold text-color-grey-semilight">
                {Number(dispenser.give_quantity).toLocaleString()}
              </span>
            </p>
          </div>
          <div class="flex flex-row justify-between w-full">
            <p class="text-base mobileLg:text-lg text-color-grey-semidark font-light">
              QUANTITY{" "}
              <span class="font-bold text-color-grey-semilight">
                {dispenser.give_remaining === 0
                  ? Number(dispenser.escrow_quantity).toLocaleString()
                  : `${Number(dispenser.give_remaining).toLocaleString()}/${
                    Number(dispenser.escrow_quantity).toLocaleString()
                  }`}
              </span>
            </p>
            <p
              class={`text-color-grey-semidark text-lg font-light -mt-1 ${
                view === "mobile" ? "hidden mobileLg:block" : ""
              }`}
            >
              VALUE
            </p>
          </div>
          <div class="flex flex-row justify-between w-full">
            <p class="text-base mobileLg:text-lg text-color-grey-semidark font-light">
              PRICE{" "}
              <span class="font-bold text-color-grey-semilight">
                {formatBTCAmount(Number(dispenser.btcrate), {
                  includeSymbol: false,
                })}
              </span>{" "}
              <span class="text-color-grey-semilight">BTC</span>
            </p>
            <p
              class={`text-xl mobileMd:text-2xl text-color-grey-semilight font-bold -mt-1 ${
                view === "mobile" ? "hidden mobileLg:block" : ""
              }`}
            >
              {formatBTCAmount(
                Number(dispenser.btcrate) * Number(dispenser.escrow_quantity),
                { includeSymbol: false },
              )} <span class="text-color-grey-semilight font-light">BTC</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== MAIN WALLET DASHBOARD COMPONENT ===== */
const WalletDashboardContent = ({
  stamps,
  src20,
  dispensers,
  address,
  anchor,
  stampsSortBy = "DESC",
  src20SortBy = "DESC",
  dispensersSortBy = "DESC",
}: WalletContentProps) => {
  /* ===== STATE ===== */
  const [sortStamps, setSortStamps] = useState<"ASC" | "DESC">(stampsSortBy);
  const [sortTokens, setSortTokens] = useState<"ASC" | "DESC">(src20SortBy);
  const [sortDispensers, setSortDispensers] = useState<"ASC" | "DESC">(
    dispensersSortBy,
  );

  /* ===== TOGGLE STATES ===== */
  const [openSetting, setOpenSetting] = useState<boolean>(false);

  /* ===== COMPUTED VALUES ===== */
  const openDispensersCount =
    dispensers.data?.filter((d: any) => d.give_remaining > 0)?.length ?? 0;

  /* ===== EFFECTS ===== */
  useEffect(() => {
    if (anchor) {
      const sectionMap = {
        stamp: "stamps-section",
        src20: "src20-section",
        open_listings: "open-listings-section",
        closed_listings: "closed-listings-section",
      };
      const sectionId = sectionMap[anchor as keyof typeof sectionMap];
      if (sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [anchor, stamps, src20, dispensers]);

  useEffect(() => {
    const currentUrl = getCurrentUrl();
    const url = new URL(currentUrl);
    const filterByValue = url.searchParams.get("filterBy") || "";
    if (filterByValue === "Transfer") {
      setOpenSetting(true);
    }
  }, []);

  /* ===== EVENT HANDLERS ===== */
  const handleOpenSetting = () => {
    setOpenSetting(!openSetting);
  };

  /* ===== SORT HANDLERS ===== */
  const handleChangeSort = (newSort: "ASC" | "DESC") => {
    setSortStamps(newSort);
    navigateWithFresh(
      {
        "stampsSortBy": newSort,
        "stamps_page": "1", // Reset to page 1 when sorting
      },
      "stamps",
    );
  };

  const handleTokenSort = (newSort: "ASC" | "DESC") => {
    setSortTokens(newSort);
    navigateWithFresh(
      {
        "src20SortBy": newSort,
        "src20_page": "1", // Reset to page 1 when sorting
      },
      "src20",
    );
  };

  const handleDispenserSort = (newSort: "ASC" | "DESC") => {
    setSortDispensers(newSort);
    navigateWithFresh(
      {
        "dispensersSortBy": newSort,
        "dispensers_page": "1", // Reset to page 1 when sorting
      },
      openDispensersCount > 0 ? "open_listings" : "closed_listings",
    );
  };

  /* ===== RENDER ===== */
  return (
    <>
      {/* Stamps Section */}
      <div class="mt-6 mobileLg:mt-12 desktop:mt-24" id="stamps-section">
        <ItemHeader
          title="STAMPS"
          sort
          sortBy={sortStamps}
          onChangeSort={handleChangeSort}
          setting={openSetting}
          isOpenSetting={openSetting}
          handleOpenSetting={handleOpenSetting}
          setOpenSettingModal={(open) => {
            setOpenSetting(open);
          }}
        />
        <div class="mt-3 mobileLg:mt-6">
          {stamps.data?.length
            ? (
              <FreshStampGallery
                initialData={stamps.data}
                initialPagination={{
                  page: stamps.pagination.page,
                  limit: stamps.pagination.limit || 10,
                  total: stamps.pagination.total || 0,
                  totalPages: Math.ceil(
                    stamps.pagination.total / stamps.pagination.limit,
                  ),
                  hasNext: stamps.pagination.page <
                    Math.ceil(
                      stamps.pagination.total / stamps.pagination.limit,
                    ),
                  hasPrev: stamps.pagination.page > 1,
                  currentPage: stamps.pagination.page,
                  pageSize: stamps.pagination.limit || 10,
                  totalItems: stamps.pagination.total || 0,
                  hasNextPage: stamps.pagination.page <
                    Math.ceil(
                      stamps.pagination.total / stamps.pagination.limit,
                    ),
                  hasPreviousPage: stamps.pagination.page > 1,
                  startIndex: (stamps.pagination.page - 1) *
                    (stamps.pagination.limit || 10),
                  endIndex: Math.min(
                    stamps.pagination.page * (stamps.pagination.limit || 10),
                    stamps.pagination.total,
                  ),
                }}
                address={address}
                initialSort={sortStamps}
                enablePartialNavigation
                showLoadingSkeleton
                gridClass={`
                  grid w-full
                  gap-3
                  mobileMd:gap-6
                  grid-cols-4
                  mobileLg:grid-cols-6
                  tablet:grid-cols-6
                  desktop:grid-cols-8
                  auto-rows-fr
                `}
              />
            )
            : <p class="text-gray-500">NO AVAILABLE STAMP</p>}
        </div>
      </div>

      {/* SRC20 (TOKENS) Section */}
      <div class="mt-12 mobileLg:mt-24 desktop:mt-36" id="src20-section">
        <ItemHeader
          title="TOKENS"
          sort
          sortBy={sortTokens}
          onChangeSort={handleTokenSort}
          setting={false}
          isOpenSetting={false}
          handleOpenSetting={() => {}}
        />
        <div class="mt-3 mobileLg:mt-6">
          {src20.data?.length
            ? (
              <FreshSRC20Gallery
                initialData={src20.data}
                initialPagination={{
                  page: src20.pagination.page,
                  limit: src20.pagination.limit || 10,
                  total: src20.pagination.total || 0,
                }}
                address={address}
                initialSort={{
                  key: "stamp",
                  direction: sortTokens === "ASC" ? "asc" : "desc",
                }}
                enablePartialNavigation
                showLoadingSkeleton
              />
            )
            : <p class="text-gray-500">NO AVAILABLE TOKEN</p>}
        </div>
      </div>

      {/* Dispensers Section */}
      {(dispensers.data?.length ?? 0) > 0 && (
        <div class="mt-48">
          <ItemHeader
            title="LISTINGS"
            sort
            sortBy={sortDispensers}
            onChangeSort={handleDispenserSort}
            setting={false}
            isOpenSetting={false}
            handleOpenSetting={() => {}}
          />
          <div class="mt-3 mobileMd:mt-6">
            <DispenserItem
              dispensers={dispensers.data}
              pagination={{
                page: dispensers.pagination.page,
                totalPages: dispensers.pagination.totalPages,
                prefix: "dispensers",
                onPageChange: createPaginationHandler(
                  "dispensers_page",
                  "closed_listings",
                ),
              }}
            />
          </div>
        </div>
      )}

      {/* Modal for sending stamps */}
      {
        /*
        openSettingModal && (
        <WalletSendStampModal
          stamps={stamps}
          fee={0}
          handleChangeFee={() => {}}
          toggleModal={handleOpenSettingModal}
          handleCloseModal={handleCloseSettingModal}
        />
      )}*/
      }
    </>
  );
};

export default WalletDashboardContent;
