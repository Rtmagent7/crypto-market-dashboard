import { z } from "zod";

// Built from tests/fixtures/finnhub-*.json (captured 2026-10-22).

/** Unknown symbols answer 200 with c = 0, t = 0 and null changes. */
export const FhQuote = z.object({
  c: z.number(),
  d: z.number().nullable(),
  dp: z.number().nullable(),
  h: z.number(),
  l: z.number(),
  o: z.number(),
  pc: z.number(),
  t: z.number().int(),
});

export const FhMarketStatus = z.object({
  exchange: z.string(),
  holiday: z.string().nullable(),
  isOpen: z.boolean(),
  session: z.string().nullable(),
  t: z.number().int(),
  timezone: z.string(),
});

export type FhQuote = z.infer<typeof FhQuote>;
export type FhMarketStatus = z.infer<typeof FhMarketStatus>;
