import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { sparklineGeometry } from "./sparkline-path";

const W = 96;
const H = 28;
const TONE = { up: "text-up", down: "text-down", flat: "text-muted" } as const;

/** 96×28 pure-SVG 7-day sparkline (spec 9A): 1.5 px stroke, no fill or axes, end dot. */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}): ReactNode {
  const g = sparklineGeometry(values, W, H);
  if (!g) {
    return <span className="text-meta text-muted">—</span>;
  }
  const { direction, changePct } = g.trend;
  const label = `7-day trend: ${direction === "flat" ? "flat" : `${direction} ${Math.abs(changePct).toFixed(1)}%`}`;

  return (
    <svg
      role="img"
      aria-label={label}
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
