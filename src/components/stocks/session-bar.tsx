import type { ReactNode } from "react";

import { MARKET } from "@/config/market-hours";
import { cn } from "@/lib/utils";

const time = new Intl.DateTimeFormat("en-GB", {
  timeZone: MARKET.displayTimeZone,
  hour: "2-digit",
  minute: "2-digit",
});

/** "US market open" / "US market closed — opens 21:30 WITA" (spec 9A); state from is_market_open. */
export function SessionBar({
  open,
  nextOpen,
}: {
  open: boolean | null;
  nextOpen: Date;
}): ReactNode {
  return (
    <p
      role="status"
      className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-cell"
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", open ? "bg-up" : "bg-control-border")}
      />
      {open === null
        ? "US market status unknown"
        : open
          ? "US market open"
          : `US market closed — opens ${time.format(nextOpen)} ${MARKET.displayZoneLabel}`}
    </p>
  );
}
