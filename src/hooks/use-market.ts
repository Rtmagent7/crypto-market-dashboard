"use client";

import { useQuery } from "@tanstack/react-query";

import type { CryptoAsset, DataEnvelope } from "@/modules/shared/domain";

import { pollDelayMs } from "./use-polling-interval";

type MarketEnvelope = DataEnvelope<CryptoAsset[]>;

const fetchMarket = async (): Promise<MarketEnvelope> => {
  const res = await fetch(new URL("/api/market", window.location.origin));
  // 503 still carries a DataEnvelope (status "unavailable"); only non-JSON is an error.
  return (await res.json()) as MarketEnvelope;
};

/**
 * Top-50 market data. Hydrated from the server render (no double fetch), then polls the
 * internal /api/market exactly when the envelope says data can change (spec §8, ADR 0004).
 */
export const useMarket = (initialData: MarketEnvelope): MarketEnvelope => {
  const { data } = useQuery({
    queryKey: ["market", "top50"],
    queryFn: fetchMarket,
    initialData,
    initialDataUpdatedAt: Date.parse(initialData.fetchedAt),
    staleTime: (query) =>
      query.state.data ? Math.max(0, Date.parse(query.state.data.nextRefreshAt) - Date.now()) : 0,
    refetchInterval: (query) =>
      query.state.data ? pollDelayMs(query.state.data.nextRefreshAt) : false,
    refetchIntervalInBackground: false,
  });
  return data;
};
