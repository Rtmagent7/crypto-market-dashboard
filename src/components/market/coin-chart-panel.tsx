"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { LazyPriceChart } from "@/components/charts/lazy-price-chart";
import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChartRange } from "@/config/coins";
import type { DataEnvelope, PricePoint } from "@/modules/shared/domain";

const RANGES: readonly { value: ChartRange; label: string }[] = [
  { value: "1d", label: "1D" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "1y", label: "1Y" },
];

type ChartEnvelope = DataEnvelope<PricePoint[]>;

/** Range tabs + chart. 30D arrives server-rendered; other ranges load on demand (spec §8). */
export function CoinChartPanel({
  coinId,
  coinName,
  initial,
}: {
  coinId: string;
  coinName: string;
  initial: ChartEnvelope;
}): ReactNode {
  const [range, setRange] = useState<ChartRange>("30d");
  const { data: envelope, isPending } = useQuery({
    queryKey: ["coin", coinId, "chart", range],
    queryFn: async (): Promise<ChartEnvelope> => {
      const url = new URL(`/api/coins/${coinId}/chart`, window.location.origin);
      url.searchParams.set("range", range);
      return (await (await fetch(url)).json()) as ChartEnvelope;
    },
    initialData: range === "30d" ? initial : undefined,
    staleTime: (q) =>
      q.state.data ? Math.max(0, Date.parse(q.state.data.nextRefreshAt) - Date.now()) : 0,
  });

  return (
    <Panel
      id="coin-chart"
      title={`${coinName} price`}
      meta={envelope ? <DataMeta envelope={envelope} /> : null}
      rail={envelope ? <FreshnessRail {...envelope} /> : undefined}
    >
      <Tabs
        value={range}
        onValueChange={(v) => setRange(v as ChartRange)}
        className="flex flex-col gap-3"
      >
        <TabsList aria-label="Chart range">
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value} className="data-[state=active]:text-accent">
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {RANGES.map((r) => (
          <TabsContent key={r.value} value={r.value} forceMount hidden={r.value !== range}>
            {r.value !== range ? null : isPending || !envelope ? (
              <Skeleton className="h-60 w-full rounded-control desktop:h-90" />
            ) : envelope.data ? (
              <LazyPriceChart
                points={envelope.data}
                format="usd"
                label={`${coinName}, ${r.label}`}
              />
            ) : (
              <Unavailable what="This chart is" className="flex h-60 items-center desktop:h-90" />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Panel>
  );
}
