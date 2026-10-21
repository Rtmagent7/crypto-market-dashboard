import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Fixed-size placeholder. Callers set exact height so the swap to content causes no CLS. */
export function Skeleton({ className }: { className?: string }): ReactNode {
  return (
    <div aria-hidden className={cn("rounded-sm bg-skeleton motion-safe:animate-pulse", className)} />
  );
}
