/* ===== COLLECTION OVERVIEW HEADER COMPONENT ===== */
import { titleNeutral } from "$text";

/* ===== COMPONENT ===== */
function CollectionOverviewHeader() {
  return (
    <div class="flex flex-row justify-between items-start w-full">
      <h1 class={titleNeutral}>
        COLLECTIONS
      </h1>
    </div>
  );
}

export { CollectionOverviewHeader };
