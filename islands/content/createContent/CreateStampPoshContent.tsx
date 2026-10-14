/* ===== POSH STAMP CONTENT ===== */
/* Named (B-Z) assets: the stamp name is required and needs XCP. */
import { useStampFile } from "$lib/hooks/useStampFile.ts";
import { useStampMint } from "$lib/hooks/useStampMint.ts";
import {
  CreateStampLayout,
  StampMintPanel,
  StampNamedStampRow,
  StampUploadWorkspace,
} from "$islands/content/createContent/CreateStampBase.tsx";

export function CreateStampPoshContent() {
  const stampFile = useStampFile();
  const mint = useStampMint({
    variant: "posh",
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
            cpidRow={<StampNamedStampRow mint={mint} />}
            cpidAboveLocked
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
