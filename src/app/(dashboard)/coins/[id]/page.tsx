import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { ChangeCell } from "@/components/market/change-cell";
import { CoinChartPanel } from "@/components/market/coin-chart-panel";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { COIN_WHITELIST, isWhitelistedCoin, type WhitelistedCoin } from "@/config/coins";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { getMarketService } from "@/modules/market/market.service";
import type { CoinDetail } from "@/modules/shared/domain";

/** The 10 whitelisted coins are prerendered; anything else is a 404 (spec §3). */
export function generateStaticParams(): { id: string }[] {
  return COIN_WHITELIST.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/coins/[id]">): Promise<Metadata> {
  const { id } = await params;
  return {
    title: isWhitelistedCoin(id)
      ? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Not found",
  };
}

const supply = new Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 4 });

function Stats({ coin }: { coin: CoinDetail }): ReactNode {
  const range =
    coin.low24hUsd !== null && coin.high24hUsd !== null
      ? `${formatUsd(coin.low24hUsd)} – ${formatUsd(coin.high24hUsd)}`
      : "—";
  const items: [string, string][] = [
    ["Market cap", formatCompactUsd(coin.marketCapUsd)],
    ["24h volume", coin.volume24hUsd !== null ? formatCompactUsd(coin.volume24hUsd) : "—"],
    ["Rank", coin.rank ? `#${coin.rank}` : "—"],
    ["All-time high", coin.athUsd !== null ? formatUsd(coin.athUsd) : "—"],
    [
      "Circulating supply",
      coin.circulatingSupply !== null
        ? `${supply.format(coin.circulatingSupply)} ${coin.symbol}`
        : "—",
    ],
    ["24h range", range],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 desktop:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse gap-1">
          <dt className="text-meta text-muted">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function CoinView({ id }: { id: WhitelistedCoin }): Promise<ReactNode> {
  await connection();
  const service = getMarketService();
  const [coin, chart] = await Promise.all([service.getCoin(id), service.getChart(id, "30d")]);
  const c = coin.data;

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {c ? (
          <Image src={c.imageUrl} alt="" width={32} height={32} className="size-8 rounded-full" />
        ) : null}
        <h1 className="text-page-title font-semibold">
          {c?.name ?? id} <span className="text-cell font-normal text-muted">{c?.symbol}</span>
        </h1>
        {c ? (
          <p className="flex items-baseline gap-2">
            <span className="font-condensed text-2xl font-semibold tabular-nums">
              {formatUsd(c.priceUsd)}
            </span>
            <ChangeCell pct={c.change24hPct} />
          </p>
        ) : null}
      </header>
      <div className="grid gap-4">
        <CoinChartPanel coinId={id} coinName={c?.name ?? id} initial={chart} />
        <Panel
          id="coin-stats"
          title="Market stats"
          meta={<DataMeta envelope={coin} />}
          rail={<FreshnessRail {...coin} />}
        >
          {c ? <Stats coin={c} /> : <Unavailable what="Market stats are" />}
        </Panel>
      </div>
    </>
  );
}

export default async function CoinPage({ params }: PageProps<"/coins/[id]">): Promise<ReactNode> {
  // Checked before anything streams, so an unknown coin gets a real 404 status. The ten
  // whitelisted ids are known at build time (generateStaticParams), so this stays prerenderable.
  const { id } = await params;
  if (!isWhitelistedCoin(id)) notFound();
  return (
    <>
      <Link
        href="/"
        className="mb-3 inline-flex min-h-11 items-center gap-1 text-cell text-muted hover:text-text"
      >
        <ArrowLeft aria-hidden className="size-4" /> Overview
      </Link>
      <Suspense
        fallback={
          <div className="grid gap-4">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-96 w-full rounded-panel" />
            <Skeleton className="h-40 w-full rounded-panel" />
          </div>
        }
      >
        <CoinView id={id} />
      </Suspense>
    </>
  );
}
