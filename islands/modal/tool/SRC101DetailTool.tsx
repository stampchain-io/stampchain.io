/* ===== SRC-101 DETAIL TOOL MODAL ===== */
import { UserProfileIcon } from "$icon";
import { openToolModal, ToolModal } from "$islands/modal/tool/ToolModal.tsx";
import { container2 } from "$layout";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { cardCreator, cardStampNumber } from "$text";
import type { SRC101DetailToolProps } from "$types/ui.d.ts";

/* ===== OPENER ===== */
export function openSRC101DetailTool(props: SRC101DetailToolProps) {
  openToolModal(<SRC101DetailTool {...props} />);
}

const TEST_SRC101_DETAIL = {
  img: "/img/logo/favicon/web-app-manifest-512x512.png",
  name: "stampchain",
  root: ".btc",
  owner: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
};

export function openSRC101DetailTestModal() {
  openSRC101DetailTool(TEST_SRC101_DETAIL);
}

/* ===== COMPONENT ===== */
export function SRC101DetailTool(
  { img, name, root, owner }: SRC101DetailToolProps,
) {
  return (
    <ToolModal title="SRC-101" subtitle="BITNAME DETAILS">
      <div class="flex flex-col justify-center gap-3">
        <div class={`w-full ${container2}`}>
          <img src={img} alt="" class="w-full h-auto rounded-2xl p-0.5" />
        </div>

        <div class={`w-full flex flex-col items-center ${container2} p-3`}>
          <h5 class={cardStampNumber}>
            {name}
            {root}
          </h5>
          {owner && (
            <UserProfileIcon wrapperClassName="justify-center w-full">
              <span class={cardCreator}>
                {abbreviateAddress(owner, 12)}
              </span>
            </UserProfileIcon>
          )}
        </div>
      </div>
    </ToolModal>
  );
}
