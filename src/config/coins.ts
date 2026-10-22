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

/**
 * CoinMarketCap slugs that differ from CoinGecko ids, from the two top-50 fixtures
 * (2026-10-22). The CMC fallback maps through this, so `/coins/[id]` links and saved
 * watchlists keep the same ids whichever provider served the table.
 */
export const COINMARKETCAP_SLUG_TO_COINGECKO_ID: Readonly<Record<string, string>> = {
  bnb: "binancecoin",
  xrp: "ripple",
  "unus-sed-leo": "leo-token",
  "near-protocol": "near",
  "multi-collateral-dai": "dai",
  avalanche: "avalanche-2",
  usd1: "usd1-wlfi",
  gram: "the-open-network",
  hedera: "hedera-hashgraph",
  "global-dollar-usdg": "global-dollar",
  cronos: "crypto-com-chain",
  quant: "quant-network",
  "worldcoin-org": "worldcoin-wld",
};

export const CHART_RANGES = ["1d", "7d", "30d", "1y"] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
