/** Snapshot and page shapes for the stamps leaderboard. */

export type LeaderboardMetric = "stamps" | "valuation";
export type LeaderboardSort = "ASC" | "DESC";

export interface LeaderboardWallet {
  address: string;
  creator_name: string | null;
  stamp_count: number;
  floor_value_btc: number;
  images: string[];
}

/** Cached board. Only the ranked wallets are stored, not every holder. */
export interface LeaderboardSnapshot {
  generated_at: number;
  last_block: number | null;
  escrow_included: boolean;
  wallets: Record<string, LeaderboardWallet>;
  /** Addresses best-first. Index + 1 is the real rank. */
  by_stamps: string[];
  by_valuation: string[];
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  creatorName: string | null;
  stampCount: number;
  floorValueBtc: number;
  images: string[];
}

export interface LeaderboardPageData {
  metric: LeaderboardMetric;
  sortBy: LeaderboardSort;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  generatedAt: number | null;
  escrowIncluded: boolean;
  showValuation: boolean;
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  error?: string;
}
