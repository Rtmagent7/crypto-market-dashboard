import { DEGRADED_RETRY_SECONDS } from "@/config/cache-policy";

import type { DataEnvelope, ProviderId } from "./domain";

/** Mirror of the outbound gate's result, kept structural so modules stay framework-free. */
export type GateResult<T> =
  | { status: "fresh"; data: T; fetchedAt: number; expiresAt: number; cacheHit: boolean }
  | { status: "stale"; data: T; fetchedAt: number; expiresAt: number; reason: string }
  | { status: "unavailable"; reason: string };

const iso = (ms: number): string => new Date(ms).toISOString();

/** Gate result → DataEnvelope<T> (spec 6.4: every /api/* route returns one, no exceptions). */
export const toEnvelope = <Raw, T>(
  result: GateResult<Raw>,
  { source, map, now }: { source: ProviderId; map: (raw: Raw) => T; now: number },
): DataEnvelope<T> => {
  const retryAt = iso(now + DEGRADED_RETRY_SECONDS * 1000);
  switch (result.status) {
    case "fresh":
      return {
        data: map(result.data),
        status: "fresh",
        source,
        fetchedAt: iso(result.fetchedAt),
        nextRefreshAt: iso(result.expiresAt),
      };
    case "stale":
      return {
        data: map(result.data),
        status: "stale",
        source,
        fetchedAt: iso(result.fetchedAt),
        nextRefreshAt: retryAt,
      };
    case "unavailable":
      return {
        data: null,
        status: "unavailable",
        source,
        fetchedAt: iso(now),
        nextRefreshAt: retryAt,
      };
  }
};
