import "server-only";

import { CACHE_POLICY } from "@/config/cache-policy";
import type { WhitelistedCoin } from "@/config/coins";
import { getEnv } from "@/infra/env";
import type { BudgetResult, CallWithBudget } from "@/infra/outbound/call-with-budget";
import { getCallWithBudget } from "@/infra/outbound/gate";
import {
  createCoinGeckoClient,
  type ChartDays,
  type CoinGeckoClient,
} from "@/infra/providers/coingecko.client";
import type {
  CgGlobal,
  CgMarketChart,
  CgMarketItem,
  CgTrending,
} from "@/infra/providers/coingecko.schema";

export type { BudgetResult };

/** Cache + budget for market data. The only layer that reaches providers (spec §7). */
export interface MarketRepository {
  coingeckoTop50(): Promise<BudgetResult<CgMarketItem[]>>;
  coingeckoGlobal(): Promise<BudgetResult<CgGlobal>>;
  coingeckoTrending(): Promise<BudgetResult<CgTrending>>;
  /** One cache key per coin and window: 10 coins × (30d every 6 h + 1y daily) = 50 calls/day. */
  coingeckoChart(id: WhitelistedCoin, days: ChartDays): Promise<BudgetResult<CgMarketChart>>;
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
  coingeckoChart: (id, days) =>
    callWithBudget({
      budget: "coingecko",
      endpoint: "/coins/{id}/market_chart",
      cacheKey: `coingecko:chart:${id}:${days}`,
      policy: CACHE_POLICY[days === 30 ? "coingecko:chart-30d" : "coingecko:chart-1y"],
      fetcher: (signal) => coingecko.marketChart(id, days, signal),
    }),
});

let repository: MarketRepository | undefined;

export const getMarketRepository = (): MarketRepository =>
  (repository ??= createMarketRepository({
    callWithBudget: getCallWithBudget(),
    coingecko: createCoinGeckoClient({ apiKey: getEnv().COINGECKO_API_KEY }),
  }));
