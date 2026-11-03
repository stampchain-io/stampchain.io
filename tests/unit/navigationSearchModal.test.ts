import { openSRC20Search } from "$islands/modal/SearchSRC20Modal.tsx";
import { openStampSearch } from "$islands/modal/SearchStampModal.tsx";
import {
  globalModal,
  searchState,
  stackedModal,
} from "$islands/modal/states.ts";
import { assertEquals } from "@std/assert";

interface SearchModalContent {
  props: {
    onClose: () => void;
    children: {
      props: {
        setSearchTerm: (term: string) => void;
        onSearch: () => Promise<void>;
      };
    };
  };
}

function currentModal() {
  return globalModal.value.content as unknown as SearchModalContent;
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => resolve = done);
  return { promise, resolve };
}

function assetResponse(stamp: number) {
  return Response.json({ data: [{ stamp, tick: `TOKEN${stamp}` }] });
}

async function withModalFetch(
  reply: (url: URL) => Response | Promise<Response>,
  run: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalFrame = Object.getOwnPropertyDescriptor(
    globalThis,
    "requestAnimationFrame",
  );
  const originalModal = globalModal.value;
  const originalStackedModal = stackedModal.value;
  const originalSearch = searchState.value;
  globalThis.fetch = (input) =>
    Promise.resolve(
      reply(
        new URL(
          input instanceof Request ? input.url : String(input),
          "https://stampchain.test",
        ),
      ),
    );
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    value: () => 0,
    configurable: true,
    writable: true,
  });
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalFrame) {
      Object.defineProperty(globalThis, "requestAnimationFrame", originalFrame);
    } else {
      Reflect.deleteProperty(globalThis, "requestAnimationFrame");
    }
    globalModal.value = originalModal;
    stackedModal.value = originalStackedModal;
    searchState.value = originalSearch;
  }
}

for (
  const [context, openSearch] of [
    ["stamp", openStampSearch],
    ["src20", openSRC20Search],
  ] as const
) {
  Deno.test(`${context} modal keeps the latest search when an old request finishes last`, async () => {
    const oldResponse = deferredResponse();
    await withModalFetch(
      (url) => {
        if (url.pathname.includes("/creators/")) {
          return Response.json({ data: [] });
        }
        return url.searchParams.get("q") === "Old Artist"
          ? oldResponse.promise
          : assetResponse(2);
      },
      async () => {
        openSearch();
        const content = currentModal().props.children.props;
        content.setSearchTerm("Old Artist");
        const oldSearch = content.onSearch();
        content.setSearchTerm("New Artist");
        await content.onSearch();
        const latestState = searchState.value;

        oldResponse.resolve(assetResponse(1));
        await oldSearch;

        assertEquals(searchState.value, latestState);
        assertEquals(searchState.value.results?.[0].stamp, 2);
        assertEquals(searchState.value.term, "New Artist");
        assertEquals(searchState.value.isLoading, false);
      },
    );
  });

  Deno.test(`${context} modal ignores results after the input is cleared`, async () => {
    const pendingResponse = deferredResponse();
    await withModalFetch(
      (url) =>
        url.pathname.includes("/creators/")
          ? Response.json({ data: [] })
          : pendingResponse.promise,
      async () => {
        openSearch();
        const content = currentModal().props.children.props;
        content.setSearchTerm("Artist");
        const pendingSearch = content.onSearch();
        content.setSearchTerm("");
        const clearedState = searchState.value;

        pendingResponse.resolve(assetResponse(1));
        await pendingSearch;

        assertEquals(searchState.value, clearedState);
        assertEquals(searchState.value.results, []);
        assertEquals(searchState.value.isLoading, false);
      },
    );
  });

  Deno.test(`${context} modal ignores results after it is closed`, async () => {
    const pendingResponse = deferredResponse();
    await withModalFetch(
      (url) =>
        url.pathname.includes("/creators/")
          ? Response.json({ data: [] })
          : pendingResponse.promise,
      async () => {
        openSearch();
        const modal = currentModal();
        const content = modal.props.children.props;
        content.setSearchTerm("Artist");
        const pendingSearch = content.onSearch();
        modal.props.onClose();
        const closedState = searchState.value;

        pendingResponse.resolve(assetResponse(1));
        await pendingSearch;

        assertEquals(globalModal.value.isOpen, false);
        assertEquals(searchState.value, closedState);
        assertEquals(searchState.value.results, []);
      },
    );
  });
}

Deno.test("navigation modal guards isolate searches with the same term across contexts", async () => {
  const oldStampResponse = deferredResponse();
  await withModalFetch(
    (url) => {
      if (url.pathname.includes("/creators/")) {
        return Response.json({ data: [] });
      }
      return url.pathname.includes("/stamps/")
        ? oldStampResponse.promise
        : assetResponse(2);
    },
    async () => {
      openStampSearch();
      const stampContent = currentModal().props.children.props;
      stampContent.setSearchTerm("Artist");
      const oldStampSearch = stampContent.onSearch();

      openSRC20Search();
      const tokenContent = currentModal().props.children.props;
      tokenContent.setSearchTerm("Artist");
      await tokenContent.onSearch();
      const tokenState = searchState.value;

      oldStampResponse.resolve(assetResponse(1));
      await oldStampSearch;

      assertEquals(searchState.value, tokenState);
      assertEquals(searchState.value.results?.[0].tick, "TOKEN2");
    },
  );
});
