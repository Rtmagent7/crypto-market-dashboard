import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { CHART_RANGES, COIN_WHITELIST } from "../../../config/coins";
import type {
  CryptoAsset,
  DataEnvelope,
  FxRates,
  PricePoint,
  ProviderStatus,
} from "../../../modules/shared/domain";

// Public HTTP contract of /api/*, documented in docs/openapi.yaml (`npm run openapi`).
// Relative imports only: scripts/generate-openapi.mts runs this file outside Next.js.

extendZodWithOpenApi(z);

const ProviderId = z
  .enum([
    "coingecko",
    "coinmarketcap",
    "twelvedata",
    "finnhub",
    "frankfurter",
    "exchangerate",
    "groq",
    "workers-ai",
    "internal",
  ])
  .openapi("ProviderId");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the inferred Zod type is the point
const envelope = <T extends z.ZodType>(name: string, data: T) =>
  z
    .object({
      data: data.nullable().openapi({ description: "null only when status is `unavailable`" }),
      status: z.enum(["fresh", "stale", "unavailable"]),
      source: ProviderId.openapi({ description: "Provider that actually served the data" }),
      fetchedAt: z.iso.datetime().openapi({ description: "When the data was fetched (ISO 8601)" }),
      nextRefreshAt: z.iso
        .datetime()
        .openapi({ description: "Do not poll again before this time (ISO 8601)" }),
    })
    .openapi(name);

export const CryptoAssetSchema = z
  .object({
    id: z.string().openapi({ example: "bitcoin" }),
    symbol: z.string().openapi({ example: "BTC" }),
    name: z.string().openapi({ example: "Bitcoin" }),
    imageUrl: z.url(),
    priceUsd: z.number().openapi({ example: 84456 }),
    marketCapUsd: z.number(),
    rank: z.number().int().openapi({ description: "0 when the provider has no rank" }),
    change24hPct: z.number().nullable(),
    sparkline7d: z
      .array(z.number())
      .openapi({ description: "7 days of hourly prices, oldest first" }),
  })
  .openapi("CryptoAsset");

export const MarketEnvelopeSchema = envelope("MarketEnvelope", z.array(CryptoAssetSchema));

export const PricePointSchema = z
  .object({
    t: z.string().openapi({ description: "ISO 8601 time, or YYYY-MM-DD for daily series" }),
    v: z.number(),
  })
  .openapi("PricePoint");

export const ChartEnvelopeSchema = envelope("ChartEnvelope", z.array(PricePointSchema));

export const ProviderStatusSchema = z
  .object({
    id: z.string().openapi({ example: "coingecko" }),
    name: z.string().openapi({ example: "CoinGecko" }),
    role: z.enum(["core", "backup", "optional"]),
    serves: z.string().openapi({ example: "Crypto prices" }),
    state: z.enum(["operational", "degraded", "down", "standby"]),
    reason: z.string().nullable(),
    quotaUsed: z.number().int(),
    quotaCap: z
      .number()
      .int()
      .openapi({ description: "Enforced cap (80% of the provider limit × BUDGET_CAP_RATIO)" }),
    quotaPeriod: z.enum(["day", "month"]),
    lastDataAt: z.string().nullable(),
    fallbackActive: z.string().nullable(),
  })
  .openapi("ProviderStatus");

export const StatusEnvelopeSchema = envelope("StatusEnvelope", z.array(ProviderStatusSchema));

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");

export const FxRatesSchema = z
  .object({
    base: z.string().length(3).openapi({ example: "USD" }),
    date: z
      .string()
      .openapi({ description: "Business day of the rates (YYYY-MM-DD)", example: "2026-10-21" }),
    rates: z.record(z.string(), z.number()).openapi({ example: { IDR: 18043, EUR: 0.86155 } }),
  })
  .openapi("FxRates");

export const FxEnvelopeSchema = envelope("FxEnvelope", FxRatesSchema);

// Compile-time guard: the documented contract must equal the domain model exactly.
type Equals<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;
const assertContract = <T extends true>(): T => true as T;
assertContract<Equals<z.infer<typeof CryptoAssetSchema>, CryptoAsset>>();
assertContract<Equals<z.infer<typeof MarketEnvelopeSchema>, DataEnvelope<CryptoAsset[]>>>();
assertContract<Equals<z.infer<typeof FxRatesSchema>, FxRates>>();
assertContract<Equals<z.infer<typeof PricePointSchema>, PricePoint>>();
assertContract<Equals<z.infer<typeof ProviderStatusSchema>, ProviderStatus>>();
assertContract<Equals<z.infer<typeof StatusEnvelopeSchema>, DataEnvelope<ProviderStatus[]>>>();
assertContract<Equals<z.infer<typeof ChartEnvelopeSchema>, DataEnvelope<PricePoint[]>>>();
assertContract<Equals<z.infer<typeof FxEnvelopeSchema>, DataEnvelope<FxRates>>>();

export const registry = new OpenAPIRegistry();

const unavailable = (schema: z.ZodType): object => ({
  description: "No cached data and no provider can be called (budget, breaker or outage).",
  headers: { "Retry-After": { schema: { type: "integer" as const }, description: "Seconds" } },
  content: { "application/json": { schema } },
});

registry.registerPath({
  method: "get",
  path: "/api/market",
  summary: "Top 50 coins by market cap with a 7-day sparkline",
  description:
    "Served from the shared cache; the provider is called at most once per TTL (15 min). " +
    "`Cache-Control: s-maxage` equals the seconds until `nextRefreshAt`.",
  tags: ["market"],
  responses: {
    200: {
      description: "Fresh or stale data. Stale responses carry the original `fetchedAt`.",
      content: { "application/json": { schema: MarketEnvelopeSchema } },
    },
    429: { description: "Rate limited (per hashed IP). Retry after `Retry-After` seconds." },
    503: unavailable(MarketEnvelopeSchema),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/fx",
  summary: "Latest USD exchange rates",
  description:
    "Frankfurter (ECB reference rates, TTL 6 h); ExchangeRate-API serves as the backup and is " +
    "named in `source` when it was used.",
  tags: ["fx"],
  responses: {
    200: {
      description: "Fresh or stale rates.",
      content: { "application/json": { schema: FxEnvelopeSchema } },
    },
    429: { description: "Rate limited (per hashed IP). Retry after `Retry-After` seconds." },
    503: unavailable(FxEnvelopeSchema),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/coins/{id}/chart",
  summary: "Price history for a whitelisted coin",
  description:
    "1d and 30d share the hourly 30-day series (TTL 6 h); 1y is daily (TTL 24 h); 7d comes from " +
    "the top-50 sparkline at no extra provider cost. Parameters are validated against the " +
    "whitelist before any cache or provider access.",
  tags: ["market"],
  request: {
    params: z.object({ id: z.enum(COIN_WHITELIST).openapi({ example: "bitcoin" }) }),
    query: z.object({ range: z.enum(CHART_RANGES).optional().openapi({ example: "30d" }) }),
  },
  responses: {
    200: {
      description: "Fresh or stale series.",
      content: { "application/json": { schema: ChartEnvelopeSchema } },
    },
    400: {
      description: "Malformed id or unknown range.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Coin is not on the whitelist.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    429: { description: "Rate limited (per hashed IP). Retry after `Retry-After` seconds." },
    503: unavailable(ChartEnvelopeSchema),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/status",
  summary: "Provider health and quota use",
  description:
    "Read live from the same Redis counters, circuit breakers and cache entries the quota guard " +
    "uses. Never cached (`Cache-Control: no-store`); the page polls it every 60 s.",
  tags: ["status"],
  responses: {
    200: {
      description: "Current provider status.",
      content: { "application/json": { schema: StatusEnvelopeSchema } },
    },
    429: { description: "Rate limited (per hashed IP). Retry after `Retry-After` seconds." },
  },
});
