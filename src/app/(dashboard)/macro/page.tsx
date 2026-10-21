import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { PageHeader } from "@/components/layout/page-header";
import { IndicatorTable } from "@/components/macro/indicator-table";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getMacroService } from "@/modules/macro/macro.service";

export const metadata: Metadata = { title: "Macro" };

const TITLE = "Indonesia at a glance";
// Same height as the five-row table (measured at 390 px and from 464 px up), so the panel does
// not jump when data arrives: on phones the descriptions wrap to two lines.
const TABLE_HEIGHT = "h-[388px] min-[464px]:h-[340px]";

async function IndicatorsPanel(): Promise<ReactNode> {
  await connection();
  const envelope = await getMacroService().getIndicators();
  return (
    <Panel
      id="indicators"
      title={TITLE}
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
    >
      {envelope.data ? (
        <IndicatorTable indicators={envelope.data} />
      ) : (
        <Unavailable what="Macro indicators are" className={`flex items-center ${TABLE_HEIGHT}`} />
      )}
    </Panel>
  );
}

export default function MacroPage(): ReactNode {
  return (
    <>
      <PageHeader title="Macro">
        Annual World Bank indicators for Indonesia, refreshed weekly.
      </PageHeader>
      <Suspense
        fallback={
          <Panel id="indicators" title={TITLE}>
            <Skeleton className={`w-full rounded-control ${TABLE_HEIGHT}`} />
          </Panel>
        }
      >
        <IndicatorsPanel />
      </Suspense>
    </>
  );
}
