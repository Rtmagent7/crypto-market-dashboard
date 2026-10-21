"use client";

import { useQuery } from "@tanstack/react-query";

import type { DataEnvelope, StockQuote } from "@/modules/shared/domain";

import { pollDelayMs } from "./use-polling-interval";

type StocksEnvelope = DataEnvelope<StockQuote[]>;

export const isMarketOpen = (env: StocksEnvelope): boolean =>
  env.data?.some((q) => q.isMarketOpen) ?? false;

/**
 * Watchlist quotes, hydrated from the server render. Polls /api/stocks only while the US market
 * is open (spec §8); when closed there is nothing new to fetch.
 */
export const useQuotes = (initialData: StocksEnvelope): StocksEnvelope => {
  const { data } = useQuery({
    queryKey: ["stocks", "quotes"],
    queryFn: async (): Promise<StocksEnvelope> =>
      (await (
        await fetch(new URL("/api/stocks", window.location.origin))
      ).json()) as StocksEnvelope,
    initialData,
    initialDataUpdatedAt: Date.parse(initialData.fetchedAt),
    staleTime: (q) =>
      q.state.data ? Math.max(0, Date.parse(q.state.data.nextRefreshAt) - Date.now()) : 0,
    refetchInterval: (q) =>
      q.state.data && isMarketOpen(q.state.data) ? pollDelayMs(q.state.data.nextRefreshAt) : false,
    refetchIntervalInBackground: false,
  });
  return data;
};
