import { z } from "zod";

// Built from tests/fixtures/twelvedata-*.json — real 8-ticker batches (2026-10-21).
// Twelve Data sends numbers as strings → z.coerce (spec 6.2).
const num = z.coerce.number();

export const TdQuote = z.object({
  symbol: z.string(),
  name: z.string(),
  close: num,
  change: num,
  percent_change: num,
  is_market_open: z.boolean(),
  datetime: z.string(),
  timestamp: z.number().int(),
  last_quote_at: z.number().int().optional(),
});

/** A per-symbol failure inside a batch; the rest of the batch stays usable. */
export const TdSymbolError = z.object({
  code: z.number(),
  message: z.string(),
  status: z.literal("error"),
});

export const TdQuoteBatch = z.record(z.string(), z.union([TdQuote, TdSymbolError]));

export const TdSeries = z.object({
  meta: z.object({
    symbol: z.string(),
    interval: z.string(),
    exchange_timezone: z.string(),
  }),
  values: z.array(z.object({ datetime: z.string(), close: num })),
  status: z.literal("ok"),
});

export const TdSeriesBatch = z.record(z.string(), z.union([TdSeries, TdSymbolError]));

export type TdQuote = z.infer<typeof TdQuote>;
export type TdQuoteBatch = z.infer<typeof TdQuoteBatch>;
export type TdSeries = z.infer<typeof TdSeries>;
export type TdSeriesBatch = z.infer<typeof TdSeriesBatch>;
