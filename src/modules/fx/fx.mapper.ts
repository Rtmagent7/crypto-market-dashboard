import type { ErOpenLatest } from "@/infra/providers/exchangerate.schema";
import type { FfLatest, FfRange } from "@/infra/providers/frankfurter.schema";
import type { FxRates, PricePoint } from "@/modules/shared/domain";

export const fromFrankfurter = (r: FfLatest): FxRates => ({
  base: r.base,
  date: r.date,
  rates: r.rates,
});

export const fromExchangeRate = (r: ErOpenLatest): FxRates => {
  // The open endpoint includes the base itself (USD: 1); Frankfurter does not — match it.
  const rates = Object.fromEntries(
    Object.entries(r.rates).filter(([code]) => code !== r.base_code),
  );
  return {
    base: r.base_code,
    date: new Date(r.time_last_update_unix * 1000).toISOString().slice(0, 10),
    rates,
  };
};

/** Daily closes for one currency, oldest first (Frankfurter keys are ISO dates). */
export const fromFrankfurterRange = (r: FfRange, currency: string): PricePoint[] =>
  Object.entries(r.rates)
    .flatMap(([date, rates]) =>
      rates[currency] === undefined ? [] : [{ t: date, v: rates[currency] }],
    )
    .sort((a, b) => a.t.localeCompare(b.t));
