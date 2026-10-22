import { z } from "zod";

// Built from tests/fixtures/coinmarketcap-listings.json (captured 2026-10-22). Only the
// fields the domain uses are validated; the rest are stripped.

const CmcUsdQuote = z.object({
  price: z.number(),
  volume_24h: z.number().nullable(),
  percent_change_24h: z.number().nullable(),
  market_cap: z.number(),
});

export const CmcListing = z.object({
  id: z.number().int(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  cmc_rank: z.number().int().nullable(),
  circulating_supply: z.number().nullable(),
  last_updated: z.string(),
  quote: z.object({ USD: CmcUsdQuote }),
});

export const CmcListings = z.object({
  status: z.object({
    error_code: z.number(),
    error_message: z.string().nullable(),
    credit_count: z.number(),
  }),
  data: z.array(CmcListing),
});

export type CmcListing = z.infer<typeof CmcListing>;
export type CmcListings = z.infer<typeof CmcListings>;
