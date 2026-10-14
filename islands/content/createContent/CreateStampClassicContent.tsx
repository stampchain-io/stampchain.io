/* ===== CLASSIC STAMP CONTENT ===== */
/* Numeric (A-prefixed) assets: auto-generated or custom CPID. */
import { useStampFile } from "$lib/hooks/useStampFile.ts";
import { useStampMint } from "$lib/hooks/useStampMint.ts";
import {
  CreateStampLayout,
  StampCpidToggleRow,
  StampMintPanel,
  StampUploadWorkspace,
} from "$islands/content/createContent/CreateStampBase.tsx";

export function CreateStampClassicContent() {
  const stampFile = useStampFile();
  const mint = useStampMint({
    variant: "classic",
    payload: stampFile.payload,
    onSuccess: stampFile.clearFile,
  });

  return (
    <div class="flex flex-col w-full">
      <CreateStampLayout
        title="STAMP"
        sidebar={
          <StampMintPanel
            mint={mint}
            cpidRow={<StampCpidToggleRow mint={mint} />}
            fileType={stampFile.file?.type || "image/png"}
            fileSize={stampFile.file?.size ?? 0}
            fileUploadError={stampFile.fileError || stampFile.fileWarning ||
              null}
          />
        }
      >
        <StampUploadWorkspace
          stampFile={stampFile}
          mint={mint}
          disabled={mint.isSubmitting}
        />
      </CreateStampLayout>
    </div>
  );
}
