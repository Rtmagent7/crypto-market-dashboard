"use client";

import { useState, type ReactNode } from "react";

import { LazyPriceChart } from "@/components/charts/lazy-price-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PricePoint } from "@/modules/shared/domain";

type Range = "1d" | "1y";

/** Ticker + range switcher over server-provided series: no extra requests (local UI state). */
export function StockChart({
  tickers,
  hourly,
  daily,
}: {
  tickers: readonly string[];
  hourly: Record<string, PricePoint[]>;
  daily: Record<string, PricePoint[]>;
}): ReactNode {
  const [ticker, setTicker] = useState(tickers[0] ?? "AAPL");
  // Open on 1Y, unless only the intraday series is cached yet (cold cache: one 8-credit batch per
  // minute means the series fill in over a few minutes).
  const [range, setRange] = useState<Range>(Object.keys(daily).length > 0 ? "1y" : "1d");
  const points = (range === "1d" ? hourly : daily)[ticker] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="stock-ticker" className="sr-only">
          Ticker
        </label>
        <select
          id="stock-ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="min-h-11 rounded-control border border-control-border bg-surface px-3 text-cell"
        >
          {tickers.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList aria-label="Chart range">
            <TabsTrigger value="1d" className="data-[state=active]:text-accent">
              24 trading hours
            </TabsTrigger>
            <TabsTrigger value="1y" className="data-[state=active]:text-accent">
              1Y
            </TabsTrigger>
          </TabsList>
          <TabsContent value="1d" forceMount hidden={range !== "1d"} className="hidden" />
          <TabsContent value="1y" forceMount hidden={range !== "1y"} className="hidden" />
        </Tabs>
      </div>
      {points.length > 0 ? (
        <LazyPriceChart
          points={points}
          format="usd"
          label={`${ticker}, ${range === "1d" ? "24 trading hours" : "1 year"}`}
        />
      ) : (
        <p role="status" className="flex h-60 items-center text-cell text-muted desktop:h-90">
          {range === "1y" ? "The one-year history" : "The intraday history"} is still being fetched
          — the free API allows one batch per minute. It appears within a few minutes.
        </p>
      )}
    </div>
  );
}
