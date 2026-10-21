import type { CachePolicy } from "@/config/cache-policy";
import type { Logger } from "@/infra/logger";
import type { KeyValueStore } from "@/infra/store";

import { ALERT_THRESHOLDS_PCT, BUDGETS, RESILIENCE, type BudgetKey } from "./budgets";
import { minuteKey, periodKey, periodTtlSeconds } from "./day-key";
import { scopedKeys, sharedKeys, type CacheEntry } from "./keys";
import { ContractError, ProviderHttpError, ProviderTimeoutError, isRetryable } from "./errors";

/**
 * The single outbound gate (spec Section 5). Degradation order:
 *   fresh cache → stale cache → (backup provider, decided by the service) → unavailable
 * Provider call volume depends only on cache TTL, never on visitor count.
 */

export interface BudgetedCall<T> {
  budget: BudgetKey;
  /** Provider path, for logs only. */
  endpoint: string;
  cacheKey: string;
  /** Fixed TTL, or one derived from the response (e.g. Twelve Data's `is_market_open`). */
  policy: CachePolicy | ((data: T) => CachePolicy);
  fetcher: (signal: AbortSignal) => Promise<T>;
  /** Quota units this call spends (Twelve Data: 1 credit per symbol). Default 1. */
  cost?: number;
  requestId?: string;
}

export type SkipReason =
  | "budget-exhausted"
  | "minute-cap"
  | "locked"
  | "circuit-open"
  | "cooldown"
  | "provider-error"
  | "contract-error";

export type BudgetResult<T> =
  | { status: "fresh"; data: T; fetchedAt: number; expiresAt: number; cacheHit: boolean }
  | { status: "stale"; data: T; fetchedAt: number; expiresAt: number; reason: SkipReason }
  | { status: "unavailable"; reason: SkipReason };

export interface CallWithBudgetDeps {
  store: KeyValueStore;
  logger: Logger;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  /** BUDGET_CAP_RATIO: 1.0 in production, 0.1 in Preview so PRs never drain real quota. */
  capRatio?: number;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  /**
   * Prefix for cache and lock keys (VERCEL_ENV). Production and Preview share one Redis:
   * caches stay separate so a preview can never poison production, while quota counters,
   * circuit breakers and cooldowns stay shared because both use the same provider keys.
   */
  namespace?: string;
  /** How long a request with nothing cached waits for another request's in-flight call. */
  lockWaitMs?: number;
}

type Attempt<T> = { ok: true; data: T } | { ok: false; reason: SkipReason; error: unknown };

const statusOf = (err: unknown): string | number => {
  if (err instanceof ProviderHttpError) return err.status;
  if (err instanceof ProviderTimeoutError) return "timeout";
  if (err instanceof ContractError) return "contract-error";
  return "error";
};

export type CallWithBudget = <T>(call: BudgetedCall<T>) => Promise<BudgetResult<T>>;

export const createCallWithBudget = ({
  store,
  logger,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
  capRatio = 1,
  timeoutMs = RESILIENCE.timeoutMs,
  retryDelaysMs = RESILIENCE.retryDelaysMs,
  namespace,
  lockWaitMs = RESILIENCE.lockWaitMs,
}: CallWithBudgetDeps): CallWithBudget => {
  const keys = { ...sharedKeys, ...scopedKeys(namespace) };
  const capOf = (budget: BudgetKey): { cap: number; perMinute: number } => ({
    cap: Math.max(1, Math.floor(BUDGETS[budget].cap * capRatio)),
    perMinute: BUDGETS[budget].perMinute,
  });

  /**
   * Reserve one provider call atomically: INCR first, then undo if it overshot the cap.
   * Two serverless instances can never both slip under the cap this way.
   */
  const reserve = async (
    budget: BudgetKey,
    cost: number,
  ): Promise<{ ok: true; used: number } | { ok: false; reason: SkipReason }> => {
    const { period, resetTz } = BUDGETS[budget];
    const { cap, perMinute } = capOf(budget);
    const t = now();
    const periodCounter = keys.quota(budget, periodKey(period, resetTz, t));
    const minuteCounter = keys.minute(budget, minuteKey(t));

    const used = await store.incr(periodCounter, periodTtlSeconds(period), cost);
    if (used > cap) {
      await store.decr(periodCounter, cost);
      return { ok: false, reason: "budget-exhausted" };
    }
    const usedThisMinute = await store.incr(minuteCounter, 120, cost);
    if (usedThisMinute > perMinute) {
      await Promise.all([store.decr(minuteCounter, cost), store.decr(periodCounter, cost)]);
      return { ok: false, reason: "minute-cap" };
    }
    // INCRBY is atomic, so exactly one request's step crosses each threshold: one signal per period.
    for (const pct of ALERT_THRESHOLDS_PCT) {
      const threshold = Math.ceil((cap * pct) / 100);
      if (used - cost < threshold && used >= threshold) {
        logger.log("warn", "quota_threshold", {
          provider: budget,
          threshold: pct,
          used,
          cap,
          period: periodKey(period, resetTz, t),
        });
      }
    }
    return { ok: true, used };
  };

  const withTimeout = async <T>(fetcher: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new ProviderTimeoutError(timeoutMs)),
      timeoutMs,
    );
    try {
      return await fetcher(controller.signal);
    } catch (err) {
      throw controller.signal.aborted ? new ProviderTimeoutError(timeoutMs) : err;
    } finally {
      clearTimeout(timer);
    }
  };

  const recordFailure = async (budget: BudgetKey): Promise<void> => {
    const fails = await store.incr(keys.breakerFails(budget), RESILIENCE.breakerWindowSeconds);
    if (fails >= RESILIENCE.breakerThreshold) {
      await store.set(keys.breakerOpen(budget), true, { px: RESILIENCE.breakerOpenSeconds * 1000 });
      await store.del(keys.breakerFails(budget));
      logger.log("error", "circuit_open", {
        provider: budget,
        openForSeconds: RESILIENCE.breakerOpenSeconds,
      });
    }
  };

  /** Calls the provider with the retry policy of Section 10.3, counting every attempt. */
  const attempt = async <T>(call: BudgetedCall<T>): Promise<Attempt<T>> => {
    for (let i = 0; ; i++) {
      const reservation = await reserve(call.budget, call.cost ?? 1);
      if (!reservation.ok) {
        return { ok: false, reason: reservation.reason, error: null };
      }
      const started = now();
      const logCall = (status: string | number): void =>
        logger.log(status === "ok" ? "info" : "warn", "outbound_call", {
          provider: call.budget,
          endpoint: call.endpoint,
          cacheKey: call.cacheKey,
          cacheHit: false,
          stale: false,
          status,
          latencyMs: now() - started,
          quotaUsed: reservation.used,
          quotaCap: capOf(call.budget).cap,
          fallbackUsed: false,
          requestId: call.requestId ?? null,
        });

      try {
        const data = await withTimeout(call.fetcher);
        logCall("ok");
        return { ok: true, data };
      } catch (err) {
        logCall(statusOf(err));
        if (err instanceof ContractError) {
          logger.log("error", "contract_error", {
            provider: call.budget,
            endpoint: call.endpoint,
            issues: err.issues.slice(0, 5),
          });
          return { ok: false, reason: "contract-error", error: err };
        }
        if (err instanceof ProviderHttpError && err.status === 429 && err.retryAfterSeconds) {
          await store.set(keys.cooldown(call.budget), true, { px: err.retryAfterSeconds * 1000 });
        }
        const delay = retryDelaysMs[i];
        if (!isRetryable(err) || delay === undefined) {
          return { ok: false, reason: "provider-error", error: err };
        }
        await sleep(delay + Math.round(random() * RESILIENCE.retryJitterMs));
      }
    }
  };

  return async <T>(call: BudgetedCall<T>): Promise<BudgetResult<T>> => {
    const cached = await store.get<CacheEntry<T>>(keys.cache(call.cacheKey));
    if (cached && now() < cached.expiresAt) {
      return { status: "fresh", ...cached, cacheHit: true };
    }

    const degrade = (reason: SkipReason): BudgetResult<T> =>
      cached ? { status: "stale", ...cached, reason } : { status: "unavailable", reason };

    if (await store.get(keys.breakerOpen(call.budget))) return degrade("circuit-open");
    if (await store.get(keys.cooldown(call.budget))) return degrade("cooldown");

    const token = `${now()}-${random()}`;
    const lockKey = keys.lock(call.cacheKey);
    if (!(await store.set(lockKey, token, { px: RESILIENCE.lockMs, nx: true }))) {
      if (cached) return degrade("locked");
      // Cold cache: wait briefly for the in-flight call rather than failing (or, worse, sending
      // this request to a backup provider while the primary is answering).
      for (let waited = 0; waited < lockWaitMs; waited += RESILIENCE.lockPollMs) {
        await sleep(RESILIENCE.lockPollMs);
        const landed = await store.get<CacheEntry<T>>(keys.cache(call.cacheKey));
        if (landed) return { status: "fresh", ...landed, cacheHit: true };
      }
      return degrade("locked");
    }

    try {
      const result = await attempt(call);
      if (!result.ok) {
        if (result.error !== null) await recordFailure(call.budget);
        return degrade(result.reason);
      }

      const fetchedAt = now();
      const policy = typeof call.policy === "function" ? call.policy(result.data) : call.policy;
      const entry: CacheEntry<T> = {
        data: result.data,
        fetchedAt,
        expiresAt: fetchedAt + policy.ttl * 1000,
      };
      await store.set(keys.cache(call.cacheKey), entry, {
        px: (policy.ttl + policy.staleFor) * 1000,
      });
      await store.del(keys.breakerFails(call.budget));
      return { status: "fresh", ...entry, cacheHit: false };
    } finally {
      // Release only our own lock; an expired-and-retaken lock belongs to someone else.
      if ((await store.get(lockKey)) === token) await store.del(lockKey);
    }
  };
};
