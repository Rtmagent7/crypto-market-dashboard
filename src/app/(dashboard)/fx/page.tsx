import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "FX" };

export default function FxPage(): ReactNode {
  return (
    <>
      <PageHeader title="FX">Converter and 1-year history on cached rates.</PageHeader>
      <Panel id="fx-main" title="Currency converter" meta="Not connected yet · arrives in Sprint 2">
        <div className="flex h-64 flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-full w-full" />
        </div>
      </Panel>
    </>
  );
}
