import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Stocks" };

export default function StocksPage(): ReactNode {
  return (
    <>
      <PageHeader title="Stocks">Eight US tickers, refreshed while the market is open.</PageHeader>
      <Panel id="stocks-main" title="Watchlist" meta="Not connected yet · arrives in Sprint 3">
        <div className="flex h-64 flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-full w-full" />
        </div>
      </Panel>
    </>
  );
}
