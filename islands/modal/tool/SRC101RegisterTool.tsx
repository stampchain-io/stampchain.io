/* ===== SRC-101 REGISTER TOOL MODAL ===== */
/* Thin wrapper: the tool itself lives in islands/tool/src101/RegisterTool.tsx
   and is rendered here with variant="modal" inside the modal chrome. */
import { SRC101RegisterInfo } from "$islands/modal/info/SRC101RegisterInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { SRC101RegisterTool as SRC101RegisterToolView } from "$islands/tool/src101/RegisterTool.tsx";

/* ===== OPENER ===== */
export function openSRC101RegisterTool() {
  openModalTool(<SRC101RegisterTool />);
}

/* ===== COMPONENT ===== */
export function SRC101RegisterTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = {
    trxType: "olga",
  },
) {
  return (
    <ModalTool
      title="SRC-101"
      subtitle="BITNAME REGISTRATION"
      info={<SRC101RegisterInfo />}
    >
      <SRC101RegisterToolView trxType={trxType} variant="modal" />
    </ModalTool>
  );
}
