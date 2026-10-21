"use client";

import { relativeAge } from "@/components/data-state/freshness";

import { useNow } from "./use-now";

/** "3 min ago" for an ISO timestamp, kept current every 30 s. */
export const useRelativeTime = (iso: string): string =>
  relativeAge(Date.parse(iso), useNow(30_000));
