import "server-only";

import { STATUS_PROVIDERS } from "@/config/providers";
import { getEnv, type Env } from "@/infra/env";
import { BUDGETS, type BudgetKey } from "@/infra/outbound/budgets";
import { periodKey } from "@/infra/outbound/day-key";
import { scopedKeys, sharedKeys, type CacheEntry } from "@/infra/outbound/keys";
import { getStore } from "@/infra/redis";
import type { KeyValueStore } from "@/infra/store";

import type { RawProviderState } from "./status.logic";

export interface StatusRepository {
  snapshot(now: number): Promise<Record<string, RawProviderState>>;
}

/** Reads the very counters, breakers and cache entries the outbound gate writes. */
export const createStatusRepository = ({
  store,
  env,
}: {
  store: KeyValueStore;
  env: Pick<Env, "BUDGET_CAP_RATIO" | "VERCEL_ENV" | "NODE_ENV"> &
    Partial<Pick<Env, "MOCK_PROVIDERS">> &
    Partial<Record<string, unknown>>;
}): StatusRepository => {
  const cacheKeys = scopedKeys(env.VERCEL_ENV ?? env.NODE_ENV);
  return {
    snapshot: async (now) => {
      const rows = await Promise.all(
        STATUS_PROVIDERS.map(async (p): Promise<[string, RawProviderState]> => {
          const budget = p.id as BudgetKey;
          const { period, resetTz } = BUDGETS[budget];
          const [used, open, cooldown, entry] = await Promise.all([
            store.get<number>(sharedKeys.quota(budget, periodKey(period, resetTz, now))),
            store.get(sharedKeys.breakerOpen(budget)),
            store.get(sharedKeys.cooldown(budget)),
            store.get<CacheEntry<unknown>>(cacheKeys.cache(p.cacheKey)),
          ]);
          return [
            p.id,
            {
              quotaUsed: used ?? 0,
              breakerOpen: Boolean(open),
              cooldown: Boolean(cooldown),
              fetchedAt: entry?.fetchedAt ?? null,
              // Mock mode serves every provider from fixtures, so none of them needs a key there.
              configured:
                env.MOCK_PROVIDERS === "1" || p.keyEnv.every((name) => Boolean(env[name])),
              quotaCap: Math.max(1, Math.floor(BUDGETS[budget].cap * env.BUDGET_CAP_RATIO)),
              quotaPeriod: period,
            },
          ];
        }),
      );
      return Object.fromEntries(rows);
    },
  };
};

let repository: StatusRepository | undefined;

export const getStatusRepository = (): StatusRepository => {
  if (repository) return repository;
  const env = getEnv();
  repository = createStatusRepository({ store: getStore(env), env });
  return repository;
};
