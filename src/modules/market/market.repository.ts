import "server-only";

import { CACHE_POLICY } from "@/config/cache-policy";
import { getEnv } from "@/infra/env";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { getCallWithBudget } from "@/infra/outbound/gate";
import { createCoinGeckoClient, type CoinGeckoClient } from "@/infra/providers/coingecko.client";
import type { CgGlobal, CgMarketItem, CgTrending } from "@/infra/providers/coingecko.schema";

export type { BudgetResult };

/** Cache + budget for market data. The only layer that reaches providers (spec §7). */
export interface MarketRepository {
  coingeckoTop50(): Promise<BudgetResult<CgMarketItem[]>>;
  coingeckoGlobal(): Promise<BudgetResult<CgGlobal>>;
  coingeckoTrending(): Promise<BudgetResult<CgTrending>>;
}

export const createMarketRepository = ({
  callWithBudget,
  coingecko,
}: {
  callWithBudget: CallWithBudget;
  coingecko: CoinGeckoClient;
}): MarketRepository => ({
  coingeckoTop50: () =>
    callWithBudget({
      budget: "coingecko",
      endpoint: "/coins/markets",
      cacheKey: "coingecko:markets:top50",
      policy: CACHE_POLICY["coingecko:markets"],
      fetcher: (signal) => coingecko.markets(signal),
    }),
  coingeckoGlobal: () =>
    callWithBudget({
      budget: "coingecko",
      endpoint: "/global",
      cacheKey: "coingecko:global",
      policy: CACHE_POLICY["coingecko:global"],
      fetcher: (signal) => coingecko.global(signal),
    }),
  coingeckoTrending: () =>
    callWithBudget({
      budget: "coingecko",
      endpoint: "/search/trending",
      cacheKey: "coingecko:trending",
      policy: CACHE_POLICY["coingecko:trending"],
      fetcher: (signal) => coingecko.trending(signal),
    }),
});

let repository: MarketRepository | undefined;

export const getMarketRepository = (): MarketRepository =>
  (repository ??= createMarketRepository({
    callWithBudget: getCallWithBudget(),
    coingecko: createCoinGeckoClient({ apiKey: getEnv().COINGECKO_API_KEY }),
  }));
