import type { ProviderId } from "@/modules/shared/domain";

/** The UI always names the provider that actually served the number (spec 9A). */
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  coingecko: "CoinGecko",
  coinmarketcap: "CoinMarketCap",
  twelvedata: "Twelve Data",
  finnhub: "Finnhub",
  frankfurter: "Frankfurter",
  exchangerate: "ExchangeRate-API",
  groq: "Groq",
  "workers-ai": "Cloudflare Workers AI",
  internal: "Tidewater",
};
