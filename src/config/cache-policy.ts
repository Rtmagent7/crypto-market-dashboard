// TTL per endpoint, in seconds (spec Section 4). The only other file allowed to hold
// cache/quota numbers is infra/outbound/budgets.ts.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface CachePolicy {
  /** Data is fresh for this long; after it, the next request may call the provider. */
  readonly ttl: number;
  /** Stale data is kept (and served on failure) this long after it stops being fresh. */
  readonly staleFor: number;
}

export const CACHE_POLICY = {
  "coingecko:markets": { ttl: 15 * MINUTE, staleFor: 7 * DAY },
  "coingecko:global": { ttl: HOUR, staleFor: 7 * DAY },
  "coingecko:trending": { ttl: HOUR, staleFor: 7 * DAY },
  "coingecko:chart-30d": { ttl: 6 * HOUR, staleFor: 7 * DAY },
  "coingecko:chart-1y": { ttl: DAY, staleFor: 7 * DAY },
  // Backup for coingecko:markets: only called while CoinGecko has no fresh data.
  "coinmarketcap:listings": { ttl: 15 * MINUTE, staleFor: 7 * DAY },
  "twelvedata:quote-open": { ttl: 20 * MINUTE, staleFor: 7 * DAY },
  "twelvedata:quote-closed": { ttl: 6 * HOUR, staleFor: 7 * DAY },
  "twelvedata:series-1h": { ttl: HOUR, staleFor: 7 * DAY },
  "twelvedata:series-1day": { ttl: DAY, staleFor: 7 * DAY },
  "frankfurter:latest": { ttl: 6 * HOUR, staleFor: 7 * DAY },
  "frankfurter:range-1y": { ttl: DAY, staleFor: 7 * DAY },
  "exchangerate:latest": { ttl: DAY, staleFor: 7 * DAY },
  "groq:summary": { ttl: 3 * HOUR, staleFor: 7 * DAY },
  // Annual data, published a few times a year (spec §4: /macro ISR 7 days).
  "worldbank:indicators": { ttl: 7 * DAY, staleFor: 30 * DAY },
} as const satisfies Record<string, CachePolicy>;

export type CachePolicyKey = keyof typeof CACHE_POLICY;

/**
 * While data is stale or unavailable, clients re-ask the internal API this often. It costs no
 * provider quota (the gate serves cache or skips the call), and picks up recovery quickly.
 */
export const DEGRADED_RETRY_SECONDS = 60;

/**
 * Twelve Data credit schedule (spec §4): one 8-ticker batch spends a whole minute's 8 credits,
 * so each batch type owns different minutes. Times are in America/New_York.
 */
export const TWELVEDATA_SCHEDULE = {
  /** Quotes refresh at :00, :20 and :40 while the market is open. */
  quoteMinutes: [0, 20, 40],
  /** Hourly series refresh at :05. */
  intradayMinutes: [5],
  /** Daily series refresh once, 15 minutes after the 16:00 close. */
  dailyAfterClose: "16:15",
} as const;

/** Visitor rate limits per hashed IP (spec §11). Cached data is cheap; AI routes are stricter. */
export const RATE_LIMITS = {
  api: { limit: 120, windowSec: 60 },
  ai: { limit: 30, windowSec: 60 },
} as const;

/** Ask AI per hashed IP (spec §11): 5 questions a day; the global 100/day is the groq:chat budget. */
export const ASK_AI_DAILY = { limit: 5, windowSec: 86_400 } as const;
