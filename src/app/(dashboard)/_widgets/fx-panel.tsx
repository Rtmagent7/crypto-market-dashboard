import { connection } from "next/server";
import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { ChangeCell } from "@/components/market/change-cell";
import { Panel } from "@/components/ui/panel";
import { formatIdr } from "@/lib/format";
import { getFxService } from "@/modules/fx/fx.service";

const LAST_30_DAYS = 22; // business days

const dayLabel = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    Date.parse(iso),
  );

export async function FxPanel(): Promise<ReactNode> {
  await connection();
  const envelope = await getFxService().getUsdIdr();
  const fx = envelope.data;

  return (
    <Panel
      id="fx"
      title="USD/IDR"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
      className="[grid-area:fx]"
    >
      {!fx ? (
        <Unavailable what="Exchange rates are" className="flex h-16 items-center" />
      ) : (
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-baseline gap-2">
              <span className="font-condensed text-2xl leading-7 font-semibold">
                {formatIdr(fx.rate)}
              </span>
              <span className="text-meta">
                <ChangeCell pct={fx.change1dPct} />
              </span>
            </p>
            <p className="text-meta text-muted">1 USD · reference rate for {dayLabel(fx.date)}</p>
          </div>
          {fx.history.length > 1 ? (
            <div className="flex flex-col items-end gap-1">
              <Sparkline values={fx.history.slice(-LAST_30_DAYS).map((p) => p.v)} period="30-day" />
              <span className="text-meta text-muted">30 days</span>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
