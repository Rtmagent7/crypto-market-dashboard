import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ProviderState } from "@/modules/shared/domain";

const STYLE: Record<ProviderState, { label: string; chip: string; dot: string }> = {
  operational: { label: "Operational", chip: "bg-up-tint text-up", dot: "bg-up" },
  degraded: { label: "Degraded", chip: "bg-stale-tint text-stale", dot: "bg-stale" },
  down: { label: "Down", chip: "bg-down-tint text-down", dot: "bg-down" },
  standby: { label: "Standby", chip: "bg-surface-raised text-muted", dot: "bg-control-border" },
};

/** State is spelled out in text; color and dot only reinforce it. */
export function StateChip({ state }: { state: ProviderState }): ReactNode {
  const s = STYLE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-meta font-medium whitespace-nowrap",
        s.chip,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
