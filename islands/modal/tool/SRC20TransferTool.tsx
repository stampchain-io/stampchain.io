/* ===== SRC-20 TRANSFER TOOL MODAL ===== */
/* Thin wrapper: the form lives in islands/tool/src20/TransferTool.tsx and is
   rendered here with variant="modal" inside the ModalTool chrome. */
import { SRC20TransferInfo } from "$islands/modal/info/SRC20TransferInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { SRC20TransferTool as SRC20TransferToolBody } from "$islands/tool/src20/TransferTool.tsx";

/* ===== OPENER ===== */
export function openSRC20TransferTool() {
  openModalTool(<SRC20TransferTool />);
}

/* ===== COMPONENT ===== */
export function SRC20TransferTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = { trxType: "olga" },
) {
  return (
    <ModalTool
      title="SRC-20"
      subtitle="TRANSFER"
      info={<SRC20TransferInfo />}
    >
      <SRC20TransferToolBody trxType={trxType} variant="modal" />
    </ModalTool>
  );
}
