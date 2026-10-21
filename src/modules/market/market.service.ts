import type {
  CryptoAsset,
  DataEnvelope,
  GlobalMarket,
  TrendingCoin,
} from "@/modules/shared/domain";
import { toEnvelope } from "@/modules/shared/envelope";

import { fromCoinGecko, fromCoinGeckoGlobal, fromCoinGeckoTrending } from "./market.mapper";
import type { MarketRepository } from "./market.repository";

export interface MarketService {
  getTopCoins(): Promise<DataEnvelope<CryptoAsset[]>>;
  getGlobal(): Promise<DataEnvelope<GlobalMarket>>;
  getTrending(): Promise<DataEnvelope<TrendingCoin[]>>;
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
}): MarketService => ({
  getTopCoins: async () =>
    toEnvelope(await repository.coingeckoTop50(), {
      source: "coingecko",
      map: (items) => items.map(fromCoinGecko),
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
});
