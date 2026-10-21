import type { BudgetPeriod } from "./budgets";

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Memoized per timezone: building an Intl formatter is the expensive part. */
const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

/** Quota period bucket computed in the provider's reset timezone: "YYYY-MM-DD" or "YYYY-MM". */
export const periodKey = (period: BudgetPeriod, resetTz: string, nowMs: number): string => {
  const day = formatterFor(resetTz).format(nowMs); // en-CA → YYYY-MM-DD
  return period === "day" ? day : day.slice(0, 7);
};

/** Per-minute bucket. Providers restore per-minute allowances at the start of each minute. */
export const minuteKey = (nowMs: number): string => new Date(nowMs).toISOString().slice(0, 16);

/** Counter lifetime: the period plus a margin, so yesterday's usage stays readable. */
export const periodTtlSeconds = (period: BudgetPeriod): number =>
  period === "day" ? 2 * 86_400 : 32 * 86_400;
