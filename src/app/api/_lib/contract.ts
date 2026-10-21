import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import type { CryptoAsset, DataEnvelope, FxRates } from "../../../modules/shared/domain";

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
