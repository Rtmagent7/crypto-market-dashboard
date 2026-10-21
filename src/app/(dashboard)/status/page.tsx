import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Status" };

export default function StatusPage(): ReactNode {
  return (
    <>
      <PageHeader title="Status">
        Provider health and quota use, read from the same counters the guard enforces.
      </PageHeader>
      <Panel id="status-main" title="Providers" meta="Not connected yet · arrives in Sprint 2">
        <div className="flex h-64 flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-full w-full" />
        </div>
      </Panel>
    </>
  );
}
