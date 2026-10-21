import type { FxRates } from "@/modules/shared/domain";

const rateOf = (code: string, fx: FxRates): number | undefined =>
  code === fx.base ? 1 : fx.rates[code];

/** Cross-rate conversion through the base currency. Pure, client-side, on cached rates. */
export const convert = (amount: number, from: string, to: string, fx: FxRates): number | null => {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;
  const fromRate = rateOf(from, fx);
  const toRate = rateOf(to, fx);
  if (fromRate === undefined || toRate === undefined || fromRate === 0) return null;
  return (amount / fromRate) * toRate;
};

/** The dashboard's home currencies lead; the rest follow alphabetically. */
const PINNED = ["USD", "IDR"];

export const currencyOptions = (fx: FxRates): string[] => {
  const all = new Set([fx.base, ...Object.keys(fx.rates)]);
  const pinned = PINNED.filter((c) => all.has(c));
  return [...pinned, ...[...all].filter((c) => !PINNED.includes(c)).sort()];
};
