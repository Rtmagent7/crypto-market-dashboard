"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatIdr, formatUsd } from "@/lib/format";
import type { PricePoint } from "@/modules/shared/domain";

import { summarizeSeries } from "./chart-summary";

const PriceChart = dynamic(() => import("./price-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-control" />,
});

const FORMATS = {
  usd: formatUsd,
  idr: formatIdr,
  plain: (v: number): string => v.toLocaleString("en-US", { maximumSignificantDigits: 6 }),
} as const;

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const day = (t: string): string => DATE.format(Date.parse(t));

/**
 * Chart + accessible summary. The canvas library loads on demand (code splitting); screen
 * readers get the trend as text and a hidden table instead of the canvas.
 */
export function LazyPriceChart({
  points,
  format,
  label,
}: {
  points: readonly PricePoint[];
  format: keyof typeof FORMATS;
  label: string;
}): ReactNode {
  const fmt = FORMATS[format];
  const summary = summarizeSeries(points);
  if (!summary) return <p className="text-cell text-muted">No history available.</p>;

  const sign = summary.changePct > 0 ? "up" : summary.changePct < 0 ? "down" : "flat";
  return (
    <figure className="flex flex-col gap-2">
      <div className="h-60 desktop:h-90">
        <PriceChart points={points} format={fmt} />
      </div>
      <figcaption className="sr-only">
        {label}: {sign} {Math.abs(summary.changePct)}% from {day(summary.from)} to {day(summary.to)}
        .
      </figcaption>
      <table className="sr-only">
        <caption>{label} summary</caption>
        <tbody>
          <tr>
            <th scope="row">First</th>
            <td>{fmt(summary.first)}</td>
          </tr>
          <tr>
            <th scope="row">Last</th>
            <td>{fmt(summary.last)}</td>
          </tr>
          <tr>
            <th scope="row">Low</th>
            <td>{fmt(summary.low)}</td>
          </tr>
          <tr>
            <th scope="row">High</th>
            <td>{fmt(summary.high)}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
