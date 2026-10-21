"use client";

import { useState, type ReactNode } from "react";

import { LazyPriceChart } from "@/components/charts/lazy-price-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PricePoint } from "@/modules/shared/domain";

/** 1-year USD/x history with a currency switcher (local UI state: useState, spec §8). */
export function FxHistory({ histories }: { histories: Record<string, PricePoint[]> }): ReactNode {
  const currencies = Object.keys(histories);
  const [currency, setCurrency] = useState(currencies[0] ?? "IDR");
  const points = histories[currency] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={currency} onValueChange={setCurrency}>
        <TabsList aria-label="Currency">
          {currencies.map((c) => (
            <TabsTrigger key={c} value={c} className="data-[state=active]:text-accent">
              USD/{c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <LazyPriceChart
        points={points}
        format={currency === "IDR" ? "idr" : "plain"}
        label={`USD/${currency}, 1 year`}
      />
    </div>
  );
}
