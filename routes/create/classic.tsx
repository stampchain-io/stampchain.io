/* ===== CLASSIC STAMP CREATE PAGE ===== */
import { CreateStampClassicContent } from "$content";
import { CreateStampHeader } from "$header";
import { containerBackground } from "$layout";

export default function ClassicStampPage() {
  return (
    <div class={containerBackground}>
      <CreateStampHeader active="classic" />
      <CreateStampClassicContent />
    </div>
  );
}
