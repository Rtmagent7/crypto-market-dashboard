"use client";

import type { ReactNode } from "react";

import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { DataStatus } from "@/modules/shared/domain";

import { railFraction } from "./freshness";

/**
 * Signature element (spec 9A): a 2 px rail along the panel's top edge showing the time left
 * until the next refresh. Fresh: violet, shrinking. Stale: full-width amber, still.
 * Decorative only — the "Updated … ago" text carries the meaning.
 */
export function FreshnessRail({
  status,
  fetchedAt,
  nextRefreshAt,
}: {
  status: DataStatus;
  fetchedAt: string;
  nextRefreshAt: string;
}): ReactNode {
  const reduced = useReducedMotion();
  // Ticks every 5 s and glides between ticks with a linear transition (GPU: transform only).
  const now = useNow(reduced ? 60_000 : 5_000);
  const fraction =
    status === "fresh"
      ? railFraction({
          fetchedAt: Date.parse(fetchedAt),
          nextRefreshAt: Date.parse(nextRefreshAt),
          now,
        })
      : 1;

  return (
    <div
      aria-hidden
      className="h-0.5 w-full overflow-hidden bg-line"
      data-testid="freshness-rail"
      data-status={status}
    >
      <div
        suppressHydrationWarning
        className={cn(
          "h-full origin-left",
          status === "fresh" ? "bg-accent" : status === "stale" ? "bg-stale" : "bg-line",
          !reduced &&
            status === "fresh" &&
            "motion-safe:transition-transform motion-safe:duration-[5000ms] motion-safe:ease-linear",
        )}
        style={{ transform: `scaleX(${fraction})` }}
      />
    </div>
  );
}
