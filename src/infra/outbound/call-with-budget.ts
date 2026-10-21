import type { CachePolicy } from "@/config/cache-policy";
import type { Logger } from "@/infra/logger";
import type { KeyValueStore } from "@/infra/store";

import { BUDGETS, RESILIENCE, type BudgetKey } from "./budgets";
import { minuteKey, periodKey, periodTtlSeconds } from "./day-key";
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
  policy: CachePolicy;
  fetcher: (signal: AbortSignal) => Promise<T>;
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
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

type Attempt<T> = { ok: true; data: T } | { ok: false; reason: SkipReason; error: unknown };

const keys = {
  cache: (cacheKey: string): string => `cache:${cacheKey}`,
  lock: (cacheKey: string): string => `lock:${cacheKey}`,
  quota: (budget: BudgetKey, period: string): string => `quota:${budget}:${period}`,
  minute: (budget: BudgetKey, minute: string): string => `quota:${budget}:m:${minute}`,
  cooldown: (budget: BudgetKey): string => `cooldown:${budget}`,
  breakerFails: (budget: BudgetKey): string => `cb:${budget}:fails`,
  breakerOpen: (budget: BudgetKey): string => `cb:${budget}:open`,
};

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
}: CallWithBudgetDeps): CallWithBudget => {
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
  ): Promise<{ ok: true; used: number } | { ok: false; reason: SkipReason }> => {
    const { period, resetTz } = BUDGETS[budget];
    const { cap, perMinute } = capOf(budget);
    const t = now();
    const periodCounter = keys.quota(budget, periodKey(period, resetTz, t));
    const minuteCounter = keys.minute(budget, minuteKey(t));

    const used = await store.incr(periodCounter, periodTtlSeconds(period));
    if (used > cap) {
      await store.decr(periodCounter);
      return { ok: false, reason: "budget-exhausted" };
    }
    const usedThisMinute = await store.incr(minuteCounter, 120);
    if (usedThisMinute > perMinute) {
      await Promise.all([store.decr(minuteCounter), store.decr(periodCounter)]);
      return { ok: false, reason: "minute-cap" };
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
      const reservation = await reserve(call.budget);
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
      return degrade("locked");
    }

    try {
      const result = await attempt(call);
      if (!result.ok) {
        if (result.error !== null) await recordFailure(call.budget);
        return degrade(result.reason);
      }

      const fetchedAt = now();
      const entry: CacheEntry<T> = {
        data: result.data,
        fetchedAt,
        expiresAt: fetchedAt + call.policy.ttl * 1000,
      };
      await store.set(keys.cache(call.cacheKey), entry, {
        px: (call.policy.ttl + call.policy.staleFor) * 1000,
      });
      await store.del(keys.breakerFails(call.budget));
      return { status: "fresh", ...entry, cacheHit: false };
    } finally {
      // Release only our own lock; an expired-and-retaken lock belongs to someone else.
      if ((await store.get(lockKey)) === token) await store.del(lockKey);
    }
  };
};
