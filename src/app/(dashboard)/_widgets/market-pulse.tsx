import { connection } from "next/server";
import type { ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { ChangeCell } from "@/components/market/change-cell";
import { PulseFigure, PulseStrip } from "@/components/market/market-pulse";
import { formatCompactUsd, formatPercent } from "@/lib/format";
import { getMarketService } from "@/modules/market/market.service";

/** Market Pulse (spec 9A): global cap + 24h change, BTC dominance, 24h volume, USD/IDR. */
export async function MarketPulse(): Promise<ReactNode> {
  await connection();
  const envelope = await getMarketService().getGlobal();
  const g = envelope.data;

  return (
    <PulseStrip rail={<FreshnessRail {...envelope} />} meta={<DataMeta envelope={envelope} />}>
      <PulseFigure
        label="Global market cap"
        value={g ? formatCompactUsd(g.totalMarketCapUsd) : null}
      >
        {g ? <ChangeCell pct={g.marketCapChange24hPct} /> : null}
      </PulseFigure>
      <PulseFigure
        label="BTC dominance"
        value={g?.btcDominancePct != null ? formatPercent(g.btcDominancePct) : null}
      />
      <PulseFigure
        label="24h volume"
        value={g?.volume24hUsd != null ? formatCompactUsd(g.volume24hUsd) : null}
      />
      <PulseFigure label="USD/IDR" value={null} note="FX module next" />
    </PulseStrip>
  );
}
