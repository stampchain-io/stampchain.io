import type {
  StampEdition,
  StampFilesize,
  StampFiletype,
  StampFilterType,
  StampRange,
  StampSuffixFilter
} from "$constants";
import {
  DEFAULT_CACHE_DURATION,
  IMMUTABLE_CACHE_DURATION,
  MAX_PAGINATION_LIMIT,
  STAMP_TABLE,
  STAMP_TYPES as STAMP_TYPE_CONSTANTS,
  type StampType
} from "$constants";
import { filterOptions } from "$lib/utils/data/filtering/filterOptions.ts";
import { getIdentifierType } from "$lib/utils/data/identifiers/identifierUtils.ts";
import { logger, LogNamespace } from "$lib/utils/logger.ts";
import { isCpid, isStampHash, isStampNumber, isTxHash } from "$lib/utils/typeGuards.ts";
import { serverConfig } from "$server/config/config.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import { summarize_issuances } from "$server/database/index.ts";
import type { SUBPROTOCOLS } from "$types/base.d.ts";
import type { XcpBalance } from "$types/services.d.ts";
import type { StampBalance, StampFilters } from "$types/stamp.d.ts";

export class StampRepository {
  // Dependency injection support
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  static sanitize(input: string): string {
    return input.replace(/[^\w.-]/gi, "");
  }

  private static buildIdentifierConditions(
    whereConditions: string[],
    queryParams: (string | number)[],
    identifier?: string | number | (string | number)[],
    type?: StampType,
    ident?: SUBPROTOCOLS | SUBPROTOCOLS[] | string,
    blockIdentifier?: number | string,
    collectionId?: string | string[],
    filterBy?: StampFilterType[],
    combinedFilters?: (StampSuffixFilter | StampFiletype)[],
    isSearchQuery?: boolean,
    filters?: StampFilters,
    editions?: StampEdition[],
    range?: StampRange,
    rangeMin?: string,
    rangeMax?: string,
    fileSize?: StampFilesize | null,
    fileSizeMin?: string,
    fileSizeMax?: string,
    market?: "listings" | "sales" | "",
    dispensers?: boolean,
    atomics?: boolean,
    listings?: "all" | "bargain" | "affordable" | "premium" | "custom" | "",
    listingsMin?: string,
    listingsMax?: string,
    sales?: "recent" | "premium" | "custom" | "volume" | "",
    salesMin?: string,
    salesMax?: string,
    volume?: "24h" | "7d" | "30d" | "",
    volumeMin?: string,
    volumeMax?: string
  ) {

    if (identifier !== undefined) {
      if (Array.isArray(identifier)) {
        const validIdentifiers = identifier.filter(
          (id) =>
            isStampNumber(id) || (typeof id === "string" && isTxHash(id)) || isStampHash(id) || isCpid(id)
        );

        if (validIdentifiers.length === 0) {
          whereConditions.push("1 = 0");
          return;
        }

        const numericIds = validIdentifiers.filter((id): id is number =>
          isStampNumber(id)
        );
        const txHashes = validIdentifiers.filter((id): id is string =>
          typeof id === "string" && isTxHash(id)
        );
        const stampHashes = validIdentifiers.filter((id): id is string =>
          isStampHash(id)
        );
        const cpids = validIdentifiers.filter((id): id is string => isCpid(id));

        const conditions: string[] = [];

        if (numericIds.length > 0) {
          conditions.push(
            `st.stamp IN (${numericIds.map(() => "?").join(",")})`
          );
          queryParams.push(...numericIds.map(Number));
        }

        if (txHashes.length > 0) {
          conditions.push(
            `st.tx_hash IN (${txHashes.map(() => "?").join(",")})`
          );
          queryParams.push(...txHashes);
        }

        if (stampHashes.length > 0) {
          conditions.push(
            `st.stamp_hash IN (${stampHashes.map(() => "?").join(",")})`
          );
          queryParams.push(...stampHashes);
        }

        if (cpids.length > 0) {
          conditions.push(`st.cpid IN (${cpids.map(() => "?").join(",")})`);
          queryParams.push(...cpids);
        }

        whereConditions.push(`(${conditions.join(" OR ")})`);
      } else {
        if (isStampNumber(identifier)) {
            whereConditions.push("st.stamp = ?");
            queryParams.push(Number(identifier));
        } else if (typeof identifier === "string" && isTxHash(identifier)) {
          whereConditions.push("st.tx_hash = ?");
          queryParams.push(identifier);
        } else if (isStampHash(identifier)) {
          whereConditions.push("st.stamp_hash = ?");
          queryParams.push(identifier);
        } else if (isCpid(identifier)) {
          whereConditions.push("st.cpid = ?");
          queryParams.push(identifier);
        } else {
          whereConditions.push("1 = 0");
        }
      }
    }

    // Type-based stamp condition
    let stampCondition = "";
    if (type !== "all") {
      if (type === "cursed") {
        stampCondition =
          "st.stamp < 0 AND NOT (st.cpid NOT LIKE 'A%' AND st.ident != 'SRC-20')";
      } else if (type === "stamps" && !identifier) {
        if (!isSearchQuery)
          stampCondition = "st.stamp >= 0 AND st.ident != 'SRC-20'";
      } else if (type === "posh") {
        stampCondition =
          "st.stamp < 0 AND st.cpid NOT LIKE 'A%' AND st.ident != 'SRC-20'";
      } else if (type === "classic") {
        stampCondition =
          "st.stamp >= 0 AND st.cpid LIKE 'A%' AND st.ident != 'SRC-20'";
      } else if (type === "src20") {
        stampCondition = "st.ident = 'SRC-20'";
      }
      if (stampCondition) {
        whereConditions.push(`(${stampCondition})`);
      }
    } else {
      // For 'all' type, only exclude 'SRC-20'- this messes up the api/block route
      // stampCondition = "st.ident != 'SRC-20'";
      // whereConditions.push(`(${stampCondition})`);
    }

    // Ident condition
    if (ident && ident.length > 0 && !isSearchQuery) {
      const identList = Array.isArray(ident) ? ident : [ident];
      if (identList.length > 0) {
        const identCondition = identList.map(() => "st.ident = ?").join(" OR ");
        whereConditions.push(`(${identCondition})`);
        queryParams.push(...identList.map(String));
      }
    }

    // Block identifier condition
    if (blockIdentifier !== undefined) {
      if (
        typeof blockIdentifier === "number" ||
        /^\d+$/.test(blockIdentifier)
      ) {
        whereConditions.push("st.block_index = ?");
        queryParams.push(Number(blockIdentifier));
      } else if (
        typeof blockIdentifier === "string" &&
        blockIdentifier.length === 64
      ) {
        whereConditions.push("st.block_hash = ?");
        queryParams.push(blockIdentifier);
      }
    }

    if (collectionId) {
      if (Array.isArray(collectionId)) {
        whereConditions.push(
          `cs1.collection_id IN (${collectionId
            .map(() => "UNHEX(?)")
            .join(",")})`
        );
        queryParams.push(...collectionId);
      } else {
        whereConditions.push("cs1.collection_id = UNHEX(?)");
        queryParams.push(collectionId);
      }
    }

    // Handle combined filters (both suffix and fileType filters)
    if (combinedFilters && combinedFilters.length > 0) {
      // Separate file extensions (STAMP_SUFFIX_FILTERS) from other types
      const fileExtensions = combinedFilters.filter(filter =>
        ["gif", "jpg", "png", "webp", "bmp", "jpeg", "svg", "html"].includes(filter as string)
      ) as StampSuffixFilter[];

      // Separate encoding filters (legacy/olga)
      const encodingFilters = combinedFilters.filter(filter =>
        ["legacy", "olga"].includes(filter as string)
      ) as StampFiletype[];

      // Separate edition filters
      const editionFilters = combinedFilters.filter(filter =>
        ["single", "multiple", "locked", "unlocked", "divisible"].includes(filter as string)
      ) as unknown as StampEdition[];

      // Separate other file type filters (mimetype-based)
      const mimetypeFilters = combinedFilters.filter(filter =>
        ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg", "html", "txt", "mp3", "mpeg"].includes(filter as string) &&
        !["legacy", "olga", "single", "multiple", "locked", "unlocked", "divisible"].includes(filter as string)
      ) as StampFiletype[];

      // Process file extensions (URL-based filtering)
      if (fileExtensions.length > 0) {
        const suffixCondition = fileExtensions
          .map((suffix) => `st.stamp_url LIKE '%${suffix}'`)
          .join(" OR ");
        whereConditions.push(`(${suffixCondition})`);
      }

      // Process mimetype and encoding filters
      if (mimetypeFilters.length > 0 || encodingFilters.length > 0) {
        this.buildFileTypeFilterConditions([...mimetypeFilters, ...encodingFilters], whereConditions, queryParams);
      }

      // Process edition filters
      if (editionFilters.length > 0) {
        this.buildEditionsFilterConditions(editionFilters, whereConditions, queryParams);
      }
    }

    // **FilterBy conditions**
    if (filterBy && filterBy.length > 0 && !isSearchQuery) {
      const filterConditions: string[] = [];

      filterBy.forEach((filter: any) => {
        if ((filterOptions as any)[filter]) {
          const { suffixFilters: filterSuffixes, ident: filterIdent } =
            (filterOptions as any)[filter];

          const suffixCondition =
            filterSuffixes && filterSuffixes.length > 0
              ? `(${filterSuffixes
                  .map((suffix: any) => `st.stamp_url LIKE '%${suffix}'`)
                  .join(" OR ")})`
              : "";

          const identCondition =
            filterIdent && filterIdent.length > 0
              ? `(${filterIdent.map(() => "st.ident = ?").join(" OR ")})`
              : "";

          // Add ident parameters to queryParams
          if (filterIdent && filterIdent.length > 0) {
            queryParams.push(...filterIdent.map(String));
          }

          if (suffixCondition && identCondition) {
            filterConditions.push(`(${identCondition} AND ${suffixCondition})`);
          } else if (identCondition) {
            filterConditions.push(identCondition);
          } else if (suffixCondition) {
            filterConditions.push(suffixCondition);
          }
        }
      });

      if (filterConditions.length > 0) {
        whereConditions.push(`(${filterConditions.join(" OR ")})`);
      }
    }

    // Handle new filter system if filters are provided
    if (filters) {
      this.buildFilterConditions(filters, whereConditions, queryParams);
    }

    // Handle edition filters if not using the full filters object
    if (editions && editions.length > 0 && !filters) {
      this.buildEditionsFilterConditions(editions, whereConditions, queryParams);
    }

    // Handle range filters
    if (range) {
      this.buildRangeFilterConditions(
        range,
        whereConditions,
        queryParams,
        rangeMin,
        rangeMax
      );
    }

    // Handle file size filters
    if (fileSize || fileSizeMin || fileSizeMax) {
      this.buildFileSizeFilterConditions(
        fileSize,
        whereConditions,
        queryParams,
        fileSizeMin,
        fileSizeMax
      );
    }

    // Handle market place filters
    if (market || dispensers || atomics || listings || sales) {
      this.buildMarketplaceFilterConditions(
        market,
        whereConditions,
        queryParams,
        dispensers,
        atomics,
        listings,
        listingsMin,
        listingsMax,
        sales,
        salesMin,
        salesMax,
        volume,
        volumeMin,
        volumeMax
      );
    }
  }

  static async getTotalStampCountFromDb(options: {
    type?: StampType;
    ident?: SUBPROTOCOLS | SUBPROTOCOLS[] | string;
    identifier?: string | number | (string | number)[];
    blockIdentifier?: number | string;
    collectionId?: string | string[];
    filterBy?: StampFilterType[];
    suffix?: StampSuffixFilter[];
    fileType?: StampFiletype[];
    creatorAddress?: string;
  }) {
    const {
      type = STAMP_TYPE_CONSTANTS.STAMPS,
      ident,
      identifier,
      blockIdentifier,
      collectionId,
      filterBy,
      suffix = [],
      fileType = [],
      creatorAddress,
    } = options;

    // Combine filters
    const combinedFilters = [...suffix, ...fileType];

    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    this.buildIdentifierConditions(
      whereConditions,
      queryParams,
      identifier,
      type,
      ident,
      blockIdentifier,
      collectionId,
      filterBy,
      combinedFilters,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );

    if (creatorAddress) {
      whereConditions.push("st.creator = ?");
      queryParams.push(creatorAddress);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Build join clause
    let joinClause = `
      LEFT JOIN creator AS cr ON st.creator = cr.address
    `;

    // Include collection_stamps join only if collectionId is provided
    if (collectionId) {
      joinClause = `
        JOIN collection_stamps cs1 ON st.stamp = cs1.stamp
        ${joinClause}
      `;
    }

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM ${STAMP_TABLE} AS st
      ${joinClause}
      ${whereClause}
    `;

    const resultTotal = await this.db.executeQueryWithCache(
      queryTotal,
      queryParams,
      60 * 3 // 3 minute cache in seconds
    );

    return resultTotal;
  }

  /**
   * Retrieves the total stamp balance for a given address using the provided database client.
   *
   * @param client - The database client to use for the query.
   * @param address - The address for which to retrieve the stamp balance.
   * @returns A promise that resolves to the total stamp balance.
   * @throws If there is an error retrieving the balances.
   */
  static async getCountStampBalancesByAddressFromDb(
    _address: string,
    xcpBalances: XcpBalance[]
  ) {
    try {
      const assets = xcpBalances.map((balance) => balance.cpid);
      if (assets.length === 0) {
        return {
          rows: [{ total: 0 }],
        };
      }

      console.log(
        `[StampRepository] Counting total stamps for ${assets.length} assets`
      );

      const query = `
        SELECT COUNT(*) AS total
        FROM ${STAMP_TABLE} st
        LEFT JOIN creator cr ON st.creator = cr.address
        WHERE st.cpid IN (${assets.map(() => "?").join(",")})
      `;

      const result = await this.db.executeQueryWithCache(
        query,
        assets,
        DEFAULT_CACHE_DURATION
      );

      console.log(
        `[StampRepository] Total count query returned: ${(result as any).rows[0]?.total}`
      );
      return result;
    } catch (error) {
      console.error("Error getting balance count:", error);
      return { rows: [{ total: 0 }] };
    }
  }

  /**
   * Get stamp file with content for server-side processing
   */
  static async getStampFileWithContent(identifier: string): Promise<{
    stamp_base64: string | null;
    stamp_url: string;
    tx_hash: string;
    stamp_mimetype: string;
    cpid: string;
  } | null> {
    const sanitizedIdentifier = this.sanitize(identifier);
    const idType = getIdentifierType(sanitizedIdentifier);

    let whereClause: string;
    let params: string[];

    switch (idType) {
      case "stamp_number":
        whereClause = "stamp = ?";
        params = [sanitizedIdentifier];
        break;
      case "tx_hash":
        whereClause = "tx_hash = ?";
        params = [sanitizedIdentifier];
        break;
      case "stamp_hash":
        whereClause = "stamp_hash = ?";
        params = [sanitizedIdentifier];
        break;
      case "cpid":
        whereClause = "cpid = ?";
        params = [sanitizedIdentifier];
        break;
      default:
        return null;
    }

    const query = `
      SELECT stamp_url, stamp_mimetype, stamp_base64, cpid, tx_hash
      FROM ${STAMP_TABLE}
      WHERE ${whereClause}
      LIMIT 1
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      params,
      IMMUTABLE_CACHE_DURATION // Individual stamp data is immutable - invalidated on block reorg
    );

    if (!(result as any)?.rows?.length) {
      return null;
    }

    const row = (result as any).rows[0];
    return {
      stamp_base64: row.stamp_base64 || null,
      stamp_url: row.stamp_url || '',
      stamp_mimetype: row.stamp_mimetype || '',
      cpid: row.cpid || '',
      tx_hash: row.tx_hash || ''
    };
  }

  static async getStampFile(identifier: string) {
    const sanitizedIdentifier = this.sanitize(identifier);
    const idType = getIdentifierType(sanitizedIdentifier);

    await logger.debug("content" as LogNamespace, {
      message: "StampRepository.getStampFile called",
      identifier,
      sanitizedIdentifier,
      idType,
    });

    // Build query based on identifier type
    let whereClause: string;
    let params: string[];

    switch (idType) {
      case "cpid":
        whereClause = "cpid = ?";
        params = [sanitizedIdentifier];
        break;

      case "stamp_number":
        whereClause = "stamp = ?";
        params = [sanitizedIdentifier];
        break;

      case "tx_hash":
        whereClause = "tx_hash = ?";
        params = [sanitizedIdentifier];
        break;

      case "stamp_hash":
        whereClause = "stamp_hash = ?";
        params = [sanitizedIdentifier];
        break;

      default:
        return null;
    }

    const query = `
      SELECT
        tx_hash,
        stamp_hash,
        stamp_mimetype,
        cpid,
        stamp_base64,
        stamp_url,
        stamp
      FROM ${STAMP_TABLE}
      WHERE ${whereClause}
      AND stamp IS NOT NULL
      LIMIT 1;
    `;

    try {
      await logger.debug("content" as LogNamespace, {
        message: "StampRepository executing query",
        query,
        params,
        whereClause,
      });

      const data = await this.db.executeQueryWithCache(
        query,
        params,
        DEFAULT_CACHE_DURATION
      );

      await logger.debug("content" as LogNamespace, {
        message: "StampRepository query result",
        hasData: !!(data as any)?.rows?.length,
        cpid: (data as any)?.rows?.[0]?.cpid,
        mimetype: (data as any)?.rows?.[0]?.stamp_mimetype,
        identifier,
      });

      if (!(data as any)?.rows?.length) {
        return null;
      }

      const row = (data as any).rows[0];

      // Build filename from tx_hash and stamp_url if available
      const suffix = row.stamp_url ? row.stamp_url.split(".").pop() : null;
      const fileName = suffix ? `${row.tx_hash}.${suffix}` : row.tx_hash;

      // Clean stamp_url to be relative path
      const cleanStampUrl = row.stamp_url
        ?.replace(/^https?:\/\/[^\/]+\/stamps\//, "") // Remove domain and /stamps/
        ?.replace(/^stamps\//, ""); // Also remove any standalone /stamps/ prefix

      await logger.debug("content" as LogNamespace, {
        message: "StampRepository processing URLs",
        originalUrl: row.stamp_url,
        cleanUrl: cleanStampUrl,
        fileName,
        suffix,
      });

      return {
        fileName,
        stamp_base64: row.stamp_base64,
        stamp_url: cleanStampUrl, // Store relative path
        tx_hash: row.tx_hash,
        stamp_mimetype: row.stamp_mimetype,
        stamp_hash: row.stamp_hash,
        cpid: row.cpid,
        stamp: row.stamp,
      };
    } catch (error) {
      await logger.error("content" as LogNamespace, {
        message: "StampRepository error",
        error: error instanceof Error ? error.message : String(error),
        identifier,
      });
      throw error;
    }
  }

  static async getStamps(options: {
    limit?: number;
    page?: number;
    sortBy?: "ASC" | "DESC";
    type?: StampType;
    ident?: SUBPROTOCOLS | SUBPROTOCOLS[] | string;
    identifier?: string | number | (string | number)[];
    blockIdentifier?: number | string;
    allColumns?: boolean;
    noPagination?: boolean;
    cacheDuration?: number | "never";
    collectionId?: string | string[];
    sortColumn?: string;
    groupBy?: string;
    groupBySubquery?: boolean;
    collectionStampLimit?: number;
    skipTotalCount?: boolean;
    selectColumns?: string[];
    includeSecondary?: boolean;
    creatorAddress?: string;
    isSearchQuery?: boolean;
    filters?: StampFilters;
    filterBy?: StampFilterType[];
    suffix?: StampSuffixFilter[];
    fileType?: StampFiletype[];
    editions?: StampEdition[];
    range?: StampRange;
    rangeMin?: string;
    rangeMax?: string;
    market?: "listings" | "sales" | "";
    dispensers?: boolean;
    atomics?: boolean;
    listings?: "all" | "bargain" | "affordable" | "premium" | "custom" | "";
    listingsMin?: string;
    listingsMax?: string;
    sales?: "recent" | "premium" | "custom" | "volume" | "";
    salesMin?: string;
    salesMax?: string;
    volume?: "24h" | "7d" | "30d" | "";
    volumeMin?: string;
    volumeMax?: string;
    fileSize?: StampFilesize | null;
    fileSizeMin?: string;
    fileSizeMax?: string;
    search?: string;
    cpidPrefix?: string;
    addressPrefix?: string;
    txHashPrefix?: string;
    stampNumberPrefix?: string;
    excludeSrc20?: boolean;
    excludeSrc101?: boolean;
  }) {
    // Extract all parameters including both filter types
    const {
      limit = MAX_PAGINATION_LIMIT,
      page = 0,
      sortBy = "DESC",
      type,
      ident,
      identifier,
      blockIdentifier,
      allColumns = false,
      noPagination = false,
      cacheDuration = 60 * 5, // Default 5 minute cache in seconds (increased from 3)
      collectionId,
      sortColumn = "block_index",
      groupBy,
      groupBySubquery = false,
      collectionStampLimit,
      skipTotalCount = false,
      selectColumns,
      includeSecondary = false,
      creatorAddress,
      isSearchQuery = false,
      filters,
      filterBy = [],
      suffix = [],
      fileType = [],
      editions = [],
      range,
      rangeMin,
      rangeMax,
      market: _market,
      dispensers: _dispensers,
      atomics: _atomics,
      listings: _listings,
      listingsMin: _listingsMin,
      listingsMax: _listingsMax,
      sales: _sales,
      salesMin: _salesMin,
      salesMax: _salesMax,
      volume: _volume,
      volumeMin: _volumeMin,
      volumeMax: _volumeMax,
      fileSize: _fileSize,
      fileSizeMin: _fileSizeMin,
      fileSizeMax: _fileSizeMax,
      search,
      cpidPrefix,
      addressPrefix,
      txHashPrefix,
      stampNumberPrefix,
      excludeSrc20 = false,
      excludeSrc101 = false,
    } = options;

    // Combine both filter types for processing
    const combinedFilters = [...suffix, ...fileType];

    // Rest of the method remains the same, but use combinedFilters instead
    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    this.buildIdentifierConditions(
      whereConditions,
      queryParams,
      identifier,
      type,
      ident,
      blockIdentifier,
      collectionId,
      filterBy,
      combinedFilters,
      isSearchQuery,
      filters,
      editions,
      range,
      rangeMin,
      rangeMax,
      _fileSize,
      _fileSizeMin,
      _fileSizeMax,
      _market,
      _dispensers,
      _atomics,
      _listings,
      _listingsMin,
      _listingsMax,
      _sales,
      _salesMin,
      _salesMax,
      _volume,
      _volumeMin,
      _volumeMax
    );

    if (creatorAddress) {
      whereConditions.push("st.creator = ?");
      queryParams.push(creatorAddress);
    }

    // Free-text search across cpid, creator, tx_hash
    if (search) {
      this.buildSearchConditions(
        search,
        whereConditions,
        queryParams,
      );
    }

    // CPID prefix search (cpid column only)
    if (cpidPrefix) {
      whereConditions.push("st.cpid LIKE ?");
      queryParams.push(`${cpidPrefix}%`);
    }

    // Stamp number prefix search (string prefix match on stamp column)
    if (stampNumberPrefix) {
      whereConditions.push("CAST(st.stamp AS CHAR) LIKE ?");
      queryParams.push(`${stampNumberPrefix}%`);
    }

    // Address prefix search (creator column only)
    if (addressPrefix) {
      whereConditions.push("st.creator LIKE ?");
      queryParams.push(`${addressPrefix}%`);
    }

    // Tx hash prefix search (tx_hash column only)
    if (txHashPrefix) {
      whereConditions.push("st.tx_hash LIKE ?");
      queryParams.push(`${txHashPrefix}%`);
    }

    // Exclude SRC-20 entries (used by stamp search endpoint)
    if (excludeSrc20) {
      whereConditions.push("st.ident != 'SRC-20'");
    }

    // Exclude SRC-101 entries (used by stamp search endpoint)
    if (excludeSrc101) {
      whereConditions.push("st.ident != 'SRC-101'");
    }

    // Use either the object or direct parameters
    let effectiveRange = range;

    // If no range but direct parameters are provided, use those
    if (!effectiveRange && (rangeMin || rangeMax)) {
      effectiveRange = {
        sub: "stamp range",
        stampRange: {
          min: rangeMin || "",
          max: rangeMax || ""
        }
              } as unknown as StampRange;
      console.log("Repository created range filters:", effectiveRange);
    }

    // Core stamp fields that are always needed
    const coreColumns = `
      st.stamp,
      st.block_index,
      st.cpid,
      st.creator,
      cr.creator AS creator_name,
      st.divisible,
      st.keyburn,
      st.locked,
      st.stamp_url,
      st.stamp_mimetype,
      st.supply,
      st.block_time,
      st.tx_hash,
      st.tx_index,
      st.ident,
      st.stamp_hash,
      st.file_hash,
      st.file_size_bytes
    `;

    const secondaryColumns = `
      st.stamp_base64

    `;
    // Extended fields for full stamp details
    const extendedColumns = `
      st.asset_longname,
      st.message_index,
      st.src_data,
      st.is_btc_stamp,
      st.is_reissue,
      st.is_valid_base64
    `;

    // Select either custom columns, or core+extended columns, or just core columns
    let selectClause = selectColumns
      ? `st.${selectColumns.join(", st.")}` // Only selected columns if specified
      : allColumns
      ? `${coreColumns}, ${secondaryColumns}, ${extendedColumns}` // All columns including secondary
      : includeSecondary
      ? `${coreColumns}, ${secondaryColumns}` // Core + secondary columns
      : coreColumns; // Just core columns by default

    // Only include collection_id in select clause if collectionId is provided
    if (collectionId) {
      selectClause += `,
      HEX(cs1.collection_id) AS collection_id`;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const order = sortBy.toUpperCase() === "DESC" ? "DESC" : "ASC";
    const orderClause = `ORDER BY st.${sortColumn} ${order}`;

    let limitClause = "";
    let offsetClause = "";

    if (!noPagination) {
      limitClause = `LIMIT ?`;
      const offset = Math.max(0, (page - 1) * limit);
      offsetClause = `OFFSET ?`;
      queryParams.push(limit, offset);
    }

    // Check if any market data filters are present (Task 42)
    const hasMarketDataFilters = !!(
      filters?.minHolderCount ||
      filters?.maxHolderCount ||
      filters?.minDistributionScore ||
      filters?.maxTopHolderPercentage ||
      filters?.minFloorPriceBTC ||
      filters?.maxFloorPriceBTC ||
      filters?.minVolume24h ||
      filters?.minPriceChange24h ||
      filters?.minDataQualityScore ||
      filters?.maxCacheAgeMinutes ||
      filters?.priceSource
    );

    // Build join clause
    let joinClause = `
      LEFT JOIN creator AS cr ON st.creator = cr.address
    `;

    // Add market data join if needed
    if (hasMarketDataFilters) {
      joinClause += `
        LEFT JOIN stamp_market_data smd ON st.cpid = smd.cpid
      `;
    }

    // Add marketplace joins if needed (for listings/sales filters)
    // Note: Dispensers are tracked via stamp_market_data.open_dispensers_count
    // Sales history is in stamp_sales table
    const hasListingsFilter = _market === "listings" || _dispensers || _listings;
    const hasSalesFilter = _market === "sales" || _sales || _volume;

    if (hasListingsFilter || hasSalesFilter) {
      // Join with stamp_market_data for dispenser counts and pricing
      if (!hasMarketDataFilters) { // Only add if not already joined
        joinClause += `
          LEFT JOIN stamp_market_data smd ON st.cpid = smd.cpid
        `;
      }
    }

    if (hasSalesFilter) {
      // Use stamp_sales_history table (same as recent sales component)
      joinClause += `
        LEFT JOIN stamp_sales_history ss ON st.cpid = ss.cpid
      `;
    }

    // Include collection_stamps join only if collectionId is provided
    if (collectionId) {
      // Add warning if collection query is missing required parameters
      if (!groupBy || groupBy !== "collection_id" || !groupBySubquery) {
        console.warn(
          "Warning: Collection query missing required parameters. For optimal collection querying, use groupBy: 'collection_id' and groupBySubquery: true"
        );
      }

      joinClause = `
        JOIN collection_stamps cs1 ON st.stamp = cs1.stamp
        LEFT JOIN creator AS cr ON st.creator = cr.address
      `;

      // Add market data join if needed for collections
      if (hasMarketDataFilters) {
        joinClause += `
          LEFT JOIN stamp_market_data smd ON st.cpid = smd.cpid
        `;
      }
    }

    let groupByClause = "";
    if (groupBy) {
      groupByClause = `GROUP BY ${groupBy}`;
    }

    let query = ""; // Declare query variable

    if (collectionId && groupBy === "collection_id") {
      // Handle single collection case differently from multiple collections
      if (!Array.isArray(collectionId)) {
        // Simple query for single collection with standard pagination
        query = `
          SELECT ${selectClause}
          FROM ${STAMP_TABLE} AS st
          ${joinClause}
          ${whereClause}
          ${orderClause}
          ${limitClause}
          ${offsetClause}
        `;
      } else {
        // Complex query for multiple collections with per-collection limits
        const subQuery = `
          WITH ValidStamps AS (
            SELECT
              ${coreColumns},
              HEX(cs1.collection_id) as collection_id,
              ROW_NUMBER() OVER (
                PARTITION BY cs1.collection_id
                ORDER BY st.${sortColumn} ${order}
              ) as rn
            FROM ${STAMP_TABLE} st
            ${joinClause}
            WHERE cs1.collection_id IN (${collectionId
              .map(() => "UNHEX(?)")
              .join(",")})
              AND (
                st.stamp_url IS NOT NULL
                AND st.stamp_url != ''
                AND st.stamp_url NOT LIKE '%undefined%'
                AND st.stamp_url NOT LIKE '%null%'
                AND st.stamp_mimetype IS NOT NULL
              )
          )
        `;

        // Main query with pagination
        query = `
          ${subQuery}
          SELECT *
          FROM ValidStamps ranked_stamps
          WHERE rn <= ${collectionStampLimit || 12}
          ORDER BY ${sortColumn} ${order}
          LIMIT ? OFFSET ?
        `;

        // Add parameters for multiple collections
        queryParams.push(...collectionId);
      }
    } else {
      // Standard query for non-collection cases
      // Add DISTINCT when joining with stamp_sales to avoid duplicates
      const selectPrefix = hasSalesFilter ? "DISTINCT " : "";
      query = `
        SELECT ${selectPrefix}${selectClause}
        FROM ${STAMP_TABLE} AS st
        ${joinClause}
        ${whereClause}
        ${groupByClause}
        ${orderClause}
        ${limitClause}
        ${offsetClause}
      `;
    }

    // Near the end of the getStamps method, right before executing the query
    if (serverConfig.DEBUG_SQL || serverConfig.IS_DEVELOPMENT) {
      logger.debug("sql", { message: `[SQL DEBUG] Final SQL query: ${query}` });
      logger.debug("sql", { message: `[SQL DEBUG] With parameters: ${queryParams}` });
    }

    // Execute the data query
    const dataResult = await this.db.executeQueryWithCache(
      query,
      queryParams,
      cacheDuration
    );

    // Get total count only if needed
    let total = 0;
    let totalPages = 1;

    if (!skipTotalCount) {
      const totalResult = await this.getTotalStampCountFromDb({
        ...(type && { type }),
        ...(ident && { ident }),
        ...(identifier && { identifier }),
        ...(blockIdentifier && { blockIdentifier }),
        ...(collectionId && { collectionId }),
        ...(filterBy && { filterBy }),
        ...(suffix && { suffix }),
        ...(fileType && { fileType }),
      });
      total = (totalResult as any).rows[0]?.total || 0;
      totalPages = noPagination ? 1 : Math.ceil(total / limit);
    }

    return {
      stamps: (dataResult as any).rows,
      page,
      page_size: limit,
      pages: totalPages,
      total,
    };
  }
  /**
   * Retrieves stamp balances for a given address using a database client.
   *
   * @param client - The database client to use for the query.
   * @param address - The address for which to retrieve stamp balances.
   * @param limit - The maximum number of stamp balances to retrieve. Default is SMALL_LIMIT.
   * @param page - The page number of stamp balances to retrieve. Default is 1.
   * @param order - The order in which to retrieve the stamp balances. Default is "DESC".
   * @returns An array of summarized stamp balances for the given address.
   */
  static async getStampBalancesByAddress(
    _address: string,
    limit: number,
    page: number,
    xcpBalances: XcpBalance[],
    order = "DESC"
  ): Promise<StampBalance[]> {
    try {
      const assets = xcpBalances.map((balance) => balance.cpid);
      if (assets.length === 0) return [];

      const offset = (page - 1) * limit;
      console.log(
        `[StampRepository] Fetching stamps with limit: ${limit}, offset: ${offset}`
      );

      const query = `
        SELECT
          st.stamp,
          st.tx_hash,
          st.cpid,
          st.stamp_url,
          st.stamp_mimetype,
          st.divisible,
          st.supply,
          st.locked,
          st.creator,
          cr.creator AS creator_name
        FROM ${STAMP_TABLE} st
        LEFT JOIN creator cr ON st.creator = cr.address
        WHERE st.cpid IN (${assets.map(() => "?").join(",")})
        ORDER BY st.stamp ${order}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const balances = await this.db.executeQueryWithCache(
        query,
        assets,
        DEFAULT_CACHE_DURATION
      );

      console.log(
        `[StampRepository] Query returned ${(balances as any).rows.length} rows of ${assets.length} total stamps`
      );

      const grouped = (balances as any).rows.reduce(
        (acc: Record<string, StampBalance[]>, cur: StampBalance) => {
          acc[cur.cpid] = acc[cur.cpid] || [];
          acc[cur.cpid].push({ ...cur });
          return acc;
        },
        {}
      );

      const summarized = Object.keys(grouped).map((key) =>
        summarize_issuances(grouped[key])
      );
      // Use the passed xcpBalances for quantity info
      return summarized.map((summary: any) => {
        const xcp_balance = xcpBalances
          .filter((balance) => balance.cpid === summary.cpid)
          .reduce((acc, balance) => acc + balance.quantity, 0);
        const utxos = xcpBalances
          .filter(
            (balance) => balance.cpid === summary.cpid && balance.utxo
          )
          .map((balance) => ({
            quantity: balance.quantity,
            utxo: balance.utxo,
          }));
        const unbound_quantity = xcpBalances
          .filter(
            (balance) => balance.cpid === summary.cpid && !balance.utxo
          )
          .reduce((total, balance) => total + (balance.quantity || 0), 0);
        return {
          ...summary,
          unbound_quantity,
          address: xcpBalances.length ? xcpBalances[0].address : "",
          balance: xcp_balance ? xcp_balance : 0,
          utxos,
        };
      });
    } catch (error) {
      console.error("Error getting balances:", error);
      return [];
    }
  }

  static async getALLCPIDs(cacheDuration: number | "never" = 60 * 5) {  // 5 minutes (was 3)
    const query = `
      SELECT DISTINCT cpid, stamp
      FROM ${STAMP_TABLE}
      WHERE ident != 'SRC-20'
      ORDER BY cpid ASC
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [],
      cacheDuration
    );

    console.log(`Query result:`, (result as any).rows);

    return (result as any).rows;
  }

  static async getCreatorNameByAddress(
    address: string
  ): Promise<string | null> {
    const query = `
      SELECT creator
      FROM creator
      WHERE address = ?
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [address],
      604800 // 1 week cache (7 days), will be invalidated on updates
    );

    if ((result as any) && (result as any).rows && (result as any).rows.length > 0) {
      return (result as any).rows[0].creator;
    }

    return null;
  }

  static async updateCreatorName(
    address: string,
    newName: string
  ): Promise<boolean> {
    const query = `
      INSERT INTO creator (address, creator)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE creator = ?
    `;

    try {
      const result = await this.db.executeQuery(query, [
        address,
        newName,
        newName,
      ]);

      // Invalidate creator cache after successful update
      if ((result as any).affectedRows > 0) {
        console.log(`[CACHE] Invalidating creator cache after update for address: ${address}`);
        await this.db.invalidateCacheByCategory('creator');
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating creator name:", error);
      return false;
    }
  }

  static async countTotalStamps(): Promise<{
    isValid: boolean;
    count: number;
  }> {
    try {
      const result = await this.getTotalStampCountFromDb({
        type: "all" as StampType,
      });
      // If we can't get a count or it's 0, that indicates a database problem
      if (!(result as any)?.rows?.[0]?.total) {
        throw new Error("No stamps found in database");
      }
      const total = (result as any).rows[0].total;
      return {
        isValid: true,
        count: total,
      };
    } catch (error) {
      console.error("Database connection check failed:", error);
      return {
        isValid: false,
        count: 0,
      };
    }
  }

  static async getStampsCreatedCount(address: string): Promise<{ total: number }> {
    const query = `
      SELECT COUNT(DISTINCT st.stamp) as total
      FROM ${STAMP_TABLE} st
      WHERE st.creator = ?
      AND st.ident IN ('STAMP', 'SRC-721')
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [address],
      60 * 3 // 3 minute cache in seconds
    );

    return {
      total: (result as any).rows[0]?.total || 0
    };
  }

  static async getSpecificStamp(identifier: string): Promise<{
    stamp: number | undefined,
    stamp_url: string,
    stamp_mimetype: string
  }>{
    // Determine the type of identifier
    const idType = getIdentifierType(identifier);

    let whereClause: string;
    let params: (string | number)[];

    switch (idType) {
      case "stamp_number":
        whereClause = "stamp = ?";
        params = [Number(identifier)];
        break;
      case "tx_hash":
        whereClause = "tx_hash = ?";
        params = [identifier];
        break;
      case "stamp_hash":
        whereClause = "stamp_hash = ?";
        params = [identifier];
        break;
      case "cpid":
        whereClause = "cpid = ?";
        params = [identifier];
        break;
      default:
        // Return empty result for invalid identifiers
        return {
          stamp: undefined,
          stamp_url: '',
          stamp_mimetype: ''
        };
    }

    const query = `
      SELECT stamp, stamp_url, stamp_mimetype, stamp_base64, cpid, tx_hash
      FROM ${STAMP_TABLE}
      WHERE ${whereClause}
      LIMIT 1
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      params,
      DEFAULT_CACHE_DURATION
    );

    return {
      stamp: (result as any).rows[0]?.stamp,
      stamp_url: (result as any).rows[0]?.stamp_url || '',
      stamp_mimetype: (result as any).rows[0]?.stamp_mimetype || ''
    };
  }

  /**
   * Get stamps with recent sales activity using market data cache
   * Replaces the need to fetch all dispense events from XCP API
   */
  static async getRecentlyActiveSold({
    page = 1,
    limit = 50,
    includeMarketData = true,
    type = STAMP_TYPE_CONSTANTS.ALL
  }: {
    page?: number;
    limit?: number;
    includeMarketData?: boolean;
    type?: StampType;
  }): Promise<{ stamps: import("$lib/types/stamp.d.ts").StampRow[], total: number }> {
    const offset = (page - 1) * limit;

    // Build type-based filtering condition
    let typeCondition = "";
    if (type !== STAMP_TYPE_CONSTANTS.ALL) {
      if (type === STAMP_TYPE_CONSTANTS.CURSED) {
        typeCondition =
          "AND s.stamp < 0 AND NOT (s.cpid NOT LIKE 'A%' AND s.ident != 'SRC-20')";
      } else if (type === STAMP_TYPE_CONSTANTS.CLASSIC) {
        typeCondition = "AND s.stamp >= 0 AND s.cpid LIKE 'A%' AND s.ident != 'SRC-20'";
      } else if (type === STAMP_TYPE_CONSTANTS.STAMPS) {
        typeCondition = "AND s.stamp >= 0 AND s.ident != 'SRC-20'";
      } else if (type === STAMP_TYPE_CONSTANTS.POSH) {
        typeCondition = "AND s.stamp < 0 AND s.cpid NOT LIKE 'A%' AND s.ident != 'SRC-20'";
      } else if (type === STAMP_TYPE_CONSTANTS.SRC20) {
        typeCondition = "AND s.ident = 'SRC-20'";
      }
    }

    // Use stamp_sales_history as primary source for recent sales
    const salesHistoryQuery = `
      SELECT DISTINCT
        s.stamp,
        s.cpid,
        s.stamp_url,
        s.stamp_mimetype,
        s.creator,
        s.tx_hash,
        s.block_index,
        s.block_time,
        s.ident,
        s.supply,
        s.divisible,
        s.locked,
        ${includeMarketData ? `
        -- Sales data from stamp_sales_history
        ssh.btc_amount,
        ssh.unit_price_sats,
        ssh.quantity,
        ssh.buyer_address,
        ssh.seller_address,
        ssh.block_time as sale_time,
        ssh.tx_hash as sale_tx_hash,
        ssh.block_index as sale_block_index,
        -- Market data fields (optional)
        smd.floor_price_btc,
        smd.volume_24h_btc,
        smd.volume_7d_btc,
        smd.holder_count,
        smd.data_quality_score
        ` : ''}
      FROM ${STAMP_TABLE} s
      INNER JOIN stamp_sales_history ssh ON s.cpid = ssh.cpid
      LEFT JOIN stamp_market_data smd ON s.cpid = smd.cpid
      WHERE
        -- Must have actual sale data
        ssh.btc_amount > 0
        AND ssh.unit_price_sats > 0
        ${typeCondition}
      ORDER BY
        ssh.block_time DESC
      LIMIT ? OFFSET ?
    `;

    const salesHistoryCountQuery = `
      SELECT COUNT(DISTINCT s.cpid) as total
      FROM ${STAMP_TABLE} s
      INNER JOIN stamp_sales_history ssh ON s.cpid = ssh.cpid
      WHERE
        ssh.btc_amount > 0
        AND ssh.unit_price_sats > 0
        ${typeCondition}
    `;

    try {
      // Execute queries sequentially to avoid connection pool exhaustion
      // This prevents the connection leak that occurs when multiple queries run in parallel
      const result = await this.db.executeQueryWithCache(salesHistoryQuery, [limit, offset], 300); // 5 minute cache (was 60s)
      const countResult = await this.db.executeQueryWithCache(salesHistoryCountQuery, [], 600); // 10 minute cache for count (was 300s)

      const stamps = (result as any).rows || [];
      const total = (countResult as any).rows[0]?.total || 0;

      // If we have data from sales history, use it
      if (stamps.length > 0) {
        // 🔧 PRODUCTION: Remove verbose debug logging
        // Only log in development environment
        if (serverConfig.IS_DEVELOPMENT) {
          console.log(`[RECENT SALES] Using stamp_sales_history: ${stamps.length} stamps found`);
        }

        const transformedStamps = stamps.map((row: any) => {
          const stamp = {
            stamp: row.stamp,
            cpid: row.cpid,
            stamp_url: row.stamp_url,
            stamp_mimetype: row.stamp_mimetype,
            creator: row.creator,
            tx_hash: row.tx_hash,
            block_index: row.block_index,
            block_time: row.block_time,
            ident: row.ident,
            supply: row.supply,
            divisible: row.divisible,
            locked: row.locked
          };

          if (includeMarketData) {
            return {
              ...stamp,
              marketData: {
                recentSalePriceBTC: row.unit_price_sats ? parseFloat(row.unit_price_sats) / 100000000 : null, // Convert sats to BTC
                floorPriceBTC: row.floor_price_btc ? parseFloat(row.floor_price_btc) : null,
                volume24hBTC: row.volume_24h_btc ? parseFloat(row.volume_24h_btc) : null,
                volume7dBTC: row.volume_7d_btc ? parseFloat(row.volume_7d_btc) : null,
                holderCount: row.holder_count || 0,
                lastPriceUpdate: row.sale_time ? new Date(row.sale_time * 1000) : null, // Convert unix timestamp
                dataQualityScore: row.data_quality_score || 0,
                minutesSinceSale: row.sale_time ? Math.floor((Date.now() - (row.sale_time * 1000)) / 60000) : 0,
                lastSaleQuantity: row.quantity ? parseInt(row.quantity) : 1 // Quantity sold in transaction
              },
              sale_data: {
                btc_amount: row.btc_amount ? parseFloat(row.btc_amount) : 0,
                block_index: row.sale_block_index || row.block_index,
                tx_hash: row.sale_tx_hash || row.tx_hash,
                buyer_address: row.buyer_address,
                seller_address: row.seller_address,
                time_ago: row.sale_time ? this.getTimeAgo(new Date(row.sale_time * 1000)) : null,
                btc_amount_satoshis: row.btc_amount ? Math.round(parseFloat(row.btc_amount) * 100000000) : null,
                dispenser_tx_hash: null
              }
            };
          }

          return stamp;
        });

        return { stamps: transformedStamps, total };
      }

      // No sales found in stamp_sales_history
      if (Deno.env.get("DENO_ENV") === "development") {
        console.log(`[RECENT SALES] No recent sales found in stamp_sales_history`);
      }
      return { stamps: [], total: 0 };

    } catch (error) {
      console.error(`[RECENT SALES] Error in getRecentlyActiveSold:`, error);
      throw error;
    }
  }

  /**
   * Builds SQL conditions for filtering stamps by file type
   * @param filetypes Array of file type filters
   * @param whereConditions Array of SQL conditions to append to
   * @param queryParams Array of parameters to append to
   */
  private static buildFileTypeFilterConditions(
    filetypes: StampFiletype[],
    whereConditions: string[],
    _queryParams: (string | number)[] // Not used - filetype filters are static SQL conditions
  ) {
    // Separate encoding filters (legacy/olga) from mimetype filters
    const mimetypeFilters = filetypes.filter(type =>
      type !== "legacy" && type !== "olga"
    );

    const encodingFilters = filetypes.filter(type =>
      type === "legacy" || type === "olga"
    );

    // Handle mimetype filters
    if (mimetypeFilters.length > 0) {
      const mimetypeConditions = mimetypeFilters.map(filetype => {
        if (filetype === "jpg" || filetype === "jpeg") {
          return "st.stamp_mimetype = 'image/jpeg'";
        } else if (filetype === "png") {
          return "st.stamp_mimetype = 'image/png'";
        } else if (filetype === "gif") {
          return "st.stamp_mimetype = 'image/gif'";
        } else if (filetype === "webp") {
          return "st.stamp_mimetype = 'image/webp'";
        } else if (filetype === "avif") {
          return "st.stamp_mimetype = 'image/avif'";
        } else if (filetype === "bmp") {
          return "st.stamp_mimetype = 'image/bmp'";
        } else if (filetype === "svg") {
          return "st.stamp_mimetype = 'image/svg+xml'";
        } else if (filetype === "html") {
          return "st.stamp_mimetype = 'text/html'";
        } else if (filetype === "txt") {
          return "st.stamp_mimetype = 'text/plain'";
        } else if (filetype === "mp3" || filetype === "mpeg") {
          return "st.stamp_mimetype = 'audio/mpeg'";
        }
        return "";
      }).filter(Boolean);

      if (mimetypeConditions.length > 0) {
        whereConditions.push(`(${mimetypeConditions.join(" OR ")})`);
      }
    }

    // Handle encoding filters
    if (encodingFilters.length > 0) {
      const encodingCondition = this.buildEncodingFilterSQL(encodingFilters);
      if (encodingCondition) {
        whereConditions.push(encodingCondition);
      }
    }
  }

  /**
   * Builds SQL conditions for filtering stamps by encoding type (legacy or OLGA)
   *
   * IMPORTANT: Legacy and OLGA are not database identifiers but encoding types:
   * - "legacy" = multisig encoding used before block 833000 (pre-Taproot activation)
   * - "olga" = P2WSH encoding used from block 833000 onwards (post-Taproot activation)
   *
   * These filters work by checking the block_index of when the stamp was created:
   * - legacy: st.block_index < 833000 (before Taproot activation)
   * - olga: st.block_index >= 833000 (after Taproot activation)
   *
   * This is consensus-critical logic - DO NOT modify the block height thresholds
   * without understanding the Bitcoin protocol changes.
   *
   * @param filters Array of file type filters that may include "legacy" or "olga"
   * @returns SQL condition string for filtering by encoding based on block height
   */
  private static buildEncodingFilterSQL(filters: StampFiletype[]): string {
    if (!filters || !filters.includes("legacy") && !filters.includes("olga")) {
      return "";
    }

    let sql = "";

    if (filters.includes("legacy")) {
      sql += "st.block_index < 833000";
    }

    if (filters.includes("olga")) {
      if (sql) sql += " OR ";
      sql += "st.block_index >= 833000";
    }

    return sql ? `(${sql})` : "";
  }

  /**
   * Builds all SQL filter conditions from the given filters object
   * @param filters StampFilters object containing all filter options
   * @param whereConditions Array of SQL conditions to append to
   * @param queryParams Array of parameters to append to
   */
  private static buildFilterConditions(
    filters: StampFilters,
    whereConditions: string[],
    queryParams: (string | number)[]
  ) {
    // Handle fileType filters (including encoding filters)
    if (filters.fileType && filters.fileType.length > 0) {
      this.buildFileTypeFilterConditions(filters.fileType, whereConditions, queryParams);
    }

    // Handle editions filters
    if (filters.editions && filters.editions.length > 0) {
      this.buildEditionsFilterConditions(filters.editions, whereConditions, queryParams);
    }

    // Handle range filters
    if (filters.range && filters.range !== null) {
      this.buildRangeFilterConditions(filters.range, whereConditions, queryParams, filters.rangeMin || undefined, filters.rangeMax || undefined);
    }

    // Handle market filters
    if (filters.market) {
              this.buildMarketFilterConditions([filters.market] as Array<"listings" | "sales" | "all" | "bargain" | "affordable" | "premium" | "custom" | "recent" | "volume">, whereConditions, queryParams, undefined, undefined);
    }

    // Handle new market data filters (Task 42)
    this.buildMarketDataFilterConditions(filters, whereConditions, queryParams);

    // Handle search text
    if (filters.search) {
      this.buildSearchConditions(filters.search, whereConditions, queryParams);
    }
  }

  /**
   * Builds SQL conditions for filtering stamps by edition properties
   * @param editions Array of edition filters
   * @param whereConditions Array of SQL conditions to append to
   * @param queryParams Array of parameters to append to
   */
  private static buildEditionsFilterConditions(
    editions: StampEdition[],
    whereConditions: string[],
    _queryParams: (string | number)[] // Not used - edition filters are static SQL conditions
  ) {
    if (!editions || editions.length === 0) {
      return;
    }

    // Group filters by category
    const supplyFilters = [];
    const lockFilters = [];
    const divisibilityFilters = [];

    // Sort filters into their respective categories
    if (editions.includes("single")) {
      supplyFilters.push("st.supply = 1");
    }

    if (editions.includes("multiple")) {
      supplyFilters.push("st.supply > 1");
    }

    if (editions.includes("locked")) {
      lockFilters.push("st.locked = 1");
    }

    if (editions.includes("unlocked")) {
      lockFilters.push("st.locked = 0");
    }

    if (editions.includes("divisible")) {
      divisibilityFilters.push("st.divisible = 1");
    }

    // Build category conditions - within each category use OR
    const categoryConditions = [];

    if (supplyFilters.length > 0) {
      categoryConditions.push(`(${supplyFilters.join(" OR ")})`);
    }

    if (lockFilters.length > 0) {
      categoryConditions.push(`(${lockFilters.join(" OR ")})`);
    }

    if (divisibilityFilters.length > 0) {
      categoryConditions.push(`(${divisibilityFilters.join(" OR ")})`);
    }

    // Combine categories with AND logic (must satisfy all selected categories)
    if (categoryConditions.length > 0) {
      whereConditions.push(categoryConditions.join(" AND "));
    }
  }

  private static buildRangeFilterConditions(
    range: StampRange,
    whereConditions: string[],
    queryParams: (string | number)[],
    rangeMin?: string,
    rangeMax?: string
  ) {
    console.log("[RANGE DEBUG] Starting buildRangeFilterConditions with:", range);
    console.log("[RANGE DEBUG] Type of range:", typeof range);
    console.log("[RANGE DEBUG] Initial whereConditions:", whereConditions);
    console.log("[RANGE DEBUG] Custom range values:", { min: rangeMin, max: rangeMax });

    // Early exit if range is undefined, null, or the string "undefined"
    if (!range || range === undefined || range === null || (range as string) === "undefined") {
      console.log("[RANGE DEBUG] Range is undefined/null/string-undefined, skipping");
      return;
    }

    // Handle preset ranges first
    if (range && range !== "custom") {
      console.log("[RANGE DEBUG] Processing preset range:", range);
      whereConditions.push("(st.stamp < ?)");
      queryParams.push(range);
      return; // Exit early for preset ranges
    }

    // Handle custom range
    if (range === "custom" || (rangeMin || rangeMax)) {
      console.log("[RANGE DEBUG] Handling custom range");
      if (rangeMin && rangeMax) {
        whereConditions.push("(st.stamp BETWEEN ? AND ?)");
        queryParams.push(rangeMin, rangeMax);
      } else if (rangeMin) {
        whereConditions.push("(st.stamp >= ?)");
        queryParams.push(rangeMin);
      } else if (rangeMax) {
        whereConditions.push("(st.stamp <= ?)");
        queryParams.push(rangeMax);
      }
    }

    console.log("[RANGE DEBUG] Final whereConditions:", whereConditions);
    console.log("[RANGE DEBUG] Final queryParams:", queryParams);
  }

  /**
   * Build file size filter conditions for SQL WHERE clause
   * Handles both preset size ranges and custom min/max values
   *
   * @param fileSize Preset file size range or "custom"
   * @param fileSizeMin Minimum file size in bytes (for custom range)
   * @param fileSizeMax Maximum file size in bytes (for custom range)
   * @param whereConditions Array of WHERE conditions to append to
   * @param queryParams Array of parameters to append to
   */
  private static buildFileSizeFilterConditions(
    fileSize: StampFilesize | null | undefined,
    whereConditions: string[],
    queryParams: (string | number)[],
    fileSizeMin?: string,
    fileSizeMax?: string
  ) {
    // Early exit if no file size filter is set
    if (!fileSize && !fileSizeMin && !fileSizeMax) {
      return;
    }

    // Handle preset file size ranges
    if (fileSize && fileSize !== "custom") {
      switch (fileSize) {
        case "<1kb":
          whereConditions.push("st.file_size_bytes < ?");
          queryParams.push(1024);
          break;
        case "1kb-7kb":
          whereConditions.push("st.file_size_bytes >= ? AND st.file_size_bytes <= ?");
          queryParams.push(1024, 7168);
          break;
        case "7kb-32kb":
          whereConditions.push("st.file_size_bytes >= ? AND st.file_size_bytes <= ?");
          queryParams.push(7168, 32768);
          break;
        case "32kb-64kb":
          whereConditions.push("st.file_size_bytes >= ? AND st.file_size_bytes <= ?");
          queryParams.push(32768, 65536);
          break;
      }
      return; // Exit early for preset ranges
    }

    // Handle custom file size range
    if (fileSize === "custom" || fileSizeMin || fileSizeMax) {
      if (fileSizeMin && fileSizeMax) {
        whereConditions.push("st.file_size_bytes >= ? AND st.file_size_bytes <= ?");
        queryParams.push(parseInt(fileSizeMin), parseInt(fileSizeMax));
      } else if (fileSizeMin) {
        whereConditions.push("st.file_size_bytes >= ?");
        queryParams.push(parseInt(fileSizeMin));
      } else if (fileSizeMax) {
        whereConditions.push("st.file_size_bytes <= ?");
        queryParams.push(parseInt(fileSizeMax));
      }
    }
  }

  /**
   * Build marketplace filter conditions for SQL WHERE clause
   * NOTE: Marketplace filters require JOINs with stamp_market_data and stamp_sales_history tables
   * These JOINs are added in the main query when market filters are active
   *
   * @param market Main market type: "listings" or "sales"
   * @param whereConditions Array of WHERE conditions to append to
   * @param queryParams Array of parameters to append to
   * @param dispensers Filter for stamps with active dispensers (listings) or dispenser sales (sales)
   * @param atomics Filter for stamps with active atomic swaps (not yet implemented)
   * @param listings Listing price range preset
   * @param listingsMin Minimum listing price (BTC)
   * @param listingsMax Maximum listing price (BTC)
   * @param sales Sales filter type
   * @param salesMin Minimum sale price (BTC)
   * @param salesMax Maximum sale price (BTC)
   * @param volume Volume time period filter
   * @param volumeMin Minimum volume (BTC)
   * @param volumeMax Maximum volume (BTC)
   */
  private static buildMarketplaceFilterConditions(
    market: "listings" | "sales" | "" | undefined,
    whereConditions: string[],
    queryParams: (string | number)[],
    dispensers?: boolean,
    atomics?: boolean,
    listings?: "all" | "bargain" | "affordable" | "premium" | "custom" | "",
    listingsMin?: string,
    listingsMax?: string,
    sales?: "recent" | "premium" | "custom" | "volume" | "",
    salesMin?: string,
    salesMax?: string,
    volume?: "24h" | "7d" | "30d" | "",
    volumeMin?: string,
    volumeMax?: string
  ) {
    // Early exit if no market filters are set
    if (!market && !dispensers && !atomics && !listings && !sales) {
      return;
    }

    // Handle LISTINGS market type
    // Uses stamp_market_data table for dispenser info and floor pricing
    if (market === "listings") {
      // Filter for stamps with active dispensers
      if (dispensers) {
        // Use open_dispensers_count from stamp_market_data
        whereConditions.push("smd.open_dispensers_count > 0");
      }

      // TODO(@user): Atomics filtering would require atomic_swap table (not in current schema)
      if (atomics) {
        console.warn("Atomic swap filtering not yet implemented - requires atomic_swap table");
      }

      // Handle listing price ranges using floor_price_btc from stamp_market_data
      // floor_price_btc is already in BTC, so we compare directly
      if (listings && listings !== "all") {
        if (listings === "bargain") {
          // 0 to 0.0025 BTC
          whereConditions.push("smd.floor_price_btc >= ? AND smd.floor_price_btc <= ?");
          queryParams.push(0, 0.0025);
        } else if (listings === "affordable") {
          // 0.005 to 0.01 BTC
          whereConditions.push("smd.floor_price_btc >= ? AND smd.floor_price_btc <= ?");
          queryParams.push(0.005, 0.01);
        } else if (listings === "premium") {
          // >= 0.1 BTC
          whereConditions.push("smd.floor_price_btc >= ?");
          queryParams.push(0.1);
        } else if (listings === "custom") {
          if (listingsMin && listingsMax) {
            whereConditions.push("smd.floor_price_btc >= ? AND smd.floor_price_btc <= ?");
            queryParams.push(parseFloat(listingsMin), parseFloat(listingsMax));
          } else if (listingsMin) {
            whereConditions.push("smd.floor_price_btc >= ?");
            queryParams.push(parseFloat(listingsMin));
          } else if (listingsMax) {
            whereConditions.push("smd.floor_price_btc <= ?");
            queryParams.push(parseFloat(listingsMax));
          }
        }
      }
    }

    // Handle SALES market type
    // Requires JOIN with stamp_sales_history table: LEFT JOIN stamp_sales_history ss ON st.cpid = ss.cpid
    if (market === "sales") {
      console.log("[SALES FILTER DEBUG] Applying sales market filters:", {
        dispensers,
        sales,
        volume,
        salesMin,
        salesMax,
      });

      // Ensure we only get stamps that have sales (must come first)
      whereConditions.push("ss.tx_hash IS NOT NULL");

      // Filter for stamps with dispenser sales specifically
      if (dispensers) {
        whereConditions.push("ss.sale_type = 'dispenser'");
        console.log("[SALES FILTER DEBUG] Added dispenser filter");
      }

      // Handle sales type filters
      if (sales) {
        if (sales === "recent") {
          // Recent sales in last 30 days
          // Note: block_time is INT (Unix timestamp), so we calculate the timestamp value
          const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
          whereConditions.push("ss.block_time >= ?");
          queryParams.push(thirtyDaysAgo);
          console.log("[SALES FILTER DEBUG] Added recent filter, timestamp:", thirtyDaysAgo);
        } else if (sales === "premium") {
          // Premium sales >= 0.1 BTC = >= 10,000,000 satoshis
          whereConditions.push("ss.unit_price_sats >= ?");
          queryParams.push(10000000);
          console.log("[SALES FILTER DEBUG] Added premium filter");
        } else if (sales === "custom") {
          // Custom price range
          if (salesMin && salesMax) {
            const minSats = Math.floor(parseFloat(salesMin) * 100000000);
            const maxSats = Math.floor(parseFloat(salesMax) * 100000000);
            whereConditions.push("ss.unit_price_sats >= ? AND ss.unit_price_sats <= ?");
            queryParams.push(minSats, maxSats);
            console.log("[SALES FILTER DEBUG] Added custom range:", { minSats, maxSats });
          } else if (salesMin) {
            const minSats = Math.floor(parseFloat(salesMin) * 100000000);
            whereConditions.push("ss.unit_price_sats >= ?");
            queryParams.push(minSats);
            console.log("[SALES FILTER DEBUG] Added min:", minSats);
          } else if (salesMax) {
            const maxSats = Math.floor(parseFloat(salesMax) * 100000000);
            whereConditions.push("ss.unit_price_sats <= ?");
            queryParams.push(maxSats);
            console.log("[SALES FILTER DEBUG] Added max:", maxSats);
          }
        } else if (sales === "volume") {
          // Volume-based filtering - group by cpid and sum btc_amount
          let days = 30; // default
          if (volume === "24h") days = 1;
          else if (volume === "7d") days = 7;
          else if (volume === "30d") days = 30;

          const volumeTimestamp = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
          whereConditions.push("ss.block_time >= ?");
          queryParams.push(volumeTimestamp);
          console.log("[SALES FILTER DEBUG] Added volume filter for", days, "days, timestamp:", volumeTimestamp);

          // Volume filters would need a subquery or GROUP BY with HAVING
          // This is complex and may need to be handled differently in the main query
          if (volumeMin || volumeMax) {
            console.warn("Volume min/max filtering requires subquery aggregation - not yet fully implemented");
          }
        }
      }

      console.log("[SALES FILTER DEBUG] Final conditions:", whereConditions.slice(-5));
    }
  }

  private static buildMarketFilterConditions(
    marketFilters: Array<"listings" | "sales" | "all" | "bargain" | "affordable" | "premium" | "custom" | "recent" | "volume">,
    whereConditions: string[],
    queryParams: (string | number)[],
    marketMin?: string,
    marketMax?: string
  ) {
    if (!marketFilters?.length) return;

    // Group filters by category
    const listingFilters = [];
    const saleFilters = [];

    // Sort filters into their respective categories
    // if (marketFilters.includes("atomic")) {
    //   listingFilters.push("st.has_active_atomic = true");
    // }
    // if (marketFilters.includes("dispensers")) {
    //   listingFilters.push("st.has_active_dispenser = true");
    // }
    // old listings push("st.unbound_quantity > 0");
    if (marketFilters.includes("listings")) {
      listingFilters.push("st.has_active_dispenser = true");
    }
    if (marketFilters.includes("sales")) {
      saleFilters.push("st.has_recent_sale = true");
    }
    // TODO(BitcoinStamps): Add PSBT market filter when supported
    // if (marketFilters.includes("psbt")) {
    //   saleFilters.push("st.has_recent_sale = true");
    // }

    // Build category conditions - within each category use OR
    const categoryConditions = [];

    if (listingFilters.length > 0) {
      categoryConditions.push(`(${listingFilters.join(" OR ")})`);
    }

    if (saleFilters.length > 0) {
      categoryConditions.push(`(${saleFilters.join(" OR ")})`);
    }

    // Combine categories with AND logic
    if (categoryConditions.length > 0) {
      whereConditions.push(categoryConditions.join(" AND "));
    }

    // Price range conditions
    if (marketMin) {
      whereConditions.push("st.market_price >= ?");
      queryParams.push(marketMin);
    }
    if (marketMax) {
      whereConditions.push("st.market_price <= ?");
      queryParams.push(marketMax);
    }
  }

  /**
   * Builds SQL conditions for filtering stamps by market data metrics (Task 42)
   * @param filters StampFilters object containing market data filter options
   * @param whereConditions Array of SQL conditions to append to
   * @param queryParams Array of parameters to append to
   */
  private static buildMarketDataFilterConditions(
    filters: StampFilters,
    whereConditions: string[],
    queryParams: (string | number)[]
  ) {
    // Note: These filters require joining with stamp_market_data table
    // The join should be handled in the main query when any market data filter is present

    // Holder metrics
    if (filters.minHolderCount) {
      whereConditions.push("smd.holder_count >= ?");
      queryParams.push(Number(filters.minHolderCount));
    }
    if (filters.maxHolderCount) {
      whereConditions.push("smd.holder_count <= ?");
      queryParams.push(Number(filters.maxHolderCount));
    }
    if (filters.minDistributionScore) {
      whereConditions.push("smd.holder_distribution_score >= ?");
      queryParams.push(Number(filters.minDistributionScore));
    }
    if (filters.maxTopHolderPercentage) {
      whereConditions.push("smd.top_holder_percentage <= ?");
      queryParams.push(Number(filters.maxTopHolderPercentage));
    }

    // Market metrics
    if (filters.minFloorPriceBTC) {
      whereConditions.push("smd.floor_price_btc >= ?");
      queryParams.push(Number(filters.minFloorPriceBTC));
    }
    if (filters.maxFloorPriceBTC) {
      whereConditions.push("smd.floor_price_btc <= ?");
      queryParams.push(Number(filters.maxFloorPriceBTC));
    }
    if (filters.minVolume24h) {
      whereConditions.push("smd.volume_24h_btc >= ?");
      queryParams.push(Number(filters.minVolume24h));
    }
    if (filters.minPriceChange24h) {
      // Note: Price change is available in src20_market_data, not stamp_market_data
      // This might require a different join or approach
      console.log("Warning: minPriceChange24h filter requires src20_market_data join");
    }

    // Data quality
    if (filters.minDataQualityScore) {
      whereConditions.push("smd.data_quality_score >= ?");
      queryParams.push(Number(filters.minDataQualityScore));
    }
    if (filters.maxCacheAgeMinutes) {
      whereConditions.push("TIMESTAMPDIFF(MINUTE, smd.last_updated, UTC_TIMESTAMP()) <= ?");
      queryParams.push(Number(filters.maxCacheAgeMinutes));
    }
    if (filters.priceSource) {
      const sources = filters.priceSource.split(',').map(s => s.trim());
      if (sources.length > 0) {
        const placeholders = sources.map(() => "?").join(",");
        whereConditions.push(`smd.price_source IN (${placeholders})`);
        queryParams.push(...sources);
      }
    }
  }

  private static buildSearchConditions(
    search: string,
    whereConditions: string[],
    queryParams: (string | number)[]
  ) {
    if (search && search.trim()) {
      whereConditions.push("(st.cpid LIKE ? OR st.creator LIKE ? OR st.tx_hash LIKE ?)");
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
  }

  /**
   * Calculate time ago string from date
   */
  private static getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
