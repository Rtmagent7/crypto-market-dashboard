import type { BudgetKey } from "./budgets";

/**
 * Redis key layout, shared by the outbound gate (writer) and the status page (reader) so
 * /status always shows exactly what the guard enforces (spec §10.6).
 */
export const sharedKeys = {
  quota: (budget: BudgetKey, period: string): string => `quota:${budget}:${period}`,
  minute: (budget: BudgetKey, minute: string): string => `quota:${budget}:m:${minute}`,
  cooldown: (budget: BudgetKey): string => `cooldown:${budget}`,
  breakerFails: (budget: BudgetKey): string => `cb:${budget}:fails`,
  breakerOpen: (budget: BudgetKey): string => `cb:${budget}:open`,
};

export interface ScopedKeys {
  cache: (cacheKey: string) => string;
  lock: (cacheKey: string) => string;
}

/** Cache and locks are per environment (Production and Preview share one Redis). */
export const scopedKeys = (namespace: string | undefined): ScopedKeys => {
  const ns = namespace ? `${namespace}:` : "";
  return {
    cache: (cacheKey: string): string => `cache:${ns}${cacheKey}`,
    lock: (cacheKey: string): string => `lock:${ns}${cacheKey}`,
  };
};

/** What the gate stores per cache key. */
export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}
