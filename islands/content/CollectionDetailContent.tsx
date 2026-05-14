/* ===== COLLECTION DETAILS CONTENT COMPONENT ===== */
import type { StampRow } from "$types/stamp.d.ts";
import { StampCard } from "$card";

/* ===== COMPONENT ===== */
export const CollectionDetailContent = ({ stamps = [] }: {
  stamps: StampRow[];
}) => {
  return (
    <div data-name="stamps">
      <div class="grid grid-cols-2 mobileMd:grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-5 gap-6 transition-colors ease-in-out duration-100">
        {stamps.map((stamp: StampRow) => (
          <StampCard
            key={stamp.tx_hash}
            stamp={stamp}
          />
        ))}
      </div>
    </div>
  );
};
