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
  "twelvedata:quote-open": { ttl: 20 * MINUTE, staleFor: 7 * DAY },
  "twelvedata:quote-closed": { ttl: 6 * HOUR, staleFor: 7 * DAY },
  "twelvedata:series-1h": { ttl: HOUR, staleFor: 7 * DAY },
  "twelvedata:series-1day": { ttl: DAY, staleFor: 7 * DAY },
  "frankfurter:latest": { ttl: 6 * HOUR, staleFor: 7 * DAY },
  "frankfurter:range-1y": { ttl: DAY, staleFor: 7 * DAY },
  "exchangerate:latest": { ttl: DAY, staleFor: 7 * DAY },
  "groq:summary": { ttl: 3 * HOUR, staleFor: 7 * DAY },
} as const satisfies Record<string, CachePolicy>;

export type CachePolicyKey = keyof typeof CACHE_POLICY;
