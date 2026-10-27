/* ===== STAMP SEND TOOL MODAL ===== */
/* Thin wrapper: the form lives in islands/tool/stamp/SendTool.tsx and is
   rendered here with variant="modal" inside the ModalTool chrome. */
import { StampSendInfo } from "$islands/modal/info/StampSendInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { StampSendTool as StampSendToolBody } from "$islands/tool/stamp/SendTool.tsx";

/* ===== OPENER ===== */
export function openStampSendTool() {
  openModalTool(<StampSendTool />);
}

/* ===== COMPONENT ===== */
export function StampSendTool() {
  return (
    <ModalTool
      title="STAMP"
      subtitle="SEND"
      info={<StampSendInfo />}
    >
      <StampSendToolBody variant="modal" />
    </ModalTool>
  );
}
