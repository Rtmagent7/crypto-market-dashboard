import Image from "next/image";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { ChangeCell } from "@/components/market/change-cell";
import { Panel } from "@/components/ui/panel";
import { formatUsd } from "@/lib/format";
import { getMarketService } from "@/modules/market/market.service";

export async function Trending(): Promise<ReactNode> {
  await connection();
  const envelope = await getMarketService().getTrending();
  const coins = envelope.data;

  return (
    <Panel
      id="trending"
      title="Trending"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
      className="[grid-area:trending]"
    >
      {!coins ? (
        <Unavailable what="Trending coins are" className="flex h-45 items-center" />
      ) : coins.length === 0 ? (
        <p className="flex h-45 items-center text-cell text-muted">
          Nothing is trending right now.
        </p>
      ) : (
        <ul className="flex h-45 flex-col">
          {coins.map((c) => (
            <li key={c.id} className="flex h-9 items-center gap-2 text-cell">
              <Image
                src={c.thumbUrl}
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-full"
              />
              <span className="truncate font-medium" title={c.name}>
                {c.name}
              </span>
              <span className="shrink-0 text-meta text-muted">{c.symbol}</span>
              <span className="ml-auto shrink-0 tabular-nums">{formatUsd(c.priceUsd)}</span>
              <span className="w-20 shrink-0 text-right tabular-nums">
                <ChangeCell pct={c.change24hPct} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
