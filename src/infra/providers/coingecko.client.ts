import "server-only";

import {
  CgGlobal,
  CgMarketChart,
  CgMarkets,
  CgTrending,
  type CgMarketItem,
} from "./coingecko.schema";
import { assertHttps, getJson } from "./http";

export const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

export type ChartDays = 30 | 365;

export interface CoinGeckoClient {
  markets(signal: AbortSignal): Promise<CgMarketItem[]>;
  global(signal: AbortSignal): Promise<CgGlobal>;
  trending(signal: AbortSignal): Promise<CgTrending>;
  marketChart(id: string, days: ChartDays, signal: AbortSignal): Promise<CgMarketChart>;
}

/** HTTP + Zod only. Call it from a repository, through callWithBudget. */
export const createCoinGeckoClient = ({
  apiKey,
  baseUrl = COINGECKO_BASE_URL,
}: {
  apiKey?: string;
  baseUrl?: string;
}): CoinGeckoClient => {
  const base = assertHttps(baseUrl);
  const headers: Record<string, string> = apiKey ? { "x-cg-demo-api-key": apiKey } : {};

  return {
    markets: (signal) =>
      getJson(
        `${base}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`,
        CgMarkets,
        { signal, headers },
      ),
    global: (signal) => getJson(`${base}/global`, CgGlobal, { signal, headers }),
    trending: (signal) => getJson(`${base}/search/trending`, CgTrending, { signal, headers }),
    marketChart: (id, days, signal) =>
      getJson(
        `${base}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
        CgMarketChart,
        { signal, headers },
      ),
  };
};
