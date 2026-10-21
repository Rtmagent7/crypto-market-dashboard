"use client";

import type { ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { Panel } from "@/components/ui/panel";
import { useMarket } from "@/hooks/use-market";
import { cn } from "@/lib/utils";
import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { CoinTable, TABLE_VIEWPORT } from "./coin-table";
import { DensityToggle } from "./density-toggle";

/** Top-50 panel: hydrated from the server render, then kept current by useMarket polling. */
export function TopCoinsWidget({ initial }: { initial: DataEnvelope<CryptoAsset[]> }): ReactNode {
  const envelope = useMarket(initial);
  return (
    <Panel
      id="top-coins"
      title="Top 50 coins"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
      actions={<DensityToggle />}
      className="[grid-area:table]"
    >
      {envelope.data ? (
        <CoinTable coins={envelope.data} />
      ) : (
        <Unavailable what="Prices are" className={cn("flex items-center", TABLE_VIEWPORT)} />
      )}
    </Panel>
  );
}
