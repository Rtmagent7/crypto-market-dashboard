import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { CoinTableSkeleton } from "@/components/market/coin-table-skeleton";
import { DensityToggle } from "@/components/market/density-toggle";
import { MarketPulseSkeleton } from "@/components/market/market-pulse-skeleton";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

import { AiBrief } from "./_widgets/ai-brief";
import { FxPanel } from "./_widgets/fx-panel";
import { MarketPulse } from "./_widgets/market-pulse";
import { TopCoins } from "./_widgets/top-coins";
import { Trending } from "./_widgets/trending";

export const metadata: Metadata = { title: "Overview" };

function TopCoinsSkeleton(): ReactNode {
  return (
    <Panel
      id="top-coins"
      title="Top 50 coins"
      actions={<DensityToggle />}
      className="[grid-area:table]"
    >
      <CoinTableSkeleton />
    </Panel>
  );
}

function TrendingSkeleton(): ReactNode {
  return (
    <Panel id="trending" title="Trending" className="[grid-area:trending]">
      <ul className="flex h-45 flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex h-9 items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="ml-auto h-3 w-12" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AiBriefSkeleton(): ReactNode {
  return (
    <Panel id="ai-brief" title="AI market brief" className="[grid-area:brief]">
      <div role="status" className="flex h-18 flex-col gap-2.5 overflow-hidden tablet:h-66">
        <span className="sr-only">Writing the brief</span>
        {[
          "w-full",
          "w-11/12",
          "w-full",
          "w-10/12",
          "w-full",
          "w-9/12",
          "w-full",
          "w-11/12",
          "w-8/12",
        ].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
        <span aria-hidden className="h-4 w-2 bg-accent motion-safe:animate-pulse" />
      </div>
      <p className="mt-3 text-meta text-muted">Educational summary, not financial advice.</p>
    </Panel>
  );
}

function FxSkeleton(): ReactNode {
  return (
    <Panel id="fx" title="USD/IDR" className="[grid-area:fx]">
      <div className="flex h-16 flex-col justify-center gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </Panel>
  );
}

// The shell (layout, panels, skeletons) is prerendered; each widget streams in at request
// time from the shared cache, behind its own Suspense boundary (spec §8: a slow provider
// never blocks the other widgets).
export default function OverviewPage(): ReactNode {
  return (
    <>
      <h1 className="sr-only">Market overview</h1>
      <div className="overview-grid">
        <Suspense fallback={<MarketPulseSkeleton />}>
          <MarketPulse />
        </Suspense>

        <Suspense fallback={<TopCoinsSkeleton />}>
          <TopCoins />
        </Suspense>

        <Suspense fallback={<AiBriefSkeleton />}>
          <AiBrief />
        </Suspense>

        <Suspense fallback={<TrendingSkeleton />}>
          <Trending />
        </Suspense>

        <Suspense fallback={<FxSkeleton />}>
          <FxPanel />
        </Suspense>
      </div>
    </>
  );
}
