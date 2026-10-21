import type { ChartRange } from "@/config/coins";
import type { PricePoint } from "@/modules/shared/domain";

const HOUR_MS = 3_600_000;

/** 1D comes from the hourly 30-day series (no extra provider call, spec §9 Charts). */
export const selectRange = (range: ChartRange, points: readonly PricePoint[]): PricePoint[] => {
  if (range !== "1d" || points.length === 0) return [...points];
  const cutoff = Date.parse(points[points.length - 1]!.t) - 24 * HOUR_MS;
  return points.filter((p) => Date.parse(p.t) >= cutoff);
};

/** The 7-day sparkline is hourly and ends at the data's fetch time; give each value a time. */
export const sparklineToPoints = (values: readonly number[], endIso: string): PricePoint[] => {
  const end = Date.parse(endIso);
  return values.map((v, i) => ({
    t: new Date(end - (values.length - 1 - i) * HOUR_MS).toISOString(),
    v,
  }));
};
