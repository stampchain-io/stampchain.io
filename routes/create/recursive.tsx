/* ===== RECURSIVE STAMP CREATE PAGE ===== */
import { CreateStampRecursiveContent } from "$content";
import { CreateStampHeader } from "$header";
import { containerBackground } from "$layout";

export default function RecursiveStampPage() {
  return (
    <div class={containerBackground}>
      <CreateStampHeader active="recursive" />
      <CreateStampRecursiveContent />
    </div>
  );
}
