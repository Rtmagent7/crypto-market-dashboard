import { connection } from "next/server";
import type { ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { ChangeCell } from "@/components/market/change-cell";
import { PulseFigure, PulseStrip } from "@/components/market/market-pulse";
import { PROVIDER_NAMES } from "@/components/data-state/provider-names";
import { formatCompactUsd, formatIdr, formatPercent } from "@/lib/format";
import { getFxService } from "@/modules/fx/fx.service";
import { getMarketService } from "@/modules/market/market.service";

/** Market Pulse (spec 9A): global cap + 24h change, BTC dominance, 24h volume, USD/IDR. */
export async function MarketPulse(): Promise<ReactNode> {
  await connection();
  const [envelope, fx] = await Promise.all([
    getMarketService().getGlobal(),
    getFxService().getUsdIdr(),
  ]);
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
      {/* Its own provider, named beside the figure: the UI tells the truth about sources. */}
      <PulseFigure
        label="USD/IDR"
        value={fx.data ? formatIdr(fx.data.rate) : null}
        note={fx.data ? PROVIDER_NAMES[fx.source] : undefined}
      >
        {fx.data ? <ChangeCell pct={fx.data.change1dPct} /> : null}
      </PulseFigure>
    </PulseStrip>
  );
}
