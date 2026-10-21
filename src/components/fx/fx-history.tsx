"use client";

import { useState, type ReactNode } from "react";

import { LazyPriceChart } from "@/components/charts/lazy-price-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PricePoint } from "@/modules/shared/domain";

/**
 * 1-year USD/x history with a currency switcher (local UI state: useState, spec §8).
 * Every tab owns a panel (valid aria-controls); only the active one mounts a chart.
 */
export function FxHistory({ histories }: { histories: Record<string, PricePoint[]> }): ReactNode {
  const currencies = Object.keys(histories);
  const [currency, setCurrency] = useState(currencies[0] ?? "IDR");

  return (
    <Tabs value={currency} onValueChange={setCurrency} className="flex flex-col gap-3">
      <TabsList aria-label="Currency">
        {currencies.map((c) => (
          <TabsTrigger key={c} value={c} className="data-[state=active]:text-accent">
            USD/{c}
          </TabsTrigger>
        ))}
      </TabsList>
      {currencies.map((c) => (
        <TabsContent key={c} value={c} forceMount hidden={c !== currency}>
          {c === currency ? (
            <LazyPriceChart
              points={histories[c] ?? []}
              format={c === "IDR" ? "idr" : "plain"}
              label={`USD/${c}, 1 year`}
            />
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
