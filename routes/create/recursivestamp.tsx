/* ===== RECURSIVE STAMP CREATE PAGE ===== */
import { StampRecursiveContent } from "$content";
import { CreateStampHeader } from "$header";
import { containerBackground } from "$layout";

export default function RecursiveStampPage() {
  return (
    <div class={containerBackground}>
      <CreateStampHeader />
      <StampRecursiveContent />
    </div>
  );
}
