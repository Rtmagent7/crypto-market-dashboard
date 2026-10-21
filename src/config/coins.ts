/**
 * Coins with a detail page: the top 10 by market cap, frozen on 2026-10-21 from
 * tests/fixtures/coingecko-markets.json (spec §3). Editing this list changes which
 * `/coins/[id]` pages and `/api/coins/[id]/chart` keys exist — and so the chart quota.
 */
export const COIN_WHITELIST = [
  "bitcoin",
  "ethereum",
  "tether",
  "binancecoin",
  "ripple",
  "usd-coin",
  "solana",
  "tron",
  "figure-heloc",
  "zcash",
] as const;

export type WhitelistedCoin = (typeof COIN_WHITELIST)[number];

export const isWhitelistedCoin = (id: string): id is WhitelistedCoin =>
  (COIN_WHITELIST as readonly string[]).includes(id);

export const CHART_RANGES = ["1d", "7d", "30d", "1y"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
