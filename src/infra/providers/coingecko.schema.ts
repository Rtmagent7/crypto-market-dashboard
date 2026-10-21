import { z } from "zod";

// Built from tests/fixtures/coingecko-*.json (captured 2026-10-21), not from docs alone.
// Core fields are strict; secondary metrics are nullable because CoinGecko sends null for
// young or illiquid coins, and one null must not invalidate the whole top-50 list.

const metric = z.number().nullable();

export const CgMarketItem = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.url(),
  current_price: z.number(),
  market_cap: z.number(),
  market_cap_rank: z.number().int().nullable(),
  total_volume: metric,
  high_24h: metric,
  low_24h: metric,
  price_change_percentage_24h: metric,
  circulating_supply: metric,
  ath: metric,
  sparkline_in_7d: z.object({ price: z.array(z.number()) }).optional(),
  last_updated: z.string(),
});
export const CgMarkets = z.array(CgMarketItem);

const ByCurrency = z.record(z.string(), z.number());

export const CgGlobal = z.object({
  data: z.object({
    active_cryptocurrencies: z.number().int(),
    total_market_cap: ByCurrency,
    total_volume: ByCurrency,
    market_cap_percentage: ByCurrency,
    market_cap_change_percentage_24h_usd: z.number(),
    updated_at: z.number().int(),
  }),
});

export const CgTrending = z.object({
  coins: z.array(
    z.object({
      item: z.object({
        id: z.string(),
        name: z.string(),
        symbol: z.string(),
        market_cap_rank: z.number().int().nullable(),
        thumb: z.url(),
        small: z.url(),
        score: z.number().int(),
        data: z.object({
          price: z.number(),
          price_change_percentage_24h: z.record(z.string(), z.number()).optional(),
        }),
      }),
    }),
  ),
});

const Series = z.array(z.tuple([z.number(), z.number()]));

export const CgMarketChart = z.object({
  prices: Series,
  market_caps: Series,
  total_volumes: Series,
});

export type CgMarketItem = z.infer<typeof CgMarketItem>;
export type CgGlobal = z.infer<typeof CgGlobal>;
export type CgTrending = z.infer<typeof CgTrending>;
export type CgMarketChart = z.infer<typeof CgMarketChart>;
