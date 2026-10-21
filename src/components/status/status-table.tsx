"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { relativeAge } from "@/components/data-state/freshness";
import { useNow } from "@/hooks/use-now";
import type { DataEnvelope, ProviderStatus } from "@/modules/shared/domain";

import { QuotaMeter } from "./quota-meter";
import { StateChip } from "./state-chip";

type StatusEnvelope = DataEnvelope<ProviderStatus[]>;

const POLL_MS = 60_000;

/** Provider table, re-read from /api/status every 60 s (spec §8) while the tab is visible. */
export function StatusTable({ initial }: { initial: StatusEnvelope }): ReactNode {
  const now = useNow(30_000);
  const { data: envelope } = useQuery({
    queryKey: ["status"],
    queryFn: async (): Promise<StatusEnvelope> =>
      (await (
        await fetch(new URL("/api/status", window.location.origin))
      ).json()) as StatusEnvelope,
    initialData: initial,
    initialDataUpdatedAt: Date.parse(initial.fetchedAt),
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });

  if (!envelope.data) {
    return (
      <p className="text-cell text-muted">
        The status store is unreachable right now. Data on other pages is still served from cache.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-cell">
        <caption className="sr-only">Provider status, quota use and data age</caption>
        <thead className="bg-surface-raised font-condensed text-meta text-muted">
          <tr>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              Provider
            </th>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              State
            </th>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              Quota
            </th>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              Last data
            </th>
            <th scope="col" className="h-9 px-2 text-left font-medium">
              Fallback
            </th>
          </tr>
        </thead>
        <tbody>
          {envelope.data.map((p) => (
            <tr key={p.id} className="border-b border-line/60 align-top">
              <th scope="row" className="px-2 py-3 text-left font-normal">
                <span className="block font-medium">{p.name}</span>
                <span className="block text-meta text-muted">
                  {p.serves}
                  {p.role === "core" ? "" : ` · ${p.role}`}
                </span>
              </th>
              <td className="px-2 py-3">
                <StateChip state={p.state} />
                {p.reason ? <p className="mt-1 max-w-64 text-meta text-muted">{p.reason}</p> : null}
              </td>
              <td className="px-2 py-3">
                <QuotaMeter
                  used={p.quotaUsed}
                  cap={p.quotaCap}
                  period={p.quotaPeriod}
                  label={p.name}
                />
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                {p.lastDataAt ? (
                  <time dateTime={p.lastDataAt} suppressHydrationWarning>
                    {relativeAge(Date.parse(p.lastDataAt), now)}
                  </time>
                ) : (
                  <span className="text-muted">Never</span>
                )}
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                {p.fallbackActive ? (
                  <span className="font-medium text-stale">{p.fallbackActive} serving</span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
