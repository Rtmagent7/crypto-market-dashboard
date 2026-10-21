import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { CoinTableSkeleton } from "@/components/market/coin-table-skeleton";
import { DensityToggle } from "@/components/market/density-toggle";
import { MarketPulseSkeleton } from "@/components/market/market-pulse-skeleton";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

import { MarketPulse } from "./_widgets/market-pulse";
import { TopCoins } from "./_widgets/top-coins";
import { Trending } from "./_widgets/trending";

export const metadata: Metadata = { title: "Overview" };

const NOT_CONNECTED = "Not connected yet";

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

        <Panel
          id="ai-brief"
          title="AI market brief"
          meta={NOT_CONNECTED}
          className="[grid-area:brief]"
        >
          <div className="flex h-40 flex-col gap-2.5">
            {["w-full", "w-11/12", "w-full", "w-10/12", "w-full", "w-7/12"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
          <p className="mt-3 text-meta text-muted">Educational summary, not financial advice.</p>
        </Panel>

        <Suspense fallback={<TrendingSkeleton />}>
          <Trending />
        </Suspense>

        <Panel id="fx" title="USD/IDR" meta={NOT_CONNECTED} className="[grid-area:fx]">
          <div className="flex h-16 flex-col justify-center gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Panel>
      </div>
    </>
  );
}
