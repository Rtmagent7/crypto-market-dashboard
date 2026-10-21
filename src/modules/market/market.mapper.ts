import type {
  CgGlobal,
  CgMarketChart,
  CgMarketItem,
  CgTrending,
} from "@/infra/providers/coingecko.schema";
import type {
  CoinDetail,
  CryptoAsset,
  GlobalMarket,
  PricePoint,
  TrendingCoin,
} from "@/modules/shared/domain";

/** Provider → domain (spec 6.3). Swapping providers changes only this file, never the UI. */
export const fromCoinGecko = (i: CgMarketItem): CryptoAsset => ({
  id: i.id,
  symbol: i.symbol.toUpperCase(),
  name: i.name,
  imageUrl: i.image,
  priceUsd: i.current_price,
  marketCapUsd: i.market_cap,
  rank: i.market_cap_rank ?? 0,
  change24hPct: i.price_change_percentage_24h,
  sparkline7d: i.sparkline_in_7d?.price ?? [],
});

/**
 * Daily crypto volume runs at a fraction of total market cap (typically 2–10%). A reading
 * above 5× market cap is a provider glitch — the real 2026-10-21 fixture reported ~1e5× —
 * so it is hidden rather than displayed as fact.
 */
const MAX_PLAUSIBLE_VOLUME_TO_CAP = 5;

export const fromCoinGeckoGlobal = ({ data }: CgGlobal): GlobalMarket => {
  const cap = data.total_market_cap.usd ?? 0;
  const volume = data.total_volume.usd;
  return {
    totalMarketCapUsd: cap,
    marketCapChange24hPct: data.market_cap_change_percentage_24h_usd,
    btcDominancePct: data.market_cap_percentage.btc ?? null,
    volume24hUsd:
      volume !== undefined && cap > 0 && volume <= cap * MAX_PLAUSIBLE_VOLUME_TO_CAP
        ? volume
        : null,
  };
};

/** The Trending panel shows five rows (spec 9A layout). */
const TRENDING_ROWS = 5;

export const fromCoinGeckoTrending = ({ coins }: CgTrending): TrendingCoin[] =>
  coins.slice(0, TRENDING_ROWS).map(({ item }) => ({
    id: item.id,
    symbol: item.symbol.toUpperCase(),
    name: item.name,
    thumbUrl: item.small,
    rank: item.market_cap_rank,
    priceUsd: item.data.price,
    change24hPct: item.data.price_change_percentage_24h?.usd ?? null,
  }));

/** The same market item, plus the stats grid of the coin detail page (spec 9A). */
export const fromCoinGeckoDetail = (i: CgMarketItem): CoinDetail => ({
  ...fromCoinGecko(i),
  volume24hUsd: i.total_volume,
  athUsd: i.ath,
  circulatingSupply: i.circulating_supply,
  high24hUsd: i.high_24h,
  low24hUsd: i.low_24h,
});

export const fromCoinGeckoChart = (c: CgMarketChart): PricePoint[] =>
  c.prices.map(([ms, v]) => ({ t: new Date(ms).toISOString(), v }));
