import { CACHE_POLICY } from "./cache-policy";

/**
 * Providers shown on /status, in display order. `cacheKey` is the dataset whose age is reported;
 * `keyEnv` is the env var that must be set for the provider to be usable (null = keyless).
 */
export const STATUS_PROVIDERS = [
  {
    id: "coingecko",
    name: "CoinGecko",
    role: "core",
    serves: "Crypto prices",
    cacheKey: "coingecko:markets:top50",
    ttl: CACHE_POLICY["coingecko:markets"].ttl,
    keyEnv: "COINGECKO_API_KEY",
    backup: "coinmarketcap",
  },
  {
    id: "coinmarketcap",
    name: "CoinMarketCap",
    role: "backup",
    serves: "Crypto prices (backup)",
    cacheKey: "coinmarketcap:listings",
    ttl: CACHE_POLICY["coingecko:markets"].ttl,
    keyEnv: "CMC_API_KEY",
    backup: null,
  },
  {
    id: "twelvedata",
    name: "Twelve Data",
    role: "core",
    serves: "US stocks",
    cacheKey: "twelvedata:quote",
    ttl: CACHE_POLICY["twelvedata:quote-closed"].ttl,
    keyEnv: "TWELVEDATA_API_KEY",
    backup: "finnhub",
  },
  {
    id: "finnhub",
    name: "Finnhub",
    role: "backup",
    serves: "US stocks (backup)",
    cacheKey: "finnhub:quote",
    ttl: CACHE_POLICY["twelvedata:quote-open"].ttl,
    keyEnv: "FINNHUB_API_KEY",
    backup: null,
  },
  {
    id: "frankfurter",
    name: "Frankfurter",
    role: "core",
    serves: "FX rates",
    cacheKey: "frankfurter:latest:USD",
    ttl: CACHE_POLICY["frankfurter:latest"].ttl,
    keyEnv: null,
    backup: "exchangerate",
  },
  {
    id: "exchangerate",
    name: "ExchangeRate-API",
    role: "backup",
    serves: "FX rates (backup)",
    cacheKey: "exchangerate:latest:USD",
    ttl: CACHE_POLICY["exchangerate:latest"].ttl,
    keyEnv: null,
    backup: null,
  },
  {
    id: "groq:summary",
    name: "Groq",
    role: "core",
    serves: "AI market brief",
    cacheKey: "groq:summary",
    ttl: CACHE_POLICY["groq:summary"].ttl,
    keyEnv: "GROQ_API_KEY",
    backup: "workers-ai",
  },
  {
    id: "workers-ai",
    name: "Cloudflare Workers AI",
    role: "backup",
    serves: "AI market brief (backup)",
    cacheKey: "workers-ai:summary",
    ttl: CACHE_POLICY["groq:summary"].ttl,
    keyEnv: "CF_AI_TOKEN",
    backup: null,
  },
] as const;

export type StatusProviderId = (typeof STATUS_PROVIDERS)[number]["id"];
