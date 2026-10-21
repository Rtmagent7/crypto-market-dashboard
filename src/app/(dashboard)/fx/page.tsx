import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { Converter } from "@/components/fx/converter";
import { FxHistory } from "@/components/fx/fx-history";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getFxService } from "@/modules/fx/fx.service";

export const metadata: Metadata = { title: "FX" };

async function ConverterPanel(): Promise<ReactNode> {
  await connection();
  const envelope = await getFxService().getRates();
  return (
    <Panel
      id="converter"
      title="Currency converter"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
    >
      {envelope.data ? (
        <Converter rates={envelope.data} />
      ) : (
        <Unavailable what="Exchange rates are" className="flex h-40 items-center" />
      )}
    </Panel>
  );
}

async function HistoryPanel(): Promise<ReactNode> {
  await connection();
  const envelope = await getFxService().getHistories();
  return (
    <Panel
      id="fx-history"
      title="One year of USD rates"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
    >
      {envelope.data ? (
        <FxHistory histories={envelope.data} />
      ) : (
        <Unavailable what="FX history is" className="flex h-60 items-center desktop:h-90" />
      )}
    </Panel>
  );
}

const PanelSkeleton = ({
  id,
  title,
  height,
}: {
  id: string;
  title: string;
  height: string;
}): ReactNode => (
  <Panel id={id} title={title}>
    <Skeleton className={`w-full rounded-control ${height}`} />
  </Panel>
);

export default function FxPage(): ReactNode {
  return (
    <>
      <PageHeader title="FX">
        ECB reference rates via Frankfurter, refreshed every 6 hours.
      </PageHeader>
      <div className="grid gap-4">
        <Suspense
          fallback={<PanelSkeleton id="converter" title="Currency converter" height="h-40" />}
        >
          <ConverterPanel />
        </Suspense>
        <Suspense
          fallback={
            <PanelSkeleton
              id="fx-history"
              title="One year of USD rates"
              height="h-72 desktop:h-102"
            />
          }
        >
          <HistoryPanel />
        </Suspense>
      </div>
    </>
  );
}
