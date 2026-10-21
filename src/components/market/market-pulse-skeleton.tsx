import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const FIGURES = ["Global market cap", "BTC dominance", "24h volume", "USD/IDR"] as const;

/**
 * Market Pulse strip, loading state. Mobile: horizontal scroll with snap points;
 * tablet: 2 × 2; desktop: one row of four. Figure height is fixed (CLS-safe).
 */
export function MarketPulseSkeleton(): ReactNode {
  return (
    <section
      aria-labelledby="pulse-title"
      className="overflow-hidden rounded-panel bg-surface [grid-area:pulse]"
    >
      <div aria-hidden className="h-0.5 w-full bg-line" />
      <h2 id="pulse-title" className="sr-only">
        Market pulse
      </h2>
      <dl className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 py-4 tablet:grid tablet:grid-cols-2 tablet:overflow-visible desktop:grid-cols-4 desktop:px-5">
        {FIGURES.map((label) => (
          <div key={label} className="flex min-w-40 shrink-0 snap-start flex-col-reverse gap-1">
            <dt className="text-meta text-muted">{label}</dt>
            <dd className="flex h-6 items-center font-condensed text-2xl leading-6 font-semibold desktop:h-9 desktop:text-pulse">
              <Skeleton className="h-5 w-28 desktop:h-7" />
              <span className="sr-only">Loading</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
