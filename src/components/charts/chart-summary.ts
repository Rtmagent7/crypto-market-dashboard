import type { Direction } from "@/lib/format";
import type { PricePoint } from "@/modules/shared/domain";

export interface SeriesSummary {
  first: number;
  last: number;
  low: number;
  high: number;
  changePct: number;
  direction: Direction;
  from: string;
  to: string;
}

/** Numbers a screen reader gets instead of the canvas (spec §9: every chart is summarized). */
export const summarizeSeries = (points: readonly PricePoint[]): SeriesSummary | null => {
  if (points.length === 0) return null;
  const values = points.map((p) => p.v);
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const changePct = first === 0 ? 0 : Math.round(((last - first) / first) * 10_000) / 100;
  return {
    first,
    last,
    low: Math.min(...values),
    high: Math.max(...values),
    changePct,
    direction: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat",
    from: points[0]!.t,
    to: points[points.length - 1]!.t,
  };
};

/** lightweight-charts time: "YYYY-MM-DD" business days, otherwise UTC seconds. */
export const toChartTime = (t: string): string | number =>
  /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : Math.floor(Date.parse(t) / 1000);
