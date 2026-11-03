import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type { ExplorerContentProps } from "$types/ui.d.ts";
import { assertEquals } from "@std/assert";
import { type ComponentChildren, isValidElement } from "preact";

// A transitive wallet import reads storage during initialization. Keep this
// rendering test isolated from Deno's persistent localStorage database.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    },
  },
});
const { ExplorerContent } = await import(
  "$islands/content/ExplorerContent.tsx"
);

function stamp(
  id: number,
  block: number,
  txIndex: number | null | undefined = id,
): StampRow {
  return {
    stamp: id,
    tx_hash: `stamp-${id}`,
    block_index: block,
    tx_index: txIndex,
  } as StampRow;
}

function token(id: number, block: number, txIndex = id): SRC20Row {
  return {
    tx_hash: `token-${id}`,
    block_index: block,
    tx_index: txIndex,
  } as SRC20Row;
}

// Inspect the entries handed to the real cards/table without mounting child
// islands, whose wallet hooks and media loading are unrelated to ordering.
function visibleHashes(props: ExplorerContentProps): string[] {
  const hashes: string[] = [];
  function visit(child: ComponentChildren): void {
    if (Array.isArray(child)) {
      child.forEach(visit);
    } else if (isValidElement(child)) {
      const props = child.props as {
        items?: { item: { tx_hash: string } }[];
        stamp?: StampRow;
        src20?: SRC20Row;
        children?: ComponentChildren;
      };
      if (props.items) {
        hashes.push(...props.items.map(({ item }) => item.tx_hash));
      } else if (props.stamp || props.src20) {
        hashes.push((props.stamp ?? props.src20)!.tx_hash);
      } else {
        visit(props.children);
      }
    }
  }
  visit(ExplorerContent(props));
  return hashes;
}

for (const viewMode of ["cardRow", "cardSquare", "cardVertical"] as const) {
  Deno.test(`${viewMode}: descending page groups each display earliest first`, () => {
    const pages = [
      [stamp(6, 106), stamp(5, 105), stamp(4, 104)],
      [stamp(3, 103), stamp(2, 102), stamp(1, 101)],
    ];
    const original = structuredClone(pages);
    const actual = pages.map((stamps, index) =>
      visibleHashes({
        stamps,
        section: "stamps",
        viewMode,
        pagination: { page: index + 1, totalPages: 2 },
      })
    );

    assertEquals(actual, [
      ["stamp-4", "stamp-5", "stamp-6"],
      ["stamp-1", "stamp-2", "stamp-3"],
    ]);
    assertEquals(pages, original);
  });

  Deno.test(`${viewMode}: ascending pages stay ascending`, () => {
    for (const page of [1, 2]) {
      const stamps = [
        stamp(page * 2 - 1, page * 100),
        stamp(page * 2, page * 101),
      ];
      assertEquals(
        visibleHashes({ stamps, section: "stamps", viewMode }),
        stamps.map((s) => s.tx_hash),
      );
    }
  });

  Deno.test(`${viewMode}: mixed fallback follows block and transaction order`, () => {
    const stamps = [stamp(3, 101), stamp(1, 100)];
    const tokens = [token(4, 101), token(2, 100)];
    const originalStamps = structuredClone(stamps);
    const originalTokens = structuredClone(tokens);

    assertEquals(
      visibleHashes({
        stamps,
        src20DataCard: {
          data: tokens,
          total: 2,
          page: 1,
          totalPages: 1,
        },
        viewMode,
      }),
      ["stamp-1", "token-2", "stamp-3", "token-4"],
    );
    assertEquals(stamps, originalStamps);
    assertEquals(tokens, originalTokens);
  });

  Deno.test(`${viewMode}: reverses the descending mixed feed page without mutation`, () => {
    const mixedItems: NonNullable<ExplorerContentProps["mixedItems"]> = [
      { kind: "src20", item: token(3, 101) },
      { kind: "stamp", item: stamp(2, 100) },
      { kind: "stamp", item: stamp(1, 100) },
    ];
    const original = structuredClone(mixedItems);
    assertEquals(
      visibleHashes({ mixedItems, viewMode, sortBy: "DESC" }),
      ["stamp-1", "stamp-2", "token-3"],
    );
    assertEquals(mixedItems, original);
  });

  Deno.test(`${viewMode}: keeps the ascending mixed feed page and its same-block token order`, () => {
    const tokenWithoutIndex = token(2, 100);
    delete (tokenWithoutIndex as { tx_index?: number }).tx_index;
    const mixedItems: NonNullable<ExplorerContentProps["mixedItems"]> = [
      { kind: "stamp", item: stamp(1, 100) },
      { kind: "src20", item: tokenWithoutIndex },
      { kind: "stamp", item: stamp(3, 100) },
    ];
    const original = structuredClone(mixedItems);
    assertEquals(
      visibleHashes({ mixedItems, viewMode, sortBy: "ASC" }),
      ["stamp-1", "token-2", "stamp-3"],
    );
    assertEquals(mixedItems, original);

    assertEquals(
      visibleHashes({
        mixedItems: [...mixedItems].reverse(),
        viewMode,
        sortBy: "DESC",
      }),
      ["stamp-1", "token-2", "stamp-3"],
    );
  });

  Deno.test(`${viewMode}: keeps stable order when a transaction index is missing`, () => {
    assertEquals(
      visibleHashes({
        stamps: [stamp(2, 100, null), stamp(1, 100), stamp(3, 101)],
        section: "stamps",
        viewMode,
      }),
      ["stamp-2", "stamp-1", "stamp-3"],
    );
  });

  Deno.test(`${viewMode}: sorts a short final page without changing membership`, () => {
    assertEquals(
      visibleHashes({
        stamps: [stamp(2, 102), stamp(1, 101)],
        section: "stamps",
        viewMode,
        pagination: { page: 3, totalPages: 3 },
      }),
      ["stamp-1", "stamp-2"],
    );
  });

  Deno.test(`${viewMode}: preserves recent sales ordering`, () => {
    // Sales order may differ from creation order. Keep the query's order.
    assertEquals(
      visibleHashes({
        stamps: [stamp(2, 200), stamp(1, 100)],
        isRecentSales: true,
        viewMode,
      }),
      ["stamp-2", "stamp-1"],
    );
  });
}
