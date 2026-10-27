/* ===== SRC-20 MINT TOOL MODAL ===== */
/* Thin wrapper: the tool itself lives in islands/tool/src20/MintTool.tsx
   and renders here with variant="modal". */
import { SRC20MintInfo } from "$islands/modal/info/SRC20MintInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { SRC20MintTool as SRC20MintToolBody } from "$islands/tool/src20/MintTool.tsx";

/* ===== OPENER ===== */
export function openSRC20MintTool(tick?: string) {
  openModalTool(
    <SRC20MintTool {...(tick ? { tick } : {})} />,
  );
}

interface SRC20MintToolProps {
  trxType?: string;
  tick?: string;
  mintStatus?: any;
  holders?: any;
}

/* ===== COMPONENT ===== */
export function SRC20MintTool(
  props: SRC20MintToolProps = { trxType: "olga" },
) {
  return (
    <ModalTool
      title="SRC-20"
      subtitle="MINT"
      info={<SRC20MintInfo />}
    >
      <SRC20MintToolBody {...props} variant="modal" />
    </ModalTool>
  );
}
