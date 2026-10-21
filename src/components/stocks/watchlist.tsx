"use client";

import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { ChangeCell } from "@/components/market/change-cell";
import { Panel } from "@/components/ui/panel";
import { useQuotes } from "@/hooks/use-stocks";
import { formatUsd } from "@/lib/format";
import type { DataEnvelope, PricePoint, StockQuote } from "@/modules/shared/domain";

const signed = (n: number): string => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}`;

/** Watchlist table with the same cell rules as the crypto table (spec 9A). */
export function Watchlist({
  initial,
  hourly,
}: {
  initial: DataEnvelope<StockQuote[]>;
  hourly: Record<string, PricePoint[]>;
}): ReactNode {
  const envelope = useQuotes(initial);
  return (
    <Panel
      id="watchlist"
      title="Watchlist"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
    >
      {!envelope.data ? (
        <Unavailable what="Stock quotes are" className="flex h-80 items-center" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-cell">
            <caption className="sr-only">
              US watchlist: price, change and the last 24 trading hours
            </caption>
            <thead className="bg-surface-raised font-condensed text-meta text-muted">
              <tr>
                <th scope="col" className="h-9 w-full px-2 text-left font-medium">
                  Ticker
                </th>
                <th scope="col" className="h-9 px-2 text-right font-medium whitespace-nowrap">
                  Price
                </th>
                <th scope="col" className="h-9 px-2 text-right font-medium whitespace-nowrap">
                  Change
                </th>
                <th scope="col" className="h-9 px-2 text-right font-medium whitespace-nowrap">
                  Change %
                </th>
                <th
                  scope="col"
                  className="h-9 w-28 px-2 text-right font-medium @max-[30rem]:hidden"
                >
                  24 h
                </th>
              </tr>
            </thead>
            <tbody>
              {envelope.data.map((q) => (
                <tr key={q.symbol} className="h-10 border-b border-line/60">
                  <th scope="row" className="max-w-0 px-2 text-left font-normal">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-medium">{q.symbol}</span>
                      <span className="truncate text-meta text-muted" title={q.name}>
                        {q.name}
                      </span>
                    </span>
                  </th>
                  <td className="px-2 text-right font-medium whitespace-nowrap tabular-nums">
                    {formatUsd(q.price)}
                  </td>
                  <td className="px-2 text-right whitespace-nowrap tabular-nums">
                    {signed(q.change)}
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    <ChangeCell pct={q.changePct} />
                  </td>
                  <td className="px-2 text-right @max-[30rem]:hidden">
                    <Sparkline values={(hourly[q.symbol] ?? []).map((p) => p.v)} period="24-hour" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
