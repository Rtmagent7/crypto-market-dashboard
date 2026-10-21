import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): ReactNode {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-96 w-full rounded-panel" />
    </div>
  );
}
