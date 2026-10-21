import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const WARN = 0.7;
const CAP = 0.8;
const count = new Intl.NumberFormat("en-US");

/**
 * Quota meter (spec 9A): ticks at 70% and 80% of the enforced cap; the bar turns amber past 70%
 * and coral past 80%. Exposed as role="meter" with a spoken value.
 */
export function QuotaMeter({
  used,
  cap,
  period,
  label,
}: {
  used: number;
  cap: number;
  period: "day" | "month";
  label: string;
}): ReactNode {
  const share = Math.min(1, used / cap);
  const pct = Math.round(share * 100);
  const when = period === "day" ? "today" : "this month";
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <div
        role="meter"
        aria-label={`${label} quota`}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={used}
        aria-valuetext={`${pct}% of ${when}'s cap (${count.format(used)} of ${count.format(cap)} calls)`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn(
            "h-full rounded-full",
            share >= CAP ? "bg-down" : share >= WARN ? "bg-stale" : "bg-accent",
          )}
          style={{ width: `${Math.max(share > 0 ? 2 : 0, share * 100)}%` }}
        />
        <span aria-hidden className="absolute inset-y-0 left-[70%] w-px bg-text/60" />
        <span aria-hidden className="absolute inset-y-0 left-[80%] w-px bg-text/60" />
      </div>
      <span className="text-meta text-muted tabular-nums">
        {count.format(used)} / {count.format(cap)} {when} · {pct}%
      </span>
    </div>
  );
}
