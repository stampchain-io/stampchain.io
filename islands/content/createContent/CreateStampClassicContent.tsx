/* ===== CLASSIC STAMP CONTENT ===== */
/* Numeric (A-prefixed) assets: auto-generated or custom CPID. */
import { useStampFile } from "$lib/hooks/useStampFile.ts";
import { useStampMint } from "$lib/hooks/useStampMint.ts";
import {
  CreateStampLayout,
  StampCpidToggleRow,
  StampMaraDebug,
  StampMaraNotices,
  StampMintPanel,
  StampUploadWorkspace,
} from "$islands/content/createContent/CreateStampBase.tsx";

export function CreateStampClassicContent() {
  const stampFile = useStampFile();
  const mint = useStampMint({
    variant: "classic",
    payload: stampFile.payload,
    enableMara: true,
    onSuccess: stampFile.clearFile,
  });

  return (
    <div class="flex flex-col w-full">
      <StampMaraNotices mint={mint} />
      <CreateStampLayout
        title="STAMP"
        sidebar={
          <StampMintPanel
            mint={mint}
            cpidRow={<StampCpidToggleRow mint={mint} />}
            fileType={stampFile.file?.type || "image/png"}
            fileSize={stampFile.file?.size ?? 0}
            fileUploadError={stampFile.fileError || null}
          />
        }
      >
        <StampUploadWorkspace
          stampFile={stampFile}
          mint={mint}
          disabled={mint.isSubmitting}
        />
      </CreateStampLayout>
      <StampMaraDebug mint={mint} />
    </div>
  );
}
