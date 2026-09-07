import { MAX_PAGINATION_LIMIT } from "$constants";
import blockFixturesData from "../fixtures/blockData.json" with {
  type: "json"
};
import collectionFixturesData from "../fixtures/collectionData.json" with {
  type: "json"
};
import marketDataFixturesData from "../fixtures/marketData.json" with {
  type: "json"
};
import src101FixturesData from "../fixtures/src101Data.json" with {
  type: "json"
};
import src20FixturesData from "../fixtures/src20Data.json" with {
  type: "json"
};
import stampFixturesData from "../fixtures/stampData.json" with {
  type: "json"
};

interface QueryResult {
  rows: any[];
  [key: string]: any;
}

/**
 * Mock implementation of DatabaseManager for unit testing.
 * Returns fixture data instead of executing real database queries.
 */
export class MockDatabaseManager {
  private queryHistory: Array<{ query: string; params: unknown[] }> = [];
  private mockResponses: Map<string, QueryResult> = new Map();

  /**
   * Execute a query and return mocked results based on the query pattern
   */
  executeQuery<T>(query: string, params: unknown[]): Promise<T> {
    // Log the query for verification in tests
    this.queryHistory.push({ query, params });

    // Get mock data (which checks for custom responses first)
    const result = this.getMockDataForQuery(query, params);
    return Promise.resolve(result as T);
  }

  /**
   * Execute a query with cache - same as executeQuery for mock
   */
  executeQueryWithCache<T>(
    query: string,
    params: unknown[],
    _cacheDuration: number | "never",
  ): Promise<T> {
    // In mock, cache duration is ignored
    return this.executeQuery<T>(query, params);
  }

  /**
   * Handle cache operations - mock implementation
   */
  async handleCache<T>(
    key: string,
    factory: () => Promise<T>,
    duration: number,
  ): Promise<T> {
    // For testing, just call the factory function directly
    // This bypasses caching but allows the circuit breaker logic to work
    return await factory();
  }

  /**
   * Set a specific mock response for a query pattern.
   * Can be called with 2 args (tag-based) or 3 args (query-based).
   */
  setMockResponse(
    queryOrTag: string,
    paramsOrResponse: unknown[] | QueryResult,
    response?: QueryResult,
  ): void {
    if (response !== undefined) {
      // 3-argument form: setMockResponse(query, params, response)
      const key = this.generateMockKey(
        queryOrTag,
        paramsOrResponse as unknown[],
      );
      this.mockResponses.set(key, response);
    } else {
      // 2-argument form: setMockResponse(tag, response)
      // Use the tag directly as the key for simple tag-based mocking
      this._taggedMockResponses.set(
        queryOrTag,
        paramsOrResponse as QueryResult,
      );
    }
  }

  /**
   * Helper method to mock query results - simpler API for tests
   */
  mockQueryResult(rows: any[]): void {
    // Store the mock response to be returned by the next query
    this._nextMockResult = { rows };
  }

  private _nextMockResult: QueryResult | null = null;
  private _taggedMockResponses: Map<string, QueryResult> = new Map();

  /**
   * Get the history of queries that were executed.
   * Returns an array of query strings for easier testing.
   */
  getQueryHistory(): string[] {
    return this.queryHistory.map((entry) => entry.query);
  }

  /**
   * Get the full query history with parameters
   */
  getFullQueryHistory(): Array<{ query: string; params: unknown[] }> {
    return [...this.queryHistory];
  }

  /**
   * Clear query history
   */
  clearQueryHistory(): void {
    this.queryHistory = [];
  }

  /**
   * Clear all mock responses
   */
  clearMockResponses(): void {
    this.mockResponses.clear();
    this._taggedMockResponses.clear();
  }

  /**
   * Get mock response for a query - public method for tests
   */
  getMockResponse(query: string, params: unknown[]): QueryResult | null {
    const mockKey = this.generateMockKey(query, params);
    return this.mockResponses.get(mockKey) || null;
  }

  /**
   * Generate a unique key for a query + params combination
   */
  private generateMockKey(query: string, params: unknown[]): string {
    // Normalize whitespace - replace multiple spaces/newlines with single space
    const normalizedQuery = query.trim().toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\s*;\s*$/, ""); // Remove trailing semicolon
    return `${normalizedQuery}::${JSON.stringify(params)}`;
  }

  /**
   * Return appropriate mock data based on the query pattern
   */
  private getMockDataForQuery(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();

    // Check if there's a next mock result waiting (highest priority)
    if (this._nextMockResult) {
      const result = this._nextMockResult;
      this._nextMockResult = null; // Clear after use
      return result;
    }

    // Check if there's a specific mock response set by query+params (second priority)
    const mockKey = this.generateMockKey(query, params);
    if (this.mockResponses.has(mockKey)) {
      return this.mockResponses.get(mockKey)!;
    }

    // Check tagged mock responses (tag-based mocking for tests - third priority)
    // Only use tagged responses if explicitly set, not as a fallback to fixtures
    if (this._taggedMockResponses.size > 0) {
      for (const [tag, response] of this._taggedMockResponses.entries()) {
        // Match if tag is in the query - tagged mocks take precedence over fixtures
        if (normalizedQuery.includes(tag.toLowerCase())) {
          return response;
        }
      }
    }

    // Count queries - Check BEFORE collection queries since count queries may contain "from collections"
    // Only treat as count query if it's a simple SELECT COUNT query, not complex WITH clauses
    const hasCountClause = normalizedQuery.includes("count(*)") ||
      normalizedQuery.includes("count(distinct");
    const hasAsTotal = normalizedQuery.includes("as total");
    const noHex = !normalizedQuery.includes("hex(");
    const noGroupConcat = !normalizedQuery.includes("group_concat");
    const noWithClause = !normalizedQuery.includes("with "); // Don't treat complex WITH queries as count queries
    const isSimpleSelect = normalizedQuery.trim().startsWith("select"); // Must be a simple SELECT

    const isCountQuery = hasCountClause && (hasAsTotal || true) && noHex &&
      noGroupConcat && noWithClause && isSimpleSelect;

    if (isCountQuery) {
      return this.getCountData(normalizedQuery, params);
    }

    // Collection queries - check AFTER count queries
    if (
      normalizedQuery.includes("from collections") ||
      normalizedQuery.includes("collections c") ||
      normalizedQuery.includes("hex(c.collection_id)") // Specific to collection queries
    ) {
      return this.getCollectionData(normalizedQuery, params);
    }

    // SRC-20 list queries select `st.stamp` and LEFT JOIN the stamp table to
    // surface the stamp number. That makes the `st.stamp` heuristic in the
    // stamp branch below misroute them into getStampData, which returns
    // stamp-shaped rows with no `tick`. Route on the DRIVING table instead:
    // if the FROM clause resolves to SRC20Valid (directly, or via the
    // push-down subquery form `FROM (SELECT * FROM SRC20Valid ...)`), this is
    // an SRC-20 query no matter what it joins to.
    if (/from\s+\(?\s*(?:select\s+\*\s+from\s+)?src20valid/i.test(normalizedQuery)) {
      return this.getSrc20Data(normalizedQuery, params);
    }

    // Stamp queries with market data JOIN - check BEFORE simple stamp queries
    if (
      (normalizedQuery.includes("from stamps") ||
        normalizedQuery.includes("stampstablev4")) &&
      (normalizedQuery.includes("join stamp_market_data") ||
        normalizedQuery.includes("left join stamp_market_data") ||
        normalizedQuery.includes("smd.floor_price_btc"))
    ) {
      return this.getStampsWithMarketDataJoin(normalizedQuery, params);
    }

    // Stamp queries (non-count, non-join)
    if (
      normalizedQuery.includes("from stamps") ||
      normalizedQuery.includes("from stampstablev4") ||
      normalizedQuery.includes("stampstablev4") ||
      normalizedQuery.includes("st.stamp") // Common pattern in stamp queries
    ) {
      return this.getStampData(normalizedQuery, params);
    }

    // Market data queries
    if (normalizedQuery.includes("from stamp_market_data")) {
      return this.getStampMarketData(normalizedQuery, params);
    }

    if (normalizedQuery.includes("from src20_market_data")) {
      return this.getSrc20MarketData(normalizedQuery, params);
    }

    // Collection market data queries (separate table from collections)
    if (normalizedQuery.includes("from collection_market_data")) {
      return this.getCollectionMarketData(normalizedQuery, params);
    }

    // SRC-20 queries
    if (
      normalizedQuery.includes("from src20valid") ||
      normalizedQuery.includes("from balances") ||
      normalizedQuery.includes("src20_balance") ||
      normalizedQuery.includes("src20valid") // Also match table name without FROM
    ) {
      return this.getSrc20Data(normalizedQuery, params);
    }

    // SRC-101 queries
    if (
      normalizedQuery.includes("from src101") ||
      normalizedQuery.includes("src101") ||
      normalizedQuery.includes("from owners") ||
      normalizedQuery.includes("from recipients") ||
      normalizedQuery.includes("from src101price") ||
      normalizedQuery.includes("src101price") ||
      normalizedQuery.includes("recipients") ||
      normalizedQuery.includes("owners")
    ) {
      return this.getSrc101Data(normalizedQuery, params);
    }

    // Creator queries
    if (normalizedQuery.includes("from creator")) {
      return this.getCreatorData(normalizedQuery, params);
    }

    // Block queries
    if (normalizedQuery.includes("from blocks")) {
      return this.getBlockData(normalizedQuery, params);
    }

    // INSERT/UPDATE queries
    if (
      normalizedQuery.includes("insert") || normalizedQuery.includes("update")
    ) {
      return this.getMutationResult(normalizedQuery, params);
    }

    // Default empty result
    return { rows: [] };
  }

  /**
   * Get stamp data from fixtures
   */
  private getStampData(query: string, params: unknown[]): QueryResult {
    const stampFixtures = stampFixturesData as any;
    let stamps = [
      ...stampFixtures.regularStamps,
      ...stampFixtures.cursedStamps,
      ...stampFixtures.src20Stamps,
      ...stampFixtures.stampsWithMarketData,
    ];

    const normalizedQuery = query.toLowerCase();

    // Filter by stamp type based on WHERE clause
    if (normalizedQuery.includes("where")) {
      // Cursed stamps filter: (st.stamp < 0 AND cpid LIKE 'A%' AND ident = 'STAMP')
      // — checked before the posh/classic checks below because the SQL
      // still nests "st.cpid NOT LIKE 'A%'" and "st.ident != 'SRC-20'"
      // inside its NOT(...) clause, so it would otherwise also match the
      // posh substring check. The "ident != 'src-20'" fragment only
      // appears in the cursed/stamps conditions, not posh/classic (which
      // pin ident = 'STAMP' directly) — use it as the distinguishing marker.
      if (
        normalizedQuery.includes("st.stamp < 0") &&
        normalizedQuery.includes("st.ident != 'src-20'")
      ) {
        stamps = stamps.filter((s) =>
          s.stamp < 0 && s.cpid?.startsWith("A") && s.ident === "STAMP"
        );
      } // Posh stamps filter: (st.stamp < 0 AND cpid NOT LIKE 'A%' AND ident = 'STAMP')
      else if (
        normalizedQuery.includes("st.cpid not like 'a%'") &&
        normalizedQuery.includes("st.ident = 'stamp'")
      ) {
        stamps = stamps.filter((s) =>
          s.stamp < 0 && s.cpid && !s.cpid.startsWith("A") &&
          s.ident === "STAMP"
        );
      } // Classic stamps filter: (st.stamp >= 0 AND cpid LIKE 'A%' AND ident = 'STAMP')
      else if (
        normalizedQuery.includes("st.cpid like 'a%'") &&
        normalizedQuery.includes("st.ident = 'stamp'")
      ) {
        stamps = stamps.filter((s) =>
          s.stamp >= 0 && s.cpid?.startsWith("A") && s.ident === "STAMP"
        );
      } // Regular "stamps" type filter: (st.stamp >= 0 AND st.ident != 'SRC-20')
      else if (
        normalizedQuery.includes("st.stamp >= 0") &&
        normalizedQuery.includes("st.ident != 'src-20'")
      ) {
        stamps = stamps.filter((s) => s.stamp >= 0 && s.ident !== "SRC-20");
      } // Fallback stamp<0 match (shouldn't be reachable given the checks
      // above, kept as a safety net for any other stamp<0 condition shape)
      else if (normalizedQuery.includes("st.stamp < 0")) {
        stamps = stamps.filter((s) => s.stamp < 0);
      } // SRC-721 (recursive) stamps filter: (st.ident = 'SRC-721')
      else if (normalizedQuery.includes("st.ident = 'src-721'")) {
        stamps = stamps.filter((s) => s.ident === "SRC-721");
      } // Filter by CPID if present
      else if (normalizedQuery.includes("cpid")) {
        const cpidIndex = params.findIndex((p) =>
          typeof p === "string" && p.length > 0
        );
        if (cpidIndex >= 0) {
          const cpid = params[cpidIndex];
          stamps = stamps.filter((s) => s.cpid === cpid);
        }
      } // Filter by stamp number if present
      else if (normalizedQuery.includes("stamp =")) {
        const stampIndex = params.findIndex((p) => typeof p === "number");
        if (stampIndex >= 0) {
          const stampNum = params[stampIndex];
          stamps = stamps.filter((s) => s.stamp === stampNum);
        }
      }
    }

    // Apply ORDER BY if present
    if (normalizedQuery.includes("order by")) {
      const orderByMatch = query.match(/order\s+by\s+(\w+\.)?(\w+)\s+(asc|desc)/i);
      if (orderByMatch) {
        const sortField = orderByMatch[2];
        const sortOrder = orderByMatch[3].toLowerCase();

        stamps.sort((a: any, b: any) => {
          const aVal = a[sortField];
          const bVal = b[sortField];

          // Handle numeric comparisons
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
          }

          // Handle string comparisons
          if (typeof aVal === "string" && typeof bVal === "string") {
            return sortOrder === "desc"
              ? bVal.localeCompare(aVal)
              : aVal.localeCompare(bVal);
          }

          // Handle null/undefined
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;

          return 0;
        });
      }
    }

    // Apply limit and offset for pagination
    if (normalizedQuery.includes("limit")) {
      const limitMatch = query.match(/limit\s+(\d+|\?)/i);
      if (limitMatch) {
        let limit = MAX_PAGINATION_LIMIT;
        let offset = 0;

        // Find limit parameter (usually second to last or last param)
        if (normalizedQuery.includes("offset")) {
          // Both LIMIT and OFFSET present
          limit = params[params.length - 2] as number || MAX_PAGINATION_LIMIT;
          offset = params[params.length - 1] as number || 0;
        } else {
          // Only LIMIT present
          limit = params[params.length - 1] as number || MAX_PAGINATION_LIMIT;
        }

        stamps = stamps.slice(offset, offset + limit);
      }
    }

    return { rows: stamps };
  }

  /**
   * Get stamps with market data JOIN (for queries like getStampsWithMarketData)
   */
  private getStampsWithMarketDataJoin(
    query: string,
    params: unknown[],
  ): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const stampFixtures = stampFixturesData as any;
    const marketDataFixtures = marketDataFixturesData as any;

    // Get all stamps from fixtures
    let stamps = [
      ...stampFixtures.regularStamps,
      ...stampFixtures.cursedStamps,
      ...stampFixtures.src20Stamps,
      ...stampFixtures.stampsWithMarketData,
    ];

    // Apply collection filter if present (JOIN with collection_stamps)
    if (
      normalizedQuery.includes("join collection_stamps") &&
      normalizedQuery.includes("collection_id = unhex(?)")
    ) {
      const collectionId = params[0] as string;
      const collectionFixtures = collectionFixturesData as any;
      const collectionStamps = collectionFixtures.collectionStamps || [];

      // Filter stamps that belong to this collection
      const stampNumbers = collectionStamps
        .filter((cs: any) => cs.collection_id === collectionId)
        .map((cs: any) => cs.stamp);

      stamps = stamps.filter((s) => stampNumbers.includes(s.stamp));
    }

    // Join with market data
    const stampMarketData = marketDataFixtures.stampMarketData || [];
    const results = stamps.map((stamp: any) => {
      // Find matching market data by CPID
      const marketData = stampMarketData.find((md: any) => md.cpid === stamp.cpid);

      // Combine stamp data with market data (LEFT JOIN, so market data is optional)
      return {
        ...stamp,
        // Market data fields (null if no match)
        floor_price_btc: marketData?.floor_price_btc || null,
        recent_sale_price_btc: marketData?.recent_sale_price_btc || null,
        open_dispensers_count: marketData?.open_dispensers_count || 0,
        closed_dispensers_count: marketData?.closed_dispensers_count || 0,
        total_dispensers_count: marketData?.total_dispensers_count || 0,
        holder_count: marketData?.holder_count || 0,
        unique_holder_count: marketData?.unique_holder_count || 0,
        top_holder_percentage: marketData?.top_holder_percentage || null,
        holder_distribution_score: marketData?.holder_distribution_score || null,
        volume_24h_btc: marketData?.volume_24h_btc || null,
        volume_7d_btc: marketData?.volume_7d_btc || null,
        volume_30d_btc: marketData?.volume_30d_btc || null,
        total_volume_btc: marketData?.total_volume_btc || null,
        price_source: marketData?.price_source || null,
        volume_sources: marketData?.volume_sources || null,
        data_quality_score: marketData?.data_quality_score || null,
        confidence_level: marketData?.confidence_level || null,
        market_data_last_updated: marketData?.last_updated || null,
        last_price_update: marketData?.last_price_update || null,
        update_frequency_minutes: marketData?.update_frequency_minutes || null,
        cache_age_minutes: marketData ? 5 : null, // Mock cache age
      };
    });

    // Apply ORDER BY if present
    let sortedResults = [...results];
    if (normalizedQuery.includes("order by")) {
      const orderByMatch = query.match(/order\s+by\s+st\.(\w+)\s+(asc|desc)/i);
      if (orderByMatch) {
        const sortField = orderByMatch[1];
        const sortOrder = orderByMatch[2].toLowerCase();

        sortedResults.sort((a: any, b: any) => {
          const aVal = a[sortField];
          const bVal = b[sortField];

          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
          }

          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;

          return 0;
        });
      }
    }

    // Apply LIMIT and OFFSET for pagination
    let paginatedResults = sortedResults;
    if (normalizedQuery.includes("limit")) {
      let limit = 20; // default
      let offset = 0;

      // Find limit and offset in params (usually last two params)
      if (normalizedQuery.includes("offset")) {
        limit = params[params.length - 2] as number || 20;
        offset = params[params.length - 1] as number || 0;
      } else {
        limit = params[params.length - 1] as number || 20;
      }

      paginatedResults = sortedResults.slice(offset, offset + limit);
    }

    return { rows: paginatedResults };
  }

  /**
   * Get stamp market data from fixtures
   */
  private getStampMarketData(query: string, params: unknown[]): QueryResult {
    const marketDataFixtures = marketDataFixturesData as any;
    let marketData = [...marketDataFixtures.stampMarketData];

    // Filter by CPID if present
    if (query.includes("where") && query.includes("cpid")) {
      const cpidIndex = params.findIndex((p) =>
        typeof p === "string" && p.length > 0
      );
      if (cpidIndex >= 0) {
        const cpid = params[cpidIndex];
        marketData = marketData.filter((m) => m.cpid === cpid);
      }
    }

    // Handle IN clause for bulk queries
    if (query.includes("cpid in")) {
      marketData = marketData.filter((m) => params.includes(m.cpid));
    }

    return { rows: marketData };
  }

  /**
   * Get SRC-20 market data from fixtures
   */
  private getSrc20MarketData(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const marketDataFixtures = marketDataFixturesData as any;
    let marketData = [...marketDataFixtures.src20MarketData];

    // Filter by tick if present (single tick)
    if (normalizedQuery.includes("where") && normalizedQuery.includes("tick =")) {
      const tickIndex = params.findIndex((p) => typeof p === "string");
      if (tickIndex >= 0) {
        const tick = params[tickIndex];
        marketData = marketData.filter((m) => m.tick === tick);
      }
    }

    // Filter by tick IN clause (batch queries)
    if (normalizedQuery.includes("tick in")) {
      // All params are ticks for IN clause
      const ticks = params.filter((p) => typeof p === "string");
      marketData = marketData.filter((m) => ticks.includes(m.tick));
    }

    // Filter by price > 0 (common in paginated queries)
    if (normalizedQuery.includes("price_btc > 0")) {
      marketData = marketData.filter((m) =>
        m.price_btc && parseFloat(m.price_btc) > 0
      );
    }

    // Apply ORDER BY if present
    if (normalizedQuery.includes("order by")) {
      // Check for CAST expressions in ORDER BY
      const castMatch = query.match(
        /order\s+by\s+cast\((\w+)\s+as\s+decimal\([^)]+\)\)\s+(asc|desc)/i,
      );
      const simpleMatch = query.match(/order\s+by\s+(\w+)\s+(asc|desc)/i);

      const orderMatch = castMatch || simpleMatch;
      if (orderMatch) {
        const sortField = orderMatch[1];
        const sortOrder = orderMatch[2].toLowerCase();

        marketData.sort((a: any, b: any) => {
          const aVal = parseFloat(a[sortField]) || 0;
          const bVal = parseFloat(b[sortField]) || 0;
          return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
        });
      }
    }

    // Apply LIMIT and OFFSET for pagination
    if (normalizedQuery.includes("limit")) {
      let limit = 20;
      let offset = 0;

      // Try to extract LIMIT and OFFSET from the query string first
      const limitMatch = query.match(/limit\s+(\d+)/i);
      const offsetMatch = query.match(/offset\s+(\d+)/i);

      if (limitMatch) {
        limit = parseInt(limitMatch[1]);
      } else if (normalizedQuery.includes("offset")) {
        // Both LIMIT and OFFSET present as params (last two params)
        const limitParam = params[params.length - 2];
        const offsetParam = params[params.length - 1];
        if (typeof limitParam === "number") limit = limitParam;
        if (typeof offsetParam === "number") offset = offsetParam;
      } else {
        // Only LIMIT present as param (last param)
        const limitParam = params[params.length - 1];
        if (typeof limitParam === "number") limit = limitParam;
      }

      if (offsetMatch) {
        offset = parseInt(offsetMatch[1]);
      }

      marketData = marketData.slice(offset, offset + limit);
    }

    return { rows: marketData };
  }

  /**
   * Get collection market data from fixtures
   * Returns market data keyed by collection_id_hex for the two-query pattern
   * used by getCollectionDetailsWithMarketData
   */
  private getCollectionMarketData(
    _query: string,
    params: unknown[],
  ): QueryResult {
    const collectionFixtures = collectionFixturesData as any;
    const collections = collectionFixtures.collections || [];

    // params are collection IDs passed to UNHEX(?) placeholders
    const rows = params
      .filter((p): p is string => typeof p === "string")
      .map((collectionId) => {
        const collection = collections.find(
          (c: any) => c.collection_id === collectionId,
        );
        if (collection) {
          return {
            collection_id_hex: collectionId,
            floor_price_btc: "0.001",
            avg_price_btc: "0.005",
            total_value_btc: "0.05",
            volume_24h_btc: "0.5",
            volume_7d_btc: "1.2",
            volume_30d_btc: "3.5",
            total_volume_btc: "10.0",
            total_stamps: 3,
            unique_holders: 50,
            listed_stamps: 3,
            sold_stamps_24h: 1,
            last_updated: "2024-01-01T00:00:00Z",
          };
        }
        return null;
      })
      .filter(Boolean);

    return { rows };
  }

  /**
   * Get SRC-20 data from fixtures
   */
  private getSrc20Data(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const src20Fixtures = src20FixturesData as any;

    // Handle balance queries - but only simple balance queries, not complex WITH clauses
    if (
      (normalizedQuery.includes("src20_balance") ||
        normalizedQuery.includes("from balances")) &&
      !normalizedQuery.includes("with ") && // Don't match complex WITH queries
      normalizedQuery.trim().startsWith("select") // Must be a simple SELECT
    ) {
      // Return mock balance data
      return {
        rows: [{
          address: "bc1test",
          p: "src-20",
          tick: "PEPE",
          amt: "1000000",
          block_time: "2024-01-01T00:00:00Z",
          last_update: "2024-01-01T00:00:00Z",
        }],
      };
    }

    const src20Data = src20Fixtures.src20Valid ||
      src20Fixtures.src20Transactions || [];

    // Special handling for mint progress queries (fetchSrc20MintProgress)
    if (
      normalizedQuery.includes("src20_token_stats") ||
      (normalizedQuery.includes("dep.tick") &&
        normalizedQuery.includes("dep.max") &&
        normalizedQuery.includes("dep.deci") &&
        normalizedQuery.includes("op = 'deploy'"))
    ) {
      // Get the requested tick from params
      const requestedTick = params[0] as string;

      // For mint progress queries, only return data for ticks that exist in fixtures
      // The fixture has a DEPLOY transaction with tick "!"
      if (requestedTick === "!" || requestedTick === "\\U00000021") {
        const deployTx = src20Data.find((tx: any) =>
          tx.op === "DEPLOY" && tx.tick === "!"
        );
        if (deployTx) {
          return {
            rows: [{
              max: deployTx.max || "1000000",
              deci: deployTx.deci || 18,
              lim: deployTx.lim || "1000",
              tx_hash: deployTx.tx_hash || "mock_tx_hash",
              tick: deployTx.tick, // This should be "!"
              total_minted: "500000",
              holders_count: 100,
              total_mints: 50,
            }],
          };
        }
      }

      // For any other tick (including NOPE!, undefined, etc.), return empty rows
      return { rows: [] };
    }

    // Filter based on query parameters
    let filtered = [...src20Data];

    // Apply filters based on params
    if (normalizedQuery.includes("where")) {
      // Filter by tick
      if (
        normalizedQuery.includes("tick =") ||
        normalizedQuery.includes("tick in")
      ) {
        const tickParams = params.filter((p) => typeof p === "string" // Remove length restriction to allow single character ticks like "!" and "?"
        );
        if (tickParams.length > 0) {
          filtered = filtered.filter((tx) => tickParams.includes(tx.tick));
        }
      }

      // Filter by op
      if (
        normalizedQuery.includes("op =") || normalizedQuery.includes("op in")
      ) {
        const opParams = params.filter((p) =>
          typeof p === "string" &&
          ["DEPLOY", "MINT", "TRANSFER"].includes(p as string)
        );
        if (opParams.length > 0) {
          filtered = filtered.filter((tx) => opParams.includes(tx.op));
        }
      }
    }

    // Apply limit
    if (normalizedQuery.includes("limit")) {
      const limitIndex = params.findIndex((p) =>
        typeof p === "number" && p > 0 && p < 1000
      );
      if (limitIndex >= 0) {
        const limit = params[limitIndex] as number;
        filtered = filtered.slice(0, limit);
      }
    }

    return { rows: filtered };
  }

  /**
   * Get SRC-101 data from fixtures
   */
  private getSrc101Data(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const src101Fixtures = src101FixturesData as any;

    // Handle price queries
    if (normalizedQuery.includes("src101price")) {
      const deployHash = params[0] as string;
      const prices = src101Fixtures.src101_prices || [];
      const filteredPrices = prices.filter((p: any) =>
        p.deploy_hash === deployHash
      );

      // Transform into expected result format
      const result: any = {};
      filteredPrices.forEach((row: any) => {
        result[row.len] = row.price;
      });

      return { rows: filteredPrices };
    }

    // Handle recipients queries
    if (normalizedQuery.includes("recipients")) {
      const deployHash = params[0] as string;
      const recipients = src101Fixtures.src101_recipients || [];
      const filteredRecipients = recipients.filter((r: any) =>
        r.deploy_hash === deployHash
      );
      return { rows: filteredRecipients };
    }

    // Handle owners queries
    if (normalizedQuery.includes("owners")) {
      const owners = src101Fixtures.src101_owners || [];
      let filteredOwners = [...owners];

      // Filter by owner address if present
      if (
        normalizedQuery.includes("where owner = ?") ||
        normalizedQuery.includes("owner = ?")
      ) {
        const ownerAddress = params[0] as string;
        filteredOwners = filteredOwners.filter((o: any) =>
          o.owner === ownerAddress
        );
      }

      // Filter by deploy_hash if present
      if (normalizedQuery.includes("deploy_hash = ?")) {
        // Look for the deploy hash in params - could be at any position
        let deployHash: string | undefined;

        // First check if there's a timestamp parameter (number) to skip it
        const timestampIndex = params.findIndex((p) =>
          typeof p === "number" && p > 1000000
        );

        // Find the deploy hash parameter (string that's not a timestamp)
        for (let i = 0; i < params.length; i++) {
          if (typeof params[i] === "string" && i !== timestampIndex) {
            deployHash = params[i] as string;
            break;
          }
        }

        if (deployHash) {
          filteredOwners = filteredOwners.filter((o: any) =>
            o.deploy_hash === deployHash
          );
        }
      }

      // Apply limit and offset for pagination
      if (normalizedQuery.includes("limit")) {
        const limitIndex = params.findIndex((p) =>
          typeof p === "number" && p > 0 && p < 10000
        );
        if (limitIndex >= 0) {
          const limit = params[limitIndex] as number;
          let offset = 0;

          // Check for OFFSET after LIMIT
          if (normalizedQuery.includes("offset")) {
            const offsetIndex = params.findIndex((p, idx) =>
              idx > limitIndex && typeof p === "number" && p >= 0
            );
            if (offsetIndex >= 0) {
              offset = params[offsetIndex] as number;
            }
          }

          filteredOwners = filteredOwners.slice(offset, offset + limit);
        }
      }

      // Apply ORDER BY if present
      if (normalizedQuery.includes("order by")) {
        // For SRC101 owners, typically ordered by quantity or timestamp
        if (normalizedQuery.includes("quantity")) {
          const isDesc = normalizedQuery.includes("desc");
          filteredOwners.sort((a: any, b: any) => {
            const diff = (a.quantity || 0) - (b.quantity || 0);
            return isDesc ? -diff : diff;
          });
        } else if (normalizedQuery.includes("block_time")) {
          const isDesc = normalizedQuery.includes("desc");
          filteredOwners.sort((a: any, b: any) => {
            const timeA = new Date(a.block_time || 0).getTime();
            const timeB = new Date(b.block_time || 0).getTime();
            return isDesc ? timeB - timeA : timeA - timeB;
          });
        }
      }

      return { rows: filteredOwners };
    }

    // Handle deploy details queries
    if (
      normalizedQuery.includes("where tx_hash = ?") &&
      normalizedQuery.includes("op")
    ) {
      const txHash = params[0] as string;
      const transactions = src101Fixtures.src101_transactions || [];
      const transaction = transactions.find((t: any) => t.tx_hash === txHash);

      if (transaction) {
        // Add recipients from fixtures
        const recipients = src101Fixtures.src101_recipients
          .filter((r: any) => r.deploy_hash === txHash)
          .map((r: any) => r.address);

        return {
          rows: [{
            ...transaction,
            recipients,
          }],
        };
      }
      return { rows: [] };
    }

    // Handle general transaction queries (from src101 table)
    const transactions = src101Fixtures.src101_transactions || [];
    let filteredTransactions = [...transactions];

    // Apply filters based on params
    if (normalizedQuery.includes("where")) {
      // Filter by tick
      if (
        normalizedQuery.includes("tick = ?") ||
        normalizedQuery.includes("tick collate")
      ) {
        const tickIndex = params.findIndex((p) => typeof p === "string");
        if (tickIndex >= 0) {
          const tick = params[tickIndex];
          filteredTransactions = filteredTransactions.filter((t: any) =>
            t.tick === tick
          );
        }
      }

      // Filter by op
      if (normalizedQuery.includes("op = ?")) {
        const opIndex = params.findIndex((p) =>
          typeof p === "string" &&
          ["DEPLOY", "MINT", "TRANSFER"].includes(p as string)
        );
        if (opIndex >= 0) {
          const op = params[opIndex];
          filteredTransactions = filteredTransactions.filter((t: any) =>
            t.op === op
          );
        }
      }

      // Filter by deploy_hash
      if (normalizedQuery.includes("deploy_hash = ?")) {
        const deployHashIndex = params.findIndex((p) =>
          typeof p === "string" && p.startsWith("c")
        );
        if (deployHashIndex >= 0) {
          const deployHash = params[deployHashIndex];
          filteredTransactions = filteredTransactions.filter((t: any) =>
            t.deploy_hash === deployHash
          );
        }
      }

      // Filter by block_index
      if (normalizedQuery.includes("block_index = ?")) {
        const blockIndex = params.findIndex((p) => typeof p === "number");
        if (blockIndex >= 0) {
          const block = params[blockIndex];
          filteredTransactions = filteredTransactions.filter((t: any) =>
            t.block_index === block
          );
        }
      }

      // Filter by valid status
      if (normalizedQuery.includes("status is null")) {
        filteredTransactions = filteredTransactions.filter((t: any) =>
          t.status === null
        );
      } else if (normalizedQuery.includes("status is not null")) {
        filteredTransactions = filteredTransactions.filter((t: any) =>
          t.status !== null
        );
      }
    }

    // Apply limit
    if (normalizedQuery.includes("limit")) {
      const limitIndex = params.findIndex((p) =>
        typeof p === "number" && p > 0 && p < 1000
      );
      if (limitIndex >= 0) {
        const limit = params[limitIndex] as number;
        filteredTransactions = filteredTransactions.slice(0, limit);
      }
    }

    return { rows: filteredTransactions };
  }

  /**
   * Get collection data from fixtures
   */
  private getCollectionData(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const collectionFixtures = collectionFixturesData as any;

    // Check if there's a specific mock response set for collection queries
    const mockKey = this.generateMockKey(query, params);
    if (this.mockResponses.has(mockKey)) {
      const mockResponse = this.mockResponses.get(mockKey)!;
      // Special handling for getCollectionDetails - apply post-processing
      if (
        normalizedQuery.includes("hex(c.collection_id)") && mockResponse.rows
      ) {
        return {
          ...mockResponse,
          rows: mockResponse.rows,
        };
      }
      return mockResponse;
    }

    // Handle collection by name - check this BEFORE general collection details
    if (normalizedQuery.includes("where c.collection_name = ?")) {
      const collectionName = params[0] as string;
      const collections = collectionFixtures.collections || [];

      const collection = collections.find(
        (c: any) => c.collection_name === collectionName,
      );

      if (collection) {
        const collectionCreators = collectionFixtures.collectionCreators || [];
        const collectionStamps = collectionFixtures.collectionStamps || [];

        const creators = collectionCreators
          .filter((cc: any) => cc.collection_id === collection.collection_id)
          .map((cc: any) => cc.creator_address);

        const stamps = collectionStamps
          .filter((cs: any) => cs.collection_id === collection.collection_id)
          .map((cs: any) => cs.stamp);

        // Check if this is a detailed query with HEX() and GROUP_CONCAT
        if (
          normalizedQuery.includes("hex(c.collection_id)") &&
          normalizedQuery.includes("group_concat")
        ) {
          return {
            rows: [{
              collection_id: collection.collection_id,
              collection_name: collection.collection_name,
              collection_description: collection.collection_description,
              creators: creators.join(","),
              stamp_count: stamps.length.toString(),
              stamp_numbers: stamps.join(","),
              total_editions: (stamps.length * 100).toString(),
            }],
          };
        }

        // Simple collection by name query
        return {
          rows: [{
            collection_id: collection.collection_id,
            collection_name: collection.collection_name,
            collection_description: collection.collection_description,
            creators: creators.join(","),
            stamp_count: stamps.length.toString(),
            total_editions: (stamps.length * 100).toString(),
          }],
        };
      }
      // Return empty rows for non-existent collections
      return { rows: [] };
    }

    // Handle collection details queries with joins
    if (
      normalizedQuery.includes("hex(c.collection_id)") &&
      normalizedQuery.includes("collections c")
    ) {
      const collections = collectionFixtures.collections || [];
      const collectionCreators = collectionFixtures.collectionCreators || [];
      const collectionStamps = collectionFixtures.collectionStamps || [];

      // Check if this is a market data query
      const includesMarketData =
        normalizedQuery.includes("cmd.floor_price_btc") ||
        normalizedQuery.includes("collection_market_data") ||
        normalizedQuery.includes("stamp_market_data");

      // Transform collection data with creators and stamps
      const transformedCollections = collections.map((collection: any) => {
        // Find creators for this collection
        const creators = collectionCreators
          .filter((cc: any) => cc.collection_id === collection.collection_id)
          .map((cc: any) => cc.creator_address);

        // Find stamps for this collection
        const stamps = collectionStamps
          .filter((cs: any) => cs.collection_id === collection.collection_id)
          .map((cs: any) => cs.stamp);

        const baseData = {
          collection_id: collection.collection_id,
          collection_name: collection.collection_name,
          collection_description: collection.collection_description,
          creators: creators.join(","),
          stamp_numbers: stamps.join(","),
          stamp_count: stamps.length.toString(),
          total_editions: (stamps.length * 100).toString(), // Mock total editions
        };

        // Add market data fields if query includes them
        if (includesMarketData) {
          return {
            ...baseData,
            floor_price_btc: "0.001",
            avg_price_btc: "0.005",
            total_value_btc: "0.05",
            volume_24h_btc: "0.5",
            volume_7d_btc: "1.2",
            volume_30d_btc: "3.5",
            total_volume_btc: "10.0",
            total_stamps: stamps.length,
            unique_holders: 50,
            listed_stamps: 3,
            sold_stamps_24h: 1,
            last_updated: "2024-01-01T00:00:00Z",
            created_at: "2023-01-01T00:00:00Z",
          };
        }

        return baseData;
      });

      // Apply filters
      let filteredData = transformedCollections;

      // Filter by creator if specified.
      // The creator predicate is no longer the first WHERE term — a hidden-names
      // condition precedes it and contributes its own placeholders — so match the
      // predicate alone and resolve the creator param by counting the "?"
      // placeholders that appear before it.
      const creatorPredicateIndex = normalizedQuery.indexOf(
        "cc.creator_address = ?",
      );
      if (creatorPredicateIndex !== -1) {
        const paramIndex =
          (normalizedQuery.slice(0, creatorPredicateIndex).match(/\?/g) ?? [])
            .length;
        const creatorAddress = params[paramIndex];
        if (creatorAddress) {
          filteredData = filteredData.filter((c: any) =>
            c.creators.includes(creatorAddress)
          );
        }
      }

      // Filter by minimum stamp count if HAVING clause is present
      if (normalizedQuery.includes("having count(distinct cs.stamp) >= ?")) {
        const minStampCountIndex = params.findIndex((p: any, idx: number) =>
          typeof p === "number" &&
          idx > 0 && // Skip first param if it's for creator filter
          p > 0
        );
        if (minStampCountIndex >= 0) {
          const minStampCount = params[minStampCountIndex] as number;
          filteredData = filteredData.filter((c: any) =>
            parseInt(c.stamp_count) >= minStampCount
          );
        }
      }

      // Handle pagination
      const limitMatch = normalizedQuery.match(/limit\s+\?/i);
      const offsetMatch = normalizedQuery.match(/offset\s+\?/i);
      if (limitMatch && offsetMatch) {
        const limit = params[params.length - 2] as number;
        const offset = params[params.length - 1] as number;
        filteredData = filteredData.slice(offset, offset + limit);
      }

      return { rows: filteredData };
    }

    // Handle collection names query
    if (
      normalizedQuery.includes("select") &&
      normalizedQuery.includes("collection_name")
    ) {
      const collections = collectionFixtures.collections || [];
      const names = collections.map((c: any) => ({
        collection_name: c.collection_name,
      }));

      // Handle pagination
      const limitMatch = normalizedQuery.match(/limit\s+\?/i);
      const offsetMatch = normalizedQuery.match(/offset\s+\?/i);
      if (limitMatch && offsetMatch) {
        const limit = params[params.length - 2] as number;
        const offset = params[params.length - 1] as number;
        return { rows: names.slice(offset, offset + limit) };
      }

      return { rows: names };
    }

    // Default - return all collections
    const collections = collectionFixtures.collections || [];
    return { rows: collections };
  }

  /**
   * Get creator data from fixtures
   */
  private getCreatorData(query: string, params: unknown[]): QueryResult {
    const stampFixtures = stampFixturesData as any;
    const creators = stampFixtures.creators || [];

    // Filter by address if present
    if (query.includes("where") && params.length > 0) {
      const address = params[0] as string;
      const creator = creators.find((c: any) => c.address === address);
      if (creator) {
        return { rows: [{ creator: creator.creator }] };
      }
      return { rows: [] };
    }

    return { rows: creators };
  }

  /**
   * Get block data from fixtures
   */
  private getBlockData(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();
    const blockFixtures = blockFixturesData as any;
    const blocks = blockFixtures.blocks || [];
    const stampCounts = blockFixtures.stampCounts || [];

    // Handle MAX(block_index) query for getLastBlockFromDb
    if (normalizedQuery.includes("max(block_index)")) {
      if (blocks.length > 0) {
        const maxBlockIndex = Math.max(
          ...blocks.map((b: any) => b.block_index),
        );
        return { rows: [{ last_block: maxBlockIndex }] };
      }
      return { rows: [{ last_block: null }] };
    }

    // Handle query by block index or hash for getBlockInfoFromDb
    if (normalizedQuery.includes("where")) {
      if (
        normalizedQuery.includes("block_index = ?") && params[0] !== undefined
      ) {
        const blockIndex = Number(params[0]);
        const block = blocks.find((b: any) => b.block_index === blockIndex);
        return { rows: block ? [block] : [] };
      } else if (normalizedQuery.includes("block_hash = ?") && params[0]) {
        const blockHash = params[0] as string;
        const block = blocks.find((b: any) => b.block_hash === blockHash);
        if (
          normalizedQuery.includes("select block_index") &&
          normalizedQuery.includes("from blocks") &&
          normalizedQuery.includes("limit 1")
        ) {
          // This is for _getBlockIndexByHash - returns as number[]
          return block ? [block.block_index] as any : [] as any;
        }
        return { rows: block ? [block] : [] };
      }
    }

    // Handle getLastXBlocksFromDb - ORDER BY block_index DESC LIMIT ?
    if (
      normalizedQuery.includes("order by block_index desc") &&
      normalizedQuery.includes("limit") &&
      !normalizedQuery.includes("where")
    ) {
      const limit = params[0] as number || 10;
      const sortedBlocks = [...blocks].sort((a, b) =>
        b.block_index - a.block_index
      );
      const limitedBlocks = sortedBlocks.slice(0, limit);

      // This query also includes stamp counts, so we need to add tx_count
      if (
        normalizedQuery.includes("select") &&
        normalizedQuery.includes("block_index")
      ) {
        const result = limitedBlocks.map((block: any) => {
          const stampData = stampCounts.find((sc: any) =>
            sc.block_index === block.block_index
          );
          return {
            ...block,
            tx_count: stampData ? stampData.tx_count : 0,
          };
        });
        return { rows: result };
      }

      return { rows: limitedBlocks };
    }

    // Handle getRelatedBlocksWithStampsFromDb - blocks around a specific block
    if (
      normalizedQuery.includes("where block_index >= ? - 2") &&
      normalizedQuery.includes("and block_index <= ? + 2")
    ) {
      // The params are both the same block_index, and SQL does the arithmetic
      const centerIndex = params[0] as number;
      const startIndex = centerIndex - 2;
      const endIndex = centerIndex + 2;

      const relatedBlocks = blocks.filter((b: any) =>
        b.block_index >= startIndex && b.block_index <= endIndex
      );

      // Add stamp counts if this is a stamp count query
      if (normalizedQuery.includes("count(*) as stampcount")) {
        const stampCountData = stampCounts.filter((sc: any) =>
          sc.block_index >= startIndex && sc.block_index <= endIndex
        ).map((sc: any) => ({
          block_index: sc.block_index,
          stampcount: sc.stampcount || sc.tx_count || 0,
        }));
        return { rows: stampCountData };
      }

      return { rows: relatedBlocks };
    }

    // Default - return all blocks
    return { rows: blocks };
  }

  /**
   * Handle COUNT queries across different tables
   */
  private getCountData(query: string, params: unknown[]): QueryResult {
    const normalizedQuery = query.toLowerCase();

    // SRC101 count queries
    if (
      normalizedQuery.includes("from src101") ||
      normalizedQuery.includes("src101")
    ) {
      // Filter by tick if present
      if (normalizedQuery.includes("tick")) {
        return { rows: [{ total: 3 }] }; // 3 transactions with BITNAME tick
      }
      return { rows: [{ total: 4 }] }; // Total 4 transactions
    }

    if (normalizedQuery.includes("from owners")) {
      const src101Fixtures = src101FixturesData as any;
      const owners = src101Fixtures.src101_owners || [];

      // Check if query uses AS total
      const usesAsTotal = normalizedQuery.includes("as total");

      // Filter by owner if present (check this BEFORE deploy_hash)
      if (normalizedQuery.includes("where owner = ?")) {
        const ownerAddress = params[0] as string;
        const count = owners.filter((o: any) =>
          o.owner === ownerAddress
        ).length;
        return { rows: [{ [usesAsTotal ? "total" : "COUNT(*)"]: count }] };
      }

      // Filter by deploy_hash if present
      if (normalizedQuery.includes("deploy_hash = ?")) {
        const deployHash = params[0] as string;
        const count = owners.filter((o: any) =>
          o.deploy_hash === deployHash
        ).length;
        return { rows: [{ [usesAsTotal ? "total" : "COUNT(*)"]: count }] };
      }

      return {
        rows: [{ [usesAsTotal ? "total" : "COUNT(*)"]: owners.length }],
      };
    }

    // Stamp count queries
    if (
      normalizedQuery.includes("from stamps") ||
      normalizedQuery.includes("stampstablev4") ||
      normalizedQuery.includes("stamptablev4") || // Handle both variations
      normalizedQuery.includes("from stamptablev4") // Handle exact table name with FROM
    ) {
      // Check if this is counting cursed vs regular stamps
      if (normalizedQuery.includes("stamp < 0")) {
        return { rows: [{ total: 20 }] }; // Number of cursed stamps
      } else if (normalizedQuery.includes("stamp >= 0")) {
        return { rows: [{ total: 80 }] }; // Number of regular stamps
      }
      return { rows: [{ total: 100 }] }; // Total stamps
    }

    // Collection count queries
    if (
      normalizedQuery.includes("from collections") ||
      normalizedQuery.includes("collections")
    ) {
      const collectionFixtures = collectionFixturesData as any;
      const collections = collectionFixtures.collections || [];

      // Check for creator filter
      if (normalizedQuery.includes("creator_address = ?")) {
        const creatorAddress = params[0] as string;
        const collectionCreators = collectionFixtures.collectionCreators || [];
        const creatorCollectionIds = collectionCreators
          .filter((cc: any) => cc.creator_address === creatorAddress)
          .map((cc: any) => cc.collection_id);
        const count = collections.filter((c: any) =>
          creatorCollectionIds.includes(c.collection_id)
        ).length;
        return { rows: [{ total: count }] };
      }

      return { rows: [{ total: collections.length }] };
    }

    // SRC-20 count queries
    if (
      normalizedQuery.includes("from src20valid") ||
      normalizedQuery.includes("src20valid")
    ) {
      return { rows: [{ total: 50 }] }; // Mock SRC-20 count
    }

    // Block count queries
    if (normalizedQuery.includes("from blocks")) {
      return { rows: [{ total: 20 }] }; // Mock block count
    }

    // Default count
    return { rows: [{ total: 0 }] };
  }

  /**
   * Verify that a query was called with specific parameters
   */
  verifyQueryCalled(
    queryPattern: string | RegExp,
    params?: unknown[],
  ): boolean {
    return this.queryHistory.some((entry) => {
      const query = entry.query;
      const queryParams = entry.params;

      const queryMatches = typeof queryPattern === "string"
        ? query.toLowerCase().includes(queryPattern.toLowerCase())
        : queryPattern.test(query);

      if (!queryMatches) return false;

      if (params) {
        return JSON.stringify(queryParams) === JSON.stringify(params);
      }

      return true;
    });
  }

  /**
   * Get the number of times a query pattern was called
   */
  getQueryCallCount(queryPattern: string | RegExp): number {
    return this.queryHistory.filter((entry) => {
      const query = entry.query;
      return typeof queryPattern === "string"
        ? query.toLowerCase().includes(queryPattern.toLowerCase())
        : queryPattern.test(query);
    }).length;
  }

  /**
   * Get result for INSERT/UPDATE/DELETE queries
   */
  private getMutationResult(_query: string, _params: unknown[]): QueryResult {
    // Return a successful mutation result by default
    return {
      rows: [],
      affectedRows: 1,
      insertId: 1,
    };
  }

  /**
   * Mock implementation of invalidateCacheByCategory
   * In tests, this just logs the action without doing anything
   */
  async invalidateCacheByCategory(category: string): Promise<void> {
    // Log for test verification if needed
    console.log(`[MOCK] Invalidating cache for category: ${category}`);
    return Promise.resolve();
  }

  /**
   * Mock implementation of invalidateCacheKey
   * In tests, this just logs the action without doing anything
   */
  async invalidateCacheKey(query: string, params: unknown[]): Promise<void> {
    console.log(
      `[MOCK] Invalidating cache key for query: ${query.slice(0, 50)}...`,
      params,
    );
    return Promise.resolve();
  }
}
