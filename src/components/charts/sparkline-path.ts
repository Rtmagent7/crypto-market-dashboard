import type { Direction } from "@/lib/format";

export interface SparklineGeometry {
  path: string;
  last: { x: number; y: number };
  trend: { direction: Direction; changePct: number };
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** Evenly spaced sample that always keeps the first and the last point. */
const downsample = (values: readonly number[], maxPoints: number): readonly number[] => {
  if (values.length <= maxPoints) return values;
  const step = (values.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => values[Math.round(i * step)]!);
};

/** Pure SVG path math for the 96×28 sparkline (spec 9A): no chart library, server-renderable. */
export const sparklineGeometry = (
  series: readonly number[],
  width: number,
  height: number,
  pad = 2,
  maxPoints = 56,
): SparklineGeometry | null => {
  if (series.length === 0) return null;
  const values = downsample(series, maxPoints);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const xAt = (i: number): number =>
    round(pad + (values.length === 1 ? innerW : (i / (values.length - 1)) * innerW));
  const yAt = (v: number): number =>
    round(span === 0 ? height / 2 : pad + (1 - (v - min) / span) * innerH);

  const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const first = series[0]!;
  const lastValue = series[series.length - 1]!;
  const changePct = first === 0 ? 0 : round(((lastValue - first) / first) * 100);

  return {
    path: points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" "),
    last: points[points.length - 1]!,
    trend: { direction: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat", changePct },
  };
};
