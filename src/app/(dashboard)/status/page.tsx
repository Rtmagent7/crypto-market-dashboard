import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DataMeta } from "@/components/data-state/data-meta";
import { PageHeader } from "@/components/layout/page-header";
import { StatusTable } from "@/components/status/status-table";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusService } from "@/modules/status/status.service";

export const metadata: Metadata = { title: "Status" };

async function ProvidersPanel(): Promise<ReactNode> {
  await connection(); // always live: what the guard enforces right now (spec §3: no-store)
  const envelope = await getStatusService().getStatus();
  return (
    <Panel id="providers" title="Providers" meta={<DataMeta envelope={envelope} />}>
      <StatusTable initial={envelope} />
    </Panel>
  );
}

export default function StatusPage(): ReactNode {
  return (
    <>
      <PageHeader title="Status">
        Read from the same counters the quota guard enforces. Every number on this dashboard is
        cached so free API limits are never exceeded.
      </PageHeader>
      <Suspense
        fallback={
          <Panel id="providers" title="Providers">
            {/* Measured table heights (nine providers): rows wrap less as the page widens. */}
            <Skeleton className="h-[833px] w-full rounded-control min-[620px]:h-[753px] tablet:h-[689px] desktop:h-[673px]" />
          </Panel>
        }
      >
        <ProvidersPanel />
      </Suspense>
    </>
  );
}
