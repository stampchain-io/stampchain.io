/* ===== COLLECTION OVERVIEW HEADER COMPONENT ===== */
import { titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
function CollectionOverviewHeader() {
  return (
    <div class="flex flex-row justify-between items-start w-full">
      <h1 class={titleNeutralLD}>
        COLLECTIONS
      </h1>
    </div>
  );
}

export { CollectionOverviewHeader };
