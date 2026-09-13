/**
 * JSON serialization for the Redis cache layer.
 *
 * `setCachedData` and `getCachedData` in databaseManager.ts are a pair: every
 * value written with `cacheSerializer` is read back with `cacheReviver`, and
 * the round-trip has to be lossless and type-stable. Type-stable means a cache
 * HIT hands the caller the same types a cache MISS would, because a miss is
 * what development and `CACHE=false` always run on, and because a caller that
 * gets a different type depending on cache state fails intermittently in a way
 * nobody can reproduce.
 *
 * The wire format is an explicit marker: a value the serializer had to convert
 * is written as `{ __type: "<name>", value: "<string>" }`, and the reviver
 * restores exactly the values carrying that marker. It never inspects the
 * shape of an unmarked value to decide what it "looks like". Guessing from
 * shape is what this module exists to avoid:
 *
 *   - It is magnitude-dependent. A column whose values have always been small
 *     changes type the day a large value lands in it.
 *   - All-digit strings are not always numbers. SRC-20 ticks ("0", "888",
 *     "1000", "9527" are all real deployed tokens), zero-padded codes, ordinal
 *     numbers and identifiers are digits that must stay strings. Converting
 *     them drops leading zeros and loses precision past 2^53.
 *
 * The marker format is unchanged from the previous implementation, so entries
 * already in Redis are read correctly and a rolling deploy can have old and
 * new tasks sharing a cache.
 *
 * Known remaining asymmetry: the MySQL driver returns DATETIME columns as
 * `Date`, and `JSON.stringify` calls `Date#toJSON` before the replacer is
 * consulted, so a Date reaches the cache as an ISO string and revives as a
 * string. Closing that needs a `Date` marker, which changes the wire format
 * and therefore needs a cache key namespace bump to keep a rolling deploy from
 * mixing formats. It is deliberately not bundled with this change.
 */

const BIGINT_MARKER = "BigInt";

interface MarkedValue {
  __type: string;
  value: string;
}

function isMarkedValue(value: unknown): value is MarkedValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "__type" in value &&
    "value" in value &&
    typeof (value as MarkedValue).__type === "string" &&
    typeof (value as MarkedValue).value === "string"
  );
}

/**
 * `JSON.stringify` replacer. Marks the one type JSON cannot represent, and
 * passes everything else through untouched.
 */
export function cacheSerializer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return { __type: BIGINT_MARKER, value: value.toString() };
  }
  return value;
}

export function jsonStringifyForCache(obj: unknown): string {
  return JSON.stringify(obj, cacheSerializer);
}

/**
 * `JSON.parse` reviver. Restores the values `cacheSerializer` marked, and
 * nothing else — an unmarked string stays a string whatever its digits look
 * like.
 */
export function cacheReviver(_key: string, value: unknown): unknown {
  if (isMarkedValue(value) && value.__type === BIGINT_MARKER) {
    try {
      return BigInt(value.value);
    } catch (error) {
      console.warn(
        `[CACHE] Failed to restore BigInt from marked value: ${value.value}`,
        error,
      );
      // Keep the digits rather than the marker object, so the caller sees a
      // recoverable value instead of a shape it cannot use.
      return value.value;
    }
  }
  return value;
}

export function jsonParseFromCache<T = unknown>(text: string): T {
  return JSON.parse(text, cacheReviver) as T;
}
