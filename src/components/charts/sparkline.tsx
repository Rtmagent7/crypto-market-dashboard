import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { sparklineGeometry } from "./sparkline-path";

const W = 96;
const H = 28;
const TONE = { up: "text-up", down: "text-down", flat: "text-muted" } as const;

/** 96×28 pure-SVG sparkline (spec 9A): 1.5 px stroke, no fill or axes, end dot. */
export function Sparkline({
  values,
  period = "7-day",
  label,
  className,
}: {
  values: readonly number[];
  /** Spoken as "<period> trend: up 4.2%". */
  period?: string;
  /** Replaces the computed name, e.g. for rates where a percent change would mislead. */
  label?: string;
  className?: string;
}): ReactNode {
  const g = sparklineGeometry(values, W, H);
  if (!g) {
    // Same box as a drawn sparkline, so a series arriving later never shifts table columns.
    return (
      <span
        className="inline-flex h-7 w-24 items-center justify-center text-meta text-muted"
        style={{ width: W, height: H }}
      >
        <span aria-hidden>—</span>
        <span className="sr-only">No {period} data yet</span>
      </span>
    );
  }
  const { direction, changePct } = g.trend;
  const name =
    label ??
    `${period} trend: ${direction === "flat" ? "flat" : `${direction} ${Math.abs(changePct).toFixed(1)}%`}`;

  return (
    <svg
      role="img"
      aria-label={name}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={cn("inline-block shrink-0", TONE[direction], className)}
    >
      <path
        d={g.path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={g.last.x} cy={g.last.y} r={2} fill="currentColor" />
    </svg>
  );
}
