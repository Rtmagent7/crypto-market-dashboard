import { createHash } from "node:crypto";

import type { KeyValueStore } from "@/infra/store";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window ends. */
  resetSec: number;
}

/** Salted SHA-256, truncated: enough to tell clients apart, useless for recovering an IP. */
export const hashIp = (ip: string, salt: string): string =>
  createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);

/** Vercel puts the real client first in X-Forwarded-For. */
export const clientIp = (headers: Headers): string =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headers.get("x-real-ip")?.trim() ||
  "unknown";

/**
 * Sliding window over two fixed windows (current + the previous one weighted by how much of it
 * still overlaps), so a burst straddling a boundary cannot double the limit.
 */
export const createRateLimiter = ({
  store,
  now = Date.now,
  limit,
  windowSec,
  prefix,
}: {
  store: KeyValueStore;
  now?: () => number;
  limit: number;
  windowSec: number;
  prefix: string;
}): { hit(id: string): Promise<RateLimitResult> } => ({
  hit: async (id) => {
    const t = now() / 1000;
    const window = Math.floor(t / windowSec);
    const intoWindow = t - window * windowSec;
    const resetSec = Math.max(1, Math.ceil(windowSec - intoWindow));
    try {
      const current = await store.incr(`rl:${prefix}:${id}:${window}`, windowSec * 2);
      const previous = (await store.get<number>(`rl:${prefix}:${id}:${window - 1}`)) ?? 0;
      const weighted = previous * (1 - intoWindow / windowSec) + current;
      return {
        allowed: weighted <= limit,
        limit,
        remaining: Math.max(0, Math.floor(limit - weighted)),
        resetSec,
      };
    } catch {
      // Fail open: a Redis hiccup must not lock visitors out of cached data.
      return { allowed: true, limit, remaining: limit, resetSec };
    }
  },
});
