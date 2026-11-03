import {
  navigationSearchError,
  type NavigationSearchType,
  searchNavigation,
} from "$lib/utils/ui/search/navigationSearch.ts";
import { assertEquals, assertRejects } from "@std/assert";

const ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

interface SearchRequest {
  url: string;
  headers: Headers;
}

async function withFetch(
  reply: (request: SearchRequest) => Response | Promise<Response>,
  run: (requests: SearchRequest[]) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const requests: SearchRequest[] = [];
  globalThis.fetch = (input, init) => {
    const request = {
      url: input instanceof Request ? input.url : String(input),
      headers: new Headers(init?.headers),
    };
    requests.push(request);
    return Promise.resolve(reply(request));
  };
  try {
    await run(requests);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function success(data: unknown[]) {
  return Response.json({ data });
}

for (const context of ["stamp", "src20"] as NavigationSearchType[]) {
  Deno.test(`navigation search includes users alongside ${context} results`, async () => {
    const asset = context === "stamp"
      ? { stamp: 123, cpid: "A12345" }
      : { tick: "KEVIN", holders: 12 };
    const creator = { address: ADDRESS, name: "O'Brien Art" };
    await withFetch(
      ({ url }) => success(url.includes("/creators/") ? [creator] : [asset]),
      async (requests) => {
        const results = await searchNavigation("  O'Brien Art  ", context);

        assertEquals(results, [{ _addressLink: true, ...creator }, asset]);
        const assetPath = context === "stamp" ? "stamps" : "src20";
        assertEquals(
          requests.map(({ url }) => url).sort(),
          [
            `/api/v2/creators/search?q=O'Brien%20Art`,
            `/api/v2/${assetPath}/search?q=O'Brien%20Art`,
          ].sort(),
        );
        assertEquals(
          requests.map(({ headers }) => headers.get("X-API-Version")),
          ["2.3", "2.3"],
        );
      },
    );
  });
}

Deno.test("navigation search preserves names that resemble asset identifiers", async () => {
  for (const name of ["12345", "A123456", "deadbeef", "3D Artist"]) {
    const creator = { address: ADDRESS, name };
    await withFetch(
      ({ url }) => success(url.includes("/creators/") ? [creator] : []),
      async (requests) => {
        const results = await searchNavigation(name, "stamp");
        assertEquals(results, [{ _addressLink: true, ...creator }]);
        assertEquals(
          requests.some(({ url }) =>
            url === `/api/v2/creators/search?q=${encodeURIComponent(name)}`
          ),
          true,
        );
      },
    );
  }
});

Deno.test("navigation search encodes punctuation without changing the name", async () => {
  await withFetch(
    () => success([]),
    async (requests) => {
      await searchNavigation("  Art & Friends.btc  ", "stamp");
      assertEquals(
        requests.every(({ url }) => url.endsWith("?q=Art%20%26%20Friends.btc")),
        true,
      );
    },
  );
});

Deno.test("navigation search merges direct address and named user into one wallet", async () => {
  const creator = { address: ADDRESS, name: "Satoshi" };
  await withFetch(
    ({ url }) => success(url.includes("/creators/") ? [creator, creator] : []),
    async () => {
      assertEquals(await searchNavigation(ADDRESS, "stamp"), [
        { _addressLink: true, ...creator },
      ]);
    },
  );
});

Deno.test("navigation search can open a valid wallet with no indexed assets", async () => {
  await withFetch(
    () => success([]),
    async () => {
      assertEquals(await searchNavigation(ADDRESS, "src20"), [
        { _addressLink: true, address: ADDRESS },
      ]);
    },
  );
});

Deno.test("navigation search preserves direct wallet navigation during an outage", async () => {
  await withFetch(
    () => new Response(null, { status: 503 }),
    async () => {
      assertEquals(await searchNavigation(ADDRESS, "stamp"), [
        { _addressLink: true, address: ADDRESS },
      ]);
    },
  );
});

Deno.test("navigation search preserves users when asset search fails", async () => {
  const creator = { address: ADDRESS, name: "Artist" };
  await withFetch(
    ({ url }) =>
      url.includes("/creators/")
        ? success([creator])
        : new Response(null, { status: 500 }),
    async () => {
      assertEquals(await searchNavigation("Artist", "stamp"), [
        { _addressLink: true, ...creator },
      ]);
    },
  );
});

Deno.test("navigation search preserves assets when user search fails", async () => {
  const token = { tick: "KEVIN" };
  await withFetch(
    ({ url }) => {
      if (url.includes("/creators/")) {
        return Promise.reject(new TypeError("Network unavailable"));
      }
      return success([token]);
    },
    async () => {
      assertEquals(await searchNavigation("KEVIN", "src20"), [token]);
    },
  );
});

Deno.test("navigation search distinguishes a failed lookup from no matches", async () => {
  await withFetch(
    ({ url }) =>
      url.includes("/creators/")
        ? new Response(null, { status: 503 })
        : success([]),
    async () => {
      await assertRejects(
        () => searchNavigation("Missing Artist", "stamp"),
        Error,
        "Search unavailable",
      );
    },
  );
});

Deno.test("navigation search rejects malformed response envelopes", async () => {
  await withFetch(
    () => Response.json({ data: null }),
    async () => {
      await assertRejects(
        () => searchNavigation("Artist", "stamp"),
        Error,
        "Search unavailable",
      );
    },
  );
});

Deno.test("navigation search returns no matches when both lookups succeed empty", async () => {
  await withFetch(
    () => success([]),
    async () => {
      assertEquals(await searchNavigation("Missing Artist", "stamp"), []);
    },
  );
});

Deno.test("navigation search skips requests for a blank term", async () => {
  await withFetch(
    () => {
      throw new Error("Blank searches must not fetch");
    },
    async (requests) => {
      assertEquals(await searchNavigation("  ", "stamp"), []);
      assertEquals(requests, []);
    },
  );
});

Deno.test("navigation search errors mention users for name and ticker searches", () => {
  assertEquals(
    navigationSearchError("  O'Brien Art  ", "stamp"),
    "NO RESULTS FOUND\nO'Brien Art\nNo users or stamps match this search",
  );
  assertEquals(
    navigationSearchError("KEVIN", "src20"),
    "NO RESULTS FOUND\nKEVIN\nNo users or tokens match this search",
  );
  assertEquals(
    navigationSearchError("123", "stamp"),
    "NO STAMP FOUND\n123\nThe stamp number doesn't exist",
  );
});
