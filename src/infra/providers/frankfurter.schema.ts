import { z } from "zod";

// Built from tests/fixtures/frankfurter-*.json (captured 2026-10-21).
const Currency = z.string().length(3);
const Rates = z.record(Currency, z.number());

export const FfLatest = z.object({
  amount: z.number(),
  base: Currency,
  date: z.iso.date(),
  rates: Rates,
});

export const FfRange = z.object({
  amount: z.number(),
  base: Currency,
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  rates: z.record(z.iso.date(), Rates),
});

export type FfLatest = z.infer<typeof FfLatest>;
export type FfRange = z.infer<typeof FfRange>;
