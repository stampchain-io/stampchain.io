/* ===== POSH STAMP CREATE PAGE ===== */
import { CreateStampPoshContent } from "$content";
import { CreateStampHeader } from "$header";
import { containerBackground } from "$layout";

export default function PoshStampPage() {
  return (
    <div class={containerBackground}>
      <CreateStampHeader active="posh" />
      <CreateStampPoshContent />
    </div>
  );
}
