/* ===== SRC-20 DEPLOY TOOL MODAL ===== */
/* Thin wrapper: the deploy tool itself lives in
   islands/tool/src20/DeployTool.tsx and renders here with variant="modal". */
import { SRC20DeployInfo } from "$islands/modal/info/SRC20DeployInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { SRC20DeployTool as SRC20DeployToolBody } from "$islands/tool/src20/DeployTool.tsx";

/* ===== OPENER ===== */
export function openSRC20DeployTool() {
  openModalTool(<SRC20DeployTool />);
}

/* ===== COMPONENT IMPLEMENTATION ===== */
export function SRC20DeployTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = { trxType: "olga" },
) {
  return (
    <ModalTool
      title="SRC-20"
      subtitle="DEPLOY"
      info={<SRC20DeployInfo />}
    >
      <SRC20DeployToolBody trxType={trxType} variant="modal" />
    </ModalTool>
  );
}
