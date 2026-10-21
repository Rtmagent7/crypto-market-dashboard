"use client";

import { useNow } from "./use-now";

/** Never poll the internal API more than every 15 s, even if data is already due. */
const MIN_POLL_MS = 15_000;

export const pollDelayMs = (nextRefreshAt: string, now: number = Date.now()): number =>
  Math.max(MIN_POLL_MS, Date.parse(nextRefreshAt) - now);

/** Milliseconds until the envelope says data can change — the client never asks sooner. */
export const usePollingInterval = (nextRefreshAt: string): number =>
  pollDelayMs(nextRefreshAt, useNow(MIN_POLL_MS));
