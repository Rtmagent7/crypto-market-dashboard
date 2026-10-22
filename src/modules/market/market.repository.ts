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
import {
  createCoinMarketCapClient,
  type CoinMarketCapClient,
} from "@/infra/providers/coinmarketcap.client";
import type { CmcListings } from "@/infra/providers/coinmarketcap.schema";

export type { BudgetResult };

/** Cache + budget for market data. The only layer that reaches providers (spec §7). */
export interface MarketRepository {
  coingeckoTop50(): Promise<BudgetResult<CgMarketItem[]>>;
  coingeckoGlobal(): Promise<BudgetResult<CgGlobal>>;
  coingeckoTrending(): Promise<BudgetResult<CgTrending>>;
  /** Backup top 50. Never called without a key (`not-configured`). */
  coinmarketcapTop50(): Promise<BudgetResult<CmcListings>>;
  /** One cache key per coin and window: 10 coins × (30d every 6 h + 1y daily) = 50 calls/day. */
  coingeckoChart(id: WhitelistedCoin, days: ChartDays): Promise<BudgetResult<CgMarketChart>>;
}

export const createMarketRepository = ({
  callWithBudget,
  coingecko,
  coinmarketcap = null,
}: {
  callWithBudget: CallWithBudget;
  coingecko: CoinGeckoClient;
  /** null (the default) when CMC_API_KEY is not set. */
  coinmarketcap?: CoinMarketCapClient | null;
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
  coinmarketcapTop50: async () =>
    coinmarketcap
      ? callWithBudget({
          budget: "coinmarketcap",
          endpoint: "/v1/cryptocurrency/listings/latest",
          // Same key /status reads for this provider's data age (config/providers.ts).
          cacheKey: "coinmarketcap:listings",
          policy: CACHE_POLICY["coinmarketcap:listings"],
          fetcher: (signal) => coinmarketcap.listings(signal),
        })
      : { status: "unavailable", reason: "not-configured" },
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

export const getMarketRepository = (): MarketRepository => {
  if (repository) return repository;
  const env = getEnv();
  // In mock mode MSW answers, so the backup path is exercised without a real key.
  const cmcKey = env.CMC_API_KEY ?? (env.MOCK_PROVIDERS === "1" ? "mock" : undefined);
  return (repository = createMarketRepository({
    callWithBudget: getCallWithBudget(),
    coingecko: createCoinGeckoClient({ apiKey: env.COINGECKO_API_KEY }),
    coinmarketcap: cmcKey ? createCoinMarketCapClient({ apiKey: cmcKey }) : null,
  }));
};
