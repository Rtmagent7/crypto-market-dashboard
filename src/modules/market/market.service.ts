import type { ChartRange, WhitelistedCoin } from "@/config/coins";
import type {
  CoinDetail,
  CryptoAsset,
  DataEnvelope,
  GlobalMarket,
  PricePoint,
  TrendingCoin,
} from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";

import { selectRange, sparklineToPoints } from "./coin-chart";
import {
  fromCoinGecko,
  fromCoinGeckoChart,
  fromCoinGeckoDetail,
  fromCoinGeckoGlobal,
  fromCoinGeckoTrending,
  thinSparkline,
} from "./market.mapper";

const SPARKLINE_POINTS = 42;
import { getMarketRepository, type MarketRepository } from "./market.repository";

export interface MarketService {
  getTopCoins(): Promise<DataEnvelope<CryptoAsset[]>>;
  getGlobal(): Promise<DataEnvelope<GlobalMarket>>;
  getTrending(): Promise<DataEnvelope<TrendingCoin[]>>;
  getCoin(id: WhitelistedCoin): Promise<DataEnvelope<CoinDetail>>;
  getChart(id: WhitelistedCoin, range: ChartRange): Promise<DataEnvelope<PricePoint[]>>;
}

/**
 * Pure market logic: which provider, how to degrade, how to map. CoinMarketCap joins as the
 * fallback in a later step (spec 10.2); the envelope's `source` will then name it.
 */
export const createMarketService = ({
  repository,
  now = Date.now,
}: {
  repository: MarketRepository;
  now?: () => number;
}): MarketService => {
  const unavailableIfMissing = <T>(env: DataEnvelope<T | undefined>): DataEnvelope<T> =>
    env.data === undefined || env.data === null
      ? { ...env, data: null, status: "unavailable" }
      : (env as DataEnvelope<T>);

  return {
    getTopCoins: async () =>
      toEnvelope(await repository.coingeckoTop50(), {
        source: "coingecko",
        // 42 points (one per 4 h) is denser than the 96 px sparkline can show.
        map: (items) =>
          items.map((i) => {
            const asset = fromCoinGecko(i);
            return { ...asset, sparkline7d: thinSparkline(asset.sparkline7d, SPARKLINE_POINTS) };
          }),
        now: now(),
      }),
    getGlobal: async () =>
      toEnvelope(await repository.coingeckoGlobal(), {
        source: "coingecko",
        map: fromCoinGeckoGlobal,
        now: now(),
      }),
    getTrending: async () =>
      toEnvelope(await repository.coingeckoTrending(), {
        source: "coingecko",
        map: fromCoinGeckoTrending,
        now: now(),
      }),
    getCoin: async (id) =>
      unavailableIfMissing(
        toEnvelope(await repository.coingeckoTop50(), {
          source: "coingecko",
          map: (items) => {
            const item = items.find((i) => i.id === id);
            return item ? fromCoinGeckoDetail(item) : undefined;
          },
          now: now(),
        }),
      ),
    getChart: async (id, range) => {
      if (range === "7d") {
        // The top-50 call already carries a 7-day hourly sparkline: zero extra provider calls.
        const top = await repository.coingeckoTop50();
        return unavailableIfMissing(
          toEnvelope(top, {
            source: "coingecko",
            map: (items) => {
              const item = items.find((i) => i.id === id);
              const values = item?.sparkline_in_7d?.price;
              return values?.length ? sparklineToPoints(values, item!.last_updated) : undefined;
            },
            now: now(),
          }),
        );
      }
      return toEnvelope(await repository.coingeckoChart(id, range === "1y" ? 365 : 30), {
        source: "coingecko",
        map: (chart) => selectRange(range, fromCoinGeckoChart(chart)),
        now: now(),
      });
    },
  };
};

let service: MarketService | undefined;

/** Process-wide service for route handlers and Server Components. */
export const getMarketService = (): MarketService =>
  (service ??= createMarketService({ repository: getMarketRepository() }));
