import "server-only";

import { CACHE_POLICY } from "@/config/cache-policy";
import { FX_HISTORY_CURRENCIES } from "@/config/currencies";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { getCallWithBudget } from "@/infra/outbound/gate";
import {
  createExchangeRateClient,
  type ExchangeRateClient,
} from "@/infra/providers/exchangerate.client";
import type { ErOpenLatest } from "@/infra/providers/exchangerate.schema";
import {
  createFrankfurterClient,
  type FrankfurterClient,
} from "@/infra/providers/frankfurter.client";
import type { FfLatest, FfRange } from "@/infra/providers/frankfurter.schema";

export type { BudgetResult };

export interface FxRepository {
  frankfurterLatest(): Promise<BudgetResult<FfLatest>>;
  frankfurterRange(): Promise<BudgetResult<FfRange>>;
  exchangerateLatest(): Promise<BudgetResult<ErOpenLatest>>;
}

const YEAR_MS = 365 * 86_400_000;

export const createFxRepository = ({
  callWithBudget,
  frankfurter,
  exchangerate,
  now = Date.now,
}: {
  callWithBudget: CallWithBudget;
  frankfurter: FrankfurterClient;
  exchangerate: ExchangeRateClient;
  now?: () => number;
}): FxRepository => ({
  frankfurterLatest: () =>
    callWithBudget({
      budget: "frankfurter",
      endpoint: "/latest",
      cacheKey: "frankfurter:latest:USD",
      policy: CACHE_POLICY["frankfurter:latest"],
      fetcher: (signal) => frankfurter.latest("USD", signal),
    }),
  frankfurterRange: () =>
    callWithBudget({
      budget: "frankfurter",
      endpoint: "/{start}..",
      cacheKey: "frankfurter:range-1y:USD",
      policy: CACHE_POLICY["frankfurter:range-1y"],
      // The window is computed when the provider is actually called, so one cache key
      // always holds "the last 365 days" as of its fetch.
      fetcher: (signal) =>
        frankfurter.range(
          "USD",
          new Date(now() - YEAR_MS).toISOString().slice(0, 10),
          FX_HISTORY_CURRENCIES,
          signal,
        ),
    }),
  exchangerateLatest: () =>
    callWithBudget({
      budget: "exchangerate",
      endpoint: "/latest/USD",
      cacheKey: "exchangerate:latest:USD",
      policy: CACHE_POLICY["exchangerate:latest"],
      fetcher: (signal) => exchangerate.latest("USD", signal),
    }),
});

let repository: FxRepository | undefined;

export const getFxRepository = (): FxRepository =>
  (repository ??= createFxRepository({
    callWithBudget: getCallWithBudget(),
    frankfurter: createFrankfurterClient(),
    exchangerate: createExchangeRateClient(),
  }));
