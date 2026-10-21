import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { PageHeader } from "@/components/layout/page-header";
import { SessionBar } from "@/components/stocks/session-bar";
import { StockChart } from "@/components/stocks/stock-chart";
import { Watchlist } from "@/components/stocks/watchlist";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TICKERS } from "@/config/tickers";
import { getStocksService } from "@/modules/stocks/stocks.service";

export const metadata: Metadata = { title: "Stocks" };

async function StocksView(): Promise<ReactNode> {
  await connection();
  const service = getStocksService();
  const [quotes, hourly, daily] = await Promise.all([
    service.getQuotes(),
    service.getSeries("1d"),
    service.getSeries("1y"),
  ]);
  const open = quotes.data ? quotes.data.some((q) => q.isMarketOpen) : null;

  return (
    <>
      <SessionBar open={open} nextOpen={service.nextOpen()} />
      <div className="grid gap-4">
        <Watchlist initial={quotes} hourly={hourly.data ?? {}} />
        <Panel
          id="stock-chart"
          title="Price history"
          meta={<DataMeta envelope={daily} />}
          rail={<FreshnessRail {...daily} />}
        >
          {daily.data || hourly.data ? (
            <StockChart tickers={TICKERS} hourly={hourly.data ?? {}} daily={daily.data ?? {}} />
          ) : (
            <Unavailable what="Price history is" className="flex h-60 items-center desktop:h-90" />
          )}
        </Panel>
      </div>
    </>
  );
}

export default function StocksPage(): ReactNode {
  return (
    <>
      <PageHeader title="Stocks">
        Eight US tickers from Twelve Data, refreshed while the market is open.
      </PageHeader>
      <Suspense
        fallback={
          <div className="grid gap-4">
            <Skeleton className="h-8 w-72 rounded-full" />
            <Skeleton className="h-96 w-full rounded-panel" />
            <Skeleton className="h-96 w-full rounded-panel" />
          </div>
        }
      >
        <StocksView />
      </Suspense>
    </>
  );
}
