// Internal domain model (spec Section 6.1). Every provider maps into these shapes, so
// swapping CoinGecko for CoinMarketCap changes no UI code.

export type ProviderId =
  | "coingecko"
  | "coinmarketcap"
  | "twelvedata"
  | "finnhub"
  | "frankfurter"
  | "exchangerate"
  | "groq"
  | "workers-ai";

export type DataStatus = "fresh" | "stale" | "unavailable";

export interface DataEnvelope<T> {
  data: T | null;
  status: DataStatus;
  source: ProviderId;
  fetchedAt: string; // ISO 8601
  nextRefreshAt: string; // ISO 8601, used by the client to schedule polling
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  priceUsd: number;
  marketCapUsd: number;
  rank: number;
  change24hPct: number | null;
  sparkline7d: number[];
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  isMarketOpen: boolean;
  asOf: string;
}

export interface PricePoint {
  t: string;
  v: number;
}

export interface FxRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface GlobalMarket {
  totalMarketCapUsd: number;
  marketCapChange24hPct: number;
  btcDominancePct: number | null;
  /** null when the provider reports an implausible value (see market.mapper.ts). */
  volume24hUsd: number | null;
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  thumbUrl: string;
  rank: number | null;
  priceUsd: number;
  change24hPct: number | null;
}

export interface UsdIdr {
  rate: number;
  /** Business day the rate applies to (YYYY-MM-DD). */
  date: string;
  /** Change against the previous business day; null when history is unavailable. */
  change1dPct: number | null;
  /** One year of daily USD/IDR closes, oldest first. */
  history: PricePoint[];
}

export interface CoinDetail extends CryptoAsset {
  volume24hUsd: number | null;
  athUsd: number | null;
  circulatingSupply: number | null;
  high24hUsd: number | null;
  low24hUsd: number | null;
}
