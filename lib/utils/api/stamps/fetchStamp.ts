/* ===== CLIENT-SIDE STAMP FETCH HELPERS ===== */
import type { Collection } from "$types/api.d.ts";
import type { StampRow } from "$types/stamp.d.ts";

const API_HEADERS = { "X-API-Version": "2.3" };

function unwrapStamp(json: unknown): StampRow | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const inner = data as Record<string, unknown>;
    if (inner.stamp && typeof inner.stamp === "object") {
      return inner.stamp as StampRow;
    }
    if (inner.cpid || inner.stamp !== undefined) {
      return data as StampRow;
    }
  }
  return null;
}

function unwrapStampList(json: unknown): StampRow[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as StampRow[];
  if (root.data && typeof root.data === "object") {
    const inner = root.data as Record<string, unknown>;
    if (Array.isArray(inner.stamps)) return inner.stamps as StampRow[];
    if (Array.isArray(inner.data)) return inner.data as StampRow[];
  }
  return [];
}

export type StampPickerType = "all" | "classic" | "posh" | "src-721";

export interface StampListPage {
  stamps: StampRow[];
  page: number;
  totalPages: number;
}

function unwrapStampListPage(
  json: unknown,
  fallbackPage: number,
): StampListPage {
  const stamps = unwrapStampList(json);
  if (!json || typeof json !== "object") {
    return { stamps, page: fallbackPage, totalPages: 0 };
  }
  const root = json as Record<string, unknown>;
  const nested = root.data && typeof root.data === "object" &&
      !Array.isArray(root.data)
    ? root.data as Record<string, unknown>
    : root;
  const page = Number(root.page ?? nested.page ?? fallbackPage) ||
    fallbackPage;
  const totalPages = Number(
    root.totalPages ?? nested.totalPages ?? root.pages ?? nested.pages ??
      0,
  ) || 0;
  return { stamps, page, totalPages };
}

export async function fetchStampById(
  id: string,
): Promise<StampRow | null> {
  try {
    const res = await fetch(
      `/api/v2/stamps/${encodeURIComponent(id)}`,
      { headers: API_HEADERS },
    );
    if (!res.ok) return null;
    return unwrapStamp(await res.json());
  } catch {
    return null;
  }
}

export async function fetchStampList(opts: {
  limit?: number;
  page?: number;
  type?: StampPickerType;
}): Promise<StampListPage> {
  const page = opts.page ?? 1;
  const empty: StampListPage = { stamps: [], page, totalPages: 0 };
  try {
    const type = opts.type ?? "all";
    const params = new URLSearchParams({
      limit: String(opts.limit ?? 20),
      page: String(page),
    });
    if (type === "src-721") {
      params.set("type", "all");
      params.set("ident", "SRC-721");
    } else if (type === "all") {
      params.set("type", "all");
      params.set("ident", "STAMP,SRC-721");
    } else {
      params.set("type", type);
    }
    const res = await fetch(`/api/v2/stamps?${params}`, {
      headers: API_HEADERS,
    });
    if (!res.ok) return empty;
    return unwrapStampListPage(await res.json(), page);
  } catch {
    return empty;
  }
}

export async function fetchStampsByCreator(
  address: string,
  limit = 20,
): Promise<StampRow[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: "1",
    });
    const res = await fetch(
      `/api/v2/balance/${encodeURIComponent(address)}?${params}`,
      { headers: API_HEADERS },
    );
    if (!res.ok) return [];
    return unwrapStampList(await res.json());
  } catch {
    return [];
  }
}

export async function fetchCollections(
  limit = 60,
): Promise<Collection[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: "1",
    });
    const res = await fetch(`/api/v2/collections?${params}`, {
      headers: API_HEADERS,
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json?.data)) return json.data as Collection[];
    if (Array.isArray(json?.data?.data)) {
      return json.data.data as Collection[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchCollectionStamps(
  collectionId: string,
  limit = 20,
  page = 1,
): Promise<StampRow[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    const res = await fetch(
      `/api/v2/collections/${encodeURIComponent(collectionId)}?${params}`,
      { headers: API_HEADERS },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    const raw = data?.stamps;
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
      return raw as StampRow[];
    }
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "number") {
      const results = await Promise.all(
        (raw as number[]).map((id) => fetchStampById(String(id))),
      );
      return results.filter((s): s is StampRow => s != null);
    }
    return unwrapStampList(json);
  } catch {
    return [];
  }
}
