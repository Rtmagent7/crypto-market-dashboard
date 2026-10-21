"use client";

import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/use-now";
import type { DataEnvelope } from "@/modules/shared/domain";

import { relativeAge, witaTime } from "./freshness";
import { PROVIDER_NAMES } from "./provider-names";

const minutesUntil = (iso: string, now: number): number =>
  Math.max(1, Math.round((Date.parse(iso) - now) / 60_000));

/**
 * Panel meta (spec 9A): "Updated 3 min ago · CoinGecko", or the stale badge
 * "Data as of 14:20 WITA". Focusable, with the quota explanation in a tooltip.
 */
export function DataMeta({ envelope }: { envelope: DataEnvelope<unknown> }): ReactNode {
  const now = useNow(30_000);
  const source = PROVIDER_NAMES[envelope.source];
  if (envelope.status === "unavailable") return null;

  const fetched = Date.parse(envelope.fetchedAt);
  const time = (
    <time dateTime={envelope.fetchedAt} suppressHydrationWarning>
      {envelope.status === "stale"
        ? `Data as of ${witaTime(fetched)}`
        : `Updated ${relativeAge(fetched, now)}`}
    </time>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={
            envelope.status === "stale"
              ? "inline-flex items-center gap-1 rounded-full bg-stale-tint px-2 py-0.5 text-meta font-medium text-stale"
              : "text-meta text-muted"
          }
        >
          {time}
          <span aria-hidden> · </span>
          {source}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 bg-surface-raised text-text shadow-popover">
        {envelope.status === "stale"
          ? "The provider is unreachable or its free quota is used up, so this is the last good data. It refreshes as soon as the provider answers."
          : `Next refresh in ${minutesUntil(envelope.nextRefreshAt, now)} min. Cached to protect the free API quota.`}
      </TooltipContent>
    </Tooltip>
  );
}
